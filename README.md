# Conflict Mapper

**Open-source geopolitical intelligence platform**

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

Conflict Mapper is a self-hostable Node.js platform that aggregates geopolitical intelligence from 153 live RSS feeds, plots geotagged articles on interactive Leaflet maps, and generates AI-powered analysis reports using your choice of five LLM providers. No database required — everything persists to JSON files.

---

## Screenshots

> _Add screenshots after first run. Suggested paths:_

| View | Path |
|------|------|
| Global Map & Feed | `screenshots/global-map.png` |
| Country Dossier | `screenshots/country-dossier.png` |
| Admin Panel | `screenshots/admin-panel.png` |
| Taiwan Strait Watch | `screenshots/taiwan-strait.png` |
| AI Analysis Report | `screenshots/analysis-report.png` |

---

## Features

### Country Strategic Dossiers (11)
Military capability overviews, order of battle, nuclear arsenals, leadership profiles, and strategic outlook for:
**USA · China · Russia · Ukraine · Taiwan · Iran · Israel · India · Pakistan · North Korea · NATO**

### Theater & Domain Analysis (7)
Regional geopolitical assessments with capability matrices, escalation ladders, and chokepoint analysis:
**Eastern Europe · Asia-Pacific · Middle East · Arctic · Africa · Space Domain · Cyber & Asymmetric**

### AI-Powered Current Analysis
Automated intelligence reports generated from live RSS articles. Five provider options:

| Provider | Best For |
|----------|----------|
| Perplexity | Built-in web search, real-time data (recommended default) |
| OpenAI GPT | High-quality general analysis |
| Anthropic Claude | Long-context, detailed reports |
| Google Gemini | Fast generation |
| Ollama (Local) | Air-gapped/private deployments, no API key |

Reports are rendered as styled HTML and automatically archived with timestamps.

### Live RSS Aggregation
- **153 pre-configured feeds** across 10 categories
- 135 enabled by default, 18 disabled (configurable via admin panel)
- Feed categories: `breaking`, `geopolitical`, `military`, `economic`, `science`, `ai`, `robotics`, `technology`, `political`, `general`
- XML/Atom/RSS 1.0/2.0 parsing with HTML stripping and CDATA unwrapping
- Jaccard similarity deduplication (threshold: 0.75) — no duplicate articles
- Language detection (non-ASCII ratio heuristic) — filter to English-only for AI analysis
- Up to 5,000 most-recent articles stored

### Global Map & Feed
- Leaflet dark map (CartoDB Dark Matter tiles) with **clustered article markers**
- Heatmap overlay showing news density
- Category and time-range filters
- Per-article flag button for analyst review

### Per-Country Live News Maps
- Dedicated Leaflet maps for each monitored country
- Country navigation strip for quick switching
- Geotagged articles plotted with source and category color-coding

### China/Taiwan Strait Watch
- Interactive military map with PLA, Taiwan, and US base markers
- Live weather embed (Windy.com integration)
- Real-time tidal data
- Force comparison panel (PLA vs. Taiwan defense)

### Taiwan Invasion Window Analysis (4 pages)
Detailed per-window assessments covering environmental conditions, force assessment, scenario modeling, and probability estimates:
- April 2026 · October 2026 · April 2027 · October 2027

### Admin Panel
- **AI Config** — switch providers, enter API keys, test connection
- **RSS Feed Management** — add/remove/enable feeds, bulk import, trigger fetch
- **Countries** — add, edit, or remove monitored countries with per-country topic assignments
- **Topics** — manage analysis topic tags
- **Report Generation** — trigger global, per-country, or full-suite analysis with progress tracking
- **Flagged Articles** — review analyst-flagged articles with paginated audit log
- **Navigation Editor** — edit `nav-config.json` live
- **Config Export/Import** — full JSON backup and restore
- **System Diagnostics** — run full platform health check
- **Logs** — terminal-style log viewer with category/level filters and 30s auto-refresh

### Additional Features
- Article flagging — flag articles for priority inclusion in the next AI analysis
- Historical report archival — every generated report is timestamped and archived
- Day/Night mode toggle
- Responsive design with mobile hamburger menu
- Self-hostable — no external database, no required cloud services
- Zero build step — pure HTML/CSS/JS frontend

---

## Quick Start

```bash
git clone https://github.com/yourusername/conflict-mapper.git
cd conflict-mapper
npm install
node server.js
# Open http://localhost:5000
```

Node.js 18 or later required.

---

## First-Time Setup

After the server is running at `http://localhost:5000`:

### 1. Configure AI Provider

Go to **Settings → AI CONFIG**

