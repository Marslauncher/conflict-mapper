# SITE ARCHITECTURE — Master System Prompt & Developer Guide
## Conflict Mapper Platform | Complete Platform Overview

> This is the master reference document for the Conflict Mapper geopolitical intelligence platform. Use it as the primary system prompt when working on the platform as a whole, when setting up the system fresh, or when making cross-cutting changes that span multiple components. Cross-reference the component-specific prompt files for deeper detail on each subsystem.

---

## 1. Platform Summary

Conflict Mapper is a **self-hostable, open-source geopolitical intelligence platform** that combines:

- **AI-generated intelligence reports** — country dossiers and global briefings produced by configurable LLM providers
- **Live RSS news aggregation** — multi-feed ingestion with keyword geocoding and deduplication
- **Interactive Leaflet maps** — geotagged news articles, military installations, and operational heatmaps
- **Theater and country deep-dives** — hand-crafted strategic analysis pages for major conflict zones
- **Taiwan Strait invasion window analysis** — dedicated deep-dive module with 4 time-window assessments

The platform runs as a **Node.js/Express backend** serving a **single-page application shell** (`index.html`) that loads all content pages in an iframe.

---

## 2. Full File/Folder Structure

```
conflict-mapper/
├── server.js                  ← Express backend API server
├── package.json               ← Node.js dependencies (express, cors, xml2js, uuid)
├── index.html                 ← Main SPA shell (nav, admin panel, iframe container)
│
├── assets/
│   ├── style.css              ← Shared design tokens and global CSS
│   └── nav-config.json        ← Navigation config, password, site name, theme
│
├── lib/
│   ├── analysis-generator.js  ← AI report pipeline: gather → prompt → AI → render → save
│   ├── ai-providers.js        ← Multi-provider AI abstraction (Perplexity/OpenAI/Anthropic/Google/Ollama)
│   ├── rss-engine.js          ← RSS/Atom fetcher, parser, deduplicator
│   ├── feed-store.js          ← JSON file storage for articles, feeds, AI config, settings
│   └── geocoder.js            ← Keyword-based geocoder (~400+ locations lookup table)
│
├── data/                      ← Runtime data (auto-created, gitignore recommended)
│   ├── articles.json          ← Cached RSS articles (up to 5,000 most recent)
│   ├── flagged-articles.json  ← Analyst-flagged articles for AI analysis inclusion
│   ├── feeds-config.json      ← RSS feed configuration (same as assets/ version but live-editable)
│   ├── ai-config.json         ← AI provider selection and API keys
│   └── settings.json          ← App settings (fetch interval, retention, etc.)
│
├── pages/
│   ├── map-feed.html          ← Global RSS news map (Leaflet + MarkerCluster)
│   ├── news-map.html          ← Per-country news map (accepts ?country= param)
│   ├── historical.html        ← Historical reports browser (accepts ?slug= param)
│   ├── taiwan-strait.html     ← China/Taiwan hub page with overview map
│   ├── taiwan-window-apr-2026.html  ← April 2026 invasion window deep-dive
│   ├── taiwan-window-oct-2026.html  ← October 2026 invasion window deep-dive
│   ├── taiwan-window-apr-2027.html  ← April 2027 invasion window deep-dive
│   └── taiwan-window-oct-2027.html  ← October 2027 invasion window deep-dive
│
├── countries/                 ← Static country strategic dossiers (hand-crafted)
│   ├── usa-dossier.html
│   ├── china-dossier.html
│   ├── russia-dossier.html
│   ├── ukraine-dossier.html
│   ├── taiwan-dossier.html
│   ├── iran-dossier.html
│   ├── israel-dossier.html
│   ├── india-dossier.html
│   ├── pakistan-dossier.html
│   ├── north-korea-dossier.html
│   └── nato-dossier.html
│
├── theaters/                  ← Theater/domain analysis pages (hand-crafted)
│   ├── eastern-europe-theater.html
│   ├── asia-pacific-theater.html
│   ├── middle-east-theater.html
│   ├── arctic-theater.html
│   ├── africa-theater.html
│   ├── space-domain.html
│   └── cyber-asymmetric.html
│
├── reports/                   ← AI-generated reports (auto-created by server)
│   ├── global/
│   │   ├── current/
│   │   │   └── report.html    ← Live global intelligence report
│   │   └── historical/
│   │       └── report-YYYY-MM-DDTHH-MM-SS.html
│   └── countries/
│       └── {slug}/
│           ├── current/
│           │   └── report.html
│           └── historical/
│               └── report-YYYY-MM-DDTHH-MM-SS.html
│
├── admin/
│   └── admin.html             ← Legacy admin redirect (unused; admin is in index.html)
│
├── docs/                      ← System prompt documentation (this directory)
│   ├── ANALYSIS_ENGINE_PROMPT.md
│   ├── MAP_AND_FEED_PROMPT.md
│   ├── TAIWAN_STRAIT_ANALYSIS_PROMPT.md
│   ├── ADMIN_SETTINGS_PROMPT.md
│   ├── NAVIGATION_SYSTEM_PROMPT.md
│   └── SITE_ARCHITECTURE_PROMPT.md
│
└── screenshots/               ← Development reference screenshots
```

