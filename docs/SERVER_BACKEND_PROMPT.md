# Server Backend — System Prompt
## Conflict Mapper — `server.js`

You are an expert Node.js developer rebuilding the Express.js backend server for Conflict Mapper. This document is the complete specification for `server.js` (~1099 lines, ~42KB). The server provides a REST API over JSON file storage, coordinates all lib/ modules, and serves static files.

---

## Architecture

```
server.js
├── Dependencies: express, cors, body-parser
├── Internal modules:
│   ├── lib/feed-store.js    — JSON file R/W for all data
│   ├── lib/rss-engine.js    — RSS/Atom feed fetching
│   ├── lib/ai-providers.js  — Multi-provider AI abstraction
│   ├── lib/analysis-generator.js — Report generation
│   └── lib/logger.js        — Centralized logging
├── Middleware stack
│   ├── CORS (all origins)
│   ├── body-parser JSON (10MB limit)
│   ├── body-parser urlencoded
│   ├── API request logger
│   └── static file serving (project root)
├── Global state
│   ├── fetchStatus     — RSS fetch progress
│   └── analysisStatus  — Analysis generation progress
├── API routes (27 routes)
└── Error handling middleware
```

---

## Setup & Dependencies

```js
'use strict';

const express    = require('express');      // npm install express
const path       = require('path');         // built-in
const cors       = require('cors');         // npm install cors
const bodyParser = require('body-parser'); // npm install body-parser

const feedStore   = require('./lib/feed-store');
const rssEngine   = require('./lib/rss-engine');
const aiProviders = require('./lib/ai-providers');
const generator   = require('./lib/analysis-generator');
const logger      = require('./lib/logger');

const app  = express();
const PORT = process.env.PORT || 5000;
```

**package.json dependencies:**
```json
{
  "dependencies": {
    "express":     "^5.0.0",
    "cors":        "^2.8.5",
    "body-parser": "^1.20.0",
    "xml2js":      "^0.6.2",
    "uuid":        "^9.0.0"
  }
}
```

---

## Middleware Stack

```js
// 1. CORS — all origins allowed (dev mode)
app.use(cors({
  origin: true,
  credentials: true,
}));

// 2. JSON body parsing (up to 10MB for large feed imports)
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 3. API request logger middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    let bodySummary = null;
    if (req.body && Object.keys(req.body).length > 0) {
      const raw = JSON.stringify(req.body);
      bodySummary = raw.length > 200 ? raw.slice(0, 200) + '...' : raw;
    }
    logger.log('api', 'info', `${req.method} ${req.path}`,
      bodySummary ? { body: bodySummary } : undefined);
  }
  next();
});

// 4. Static file serving from project root
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    res.removeHeader('X-Frame-Options');  // allow iframe embedding of reports
    if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    if (filePath.endsWith('.html')) res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));
```

Static serving makes the entire project directory available. The `/reports/` folder, `/pages/` folder, `/countries/` dossiers, and `/assets/` are all directly accessible.

---

## `asyncRoute()` Helper

Wraps async route handlers to catch unhandled promise rejections and forward to Express error handler:

```js
function asyncRoute(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

Usage on every async route:
```js
app.get('/api/articles', asyncRoute(async (req, res) => {
  // any throw here gets caught and forwarded to error handler
}));
```

---

## Global State

Progress tracking for long-running non-blocking operations:

```js
let fetchStatus = {
  running:   false,
  progress:  0,
  total:     0,
  current:   '',
  errors:    0,
  lastRun:   null,
  message:   'Idle',
};

