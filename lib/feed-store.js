/**
 * feed-store.js — JSON file-based persistent storage for Conflict Mapper
 *
 * Manages three data files:
 *   data/articles.json        - All fetched/cached articles
 *   data/flagged-articles.json - User-flagged articles for AI analysis
 *   data/feeds-config.json    - RSS feed configuration
 *
 * All operations are synchronous reads + atomic-ish writes (write to temp, rename).
 * For the scale of this application (hundreds of articles), JSON files are sufficient.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// COUNTRY SLUG → SEARCH TERMS MAP
// Maps URL slugs (e.g. "usa") to arrays of terms that appear in article
// titles, descriptions, and geo fields for that country.
// Used by getArticles() to fix country filtering.
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_SLUG_MAP = {
  'usa':         ['united states', 'america', 'american', 'washington', 'pentagon', 'u.s.', 'cia', 'nsa', 'fbi', 'white house', 'congress', 'senate', 'democrat', 'republican', 'biden', 'trump'],
  'china':       ['china', 'chinese', 'beijing', 'prc', 'xi jinping', "people's liberation army", 'pla ', "people's republic", 'ccp', 'shanghai', 'hong kong', 'guangdong'],
  'russia':      ['russia', 'russian', 'moscow', 'kremlin', 'putin', 'fsb', 'svr', 'wagner', 'siberia', 'st. petersburg'],
  'ukraine':     ['ukraine', 'ukrainian', 'kyiv', 'kiev', 'zelensky', 'donbas', 'donbass', 'zaporizhzhia', 'kharkiv', 'odessa', 'kherson', 'mariupol'],
  'taiwan':      ['taiwan', 'taiwanese', 'taipei', 'roc', 'republic of china', 'tsai', 'taiwan strait', 'formosa'],
  'iran':        ['iran', 'iranian', 'tehran', 'persian', 'irgc', 'khamenei', 'rouhani', 'raisi', 'nuclear deal', 'jcpoa'],
  'israel':      ['israel', 'israeli', 'jerusalem', 'tel aviv', 'idf', 'hamas', 'netanyahu', 'mossad', 'gaza', 'west bank', 'hezbollah'],
  'india':       ['india', 'indian', 'delhi', 'new delhi', 'mumbai', 'modi', 'bjp', 'kashmir', 'hindutva', 'chennai'],
  'pakistan':    ['pakistan', 'pakistani', 'islamabad', 'lahore', 'karachi', 'isi', 'imf pakistan'],
  'north-korea': ['north korea', 'dprk', 'pyongyang', 'kim jong', 'kim jong-un', 'korean peninsula', 'icbm korea'],
  'nato':        ['nato', 'north atlantic treaty', 'article 5', 'collective defense'],
};

// ─────────────────────────────────────────────────────────────────────────────
// WORD-BOUNDARY MATCHING HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a search term appears as a whole word in text.
 * Uses word boundary matching to prevent 'pla' matching inside 'explain'.
 * For short terms (<=3 chars), requires word boundaries.
 * For longer terms, simple case-insensitive includes is sufficient.
 *
 * @param {string} text - The text to search within
 * @param {string} term - The term to search for
 * @returns {boolean}
 */