---

## 3. Backend Server Architecture

**File:** `server.js`  
**Runtime:** Node.js 18+ (requires native `fetch`)  
**Framework:** Express 5.x  
**Port:** 5000 (configurable via `PORT` environment variable)

### Middleware Stack

```js
app.use(cors({ origin: true, credentials: true }));        // CORS — all origins (dev mode)
app.use(bodyParser.json({ limit: '10mb' }));               // JSON body parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname), {             // Static file serving
  setHeaders: (res, filePath) => {
    res.removeHeader('X-Frame-Options');                   // Allow iframe embedding
  },
}));
```

### Route Organization

| Route Group | Prefix | Handlers |
|---|---|---|
| Feed management | `/api/feeds` | CRUD for feed config, bulk import, trigger fetch |
| Article storage | `/api/articles` | Read articles, geo-articles, flag/unflag |
| AI configuration | `/api/ai` | Get/save config, test connection |
| Analysis generation | `/api/analysis` | Generate reports (async), status polling, history |
| Settings | `/api/settings` | Read/write app settings |
| Status/health | `/api/status` | Server health check with stats |
| Static fallback | `*` | Serves `index.html` for non-API, non-file routes |

### Async Pattern

All endpoints follow the same async non-blocking pattern for long operations:

```js
app.post('/api/analysis/global', asyncRoute(async (req, res) => {
  // 1. Check if already running → return early if so
  // 2. Update global status object to running=true
  // 3. RESPOND IMMEDIATELY with 200 OK
  res.json({ success: true, data: { message: 'Started', status: analysisStatus } });
  // 4. Run the long operation in the background (no await before response)
  try {
    const result = await generator.generateGlobalAnalysis();
    analysisStatus = { running: false, ... };
  } catch (err) {
    analysisStatus = { running: false, phase: 'error', ... };
  }
}));
```

---

## 4. Frontend Shell Architecture

**File:** `index.html` (4,193 lines)

The shell is a single HTML file that contains:
- All navigation CSS (~800 lines)
- All admin panel CSS (~600 lines)
- Welcome screen CSS (~400 lines)
- All JavaScript (nav rendering, content loading, admin panel, theme, events)
- The nav bar HTML
- The iframe container (`<iframe id="content-iframe">`)
- The admin panel overlay
- The welcome screen
- The mobile drawer

### Key DOM Elements

```html
<!-- Main app structure -->
<nav class="cm-nav">...</nav>           <!-- Fixed top nav (54px height) -->
<div id="mobile-overlay">...</div>      <!-- Mobile drawer backdrop -->
<div id="mobile-drawer">...</div>       <!-- Mobile slide-out menu -->

<!-- Content area (below nav) -->
<div id="welcome-screen">...</div>      <!-- Default home screen -->
<iframe id="content-iframe">...</iframe><!-- Fills viewport below nav -->
<div id="admin-panel">...</div>         <!-- Admin overlay (slides in) -->

<!-- Utilities -->
<div id="iframe-loader">...</div>       <!-- Loading bar -->
<div id="toast">...</div>              <!-- Toast notification -->
<div id="confirm-modal">...</div>       <!-- Confirm dialog -->
```

### Content Loading Model

Every page in the platform (dossiers, theaters, reports, maps) loads inside `<iframe id="content-iframe">`. The shell sets `iframe.src` to the relative path of the target file.

**Advantages:**
- Zero CSS conflicts between pages
- Pages can be opened standalone in browser
- Easy to add new pages without modifying shell