let analysisStatus = {
  running:    false,
  phase:      'idle',    // 'idle' | 'global' | 'country' | 'countries' | 'complete' | 'error'
  current:    0,
  total:      0,
  message:    'Idle',
  lastRun:    null,
  lastResult: null,
};
```

Both objects are module-level and shared across all requests. Clients poll via `GET /api/feeds/fetch-status` and `GET /api/analysis/status`.

---

## Complete API Route Reference (33 routes)

### RSS Feed Management

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/feeds` | — | List all feeds with totals |
| POST | `/api/feeds` | `{ url, name, category, country, enabled }` | Add a new feed |
| DELETE | `/api/feeds/:id` | — | Remove a feed by ID |
| POST | `/api/feeds/import` | `{ feeds: [...] }` | Bulk import feeds |
| POST | `/api/feeds/fetch` | — | Trigger async fetch of all enabled feeds |
| GET | `/api/feeds/fetch-status` | — | Poll current fetch progress |

### Articles

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/articles` | — | Get articles (supports ?country, ?category, ?timeRange, ?search, ?limit, ?language, ?page, ?pageSize) |
| GET | `/api/articles/geo` | — | Get geotagged articles only (supports ?timeRange, ?country) |
| POST | `/api/articles/flag` | `{ articleId, country, notes }` | Flag article for analysis |
| GET | `/api/articles/flagged` | — | Get flagged articles (supports ?country) |
| DELETE | `/api/articles/flag/:id` | — | Remove a flag by flag ID |

### AI Configuration

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/ai/config` | — | Get AI config (keys masked) |
| POST | `/api/ai/config` | `{ provider, apiKey, model, baseUrl }` or nested | Save AI config |
| POST | `/api/ai/test` | `{ provider, apiKey?, model?, baseUrl? }` | Test AI connection |

### Analysis Generation

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/analysis/global` | — | Generate global intelligence report (async) |
| POST | `/api/analysis/country/:slug` | — | Generate country report (async) |
| POST | `/api/analysis/all-countries` | — | Generate all country reports (async) |
| POST | `/api/analysis/all` | — | Generate global + all country reports (async) |
| GET | `/api/analysis/status` | — | Poll analysis generation progress |
| GET | `/api/analysis/history/global` | — | List historical global reports |
| GET | `/api/analysis/history/country/:slug` | — | List historical reports for a country |

### Settings

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/settings` | — | Get all app settings |
| POST | `/api/settings` | `{ fetchIntervalHours, maxArticlesPerFeed, ... }` | Update settings (merge) |

### Countries & Topics Configuration

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/countries` | — | Returns `{ countries, topics }` from `data/countries-config.json` |
| POST | `/api/countries` | `{ name, slug, flag, accent, topics }` | Add a new country |
| PUT | `/api/countries/:slug` | `{ name?, flag?, accent?, topics? }` | Update country fields (slug immutable) |
| DELETE | `/api/countries/:slug` | — | Remove a country |
| POST | `/api/topics` | `{ id, name }` | Add a new analysis topic |
| DELETE | `/api/topics/:id` | — | Remove a topic |

### Report Upload

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/upload/report` | `{ type, slug?, content }` | Upload an HTML report by type. `type`: `'global'\|'country'\|'dossier'\|'taiwan'` |

