/**
 * server.js — Conflict Mapper Backend API Server
 *
 * A full Express.js REST API server providing:
 *   - Static file serving (existing dossiers, site assets)
 *   - RSS feed management endpoints
 *   - Article storage and retrieval endpoints
 *   - AI provider configuration endpoints
 *   - Analysis report generation endpoints
 *   - Settings management
 *
 * All API routes return consistent JSON:
 *   { success: true, data: {...} }
 *   { success: false, error: "message" }
 *
 * Data is persisted in JSON files under ./data/ — no database required.
 */

'use strict';

const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const bodyParser = require('body-parser');

// ── Internal modules ────────────────────────────────────────────────────────
const feedStore   = require('./lib/feed-store');
const rssEngine   = require('./lib/rss-engine');
const aiProviders = require('./lib/ai-providers');
const generator   = require('./lib/analysis-generator');
const logger      = require('./lib/logger');

// ─────────────────────────────────────────────────────────────────────────────
// SERVER SETUP
// ─────────────────────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins in development
app.use(cors({
  origin: true,
  credentials: true,
}));

// Parse JSON request bodies (up to 10MB for large feed imports)
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ── API Request Logging Middleware ───────────────────────────────────────────
// Log every API request immediately on receipt.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    let bodySummary = null;
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      const raw = JSON.stringify(req.body);
      bodySummary = raw.length > 200 ? raw.slice(0, 200) + '...' : raw;
    }
    logger.log('api', 'info', `${req.method} ${req.path}`, bodySummary ? { body: bodySummary } : undefined);
  }
  next();
});