**Limitations:**
- Theme changes must be broadcast to iframe via `contentDocument`
- Inter-page navigation requires going through the shell
- Some browsers add iframe security restrictions (mitigated by removing `X-Frame-Options`)

---

## 5. Data Flow: End-to-End

```
                     EXTERNAL RSS FEEDS
                            │
                     rss-engine.fetchAllFeeds()
                     (triggered by POST /api/feeds/fetch)
                            │
                     XML parsing + geocoding
                            │
                     feed-store.saveArticles()
                            │
                     data/articles.json  ←──────── (max 5,000 articles)
                            │
                 ┌──────────┴──────────┐
                 │                     │
         GET /api/articles         POST /api/analysis/*
         (Leaflet maps fetch)      (AI report generation)
                 │                     │
         Leaflet frontend        analysis-generator.js
         (map-feed.html)              │
                               gatherArticlesForPrompt()
                                      │
                               AI Provider (via ai-providers.js)
                                      │
                               parseAIJson()
                                      │
                               renderGlobalHTML() / renderCountryHTML()
                                      │
                               reports/{type}/{slug}/current/report.html
                                      │
                               <iframe> in index.html displays it
```

---

## 6. All API Endpoints with Request/Response Schemas

### Feed Management

```
GET  /api/feeds
  Response: { success, data: { feeds[], categories[], total, enabled } }

POST /api/feeds
  Body:     { url, name, category, country, enabled }
  Response: { success, data: { feed } }

DELETE /api/feeds/:id
  Response: { success, data: { removed, id } }

POST /api/feeds/import
  Body:     { feeds: [...] }
  Response: { success, data: { imported, skipped } }

POST /api/feeds/fetch
  Response: { success, data: { message, status } }
  (Async — response is immediate; poll fetch-status)

GET  /api/feeds/fetch-status
  Response: { success, data: { running, progress, total, current, errors, lastRun, message } }
```

### Articles

```
GET  /api/articles?country=&category=&timeRange=&search=&limit=
  Response: { success, data: { articles[], total, lastFetch, filters } }

GET  /api/articles/geo?country=&timeRange=
  Response: { success, data: { articles[], total } }
  (Only articles with valid lat/lng)

POST /api/articles/flag
  Body:     { articleId, country, notes }
  Response: { success, data: { flag } }

GET  /api/articles/flagged?country=
  Response: { success, data: { flagged[], total } }

DELETE /api/articles/flag/:id
  Response: { success, data: { removed, id } }
```

### AI Configuration

```
GET  /api/ai/config
  Response: { success, data: { config (keys masked), providers[] } }

POST /api/ai/config
  Body:     { provider, providers: { [name]: { apiKey, model, baseUrl } } }
  Response: { success, data: { config (keys masked) } }

POST /api/ai/test
  Body:     { provider? }
  Response: { success, data: { message, model, providerName } }
```

### Analysis Generation

```
POST /api/analysis/global
  Response: { success, data: { message, status } }  (async)

POST /api/analysis/country/:slug
  Response: { success, data: { message, status } }  (async)

POST /api/analysis/all-countries
  Response: { success, data: { message, status } }  (async)

POST /api/analysis/all
  Response: { success, data: { message, status } }  (async)

GET  /api/analysis/status
  Response: { success, data: { running, phase, current, total, message, lastRun, lastResult } }

GET  /api/analysis/history/global
  Response: { success, data: { reports[], type, slug } }

GET  /api/analysis/history/country/:slug
  Response: { success, data: { reports[], type, slug } }
```

### Settings and Status

```
GET  /api/settings
  Response: { success, data: { settings } }

POST /api/settings
  Body:     { ...settings fields... }
  Response: { success, data: { settings } }

GET  /api/status
  Response: { success, data: { server, version, uptime, stats, fetchStatus, analysisStatus } }
```

---

## 7. Design System Summary

**Philosophy:** Dark military aesthetic — classified intelligence briefing aesthetic with clean readability.

### Color Palette

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--color-bg` | `#0a0c10` | `#f0f2f5` | Page background |
| `--color-surface` | `#0f1117` | `#ffffff` | Cards, panels, nav |
| `--color-surface-2` | `#141820` | `#f5f6f8` | Nested elements |
| `--color-surface-3` | `#1a2030` | `#eaedf1` | Hover states |
| `--color-accent` | `#c41e3a` | `#c41e3a` | Crimson — identity color |
| `--color-text` | `#dde2ec` | `#0d1117` | Primary text |
| `--color-text-muted` | `#8a94a8` | `#4a5568` | Secondary text |
| `--color-teal` | `#2dd4bf` | `#0d9488` | Reports accent |
| `--color-amber` | `#f59e0b` | `#d97706` | Warning/theater |
| `--color-green` | `#22c55e` | `#16a34a` | Positive/US forces |
| `--color-blue` | `#60a5fa` | `#2563eb` | Info/Taiwan forces |