### Status & Logs

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/status` | — | Server health check + summary stats |
| GET | `/api/logs` | — | Get recent logs (?category, ?level, ?limit, ?since, ?search) |
| DELETE | `/api/logs` | — | Clear in-memory log buffer |

---

## Article Pagination

The `GET /api/articles` endpoint supports two modes:

**Legacy mode** (backward-compatible): pass `?limit=N` to get up to N articles.

**Pagination mode**: pass `?page=1&pageSize=50` to get paginated results.

Pagination response shape:
```json
{
  "success": true,
  "data": {
    "articles": [...],
    "page": 1,
    "pageSize": 50,
    "total": 1247,
    "totalPages": 25,
    "lastFetch": "2026-03-29T09:00:00.000Z",
    "filters": { "country": "china", "category": null, ... }
  }
}
```

- `page` — 1-based page number (default: 1)
- `pageSize` — articles per page (default: 50, max: 500)
- When `page` or `pageSize` is present, `limit` is ignored

## Countries Config (`data/countries-config.json`)

Stored at `data/countries-config.json` (auto-created if missing):
```json
{
  "countries": [
    {
      "name": "United States",
      "slug": "usa",
      "flag": "\ud83c\uddfa\ud83c\uddf8",
      "accent": "#002868",
      "topics": ["military", "geopolitical"]
    }
  ],
  "topics": [
    { "id": "military", "name": "Military" },
    { "id": "geopolitical", "name": "Geopolitical" }
  ]
}
```

The countries config is **separate from `COUNTRY_SLUGS`** in `lib/analysis-generator.js` — both must be kept in sync when adding a new monitored country.

## Report Upload (`POST /api/upload/report`)

Allows uploading a pre-rendered HTML file to the appropriate location:

| `type` | `slug` required? | Target path |
|--------|-----------------|-------------|
| `'global'` | No | `reports/global/current/report.html` |
| `'country'` | Yes | `reports/countries/{slug}/current/report.html` |
| `'dossier'` | Yes | `pages/{slug}-dossier.html` |
| `'taiwan'` | No | `pages/taiwan-strait.html` |

Directories are created if they don't exist.

---

## Detailed Route Implementations

### `GET /api/feeds`

```js
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
```

### `POST /api/feeds/fetch` — Non-blocking Feed Fetch

The response is sent immediately, then the actual fetch runs in background:

```js
app.post('/api/feeds/fetch', asyncRoute(async (req, res) => {
  if (fetchStatus.running) {
    return res.json({
      success: true,
      data: { message: 'Fetch already in progress', status: fetchStatus },
    });
  }

  const config       = feedStore.getFeeds();
  const enabledCount = (config.feeds || []).filter(f => f.enabled).length;

  if (enabledCount === 0) {
    return res.json({ success: false, error: 'No enabled feeds configured' });
  }

  // Update global state
  fetchStatus = {
    running: true, progress: 0, total: enabledCount,
    current: 'Starting...', errors: 0,
    lastRun: new Date().toISOString(),
    message: `Fetching ${enabledCount} feeds...`,
  };

  // Respond IMMEDIATELY (before fetch starts)
  res.json({ success: true, data: { message: `Feed fetch started`, status: fetchStatus } });

  // Run fetch asynchronously (fire and forget — no await)
  try {
    logger.log('rss', 'info', `RSS fetch started for ${enabledCount} feeds`);
    const result = await rssEngine.fetchAllFeeds(config, (progress) => {
      // Progress callback — updates global state
      fetchStatus.progress = progress.fetched;
      fetchStatus.current  = progress.current;
      fetchStatus.errors   = progress.errors;
      fetchStatus.message  = `Fetching: ${progress.current} (${progress.fetched}/${progress.total})`;
    });

    const saved = feedStore.saveArticles(result.articles);

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
  } catch (err) {
    fetchStatus = {
      running: false, progress: 0, total: 0, current: 'Error',
      errors: 1, lastRun: new Date().toISOString(),
      message: `Fetch failed: ${err.message}`,
    };
  }
}));
```

**Important pattern:** `res.json()` is called BEFORE the `await rssEngine.fetchAllFeeds()`. This is intentional — it allows the HTTP connection to close while the long operation runs. The client polls `/api/feeds/fetch-status` to track progress.

### `POST /api/ai/config` — Dual Body Shape Support

Accepts two different body formats:

```js
app.post('/api/ai/config', asyncRoute(async (req, res) => {
  const { provider, providers, apiKey, model, baseUrl } = req.body;

  // Shape A: flat { provider, apiKey, model, baseUrl }
  if (provider && (apiKey !== undefined || model !== undefined || baseUrl !== undefined)) {
    const providerUpdate = {};
    if (apiKey  !== undefined) providerUpdate.apiKey  = apiKey;
    if (model   !== undefined) providerUpdate.model   = model;
    if (baseUrl !== undefined) providerUpdate.baseUrl = baseUrl;
    feedStore.saveAIConfig({ provider, providers: { [provider]: providerUpdate } });
  } else {
    // Shape B: nested { provider, providers: { [name]: { apiKey, model, baseUrl } } }
    feedStore.saveAIConfig({ provider, providers });
  }

  const saved = feedStore.getAIConfig(true);  // masked
  res.json({ success: true, data: { config: saved } });
}));
```

### `POST /api/ai/test` — Test Without Saving

```js
app.post('/api/ai/test', asyncRoute(async (req, res) => {
  const { provider: bodyProvider, apiKey, model, baseUrl } = req.body || {};
  let testConfig;

  if (bodyProvider && apiKey) {
    // Temporary test — credentials NOT saved
    testConfig = {
      provider: bodyProvider,
      providers: {
        [bodyProvider]: { apiKey, model: model || undefined, baseUrl: baseUrl || undefined },
      },
    };
  } else {
    // Test saved config
    testConfig = feedStore.getAIConfig(false);
    if (bodyProvider) testConfig.provider = bodyProvider;
  }

  const startTime = Date.now();
  const provider  = aiProviders.getProvider(testConfig);
  const result    = await provider.testConnection();
  const elapsed   = Date.now() - startTime;

  res.json({
    success: result.success,
    data: { ...result, provider: testConfig.provider, providerName: provider.name, elapsed },
  });
}));
```

### Analysis Generation — Non-blocking Pattern

All analysis endpoints follow the same non-blocking pattern as feed fetch:

```js
app.post('/api/analysis/country/:slug', asyncRoute(async (req, res) => {
  const { slug } = req.params;

  if (analysisStatus.running) {
    return res.json({ success: true, data: { message: 'Already in progress', status: analysisStatus } });
  }

  analysisStatus = {
    running: true, phase: 'country', current: 0, total: 1,
    message: `Generating report for ${slug}...`,
    lastRun: new Date().toISOString(),
  };

  // Respond immediately
  res.json({ success: true, data: { message: `Country analysis started for ${slug}`, status: analysisStatus } });

  // Generate in background
  try {
    const result = await generator.generateCountryAnalysis(slug);
    analysisStatus = {
      running: false, phase: 'complete', current: 1, total: 1,
      message: result.success ? `${slug} report generated` : `Error: ${result.error}`,
      lastRun: new Date().toISOString(), lastResult: result,
    };
  } catch (err) {
    analysisStatus = {
      running: false, phase: 'error', current: 0, total: 1,
      message: `Generation failed: ${err.message}`,
      lastRun: new Date().toISOString(),
    };
  }
}));
```

### `GET /api/articles` — Query Parameter Reference

```js
app.get('/api/articles', asyncRoute(async (req, res) => {
  const filters = {
    country:        req.query.country        || null,
    category:       req.query.category       || null,
    timeRange:      req.query.timeRange ? parseInt(req.query.timeRange) : null,  // hours
    search:         req.query.search         || null,
    limit:          req.query.limit ? parseInt(req.query.limit) : 200,
    languageFilter: req.query.language === 'all' ? 'all' : null,  // 'all' = include non-English
  };

  const articles  = feedStore.getArticles(filters);
  const lastFetch = feedStore.getLastFetchTime();

  res.json({
    success: true,
    data: { articles, total: articles.length, lastFetch, filters },
  });
}));
```

### `GET /api/status` — Health Check

```js
app.get('/api/status', asyncRoute(async (req, res) => {
  const config    = feedStore.getFeeds();
  const articles  = feedStore.getArticles({});
  const flagged   = feedStore.getFlaggedArticles();
  const aiConfig  = feedStore.getAIConfig(true);  // masked
  const settings  = feedStore.getSettings();
  const lastFetch = feedStore.getLastFetchTime();

  res.json({
    success: true,
    data: {
      server:  'Conflict Mapper Backend',
      version: '2.0.0',
      uptime:  process.uptime(),
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
```

---

## Standard Response Format

All API endpoints return this shape:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## Error Handling

### 404 for Unknown API Routes

```js
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`,
  });
});
```

### Global Error Handler

```js
app.use((err, req, res, next) => {
  if (req.path.startsWith('/api/')) {
    logger.log('api', 'error', `API error on ${req.path}: ${err.message}`, { stack: err.stack });
    return res.status(500).json({
      success: false,
      error: `Server error: ${err.message}`,
    });
  }
  next(err);
});
```

### Catch-all SPA Route

Serves `index.html` for any non-API, non-file route:

```js
// Express 5 requires named wildcards: {*name}
app.get('/{*catchAll}', (req, res, next) => {
  if (path.extname(req.path)) return next();  // skip file requests
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});
```

---

## Server Startup

```js
app.listen(PORT, '0.0.0.0', () => {
  logger.log('system', 'info', `Conflict Mapper API server started on port ${PORT}`);
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     CONFLICT MAPPER — API SERVER v2.0      ║');
  console.log(`║  HTTP:  http://0.0.0.0:${PORT}              ║`);
  console.log('╚════════════════════════════════════════════╝');
});

module.exports = app;
```

- Binds to `0.0.0.0` (all interfaces, not just localhost)
- `PORT` from environment variable or defaults to 5000
- `module.exports = app` allows testing via `require('./server')`

---

## Environment / Runtime Requirements

| Requirement | Detail |
|------------|--------|
| Node.js    | 18+ required (native `fetch`, `AbortSignal.timeout`) |
| Port       | 5000 (default), override with `PORT` env var |
| Data dir   | `./data/` — created automatically on first run |
| No database | All data in JSON files under `./data/` |
| No auth    | No authentication on API (admin password is client-side only) |

---

## Data Files (Managed by Feed Store)

| File | Contents |
|------|---------|
| `data/articles.json` | All fetched articles (max 5000, newest first) |
| `data/flagged-articles.json` | User-flagged articles with inline snapshots |
| `data/feeds-config.json` | 153 RSS feed configurations |
| `data/ai-config.json` | AI provider credentials and settings |
| `data/settings.json` | App settings (fetch interval, retention, etc.) |
| `data/server.log` | Append-only server log file |

---

## Security Considerations

- **No authentication on API routes.** The "admin password" is checked client-side in `admin.html` — any API client can make any request without authentication.
- **CORS is wide open** (`origin: true`) — appropriate for local development.
- **API keys stored in plaintext** in `data/ai-config.json` — restrict file permissions in production.
- **No rate limiting** on any endpoint — no protection against request floods.
- **Static serving exposes entire project directory** — `data/*.json` files are publicly accessible.

For production deployment, add:
1. Express `helmet` middleware
2. `express-rate-limit` on `/api/feeds/fetch` and `/api/analysis/*`
3. Proper CORS origin whitelist
4. Restricted static serving (exclude `data/` from public access)
5. Proper server-side authentication

---

## How to Add a New API Endpoint

```js
/**
 * GET /api/my-feature
 * Description of what this does.
 * Query params: ?param1=value
 */
app.get('/api/my-feature', asyncRoute(async (req, res) => {
  const param1 = req.query.param1 || null;

  try {
    // Do work using feedStore / rssEngine / etc.
    const result = await someOperation(param1);

    logger.info('system', 'My feature called', { param1, resultCount: result.length });

    res.json({
      success: true,
      data: { result, total: result.length },
    });
  } catch (err) {
    // asyncRoute catches this and sends to error handler
    throw new Error(`My feature failed: ${err.message}`);
  }
}));
```

**Guidelines:**
- Always use `asyncRoute()` wrapper for async handlers
- Always return `{ success: true, data: {...} }` on success
- Use logger to instrument important operations
- For long-running operations: respond immediately, run in background, expose progress via status endpoint
- Place new routes in the appropriate section (before the 404 handler)