function matchesWholeWord(text, term) {
  if (!text || !term) return false;
  if (term.length <= 3) {
    // Escape any regex special chars in the term, then require word boundaries
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    return regex.test(text);
  }
  return text.toLowerCase().includes(term.toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// PATH CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const DATA_DIR           = path.join(__dirname, '..', 'data');
const ARTICLES_FILE      = path.join(DATA_DIR, 'articles.json');
const FLAGGED_FILE       = path.join(DATA_DIR, 'flagged-articles.json');
const FEEDS_CONFIG_FILE  = path.join(DATA_DIR, 'feeds-config.json');
const AI_CONFIG_FILE     = path.join(DATA_DIR, 'ai-config.json');
const SETTINGS_FILE      = path.join(DATA_DIR, 'settings.json');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely read a JSON file. Returns defaultValue if file is missing or corrupt.
 */
function readJson(filePath, defaultValue = {}) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[feed-store] Failed to read ${filePath}:`, err.message);
    return defaultValue;
  }
}

/**
 * Write data to a JSON file. Uses a temp-file + rename pattern for safety.
 */
function writeJson(filePath, data) {
  const tempPath = filePath + '.tmp';
  try {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`[feed-store] Failed to write ${filePath}:`, err.message);
    // Attempt cleanup of temp file
    try { fs.unlinkSync(tempPath); } catch (_) {}
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE STORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getArticles(filters)
 * Read all articles from articles.json, apply optional filters.
 *
 * @param {object} filters - Optional: { country, category, timeRange, search }
 *   country   - Filter by article.country (case-insensitive)
 *   category  - Filter by article.category
 *   timeRange - Filter by age in hours (e.g., 24 = last 24 hours)
 *   search    - Text search across title + description
 *   limit     - Max number of results (default: all)
 * @returns {Array} Filtered articles, newest first
 */
function getArticles(filters = {}) {
  const data = readJson(ARTICLES_FILE, { articles: [] });
  let articles = Array.isArray(data.articles) ? data.articles : [];

  // Apply country filter
  // Uses COUNTRY_SLUG_MAP to translate URL slugs (e.g. "usa") into
  // lists of search terms matched against the article's country field, geo.country,
  // and title ONLY. Source names and descriptions are intentionally excluded to
  // prevent false matches (e.g. "South China Morning Post" is not evidence of China).
  if (filters.country && filters.country !== 'global') {
    const slug  = filters.country.toLowerCase();
    const terms = COUNTRY_SLUG_MAP[slug];

    if (terms) {
      articles = articles.filter(a => {
        // Priority 1: article.country field matches slug directly (most reliable)
        if ((a.country || '').toLowerCase() === slug) return true;

        // Priority 2: geo.country matches any term (word-boundary safe)
        const geoCountry = (a.geo?.country || '').toLowerCase();
        if (geoCountry && terms.some(t => matchesWholeWord(geoCountry, t))) return true;

        // Priority 3: title contains country-relevant terms (word-boundary safe)
        // Deliberately excludes description and source to avoid false positives.
        const title = (a.title || '').toLowerCase();
        if (terms.some(t => matchesWholeWord(title, t))) return true;

        return false;
      });
    } else {
      // Fallback: direct match on country field only
      articles = articles.filter(a =>
        (a.country || '').toLowerCase() === slug ||
        (a.geo?.country || '').toLowerCase() === slug
      );
    }
  }

  // Apply category filter
  if (filters.category) {
    articles = articles.filter(a =>
      (a.category || '').toLowerCase() === filters.category.toLowerCase()
    );
  }

  // Apply time range filter (hours)
  if (filters.timeRange) {
    const cutoff = Date.now() - (filters.timeRange * 60 * 60 * 1000);
    articles = articles.filter(a => {
      const ts = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      return ts >= cutoff;
    });
  }

  // Apply text search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    articles = articles.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    );
  }

  // Apply language filter
  // Default: only return articles detected as English (language === 'en' OR no language field).
  // Pass languageFilter: 'all' to return every language.
  if (!filters.languageFilter || filters.languageFilter !== 'all') {
    articles = articles.filter(a =>
      !a.language || a.language === 'en'
    );
  }

  // Sort newest first
  articles.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });

  // Apply limit
  if (filters.limit && filters.limit > 0) {
    articles = articles.slice(0, filters.limit);
  }

  return articles;
}

/**
 * saveArticles(newArticles)
 * Merge new articles with existing ones (by ID), dedupe, and save.
 * Keeps max 5000 most recent articles to prevent unbounded growth.
 *
 * @param {Array} newArticles - Array of article objects to merge
 * @returns {{ added: number, total: number }}
 */
function saveArticles(newArticles) {
  const data = readJson(ARTICLES_FILE, { articles: [], lastFetch: null });
  const existing = Array.isArray(data.articles) ? data.articles : [];

  // Build ID lookup map for efficient deduplication
  const idMap = new Map(existing.map(a => [a.id, a]));

  // Also build a normalized-title lookup for title-based dedup
  // Key: lowercased title with punctuation stripped
  function normTitle(t) {
    return (t || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  }
  const titleMap = new Map(existing.map(a => [normTitle(a.title), a]));

  let added = 0;

  for (const article of newArticles) {
    // Skip if exact ID already exists
    if (idMap.has(article.id)) continue;

    // Skip if normalized title already exists (title dedup)
    const nt = normTitle(article.title);
    if (nt && titleMap.has(nt)) {
      // Keep the newer article
      const existing_match = titleMap.get(nt);
      const newDate  = article.pubDate ? new Date(article.pubDate).getTime() : 0;
      const existDate = existing_match.pubDate ? new Date(existing_match.pubDate).getTime() : 0;
      if (newDate > existDate) {
        // Replace the existing entry with the newer one
        idMap.delete(existing_match.id);
        idMap.set(article.id, article);
        titleMap.set(nt, article);
        // Don't increment added (net count stays the same)
      }
      continue;
    }

    idMap.set(article.id, article);
    if (nt) titleMap.set(nt, article);
    added++;
  }

  // Convert back to array, sort by date, cap at 5000
  let merged = Array.from(idMap.values());
  merged.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });
  if (merged.length > 5000) {
    merged = merged.slice(0, 5000);
  }

  writeJson(ARTICLES_FILE, {
    articles: merged,
    lastFetch: new Date().toISOString(),
    total: merged.length,
  });

  return { added, total: merged.length };
}

/**
 * getArticleById(id)
 * Fetch a single article by ID.
 */
function getArticleById(id) {
  const articles = getArticles();
  return articles.find(a => a.id === id) || null;
}

/**
 * clearArticles()
 * Delete all cached articles (useful for full refresh).
 */
function clearArticles() {
  return writeJson(ARTICLES_FILE, { articles: [], lastFetch: null, total: 0 });
}

/**
 * getLastFetchTime()
 * Returns ISO timestamp of last successful fetch, or null.
 */
function getLastFetchTime() {
  const data = readJson(ARTICLES_FILE, {});
  return data.lastFetch || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLAGGED ARTICLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * flagArticle(articleId, country, notes)
 * Flag an article for inclusion in AI analysis.
 * If the article is already flagged, updates its notes.
 *
 * @param {string} articleId
 * @param {string} country - Country context for this flag
 * @param {string} notes   - Analyst notes
 * @returns {object} The flag entry created/updated
 */
function flagArticle(articleId, country = 'global', notes = '') {
  const data = readJson(FLAGGED_FILE, { flagged: [] });
  const flagged = Array.isArray(data.flagged) ? data.flagged : [];

  // Check if already flagged
  const existing = flagged.find(f => f.articleId === articleId && f.country === country);
  if (existing) {
    existing.notes = notes;
    existing.updatedAt = new Date().toISOString();
    writeJson(FLAGGED_FILE, { flagged });
    return existing;
  }

  // Fetch article details to store inline (so reports work even if articles.json is cleared)
  const article = getArticleById(articleId);
  const flagEntry = {
    id: `flag_${Date.now()}_${articleId.slice(0, 8)}`,
    articleId,
    country,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Inline article snapshot
    article: article ? {
      id: article.id,
      title: article.title,
      description: article.description,
      link: article.link,
      pubDate: article.pubDate,
      source: article.source,
      category: article.category,
    } : null,
  };

  flagged.push(flagEntry);
  writeJson(FLAGGED_FILE, { flagged });
  return flagEntry;
}

/**
 * unflagArticle(flagId)
 * Remove a flag by its flag ID (not the article ID).
 *
 * @param {string} flagId
 * @returns {boolean} True if removed, false if not found
 */
function unflagArticle(flagId) {
  const data = readJson(FLAGGED_FILE, { flagged: [] });
  const flagged = Array.isArray(data.flagged) ? data.flagged : [];
  const before = flagged.length;
  const updated = flagged.filter(f => f.id !== flagId);

  if (updated.length === before) return false;
  writeJson(FLAGGED_FILE, { flagged: updated });
  return true;
}

/**
 * getFlaggedArticles(country)
 * Get all flagged articles, optionally filtered by country.
 *
 * @param {string|null} country - Optional country filter
 * @returns {Array}
 */
function getFlaggedArticles(country = null) {
  const data = readJson(FLAGGED_FILE, { flagged: [] });
  let flagged = Array.isArray(data.flagged) ? data.flagged : [];

  if (country && country !== 'global') {
    flagged = flagged.filter(f =>
      f.country === country || f.country === 'global'
    );
  }

  // Sort newest first
  return flagged.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getFeeds()
 * Get the full feeds configuration.
 */
function getFeeds() {
  return readJson(FEEDS_CONFIG_FILE, { feeds: [], categories: [] });
}

/**
 * saveFeeds(config)
 * Overwrite the feeds configuration.
 */
function saveFeeds(config) {
  return writeJson(FEEDS_CONFIG_FILE, config);
}

/**
 * addFeed(feed)
 * Add a single feed to the configuration.
 *
 * @param {{ url, name, category, country, enabled }} feed
 * @returns {object} The added feed with generated ID
 */
function addFeed(feed) {
  const config = getFeeds();
  if (!Array.isArray(config.feeds)) config.feeds = [];

  // Check for duplicate URL
  if (config.feeds.some(f => f.url === feed.url)) {
    throw new Error(`Feed already exists: ${feed.url}`);
  }

  const newFeed = {
    id: `feed_${Date.now()}`,
    url: feed.url,
    name: feed.name || feed.url,
    category: feed.category || 'breaking',
    country: feed.country || 'global',
    enabled: feed.enabled !== false,
    addedAt: new Date().toISOString(),
  };

  config.feeds.push(newFeed);
  saveFeeds(config);
  return newFeed;
}

/**
 * removeFeed(id)
 * Remove a feed by ID.
 */
function removeFeed(id) {
  const config = getFeeds();
  const before = config.feeds.length;
  config.feeds = config.feeds.filter(f => f.id !== id);
  if (config.feeds.length === before) return false;
  saveFeeds(config);
  return true;
}

/**
 * importFeeds(feeds)
 * Bulk import feeds, skipping duplicates.
 *
 * @param {Array} feeds
 * @returns {{ imported: number, skipped: number }}
 */
function importFeeds(feeds) {
  const config = getFeeds();
  if (!Array.isArray(config.feeds)) config.feeds = [];

  const existingUrls = new Set(config.feeds.map(f => f.url));
  let imported = 0, skipped = 0;

  for (const feed of feeds) {
    if (existingUrls.has(feed.url)) {
      skipped++;
      continue;
    }
    config.feeds.push({
      id: feed.id || `feed_${Date.now()}_${imported}`,
      url: feed.url,
      name: feed.name || feed.url,
      category: feed.category || 'breaking',
      country: feed.country || 'global',
      enabled: feed.enabled !== false,
      addedAt: new Date().toISOString(),
    });
    existingUrls.add(feed.url);
    imported++;
  }

  saveFeeds(config);
  return { imported, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getAIConfig()
 * Returns the current AI configuration with keys partially masked for API responses.
 *
 * @param {boolean} mask - If true, mask API keys (for client responses)
 */
function getAIConfig(mask = false) {
  const config = readJson(AI_CONFIG_FILE, {
    provider: 'perplexity',
    providers: {},
  });

  if (mask) {
    // Return a copy with masked keys
    const masked = JSON.parse(JSON.stringify(config));
    for (const provider of Object.values(masked.providers || {})) {
      if (provider.apiKey && provider.apiKey.length > 8) {
        provider.apiKey = provider.apiKey.slice(0, 4) + '****' + provider.apiKey.slice(-4);
      } else if (provider.apiKey) {
        provider.apiKey = '****';
      }
    }
    return masked;
  }

  return config;
}

/**
 * saveAIConfig(config)
 * Save AI configuration. Merges with existing (won't clear keys you don't resend).
 */
function saveAIConfig(config) {
  const existing = getAIConfig(false);

  // Deep merge providers so we don't accidentally clear API keys
  if (config.providers) {
    for (const [name, providerConfig] of Object.entries(config.providers)) {
      if (!existing.providers[name]) {
        existing.providers[name] = {};
      }
      Object.assign(existing.providers[name], providerConfig);
    }
  }

  if (config.provider) {
    existing.provider = config.provider;
  }

  return writeJson(AI_CONFIG_FILE, existing);
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  fetchIntervalHours: 4,
  maxArticlesPerFeed: 50,
  autoFetch: false,
  deduplicationThreshold: 0.8,
  reportRetentionDays: 30,
  defaultCountries: ['usa', 'russia', 'china', 'ukraine', 'taiwan', 'iran', 'israel', 'india', 'pakistan', 'north-korea', 'nato'],
};

function getSettings() {
  const stored = readJson(SETTINGS_FILE, {});
  return Object.assign({}, DEFAULT_SETTINGS, stored);
}

function saveSettings(settings) {
  const current = getSettings();
  const merged = Object.assign({}, current, settings);
  return writeJson(SETTINGS_FILE, merged);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  // Articles
  getArticles,
  saveArticles,
  getArticleById,
  clearArticles,
  getLastFetchTime,
  // Flagged articles
  flagArticle,
  unflagArticle,
  getFlaggedArticles,
  // Feeds
  getFeeds,
  saveFeeds,
  addFeed,
  removeFeed,
  importFeeds,
  // AI Config
  getAIConfig,
  saveAIConfig,
  // Settings
  getSettings,
  saveSettings,
};