**Report pages** use **teal (`#00c8b4`)** as their accent — a slightly different teal from the global `--color-teal` but visually consistent.

**Taiwan Strait window pages** use **navy blue (`#2E5F99` / `#4A8FD4`)** as their accent.

### Typography

| Font | Variable | Usage |
|---|---|---|
| Rajdhani | `--font-display` | Headings, nav labels, section titles |
| Share Tech Mono | `--font-mono` | Code, timestamps, badges, metadata |
| Inter | `--font-body` | Body text, descriptions |

Loaded via Google Fonts CDN:
```html
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Spacing Scale

4px base unit: `--space-1` (4px) through `--space-16` (64px)

### Report-Specific Typography

Reports (`renderGlobalHTML` / `renderCountryHTML`) include their own inline Google Fonts link and don't rely on `assets/style.css` — they are fully self-contained for direct-browser-open compatibility.

---

## 8. CDN Dependencies

| Library | Version | CDN URL | Usage |
|---|---|---|---|
| Leaflet | 1.9.4 | `unpkg.com/leaflet@1.9.4` | Maps (all map pages) |
| Leaflet.markercluster | 1.5.3 | `unpkg.com/leaflet.markercluster@1.5.3` | Article clustering |
| Lucide Icons | latest | `unpkg.com/lucide@latest/dist/umd/lucide.js` | Nav and UI icons |
| Google Fonts (Rajdhani) | — | `fonts.googleapis.com` | Display typeface |
| Google Fonts (Inter) | — | `fonts.googleapis.com` | Body typeface |
| Google Fonts (Share Tech Mono) | — | `fonts.googleapis.com` | Monospace typeface |

### Self-Hosting CDN Assets

To run fully offline:

```bash
# Leaflet
npm install leaflet leaflet.markercluster
# Copy dist/ to conflict-mapper/vendor/