Enter your API key for your preferred provider. Perplexity is recommended because its `sonar-pro` model includes built-in web search — analysis reports will automatically pull in real-time context beyond your RSS articles.

- Perplexity: [console.perplexity.ai](https://www.perplexity.ai/settings/api)
- OpenAI: [platform.openai.com](https://platform.openai.com/api-keys)
- Anthropic: [console.anthropic.com](https://console.anthropic.com/)
- Google Gemini: [aistudio.google.com](https://aistudio.google.com/app/apikey)
- Ollama: No key needed — run `ollama serve` locally first

Click **Test Connection** to verify the key works before proceeding.

### 2. Fetch RSS Feeds

Go to **Settings → RSS FEEDS → Fetch All Now**

This triggers a batch fetch of all 135 enabled feeds (batched 5 at a time with a 15-second timeout per feed). Watch the progress counter. Expect 200–500 articles on the first fetch.

### 3. Run Diagnostics

Go to **Settings → DIAGNOSTICS → Run Full Diagnostics**

The diagnostics check AI config, feed health, article counts, geocoding rates, and report availability. Review any warnings before proceeding.

### 4. Explore the Map

Navigate to **Map & Feed** in the top nav.

Geotagged articles appear as colored circle markers clustered by location. Use the category checkboxes and time-range filter in the sidebar to narrow results. Click any marker to see the article headline, source, and a link to the original.

### 5. Generate Your First Analysis

Go to **Settings → REPORTS → Global Analysis → Generate**

Analysis takes **2–5 minutes** depending on provider and the number of articles. The page polls for progress every 10 seconds. When complete, a link to the HTML report appears. Reports are also accessible from the **Historical Reports** page.

---

## Sharing Over the Internet

The server runs locally on port 5000 by default. Three options for exposing it publicly:

### Option A: Cloudflare Tunnel (Quick, Free)

No port forwarding required. Creates a public HTTPS URL in seconds.

```bash
# Install cloudflared
brew install cloudflared          # macOS
# Linux:
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o cloudflared && chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/

# Start your server
node server.js

# In another terminal — create a quick tunnel (no Cloudflare account needed)
cloudflared tunnel --url http://localhost:5000
# → Gives you a public https://random-words.trycloudflare.com URL
```

For a **permanent custom domain** (requires free Cloudflare account + domain):

```bash
cloudflared tunnel create conflictmapper
cloudflared tunnel route dns conflictmapper yourdomain.com
cloudflared tunnel run conflictmapper
```

### Option B: Railway.app (Recommended for Production, ~$5/month)

Auto-deploy on every git push, built-in logs, auto-SSL, custom domain support.

```bash
# 1. Push to GitHub
git init && git add -A && git commit -m "Initial commit"
gh repo create conflict-mapper --public --push

# 2. Deploy on Railway
# Visit https://railway.app → New Project → Deploy from GitHub
# Select your conflict-mapper repo
# Railway auto-detects Node.js and runs: npm install && node server.js

# 3. Add a custom domain
# Railway dashboard → Settings → Networking → Custom Domain → add your domain
# In your DNS provider, add a CNAME record pointing to the Railway-provided domain

# 4. Set environment variables (optional — avoids committing API keys)
# Railway dashboard → Variables tab → add: PORT=5000
```

### Option C: Docker

```bash
docker build -t conflict-mapper .
docker run -p 5000:5000 -v $(pwd)/data:/app/data conflict-mapper
```

Mount the `data/` volume to persist articles and configuration across container restarts. See `Dockerfile` and `.dockerignore` in the repo root.

---

## Project Structure

```
conflict-mapper/
├── server.js                  ← Express backend (~1099 lines) — all 33 API routes
├── package.json               ← Dependencies: express, cors, body-parser, xml2js, uuid
├── Dockerfile                 ← Multi-stage Docker build (node:20-alpine)
├── .dockerignore              ← Excludes node_modules, logs, generated reports
├── README.md                  ← This file
├── LICENSE                    ← MIT
│
├── assets/
│   ├── style.css              ← Shared design tokens and global CSS
│   └── nav-config.json        ← Navigation structure, site name, password, theme
│
├── lib/                       ← Backend modules
│   ├── analysis-generator.js  ← AI report pipeline: gather → prompt → AI → render → save
│   ├── ai-providers.js        ← Multi-provider AI abstraction (5 providers)
│   ├── rss-engine.js          ← RSS/Atom fetcher, XML parser, deduplicator
│   ├── feed-store.js          ← JSON file storage: articles, feeds, AI config, flags
│   ├── geocoder.js            ← Keyword geocoder (~370-entry lookup table)
│   └── logger.js              ← Ring buffer logging + file persistence + console mirror
│
├── data/                      ← Runtime data (auto-created; add to .gitignore)
│   ├── articles.json          ← Cached RSS articles (up to 5,000)
│   ├── flagged-articles.json  ← Analyst-flagged articles for AI inclusion
│   ├── feeds-config.json      ← 153 RSS feed definitions (live-editable via admin)
│   ├── countries-config.json  ← Monitored countries and analysis topics
│   ├── ai-config.json         ← AI provider selection and API keys
│   ├── settings.json          ← Fetch interval, retention limits, etc.
│   └── server.log             ← Append-only server log
│
├── pages/                     ← Dynamic frontend pages (loaded in iframe)
│   ├── map-feed.html          ← Global RSS news map (Leaflet + MarkerCluster)
│   ├── news-map.html          ← Per-country news map (?country= param)
│   ├── historical.html        ← Historical report browser (?slug= param)
│   ├── taiwan-strait.html     ← China/Taiwan Strait Watch dashboard
│   ├── taiwan-window-apr-2026.html
│   ├── taiwan-window-oct-2026.html
│   ├── taiwan-window-apr-2027.html
│   └── taiwan-window-oct-2027.html
│
├── countries/                 ← Static country strategic dossiers
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
├── theaters/                  ← Theater/domain analysis pages
│   ├── eastern-europe-theater.html
│   ├── asia-pacific-theater.html
│   ├── middle-east-theater.html
│   ├── arctic-theater.html
│   ├── africa-theater.html
│   ├── space-domain.html
│   └── cyber-asymmetric.html
│
├── admin/
│   └── admin.html             ← Standalone admin panel (legacy reference)
│
├── docs/                      ← In-repo subset of prompt docs
│   ├── SITE_ARCHITECTURE_PROMPT.md
│   ├── ADMIN_SETTINGS_PROMPT.md
│   ├── ANALYSIS_ENGINE_PROMPT.md
│   ├── MAP_AND_FEED_PROMPT.md
│   ├── NAVIGATION_SYSTEM_PROMPT.md
│   └── TAIWAN_STRAIT_ANALYSIS_PROMPT.md
│
└── reports/                   ← Auto-generated (created at runtime)
    ├── global/
    │   ├── current/report.html
    │   └── historical/
    └── countries/
        └── {slug}/
            ├── current/report.html
            └── historical/
```

---

## API Reference

All routes return `{ success: true, data: ... }` on success or `{ success: false, error: "..." }` on failure.

### Feeds

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/feeds` | List all feeds with article counts |
| `POST` | `/api/feeds` | Add a feed `{ url, name, category, country, enabled }` |
| `DELETE` | `/api/feeds/:id` | Remove a feed by ID |
| `POST` | `/api/feeds/import` | Bulk import `{ feeds: [...] }` |
| `POST` | `/api/feeds/fetch` | Trigger async fetch of all enabled feeds |
| `GET` | `/api/feeds/fetch-status` | Poll fetch progress |

### Articles

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/articles` | List articles. Query: `?country, ?category, ?timeRange, ?search, ?limit, ?language, ?page, ?pageSize` |
| `GET` | `/api/articles/geo` | Geotagged articles only. Query: `?timeRange, ?country` |
| `POST` | `/api/articles/flag` | Flag article `{ articleId, country, notes }` |
| `GET` | `/api/articles/flagged` | List flagged articles. Query: `?country` |
| `DELETE` | `/api/articles/flag/:id` | Remove a flag by flag ID |

**Pagination** (for `/api/articles`): Pass `?page=1&pageSize=50` for paginated results. Response includes `{ articles, page, pageSize, total, totalPages, lastFetch, filters }`. Legacy `?limit=N` behavior is preserved when `page`/`pageSize` are omitted.

### AI Configuration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ai/config` | Get AI config (keys masked) |
| `POST` | `/api/ai/config` | Save AI config `{ provider, apiKey, model, baseUrl }` |
| `POST` | `/api/ai/test` | Test connection `{ provider, apiKey?, model?, baseUrl? }` |

### Analysis

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analysis/global` | Generate global intelligence report (async) |
| `POST` | `/api/analysis/country/:slug` | Generate country report (async) |
| `POST` | `/api/analysis/all-countries` | Generate all 11 country reports (async) |
| `POST` | `/api/analysis/all` | Generate global + all country reports (async) |
| `GET` | `/api/analysis/status` | Poll generation progress |
| `GET` | `/api/analysis/history/global` | List historical global reports |
| `GET` | `/api/analysis/history/country/:slug` | List historical reports for a country |

### Countries & Topics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/countries` | Get countries and topics config |
| `POST` | `/api/countries` | Add country `{ name, slug, flag, accent, topics }` |
| `PUT` | `/api/countries/:slug` | Update country fields |
| `DELETE` | `/api/countries/:slug` | Remove a country |
| `POST` | `/api/topics` | Add topic `{ id, name }` |
| `DELETE` | `/api/topics/:id` | Remove a topic |

### Settings & Utilities

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings` | Get app settings |
| `POST` | `/api/settings` | Update settings (merge) |
| `GET` | `/api/status` | Server health check + summary stats |
| `GET` | `/api/logs` | Get logs. Query: `?category, ?level, ?limit, ?since, ?search` |
| `DELETE` | `/api/logs` | Clear in-memory log buffer |
| `POST` | `/api/upload/report` | Upload HTML report `{ type, slug?, content }` |

---

## Configuration Files

### `data/ai-config.json`

```json
{
  "provider": "perplexity",
  "perplexity": { "apiKey": "", "model": "sonar-pro" },
  "openai":     { "apiKey": "", "model": "gpt-4o" },
  "anthropic":  { "apiKey": "", "model": "claude-3-5-sonnet-20241022" },
  "google":     { "apiKey": "", "model": "gemini-2.0-flash" },
  "local":      { "baseUrl": "http://localhost:11434", "model": "llama3.1" }
}
```

### `data/feeds-config.json`

Feed objects contain: `id`, `url`, `name`, `category`, `country`, `enabled`, `addedAt`. Categories: `breaking`, `geopolitical`, `military`, `economic`, `science`, `ai`, `robotics`, `technology`, `political`, `general`.

### `data/countries-config.json`

```json
{
  "countries": [
    { "name": "United States", "slug": "usa", "flag": "🇺🇸", "accent": "#002868", "topics": ["military", "geopolitical"] }
  ],
  "topics": [
    { "id": "military", "name": "Military" },
    { "id": "geopolitical", "name": "Geopolitical" }
  ]
}
```

### `assets/nav-config.json`

Controls the navigation bar structure, site name, admin password, and theme settings. Editable live via the admin panel's **Navigation Editor** tab.

---

## AI Providers

| Provider | Default Model | Notes |
|----------|--------------|-------|
| Perplexity | `sonar-pro` | Built-in web search. Best for current-events analysis. |
| OpenAI | `gpt-4o` | High quality general-purpose. |
| Anthropic | `claude-3-5-sonnet-20241022` | Excellent for long, detailed reports. |
| Google | `gemini-2.0-flash` | Fast and cost-effective. |
| Ollama (Local) | `llama3.1` | Private, no cost, no API key. Requires `ollama serve`. |

---

## Timeout Configuration

| Operation | Timeout |
|-----------|---------|
| AI API calls (POST) — analysis reports | 5 minutes (300s) |
| AI API calls (GET) — test connection | 1 minute (60s) |
| Ollama/Local AI calls | 10 minutes (600s) |
| RSS feed fetch (per feed) | 15 seconds |
| Frontend analysis polling (before giving up) | 10 minutes |

Large reports (Global Analysis + all countries) can take **10–20 minutes** to complete sequentially. The frontend progress bar polls every 10 seconds and will stop after 10 minutes — the analysis continues server-side even if the browser tab times out.

---

## RSS Feed Categories

| Category | Count | Sources Include |
|----------|-------|-----------------|
| breaking | ~20 | Reuters, AP, BBC Breaking |
| geopolitical | ~25 | Foreign Affairs, CFR, ISW, Bellingcat |
| military | ~20 | Defense News, USNI News, Janes |
| economic | ~18 | Bloomberg, FT, WSJ World |
| science | ~10 | Nature, Science, Phys.org |
| ai | ~15 | MIT Tech Review, The Gradient, AI News |
| robotics | ~8 | IEEE Spectrum, The Robot Report |
| technology | ~15 | Ars Technica, Wired, TechCrunch |
| political | ~12 | Politico, The Hill, RealClearPolitics |
| general | ~10 | Al Jazeera, DW, France 24 |

153 feeds total, 135 enabled by default.

---

## System Prompts (Developer Docs)

The `docs/` directory (and the companion `conflict-mapper-prompts/` repository) contains **22 modular markdown files** — one for each major subsystem. Each file is a **self-contained system prompt**: paste any single file into a new AI conversation and it has everything needed to rebuild, debug, or extend that subsystem independently.

| File | What It Covers |
|------|---------------|
| `FILE_GUIDE.md` | Master index — feature-to-file mapping, build order, dependency tree |
| `SITE_ARCHITECTURE_PROMPT.md` | Full platform architecture, all API routes, deployment |
| `SERVER_BACKEND_PROMPT.md` | `server.js` — complete Express server spec |
| `ADMIN_SETTINGS_PROMPT.md` | Admin panel — all sections, auth, UI patterns |
| `ANALYSIS_ENGINE_PROMPT.md` | AI report pipeline — prompts, JSON schema, HTML rendering |
| `AI_PROVIDERS_PROMPT.md` | `lib/ai-providers.js` — all 5 provider implementations |
| `MAP_AND_FEED_PROMPT.md` | RSS pipeline + Leaflet maps overview |
| `GLOBAL_MAP_FEED_PROMPT.md` | `pages/map-feed.html` — global map detail spec |
| `COUNTRY_NEWS_MAP_PROMPT.md` | `pages/news-map.html` — per-country map spec |
| `RSS_FEED_ENGINE_PROMPT.md` | `lib/rss-engine.js` — feed fetching and parsing |
| `GEOCODER_PROMPT.md` | `lib/geocoder.js` — 370-entry location database |
| `ARTICLE_FLAGGING_PROMPT.md` | End-to-end flagging pipeline |
| `LOGGING_SYSTEM_PROMPT.md` | `lib/logger.js` — ring buffer + file persistence |
| `NAVIGATION_SYSTEM_PROMPT.md` | Nav bar, dropdowns, iframe loading, mobile menu |
| `CONFLICT_MAPPER_STYLE_GUIDE.md` | Design system — color tokens, typography, components |
| `COUNTRY_DOSSIER_TEMPLATE.md` | Template for building country dossier pages |
| `THEATER_DOSSIER_TEMPLATE.md` | Template for theater/domain analysis pages |
| `DOSSIER_MASTER_PLAN.md` | Production queue, accent colors, build order |
| `TAIWAN_STRAIT_WATCH_PROMPT.md` | `pages/taiwan-strait.html` dashboard |
| `TAIWAN_STRAIT_ANALYSIS_PROMPT.md` | 4 invasion window pages spec |
| `INVASION_WINDOW_PROMPT.md` | Per-section rebuild spec for window pages |
| `HISTORICAL_REPORTS_PROMPT.md` | `pages/historical.html` report browser |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js 18+ |
| Web framework | Express 5 |
| XML parsing | xml2js |
| ID generation | uuid |
| Frontend | Vanilla HTML/CSS/JS (no build step) |
| Maps | Leaflet.js 1.9 + MarkerCluster + Leaflet.heat |
| Fonts | Rajdhani, Share Tech Mono, Inter (Google Fonts) |
| Icons | Lucide Icons |
| AI APIs | Perplexity / OpenAI / Anthropic / Google Gemini / Ollama |
| Storage | JSON files (no database) |
| Deployment | Node.js direct · Docker · Railway · Cloudflare Tunnel |

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and test with `node server.js`
4. Commit: `git commit -m 'Add my feature'`
5. Push and open a Pull Request

**Areas where contributions are especially welcome:**
- Additional country dossiers (Saudi Arabia, Turkey, Japan, South Korea, Brazil, etc.)
- New theater pages (Indo-Pacific, Latin America, Sub-Saharan Africa detail)
- Additional RSS feed sources (add to `data/feeds-config.json`)
- Geocoder coverage expansion (add entries to `lib/geocoder.js`)
- Mobile UX improvements

---

## License

MIT License — see [LICENSE](LICENSE) for full text.

Copyright © 2026 JP Cooke

---

## Data Sources & Credits

Conflict Mapper aggregates publicly available open-source intelligence. The platform's analysis is only as good as its sources. Pre-configured feeds draw from organizations including:

- [Institute for the Study of War (ISW)](https://www.understandingwar.org/)
- [International Institute for Strategic Studies (IISS)](https://www.iiss.org/)
- [RAND Corporation](https://www.rand.org/)
- [Center for Strategic and International Studies (CSIS)](https://www.csis.org/)
- [Stockholm International Peace Research Institute (SIPRI)](https://www.sipri.org/)
- [Bellingcat](https://www.bellingcat.com/)
- [Reuters](https://www.reuters.com/), [AP News](https://apnews.com/), [BBC World](https://www.bbc.com/news/world)
- [Defense News](https://www.defensenews.com/), [USNI News](https://news.usni.org/)
- [Foreign Affairs](https://www.foreignaffairs.com/), [Council on Foreign Relations](https://www.cfr.org/)

**Disclaimer:** This platform is an open-source tool for research and situational awareness. All analysis generated by the AI components reflects the training data and live sources available at the time of generation. It is not a substitute for professional intelligence assessment.