// ── Static file serving ──────────────────────────────────────────────────────
// Serve all static files from the project root.
// This includes index.html, countries/*, theaters/*, assets/*, reports/*, etc.
app.use(express.static(path.join(__dirname), {
  // Remove X-Frame-Options so dossiers can be embedded in the main iframe
  setHeaders: (res, filePath) => {
    res.removeHeader('X-Frame-Options');
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
    // Allow iframe embedding of report HTML files
    if (filePath.endsWith('.html')) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STATE
// Progress tracking for long-running operations (fetch, generate)
// ─────────────────────────────────────────────────────────────────────────────

let fetchStatus = {
  running:  false,
  progress: 0,
  total:    0,
  current:  '',
  errors:   0,
  lastRun:  null,
  message:  'Idle',
};

let analysisStatus = {
  running:   false,
  phase:     'idle',
  current:   0,
  total:     0,
  message:   'Idle',
  lastRun:   null,
  lastResult: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: WRAP ROUTE HANDLER
// Wraps async route handlers to catch unhandled promise rejections.
// ─────────────────────────────────────────────────────────────────────────────
function asyncRoute(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// === RSS FEED MANAGEMENT ===
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/feeds
 * List all configured feeds with counts.
 */
app.get('/api/feeds', asyncRoute(async (req, res) => {
  const config = feedStore.getFeeds();
  res.json({
    success: true,
    data: {
      feeds:      config.feeds || [],
      categories: config.categories || [],
      total:      (config.feeds || []).length,
      enabled:    (config.feeds || []).filter(f => f.enabled).length,
    },
  });
}));

/**
 * POST /api/feeds
 * Add a new feed.
 * Body: { url, name, category, country, enabled }
 */
app.post('/api/feeds', asyncRoute(async (req, res) => {
  const { url, name, category, country, enabled } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'Feed URL is required' });
  }

  try {
    const feed = feedStore.addFeed({ url, name, category, country, enabled });
    logger.log('rss', 'info', `Feed added: ${feed.name}`, { id: feed.id, url: feed.url });
    res.json({ success: true, data: { feed } });
  } catch (err) {
    res.status(409).json({ success: false, error: err.message });
  }
}));

/**
 * DELETE /api/feeds/:id
 * Remove a feed by ID.
 */
app.delete('/api/feeds/:id', asyncRoute(async (req, res) => {
  const removed = feedStore.removeFeed(req.params.id);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Feed not found' });
  }
  logger.log('rss', 'info', `Feed removed: ${req.params.id}`);
  res.json({ success: true, data: { removed: true, id: req.params.id } });
}));

/**
 * POST /api/feeds/import
 * Bulk import feeds from a JSON array.
 * Body: { feeds: [...] }
 */
app.post('/api/feeds/import', asyncRoute(async (req, res) => {
  const { feeds } = req.body;
  if (!Array.isArray(feeds)) {
    return res.status(400).json({ success: false, error: 'Body must have "feeds" array' });
  }

  const result = feedStore.importFeeds(feeds);
  res.json({ success: true, data: result });
}));

/**
 * POST /api/feeds/fetch
 * Trigger an async fetch of all enabled feeds.
 * Returns immediately with a status message; use /api/feeds/fetch-status to poll.
 */
app.post('/api/feeds/fetch', asyncRoute(async (req, res) => {
  if (fetchStatus.running) {
    return res.json({
      success: true,
      data: { message: 'Fetch already in progress', status: fetchStatus },
    });
  }

  const config = feedStore.getFeeds();
  const enabledCount = (config.feeds || []).filter(f => f.enabled).length;

  if (enabledCount === 0) {
    return res.json({ success: false, error: 'No enabled feeds configured' });
  }

  // Start async fetch (non-blocking)
  fetchStatus = {
    running:  true,
    progress: 0,
    total:    enabledCount,
    current:  'Starting...',
    errors:   0,
    lastRun:  new Date().toISOString(),
    message:  `Fetching ${enabledCount} feeds...`,
  };

  // Respond immediately before starting the long operation
  res.json({
    success: true,
    data: {
      message: `Feed fetch started for ${enabledCount} feeds`,
      status:  fetchStatus,
    },
  });

  // Run fetch in background
  try {
    logger.log('rss', 'info', `RSS fetch started for ${enabledCount} feeds`);
    const result = await rssEngine.fetchAllFeeds(config, (progress) => {
      fetchStatus.progress = progress.fetched;
      fetchStatus.current  = progress.current;
      fetchStatus.errors   = progress.errors;
      fetchStatus.message  = `Fetching: ${progress.current} (${progress.fetched}/${progress.total})`;
    });

    // Save articles
    const saved = feedStore.saveArticles(result.articles);

    logger.log('rss', 'info', `RSS fetch complete`, {
      totalFetched: result.totalFetched,
      newArticles: saved.added,
      feedErrors: result.errors,
      feedCount: result.results.length,
    });
    fetchStatus = {
      running:   false,
      progress:  result.results.length,
      total:     result.results.length,
      current:   'Complete',
      errors:    result.errors,
      lastRun:   new Date().toISOString(),
      message:   `Fetch complete. ${saved.added} new articles. ${result.errors} feed errors.`,
      lastResult: {
        totalArticles: result.totalFetched,
        newArticles:   saved.added,
        savedTotal:    saved.total,
        feedErrors:    result.errors,
        feedResults:   result.results,
      },
    };

    // (logged above)
  } catch (err) {
    logger.log('rss', 'error', `RSS fetch failed: ${err.message}`, { stack: err.stack });
    fetchStatus = {
      running:  false,
      progress: 0,
      total:    0,
      current:  'Error',
      errors:   1,
      lastRun:  new Date().toISOString(),
      message:  `Fetch failed: ${err.message}`,
    };
  }
}));

/**
 * GET /api/feeds/fetch-status
 * Check the current feed fetch progress.
 */
app.get('/api/feeds/fetch-status', (req, res) => {
  res.json({ success: true, data: fetchStatus });
});

// ─────────────────────────────────────────────────────────────────────────────
// === ARTICLES ===
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/articles
 * Get cached articles with optional filters.
 * Query params: country, category, timeRange (hours), search, limit, page, pageSize
 *
 * Pagination:
 *   page     - 1-based page number (default: 1)
 *   pageSize - articles per page (default: 50, max: 500)
 *   If page/pageSize are provided, returns paginated results with metadata.
 *   If only limit is provided, returns up to limit articles (legacy behavior).
 */
app.get('/api/articles', asyncRoute(async (req, res) => {
  const usePagination = req.query.page !== undefined || req.query.pageSize !== undefined;

  const filters = {
    country:        req.query.country        || null,
    category:       req.query.category       || null,
    timeRange:      req.query.timeRange ? parseInt(req.query.timeRange) : null,
    search:         req.query.search         || null,
    // When paginating, fetch all matching articles (no limit); apply pagination after
    limit:          usePagination ? 0 : (req.query.limit ? parseInt(req.query.limit) : 200),
    languageFilter: req.query.language === 'all' ? 'all' : null,
  };

  const allArticles = feedStore.getArticles(filters);
  const lastFetch   = feedStore.getLastFetchTime();

  if (usePagination) {
    const page       = Math.max(1, parseInt(req.query.page)     || 1);
    const pageSize   = Math.min(500, Math.max(1, parseInt(req.query.pageSize) || 50));
    const totalCount = allArticles.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIdx   = (page - 1) * pageSize;
    const articles   = allArticles.slice(startIdx, startIdx + pageSize);

    return res.json({
      success: true,
      data: {
        articles,
        page,
        pageSize,
        total:      totalCount,
        totalPages,
        lastFetch,
        filters,
      },
    });
  }

  res.json({
    success: true,
    data: {
      articles:  allArticles,
      total:     allArticles.length,
      lastFetch,
      filters,
    },
  });
}));

/**
 * GET /api/articles/geo
 * Get geotagged articles for map display.
 * Only returns articles with valid lat/lng coordinates.
 */
app.get('/api/articles/geo', asyncRoute(async (req, res) => {
  const filters = {
    timeRange: req.query.timeRange ? parseInt(req.query.timeRange) : 48,
    country:   req.query.country || null,
  };

  const articles    = feedStore.getArticles(filters);
  const geoArticles = rssEngine.getGeotaggedArticles(articles);

  res.json({
    success: true,
    data: {
      articles: geoArticles,
      total:    geoArticles.length,
    },
  });
}));

/**
 * POST /api/articles/flag
 * Flag an article for analysis inclusion.
 * Body: { articleId, country, notes }
 */
app.post('/api/articles/flag', asyncRoute(async (req, res) => {
  const { articleId, country, notes } = req.body;

  if (!articleId) {
    return res.status(400).json({ success: false, error: 'articleId is required' });
  }

  const flag = feedStore.flagArticle(articleId, country || 'global', notes || '');
  res.json({ success: true, data: { flag } });
}));

/**
 * GET /api/articles/flagged
 * Get all flagged articles, optionally filtered by country.
 * Query params: country
 */
app.get('/api/articles/flagged', asyncRoute(async (req, res) => {
  const flagged = feedStore.getFlaggedArticles(req.query.country || null);
  res.json({
    success: true,
    data: { flagged, total: flagged.length },
  });
}));

/**
 * DELETE /api/articles/flag/:id
 * Remove a flag by its flag ID.
 */
app.delete('/api/articles/flag/:id', asyncRoute(async (req, res) => {
  const removed = feedStore.unflagArticle(req.params.id);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Flag not found' });
  }
  res.json({ success: true, data: { removed: true, id: req.params.id } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// === AI CONFIGURATION ===
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/ai/config
 * Get current AI configuration with API keys masked.
 */
app.get('/api/ai/config', (req, res) => {
  const config = feedStore.getAIConfig(true); // true = mask keys
  res.json({
    success: true,
    data: {
      config,
      providers: aiProviders.listProviders(),
    },
  });
});

/**
 * POST /api/ai/config
 * Save AI configuration.
 *
 * Accepts two body shapes:
 *   Shape A (flat):  { provider, apiKey, model, baseUrl }
 *     — Saves apiKey/model/baseUrl into the named provider slot and sets it active.
 *   Shape B (nested): { provider, providers: { [name]: { apiKey, model, baseUrl } } }
 *     — Same as the original format.
 *
 * Only sends keys you want to update. Omitted keys are preserved.
 */
app.post('/api/ai/config', asyncRoute(async (req, res) => {
  const { provider, providers, apiKey, model, baseUrl } = req.body;

  if (!provider && !providers) {
    return res.status(400).json({ success: false, error: 'Must provide "provider" and/or "providers"' });
  }

  // Shape A: flat { provider, apiKey, model, baseUrl }
  if (provider && (apiKey !== undefined || model !== undefined || baseUrl !== undefined)) {
    const providerUpdate = {};
    if (apiKey   !== undefined) providerUpdate.apiKey   = apiKey;
    if (model    !== undefined) providerUpdate.model    = model;
    if (baseUrl  !== undefined) providerUpdate.baseUrl  = baseUrl;
    feedStore.saveAIConfig({
      provider,
      providers: { [provider]: providerUpdate },
    });
  } else {
    // Shape B: nested providers object
    feedStore.saveAIConfig({ provider, providers });
  }

  logger.log('ai', 'info', 'AI config saved', { provider });

  // Return masked config so client can confirm save
  const saved = feedStore.getAIConfig(true);
  res.json({ success: true, data: { config: saved } });
}));

/**
 * POST /api/ai/test
 * Test an AI provider connection.
 *
 * Body options:
 *   { provider, apiKey, model, baseUrl } — Test with provided credentials (NOT saved).
 *   { provider }                         — Test a saved provider by name.
 *   {}                                   — Test the currently active saved config.
 */
app.post('/api/ai/test', asyncRoute(async (req, res) => {
  const { provider: bodyProvider, apiKey, model, baseUrl } = req.body || {};
  let testConfig;

  if (bodyProvider && apiKey) {
    // Temporary test — use the body params directly without reading/saving config
    testConfig = {
      provider: bodyProvider,
      providers: {
        [bodyProvider]: {
          apiKey,
          model:   model   || undefined,
          baseUrl: baseUrl || undefined,
        },
      },
    };
    logger.log('ai', 'info', `AI test (unsaved) for provider: ${bodyProvider}`, { model });
  } else {
    // Use the saved config; optionally override the active provider name
    testConfig = feedStore.getAIConfig(false);
    if (bodyProvider) {
      testConfig.provider = bodyProvider;
    }
    logger.log('ai', 'info', `AI test for saved provider: ${testConfig.provider}`);
  }

  const startTime = Date.now();
  const provider  = aiProviders.getProvider(testConfig);
  const result    = await provider.testConnection();
  const elapsed   = Date.now() - startTime;

  logger.log('ai', result.success ? 'info' : 'warn', `AI test ${result.success ? 'succeeded' : 'failed'}`, {
    provider: testConfig.provider,
    model:    result.model,
    elapsed,
    message:  result.message,
  });

  res.json({
    success: result.success,
    data: {
      ...result,
      provider:     testConfig.provider,
      providerName: provider.name,
      elapsed,
    },
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// === ANALYSIS GENERATION ===
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/analysis/global
 * Generate the global intelligence report. Non-blocking — starts async generation.
 */
app.post('/api/analysis/global', asyncRoute(async (req, res) => {
  if (analysisStatus.running) {
    return res.json({
      success: true,
      data: { message: 'Analysis already in progress', status: analysisStatus },
    });
  }

  analysisStatus = {
    running: true,
    phase:   'global',
    current: 0,
    total:   1,
    message: 'Generating global intelligence report...',
    lastRun: new Date().toISOString(),
  };

  res.json({ success: true, data: { message: 'Global analysis started', status: analysisStatus } });

  try {
    logger.log('analysis', 'info', 'Global analysis generation started');
    const result = await generator.generateGlobalAnalysis();
    logger.log('analysis', result.success ? 'info' : 'error', 'Global analysis complete', {
      success: result.success, error: result.error || null,
    });
    analysisStatus = {
      running:    false,
      phase:      'complete',
      current:    1,
      total:      1,
      message:    result.success ? 'Global report generated successfully' : `Error: ${result.error}`,
      lastRun:    new Date().toISOString(),
      lastResult: result,
    };
  } catch (err) {
    logger.log('analysis', 'error', `Global analysis failed: ${err.message}`, { stack: err.stack });
    analysisStatus = {
      running:  false,
      phase:    'error',
      current:  0,
      total:    1,
      message:  `Generation failed: ${err.message}`,
      lastRun:  new Date().toISOString(),
    };
  }
}));

/**
 * POST /api/analysis/country/:slug
 * Generate a country intelligence report.
 */
app.post('/api/analysis/country/:slug', asyncRoute(async (req, res) => {
  const { slug } = req.params;

  if (analysisStatus.running) {
    return res.json({
      success: true,
      data: { message: 'Analysis already in progress', status: analysisStatus },
    });
  }

  analysisStatus = {
    running: true,
    phase:   'country',
    current: 0,
    total:   1,
    message: `Generating report for ${slug}...`,
    lastRun: new Date().toISOString(),
  };

  res.json({ success: true, data: { message: `Country analysis started for ${slug}`, status: analysisStatus } });

  try {
    logger.log('analysis', 'info', `Country analysis started: ${slug}`);
    const result = await generator.generateCountryAnalysis(slug);
    analysisStatus = {
      running:    false,
      phase:      'complete',
      current:    1,
      total:      1,
      message:    result.success ? `${slug} report generated` : `Error: ${result.error}`,
      lastRun:    new Date().toISOString(),
      lastResult: result,
    };
  } catch (err) {
    analysisStatus = {
      running:  false,
      phase:    'error',
      current:  0,
      total:    1,
      message:  `Generation failed: ${err.message}`,
      lastRun:  new Date().toISOString(),
    };
  }
}));

/**
 * POST /api/analysis/all-countries
 * Generate intelligence reports for all configured countries.
 */
app.post('/api/analysis/all-countries', asyncRoute(async (req, res) => {
  if (analysisStatus.running) {
    return res.json({
      success: true,
      data: { message: 'Analysis already in progress', status: analysisStatus },
    });
  }

  analysisStatus = {
    running: true,
    phase:   'countries',
    current: 0,
    total:   generator.COUNTRY_SLUGS.length,
    message: `Generating all ${generator.COUNTRY_SLUGS.length} country reports...`,
    lastRun: new Date().toISOString(),
  };

  res.json({ success: true, data: { message: 'All-country analysis started', status: analysisStatus } });

  try {
    const result = await generator.generateAllCountries({}, (progress) => {
      analysisStatus.current = progress.current;
      analysisStatus.message = `Generating ${progress.slug} (${progress.current}/${progress.total})...`;
    });

    analysisStatus = {
      running:    false,
      phase:      'complete',
      current:    result.completed + result.failed,
      total:      generator.COUNTRY_SLUGS.length,
      message:    `All country reports done. ${result.completed} succeeded, ${result.failed} failed.`,
      lastRun:    new Date().toISOString(),
      lastResult: result,
    };
  } catch (err) {
    analysisStatus = {
      running:  false,
      phase:    'error',
      current:  0,
      total:    generator.COUNTRY_SLUGS.length,
      message:  `Generation failed: ${err.message}`,
      lastRun:  new Date().toISOString(),
    };
  }
}));

/**
 * POST /api/analysis/all
 * Generate global report + all country reports.
 */
app.post('/api/analysis/all', asyncRoute(async (req, res) => {
  if (analysisStatus.running) {
    return res.json({
      success: true,
      data: { message: 'Analysis already in progress', status: analysisStatus },
    });
  }

  const totalReports = generator.COUNTRY_SLUGS.length + 1; // +1 for global

  analysisStatus = {
    running: true,
    phase:   'global',
    current: 0,
    total:   totalReports,
    message: 'Starting full analysis suite...',
    lastRun: new Date().toISOString(),
  };

  res.json({ success: true, data: { message: 'Full analysis suite started', status: analysisStatus } });

  try {
    const result = await generator.generateAll({}, (progress) => {
      analysisStatus.phase   = progress.phase;
      analysisStatus.current = progress.current;
      analysisStatus.message = progress.message;
    });

    analysisStatus = {
      running:    false,
      phase:      'complete',
      current:    totalReports,
      total:      totalReports,
      message:    'Full analysis suite complete.',
      lastRun:    new Date().toISOString(),
      lastResult: result,
    };
  } catch (err) {
    analysisStatus = {
      running:  false,
      phase:    'error',
      current:  0,
      total:    totalReports,
      message:  `Generation failed: ${err.message}`,
      lastRun:  new Date().toISOString(),
    };
  }
}));

/**
 * GET /api/analysis/status
 * Check the current analysis generation progress.
 */
app.get('/api/analysis/status', (req, res) => {
  res.json({ success: true, data: analysisStatus });
});

/**
 * GET /api/analysis/history/global
 * List historical global reports.
 */
app.get('/api/analysis/history/global', asyncRoute(async (req, res) => {
  const reports = generator.listHistoricalReports('global', null);
  res.json({ success: true, data: { reports, type: 'global', slug: null } });
}));

/**
 * GET /api/analysis/history/country/:slug
 * List historical reports for a specific country.
 */
app.get('/api/analysis/history/country/:slug', asyncRoute(async (req, res) => {
  const { slug } = req.params;
  if (!slug) {
    return res.status(400).json({ success: false, error: 'slug is required for country history' });
  }
  const reports = generator.listHistoricalReports('country', slug);
  res.json({ success: true, data: { reports, type: 'country', slug } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// === SETTINGS ===
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/settings
 * Get all application settings.
 */
app.get('/api/settings', (req, res) => {
  const settings = feedStore.getSettings();
  res.json({ success: true, data: { settings } });
});

/**
 * POST /api/settings
 * Save application settings (merges with existing).
 */
app.post('/api/settings', asyncRoute(async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ success: false, error: 'Request body must be an object' });
  }

  feedStore.saveSettings(req.body);
  logger.log('system', 'info', 'Settings updated', req.body);
  const settings = feedStore.getSettings();
  res.json({ success: true, data: { settings } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// === COUNTRIES / TOPICS CONFIG ===
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRIES_CONFIG_PATH = path.join(__dirname, 'data', 'countries-config.json');

function readCountriesConfig() {
  try {
    return JSON.parse(require('fs').readFileSync(COUNTRIES_CONFIG_PATH, 'utf8'));
  } catch (e) {
    return { countries: [], topics: [] };
  }
}

function writeCountriesConfig(cfg) {
  require('fs').writeFileSync(COUNTRIES_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

/**
 * GET /api/countries
 * Returns countries and topics config.
 */
app.get('/api/countries', (req, res) => {
  const cfg = readCountriesConfig();
  res.json({ success: true, data: cfg });
});

/**
 * POST /api/countries
 * Add a new country.
 */
app.post('/api/countries', asyncRoute(async (req, res) => {
  const { name, slug, flag, accent, topics } = req.body || {};
  if (!name || !slug) {
    return res.status(400).json({ success: false, error: 'name and slug are required' });
  }
  const cfg = readCountriesConfig();
  if (cfg.countries.find(c => c.slug === slug)) {
    return res.status(409).json({ success: false, error: `Country with slug "${slug}" already exists` });
  }
  cfg.countries.push({ name, slug, flag: flag || '', accent: accent || '#c41e3a', topics: topics || [] });
  writeCountriesConfig(cfg);
  logger.log('system', 'info', `Country added: ${name} (${slug})`);
  res.json({ success: true, data: cfg });
}));

/**
 * PUT /api/countries/:slug
 * Update a country.
 */
app.put('/api/countries/:slug', asyncRoute(async (req, res) => {
  const { slug } = req.params;
  const cfg = readCountriesConfig();
  const idx = cfg.countries.findIndex(c => c.slug === slug);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: `Country "${slug}" not found` });
  }
  cfg.countries[idx] = { ...cfg.countries[idx], ...req.body, slug };
  writeCountriesConfig(cfg);
  logger.log('system', 'info', `Country updated: ${slug}`);
  res.json({ success: true, data: cfg.countries[idx] });
}));

/**
 * DELETE /api/countries/:slug
 * Remove a country.
 */
app.delete('/api/countries/:slug', asyncRoute(async (req, res) => {
  const { slug } = req.params;
  const cfg = readCountriesConfig();
  const idx = cfg.countries.findIndex(c => c.slug === slug);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: `Country "${slug}" not found` });
  }
  const removed = cfg.countries.splice(idx, 1)[0];
  writeCountriesConfig(cfg);
  logger.log('system', 'info', `Country removed: ${slug}`);
  res.json({ success: true, data: { removed } });
}));

/**
 * POST /api/topics
 * Add a new topic.
 */
app.post('/api/topics', asyncRoute(async (req, res) => {
  const { id, name } = req.body || {};
  if (!id || !name) {
    return res.status(400).json({ success: false, error: 'id and name are required' });
  }
  const cfg = readCountriesConfig();
  if (cfg.topics.find(t => t.id === id)) {
    return res.status(409).json({ success: false, error: `Topic "${id}" already exists` });
  }
  cfg.topics.push({ id, name });
  writeCountriesConfig(cfg);
  res.json({ success: true, data: cfg.topics });
}));

/**
 * DELETE /api/topics/:id
 * Remove a topic.
 */
app.delete('/api/topics/:id', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const cfg = readCountriesConfig();
  const idx = cfg.topics.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: `Topic "${id}" not found` });
  }
  cfg.topics.splice(idx, 1);
  writeCountriesConfig(cfg);
  res.json({ success: true, data: cfg.topics });
}));

// ─────────────────────────────────────────────────────────────────────────────
// === REPORT UPLOAD ===
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/upload/report
 * Upload an HTML report file.
 * Body: { type: 'global'|'country'|'dossier'|'taiwan', slug?: string, content: string }
 */
app.post('/api/upload/report', asyncRoute(async (req, res) => {
  const { type, slug, content } = req.body || {};
  if (!type || !content) {
    return res.status(400).json({ success: false, error: 'type and content are required' });
  }

  const fs = require('fs');
  let targetPath;

  switch (type) {
    case 'global':
      targetPath = path.join(__dirname, 'reports', 'global', 'current', 'report.html');
      break;
    case 'country':
      if (!slug) return res.status(400).json({ success: false, error: 'slug required for country report' });
      targetPath = path.join(__dirname, 'reports', 'countries', slug, 'current', 'report.html');
      break;
    case 'dossier':
      if (!slug) return res.status(400).json({ success: false, error: 'slug required for dossier' });
      targetPath = path.join(__dirname, 'pages', `${slug}-dossier.html`);
      break;
    case 'taiwan':
      targetPath = path.join(__dirname, 'pages', 'taiwan-strait.html');
      break;
    default:
      return res.status(400).json({ success: false, error: `Unknown report type: ${type}` });
  }

  // Ensure directory exists
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');
  logger.log('system', 'info', `Report uploaded: ${type}${slug ? ` (${slug})` : ''} -> ${targetPath}`);
  res.json({ success: true, data: { path: targetPath } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// === STATUS / HEALTH ===
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/status
 * Server health check and summary stats.
 */
app.get('/api/status', asyncRoute(async (req, res) => {
  const config    = feedStore.getFeeds();
  const articles  = feedStore.getArticles({});
  const flagged   = feedStore.getFlaggedArticles();
  const aiConfig  = feedStore.getAIConfig(true);
  const settings  = feedStore.getSettings();
  const lastFetch = feedStore.getLastFetchTime();

  res.json({
    success: true,
    data: {
      server:   'Conflict Mapper Backend',
      version:  '2.0.0',
      uptime:   process.uptime(),
      stats: {
        feeds:     { total: (config.feeds || []).length, enabled: (config.feeds || []).filter(f => f.enabled).length },
        articles:  { total: articles.length, lastFetch },
        flagged:   flagged.length,
        aiProvider: aiConfig.provider,
      },
      fetchStatus,
      analysisStatus,
    },
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// === LOGS ===
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/logs
 * Retrieve recent server logs with optional filters.
 * Query params: category, level, limit, since, search
 */
app.get('/api/logs', (req, res) => {
  const filters = {
    category: req.query.category || null,
    level:    req.query.level    || null,
    limit:    req.query.limit    ? parseInt(req.query.limit) : 200,
    since:    req.query.since    || null,
    search:   req.query.search   || null,
  };

  // Remove null keys so getLogs sees clean filters
  Object.keys(filters).forEach(k => filters[k] === null && delete filters[k]);

  const logs  = logger.getLogs(filters);
  const stats = logger.getStats();
  res.json({
    success: true,
    data: {
      logs,
      total:   logs.length,
      stats,
      filters,
    },
  });
});

/**
 * DELETE /api/logs
 * Clear the in-memory log buffer.
 */
app.delete('/api/logs', (req, res) => {
  const result = logger.clearLogs();
  res.json({ success: true, data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

// Handle 404 for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error:   `API endpoint not found: ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (req.path.startsWith('/api/')) {
    logger.log('api', 'error', `API error on ${req.path}: ${err.message}`, { stack: err.stack });
    return res.status(500).json({
      success: false,
      error:   `Server error: ${err.message}`,
    });
  }
  next(err);
});

// Catch-all: serve index.html for any non-API, non-static route
// Express 5 requires named wildcards: {*name}
app.get('/{*catchAll}', (req, res, next) => {
  // Skip if this looks like a file request with an extension
  if (path.extname(req.path)) {
    return next();
  }
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  logger.log('system', 'info', `Conflict Mapper API server started on port ${PORT}`);
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║         CONFLICT MAPPER — API SERVER v2.0          ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║  HTTP:   http://0.0.0.0:${PORT}                      ║`);
  console.log('║  API:    http://localhost:5000/api/status          ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Routes registered:');
  console.log('  GET  /api/feeds                 — List all feeds');
  console.log('  POST /api/feeds/fetch           — Trigger fetch');
  console.log('  GET  /api/articles              — Get cached articles');
  console.log('  GET  /api/articles/geo          — Geotagged articles');
  console.log('  POST /api/ai/config             — Save AI config');
  console.log('  POST /api/ai/test               — Test AI connection');
  console.log('  POST /api/analysis/global       — Generate global report');
  console.log('  POST /api/analysis/country/:slug — Generate country report');
  console.log('  GET  /api/analysis/status       — Check generation progress');
  console.log('  GET  /api/status                — Server health check');
  console.log('  GET  /api/logs                  — View server logs');
  console.log('  DELETE /api/logs                — Clear log buffer');
  console.log('');
});

module.exports = app;