# Fonts
# Download WOFF2 files from Google Fonts and host locally
# Update CSS @font-face rules in style.css
```

Then update HTML `<link>` tags to point to `/vendor/...` paths.

---

## 9. Self-Hosting Guide

### Prerequisites

- Node.js 18+ (required for native `fetch`)
- npm

### Quick Start

```bash
cd conflict-mapper
npm install
node server.js
# Visit http://localhost:5000
```

### Environment Variables

```bash
PORT=5000                      # HTTP port (default: 5000)
ADMIN_PASSWORD=mysecretpw      # Override admin password (optional — otherwise uses nav-config.json)
```

### Static Server (No Backend)

The site works partially as static HTML without the Node.js server. Features that require the backend:
- RSS feed fetching
- AI report generation
- Article flagging
- Admin panel (settings save)

Static-only features (work without server):
- All country dossiers
- All theater analysis pages
- Taiwan Strait invasion window pages
- Any pre-generated `reports/` HTML files

To serve as static only: `python3 -m http.server 8080` or any static web server.

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

```bash
docker build -t conflict-mapper .
docker run -p 5000:5000 -v $(pwd)/data:/app/data conflict-mapper
```

Mount the `data/` volume to persist articles and configuration across container restarts.

---

## 10. How to Add a New Country

1. **Add the country entry to `assets/nav-config.json`:**
```json
{ "flag": "🇸🇦", "label": "Saudi Arabia", "slug": "saudi-arabia" }
```

2. **Register the slug in `lib/analysis-generator.js`:**
```js
const COUNTRY_SLUGS = ['usa', 'russia', ... 'saudi-arabia'];
```

3. **Add name mapping in `lib/geocoder.js`:**
```js
// In getCountryFromSlug():
'saudi-arabia': 'Saudi Arabia',
// In LOCATIONS:
'saudi arabia': { lat: 24.69, lng: 46.72, country: 'Saudi Arabia', type: 'country' },
'riyadh':       { lat: 24.69, lng: 46.72, country: 'Saudi Arabia', type: 'capital' },
```

4. **Create the strategic dossier** using the template in `COUNTRY_DOSSIER_TEMPLATE.md`:
```
countries/saudi-arabia-dossier.html
```

5. **Generate the initial AI report** via admin panel or API:
```bash
curl -X POST http://localhost:5000/api/analysis/country/saudi-arabia
```

6. **Add relevant RSS feeds** covering Saudi Arabia to `data/feeds-config.json`.

---

## 11. How to Add a New Theater/Domain Analysis

1. **Create the theater HTML file** using `THEATER_DOSSIER_TEMPLATE.md` as a guide:
```
theaters/indo-pacific-theater.html
```

2. **Add to `assets/nav-config.json`** under the `Theater Analysis` dropdown:
```json
{ "label": "Indo-Pacific", "subtitle": "Theater B-08", "target": "theaters/indo-pacific-theater.html" }
```

3. **Add a welcome card** — will auto-appear from the nav config.

4. **Add relevant feeds** to the feed store for this theater's coverage region.

Theaters are purely static HTML — no backend generation pipeline is involved. They are manually maintained, deep-analysis pages.

---

## 12. Security Considerations

### API Key Storage

API keys are stored in `data/ai-config.json` in **plaintext**. This is acceptable for:
- Local development
- Private/self-hosted deployments on a trusted network

**Do not deploy with API keys in this file on a public-facing server.** Instead:
- Use environment variables: `process.env.OPENAI_API_KEY`
- Modify `feed-store.js` `getAIConfig()` to read from `process.env` first

### Admin Password

The admin password in `assets/nav-config.json` is served to every client. This provides obscurity-level protection only. The client-side check can be bypassed by a technical user.

**For production**, add HTTP Basic Auth or session-based auth at the Express server level before serving API routes.

### CORS

The server runs with `origin: true` (all origins allowed). For production:

```js
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true,
}));
```

### Rate Limiting

No rate limiting is implemented. For public deployments, add `express-rate-limit`:

```js
const rateLimit = require('express-rate-limit');
app.use('/api/analysis', rateLimit({ windowMs: 60000, max: 5 }));
```

---

## 13. The Modular Prompt System

Each `.md` file in `docs/` is designed to be a **standalone system prompt** for a specific component. When working on a specific area:

| Working on... | Use this prompt file |
|---|---|
| AI report generation, prompts, JSON schemas | `ANALYSIS_ENGINE_PROMPT.md` |
| RSS feeds, geocoder, Leaflet maps | `MAP_AND_FEED_PROMPT.md` |
| Taiwan Strait invasion windows | `TAIWAN_STRAIT_ANALYSIS_PROMPT.md` |
| Admin panel, authentication, settings | `ADMIN_SETTINGS_PROMPT.md` |
| Navigation, dropdowns, theme, welcome page | `NAVIGATION_SYSTEM_PROMPT.md` |
| Full system, cross-cutting changes | This file (`SITE_ARCHITECTURE_PROMPT.md`) |

### How to Use These Prompts

Open the relevant `.md` file, copy its full contents, and paste it as the first message (system prompt) in a new AI conversation. Then attach the specific source files you want to modify.

---

## 14. Version History and Planned Roadmap

### Current Version: 2.0.0

**Phase 1 (Shipped):**
- Core SPA shell with iframe navigation
- 11 country strategic dossiers
- 7 theater analysis pages
- Day/night mode toggle
- Nav editor in admin panel

**Phase 2 (Shipped):**
- RSS engine with 40+ feeds
- Article store with 5,000-article cache
- Keyword geocoder with 400+ locations
- Leaflet global map with clustering
- Per-country news maps
- AI report generation pipeline (5 provider support)
- Report archival system (current + historical)
- Admin panel with full settings management
- Article flagging system

**Phase 3 (Shipped):**
- Taiwan Strait invasion window analysis (4 windows)
- Interactive military installation maps
- Escalation ladder component
- Casualty estimates panel
- Scenario tab system

**Planned Roadmap:**
- Automated scheduled feed fetching (cron via node-cron)
- Email/webhook alerts for CRITICAL risk level reports
- Comparison view: side-by-side historical reports
- User annotation layer on maps
- Theater-level AI analysis generation
- Embed mode (headless iframe without nav shell)
- API key management via environment variables
- Export to PDF (reports)

---

*This master prompt covers the complete Conflict Mapper platform. For deep-dives into specific subsystems, load the component-specific prompt files in `docs/`. Each file is self-contained and can be used independently.*
