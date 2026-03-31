# CONFLICT MAPPER — PROMPT & TEMPLATE FILE GUIDE
## Modular System for Iterating, Rebuilding, or Extending Any Feature
### Last Updated: March 31, 2026 | v3.0 — Covers all 30 prompt files

---

## How to Use This Guide

Each prompt file is **self-contained** — paste any single file into a new AI conversation and it has everything needed to rebuild or modify that specific feature without context from the others.

**To rebuild the entire platform from scratch:** Use files in the Build Order (Section 5).

**To iterate on a single feature:** Use the Feature → File Mapping (Section 2) to find the right file.

**To solve a specific problem:** Use the Common Iteration Scenarios (Section 3) for step-by-step recipes.

---

## Section 1: Quick Reference Table

### Original 11 Files (Platform Core)

| # | File | Lines | What It Builds | When to Use |
|---|------|-------|----------------|-------------|
| 1 | `CONFLICT_MAPPER_STYLE_GUIDE.md` | ~400 | Site-wide design system, color palette, typography, component library | Changing the visual style, adding new component types, onboarding a new developer |
| 2 | `DOSSIER_MASTER_PLAN.md` | ~359 | Production queue, all 18 dossier specs, accent colors, folder structure, build order | Adding a new country, reordering priorities, understanding the full scope |
| 3 | `COUNTRY_DOSSIER_TEMPLATE.md` | ~532 | Any individual country dossier HTML (13-section structure, components, image workflow, sources) | Building a new country dossier, modifying dossier sections, fixing dossier styling |
| 4 | `THEATER_DOSSIER_TEMPLATE.md` | ~252 | Any theater/domain dossier HTML (capability matrix, escalation ladder, chokepoints) | Building a new theater, modifying theater sections, adding Space/Cyber domain pages |
| 5 | `SITE_ARCHITECTURE_PROMPT.md` | ~720 | Complete platform architecture — server, API routes, data flow, all 33 endpoints, deployment (Cloudflare Tunnel, Railway, Docker) | Major refactors, adding new API routes, understanding how everything connects |
| 6 | `NAVIGATION_SYSTEM_PROMPT.md` | ~587 | Nav bar, dropdowns, nested country sub-menus, iframe loading, mobile menu, day/night toggle | Changing nav structure, adding new sections, fixing mobile layout |
| 7 | `ADMIN_SETTINGS_PROMPT.md` | ~840 | Admin panel — AI config, feed management, Countries section, Topics section, LOGS tab, Diagnostics tab, report generation, flagged articles with paginated audit log | Adding admin features, changing the settings UI, modifying report generation flow |
| 8 | `ANALYSIS_ENGINE_PROMPT.md` | ~655 | AI analysis pipeline — RSS → prompt → JSON parse → HTML render → archive | Changing analysis depth, modifying AI prompts, adding analysis types, fixing output |
| 9 | `MAP_AND_FEED_PROMPT.md` | ~660 | RSS feeds, Leaflet maps, article geotagging, deduplication, flagging, per-country maps | Adding/fixing RSS feeds, changing map layers, modifying geocoder, fixing article display |
| 10 | `TAIWAN_STRAIT_ANALYSIS_PROMPT.md` | ~543 | 4 invasion window pages — weather, force assessment, scenarios, casualty estimates | Updating invasion windows, adding scenarios, modifying probability estimates, force data |
| 11 | `FILE_GUIDE.md` | ~500 | This document — prompt library navigation guide | Starting a new feature, understanding scope, onboarding |

### Original 11 Component Spec Files

| # | File | Lines | What It Builds | When to Use |
|---|------|-------|----------------|-------------|
| 12 | `LOGGING_SYSTEM_PROMPT.md` | ~393 | `lib/logger.js` — ring buffer logging, file persistence, GET/DELETE /api/logs | Adding or modifying logging, debugging server operations, building the LOGS tab |
| 13 | `RSS_FEED_ENGINE_PROMPT.md` | ~575 | `lib/rss-engine.js` — fetching, XML parsing, language detection, deduplication. 153 feeds total (135 enabled, 18 disabled) | Fixing feed parsing, adding new feed formats, modifying deduplication logic |
| 14 | `ARTICLE_FLAGGING_PROMPT.md` | ~510 | End-to-end flagging: flag modal UI, `lib/feed-store.js` methods, analysis integration, paginated audit log | Modifying flagging UI, adding flag priority levels, changing flagging-to-analysis pipeline |
| 15 | `AI_PROVIDERS_PROMPT.md` | ~685 | `lib/ai-providers.js` — 5-provider abstraction (Perplexity/OpenAI/Anthropic/Google/Ollama), sonar-deep-research support, JSON parser with citation stripping and truncation repair | Adding a new AI provider, debugging API calls, modifying request/response handling |
| 16 | `GEOCODER_PROMPT.md` | ~510 | `lib/geocoder.js` — ~370-entry location lookup table + COUNTRY_SLUG_MAP with word-boundary matching fix | Adding locations, fixing geocoding for a region, expanding country term lists |
| 17 | `SERVER_BACKEND_PROMPT.md` | ~650 | `server.js` (~1099 lines) — all 33 API routes including /api/countries, /api/topics, /api/upload/report, pagination for /api/articles, middleware stack, error handling | Rebuilding or extending the Express server from scratch |
| 18 | `GLOBAL_MAP_FEED_PROMPT.md` | ~679 | `pages/map-feed.html` — global Leaflet map + collapsible sidebar + article feed | Modifying the global map page, changing sidebar layout, adding map layers |
| 19 | `COUNTRY_NEWS_MAP_PROMPT.md` | ~535 | `pages/news-map.html` — per-country Leaflet map with article feed + country nav strip | Modifying the country map page, changing country navigation, adding filters |
| 20 | `HISTORICAL_REPORTS_PROMPT.md` | ~402 | `pages/historical.html` — report browser with inline iframe viewer | Modifying the historical reports UI, adding filter options, changing the viewer layout |
| 21 | `TAIWAN_STRAIT_WATCH_PROMPT.md` | ~618 | `pages/taiwan-strait.html` — live monitoring dashboard, operational Leaflet map, weather embed | Working on the Taiwan Strait Watch dashboard specifically (NOT the invasion windows) |
| 22 | `INVASION_WINDOW_PROMPT.md` | ~754 | `pages/taiwan-window-*.html` — detailed per-section spec for rebuilding any window page | Rebuilding a full invasion window page, adding new sections, fixing equipment cards |

### New 8 Files (Iran War + Nuclear Hub Pages)

| # | File | Lines | What It Builds | When to Use |
|---|------|-------|----------------|-------------|
| 23 | `IRAN_WAR_ANALYSIS_PROMPT.md` | ~445 | `pages/iran-war-analysis.html` — 17+ section hub, ~3,960 lines | Updating any section of the Iran War analysis page |
| 24 | `HUB_CONTENT_SYSTEM_PROMPT.md` | ~430 | Modular section architecture shared by all hub pages | Building a new hub page; understanding section patterns, CSS, and shared components |
| 25 | `WEAPONS_PLATFORMS_PROMPT.md` | ~400 | §07 of iran-war-analysis.html — 39 equipment cards across 4 sub-sections | Adding or updating weapon system cards; changing the grid layout |
| 26 | `GROUND_OPERATIONS_PROMPT.md` | ~380 | §10A Kharg Island + §10B Ground Target Options (8 target cards with mini maps) | Adding target assessments, updating Kharg Island analysis, changing feasibility ratings |
| 27 | `NUCLEAR_DEEP_DIVE_PROMPT.md` | ~500 | `pages/nuclear-deep-dive.html` — 8 sections, 14 facility cards with dual maps | Adding or updating facility cards; changing nuclear program assessment sections |
| 28 | `PREFERRED_RESOURCES_PROMPT.md` | ~300 | `data/preferred-resources.json` + `data/think-tanks-guide.md` — curated source library | Adding preferred research sources, understanding the priority-source lookup workflow |
| 29 | *(future)* | — | — | — |
| 30 | *(future)* | — | — | — |

---

## Section 2: Feature → File Mapping

### Visual Design & Styling

| Feature | Primary File | Also Relevant |
|---------|-------------|---------------|
| Color palette (dark/light mode tokens) | `CONFLICT_MAPPER_STYLE_GUIDE.md` | `NAVIGATION_SYSTEM_PROMPT.md` (theme toggle) |
| Typography (Rajdhani, Share Tech Mono, Inter) | `CONFLICT_MAPPER_STYLE_GUIDE.md` | — |
| Per-country accent colors | `DOSSIER_MASTER_PLAN.md` | `COUNTRY_DOSSIER_TEMPLATE.md` |
| Per-theater / per-hub accent colors | `HUB_CONTENT_SYSTEM_PROMPT.md` | `DOSSIER_MASTER_PLAN.md` |
| Component library (cards, tables, alerts, collapsibles) | `CONFLICT_MAPPER_STYLE_GUIDE.md` | `COUNTRY_DOSSIER_TEMPLATE.md` |
| Responsive/mobile layout | `CONFLICT_MAPPER_STYLE_GUIDE.md` | `NAVIGATION_SYSTEM_PROMPT.md` |
| Hub page CSS (modular section system) | `HUB_CONTENT_SYSTEM_PROMPT.md` | — |

### Hub Pages (Iran War, Nuclear, Taiwan)

| Feature | Primary File | Also Relevant |
|---------|-------------|---------------|
| Iran War Analysis page structure (17+ sections) | `IRAN_WAR_ANALYSIS_PROMPT.md` | `HUB_CONTENT_SYSTEM_PROMPT.md` |
| Iran §07 Weapons Platforms (39 equipment cards) | `WEAPONS_PLATFORMS_PROMPT.md` | `IRAN_WAR_ANALYSIS_PROMPT.md` |
| Iran §10A Kharg Island Assessment | `GROUND_OPERATIONS_PROMPT.md` | `IRAN_WAR_ANALYSIS_PROMPT.md` |
| Iran §10B Ground Target Options (8 target cards) | `GROUND_OPERATIONS_PROMPT.md` | `IRAN_WAR_ANALYSIS_PROMPT.md` |
| Nuclear Deep Dive (14 facility cards, 8 sections) | `NUCLEAR_DEEP_DIVE_PROMPT.md` | `HUB_CONTENT_SYSTEM_PROMPT.md` |
| Modular section architecture (shared pattern) | `HUB_CONTENT_SYSTEM_PROMPT.md` | — |
| Hub page shared components (facility cards, scenario cards) | `HUB_CONTENT_SYSTEM_PROMPT.md` | — |
| Building a new hub page from scratch | `HUB_CONTENT_SYSTEM_PROMPT.md` | `CONFLICT_MAPPER_STYLE_GUIDE.md` |

### Country Dossiers (Series A)

| Feature | Primary File | Also Relevant |
|---------|-------------|---------------|
| Build a new country dossier | `COUNTRY_DOSSIER_TEMPLATE.md` | `DOSSIER_MASTER_PLAN.md` (accent color + build order) |
| Modify dossier sections (add/remove/reorder) | `COUNTRY_DOSSIER_TEMPLATE.md` | — |
| Equipment cards with photos | `COUNTRY_DOSSIER_TEMPLATE.md` | — |
| Source citation library | `COUNTRY_DOSSIER_TEMPLATE.md` | — |

### Theater Dossiers (Series B)

| Feature | Primary File | Also Relevant |
|---------|-------------|---------------|
| Build a new theater dossier | `THEATER_DOSSIER_TEMPLATE.md` | `DOSSIER_MASTER_PLAN.md` |
| Capability matrix tables | `THEATER_DOSSIER_TEMPLATE.md` | — |
| Escalation ladder | `THEATER_DOSSIER_TEMPLATE.md` | — |

### Backend / Server

| Feature | Primary File | Also Relevant |
|---------|-------------|---------------|
| Express server setup — all 33 API routes | `SERVER_BACKEND_PROMPT.md` | `SITE_ARCHITECTURE_PROMPT.md` |
| AI provider abstraction (5 providers) | `AI_PROVIDERS_PROMPT.md` | `ANALYSIS_ENGINE_PROMPT.md` |
| sonar-deep-research (no max_tokens/temperature) | `AI_PROVIDERS_PROMPT.md` | — |
| JSON parser (citation stripping, truncation repair) | `AI_PROVIDERS_PROMPT.md` | `ANALYSIS_ENGINE_PROMPT.md` |
| RSS feed fetching & XML parsing | `RSS_FEED_ENGINE_PROMPT.md` | `MAP_AND_FEED_PROMPT.md` |
| Geocoder location lookup table | `GEOCODER_PROMPT.md` | `MAP_AND_FEED_PROMPT.md` |
| Centralized logging (lib/logger.js) | `LOGGING_SYSTEM_PROMPT.md` | `SERVER_BACKEND_PROMPT.md` |
| Report generation pipeline | `ANALYSIS_ENGINE_PROMPT.md` | `SERVER_BACKEND_PROMPT.md` |

### AI Analysis

| Feature | Primary File | Also Relevant |
|---------|-------------|---------------|
| Global analysis generation (maxTokens: 16000) | `ANALYSIS_ENGINE_PROMPT.md` | `SERVER_BACKEND_PROMPT.md` |
| Country analysis generation (maxTokens: 16000) | `ANALYSIS_ENGINE_PROMPT.md` | `SERVER_BACKEND_PROMPT.md` |
| AI system prompts (what the AI is told) | `ANALYSIS_ENGINE_PROMPT.md` | — |
| JSON response schema | `ANALYSIS_ENGINE_PROMPT.md` | — |
| JSON parse safety net (parseAIJson) | `AI_PROVIDERS_PROMPT.md` | `ANALYSIS_ENGINE_PROMPT.md` |
| Preferred research sources lookup | `PREFERRED_RESOURCES_PROMPT.md` | `ANALYSIS_ENGINE_PROMPT.md` |

### Research Sources

| Feature | Primary File | Also Relevant |
|---------|-------------|---------------|
| Preferred sources JSON (`data/preferred-resources.json`) | `PREFERRED_RESOURCES_PROMPT.md` | — |
| Think tanks guide (`data/think-tanks-guide.md`) | `PREFERRED_RESOURCES_PROMPT.md` | — |
| Priority levels (critical / high / medium / reference) | `PREFERRED_RESOURCES_PROMPT.md` | — |
| Adding a new preferred source | `PREFERRED_RESOURCES_PROMPT.md` | — |

### Taiwan / China Analysis

| Feature | Primary File | Also Relevant |
|---------|-------------|---------------|
| Taiwan Strait Watch dashboard (taiwan-strait.html) | `TAIWAN_STRAIT_WATCH_PROMPT.md` | — |
| Invasion window pages (4 total) | `TAIWAN_STRAIT_ANALYSIS_PROMPT.md` | `INVASION_WINDOW_PROMPT.md` |
| Window page rebuild (full section spec) | `INVASION_WINDOW_PROMPT.md` | `TAIWAN_STRAIT_ANALYSIS_PROMPT.md` |
| Adding new invasion windows | `TAIWAN_STRAIT_ANALYSIS_PROMPT.md` | `INVASION_WINDOW_PROMPT.md` |

---

## Section 3: Common Iteration Scenarios

### "I want to add a new weapon system card to §07"
1. `WEAPONS_PLATFORMS_PROMPT.md` — see "Adding a New System" for the card HTML pattern, image sourcing rules, and which sub-section to append to

### "I want to add a new ground target assessment to §10B"
1. `GROUND_OPERATIONS_PROMPT.md` — see "Target Card Structure" and the coordinate table; add the new card following the mini-map pattern

### "I want to update the Kharg Island analyst assessments"
1. `GROUND_OPERATIONS_PROMPT.md` — see §10A spec for analyst card structure and source list

### "I want to add a new nuclear facility card"
1. `NUCLEAR_DEEP_DIVE_PROMPT.md` — see "Facility Card Structure" and the facility list; add new entry with both context and satellite mini-maps

### "I want to add a new preferred research source"
1. `PREFERRED_RESOURCES_PROMPT.md` — see category structure and JSON schema; add to `data/preferred-resources.json`

### "I want to add a new country (e.g., Saudi Arabia)"
1. `DOSSIER_MASTER_PLAN.md` — add to the country list with accent color and build-order slot
2. `COUNTRY_DOSSIER_TEMPLATE.md` — build the strategic dossier HTML (`countries/saudi-arabia-dossier.html`)
3. `NAVIGATION_SYSTEM_PROMPT.md` — add to `assets/nav-config.json` under the Countries dropdown
4. `ANALYSIS_ENGINE_PROMPT.md` — add `'saudi-arabia'` to the `COUNTRY_SLUGS` array
5. `GEOCODER_PROMPT.md` — add locations to `LOCATIONS` table and `COUNTRY_SLUG_MAP`
6. `MAP_AND_FEED_PROMPT.md` — add relevant RSS feeds to `data/feeds-config.json`

### "I want to add a new AI provider"
1. `AI_PROVIDERS_PROMPT.md` — see "How to Add a New Provider" for the class template, `getProvider()` switch case, and `listProviders()` entry
2. `ADMIN_SETTINGS_PROMPT.md` — add the new provider to the UI dropdown and default models table

### "I want to build a new hub page (e.g., Yemen Conflict)"
1. `HUB_CONTENT_SYSTEM_PROMPT.md` — page shell, CSS variables, modular section pattern, shared components
2. `CONFLICT_MAPPER_STYLE_GUIDE.md` — design tokens and component library
3. `NAVIGATION_SYSTEM_PROMPT.md` — add to `assets/nav-config.json`

### "I want to rebuild the Iran War Analysis page from scratch"
1. `IRAN_WAR_ANALYSIS_PROMPT.md` — full section map, HTML patterns, map configs, CSS
2. `HUB_CONTENT_SYSTEM_PROMPT.md` — shared section architecture
3. `WEAPONS_PLATFORMS_PROMPT.md` — §07 full card inventory
4. `GROUND_OPERATIONS_PROMPT.md` — §10A and §10B specs

### "I want to rebuild the Nuclear Deep Dive page from scratch"
1. `NUCLEAR_DEEP_DIVE_PROMPT.md` — all 8 sections, 14 facility cards, map configurations
2. `HUB_CONTENT_SYSTEM_PROMPT.md` — shared section architecture

### "I want to change the AI analysis prompts"
1. `ANALYSIS_ENGINE_PROMPT.md` — the only file you need; see the system prompt strings and JSON schema sections

### "I want to add a new map layer"
1. `MAP_AND_FEED_PROMPT.md` — Leaflet layer config for the article/feed maps
2. `HUB_CONTENT_SYSTEM_PROMPT.md` — map tile patterns for hub pages (theater, coastal, satellite)

### "I want to rebuild the entire platform from scratch"
Use Build Order in Section 5. At minimum load in this sequence:
1. `SITE_ARCHITECTURE_PROMPT.md` — understand the full system first
2. `CONFLICT_MAPPER_STYLE_GUIDE.md` — establish the design system
3. Then follow the numbered build order

---

## Section 4: File Dependencies Tree

```
SITE_ARCHITECTURE_PROMPT.md  ← Master reference (full platform)
├── CONFLICT_MAPPER_STYLE_GUIDE.md      (design system)
│   ├── COUNTRY_DOSSIER_TEMPLATE.md     (uses design tokens)
│   ├── THEATER_DOSSIER_TEMPLATE.md     (uses design tokens)
│   └── HUB_CONTENT_SYSTEM_PROMPT.md   (uses design tokens)
│       ├── IRAN_WAR_ANALYSIS_PROMPT.md (iran-war-analysis.html)
│       │   ├── WEAPONS_PLATFORMS_PROMPT.md  (§07 weapons section)
│       │   └── GROUND_OPERATIONS_PROMPT.md  (§10A, §10B sections)
│       └── NUCLEAR_DEEP_DIVE_PROMPT.md (nuclear-deep-dive.html)
│
├── DOSSIER_MASTER_PLAN.md              (scope & production queue)
│   ├── COUNTRY_DOSSIER_TEMPLATE.md     (individual country builds)
│   └── THEATER_DOSSIER_TEMPLATE.md     (individual theater builds)
│
├── NAVIGATION_SYSTEM_PROMPT.md         (shell/nav/iframe)
│   └── ADMIN_SETTINGS_PROMPT.md        (embedded admin panel)
│       └── LOGGING_SYSTEM_PROMPT.md    (LOGS tab → logger.js)
│
├── SERVER_BACKEND_PROMPT.md            (server.js — all routes)
│   ├── LOGGING_SYSTEM_PROMPT.md        (logger.js)
│   ├── RSS_FEED_ENGINE_PROMPT.md       (rss-engine.js)
│   │   └── GEOCODER_PROMPT.md          (geocoder.js)
│   ├── AI_PROVIDERS_PROMPT.md          (ai-providers.js)
│   └── ARTICLE_FLAGGING_PROMPT.md      (feed-store.js flagging)
│
├── ANALYSIS_ENGINE_PROMPT.md           (analysis-generator.js)
│   ├── AI_PROVIDERS_PROMPT.md          (providers used by generator)
│   ├── PREFERRED_RESOURCES_PROMPT.md   (preferred sources for prompts)
│   ├── ARTICLE_FLAGGING_PROMPT.md      (flagged articles in prompt)
│   └── MAP_AND_FEED_PROMPT.md          (articles fed to generator)
│
├── MAP_AND_FEED_PROMPT.md              (rss-engine + feed-store + geocoder + maps)
│   ├── RSS_FEED_ENGINE_PROMPT.md
│   ├── GEOCODER_PROMPT.md
│   ├── GLOBAL_MAP_FEED_PROMPT.md       (map-feed.html)
│   └── COUNTRY_NEWS_MAP_PROMPT.md      (news-map.html)
│
├── TAIWAN_STRAIT_WATCH_PROMPT.md       (taiwan-strait.html dashboard)
│   └── TAIWAN_STRAIT_ANALYSIS_PROMPT.md
│       └── INVASION_WINDOW_PROMPT.md   (taiwan-window-*.html)
│
└── HISTORICAL_REPORTS_PROMPT.md        (historical.html — standalone)
```

### Fully Self-Contained Files (no upstream dependencies)
- `CONFLICT_MAPPER_STYLE_GUIDE.md`
- `COUNTRY_DOSSIER_TEMPLATE.md`
- `THEATER_DOSSIER_TEMPLATE.md`
- `LOGGING_SYSTEM_PROMPT.md`
- `RSS_FEED_ENGINE_PROMPT.md`
- `AI_PROVIDERS_PROMPT.md`
- `GEOCODER_PROMPT.md`
- `HISTORICAL_REPORTS_PROMPT.md`
- `INVASION_WINDOW_PROMPT.md`
- `WEAPONS_PLATFORMS_PROMPT.md`
- `GROUND_OPERATIONS_PROMPT.md`
- `PREFERRED_RESOURCES_PROMPT.md`
- `NUCLEAR_DEEP_DIVE_PROMPT.md`

---

## Section 5: Build Order

### Phase 1 — Foundation

| Step | File | Output |
|------|------|--------|
| 1 | `SITE_ARCHITECTURE_PROMPT.md` | Read-only: understand the full platform scope |
| 2 | `CONFLICT_MAPPER_STYLE_GUIDE.md` | `assets/style.css` — design tokens, component CSS |
| 3 | `NAVIGATION_SYSTEM_PROMPT.md` | `index.html` skeleton — nav, iframe, welcome, `assets/nav-config.json` |

### Phase 2 — Backend Core

| Step | File | Output |
|------|------|--------|
| 4 | `LOGGING_SYSTEM_PROMPT.md` | `lib/logger.js` |
| 5 | `GEOCODER_PROMPT.md` | `lib/geocoder.js` |
| 6 | `RSS_FEED_ENGINE_PROMPT.md` | `lib/rss-engine.js` |
| 7 | `AI_PROVIDERS_PROMPT.md` | `lib/ai-providers.js` |
| 8 | `ARTICLE_FLAGGING_PROMPT.md` | `lib/feed-store.js` flagging methods |
| 9 | `ANALYSIS_ENGINE_PROMPT.md` | `lib/analysis-generator.js` |
| 10 | `SERVER_BACKEND_PROMPT.md` | `server.js` — all 33 API routes |

### Phase 3 — Admin & Configuration

| Step | File | Output |
|------|------|--------|
| 11 | `ADMIN_SETTINGS_PROMPT.md` | Admin panel HTML/JS in `index.html` |

### Phase 4 — Static Content Pages

| Step | File | Output |
|------|------|--------|
| 12 | `DOSSIER_MASTER_PLAN.md` | Plan: accent colors + build order for all 18 dossiers |
| 13 | `COUNTRY_DOSSIER_TEMPLATE.md` | 11 country dossiers in `countries/*.html` |
| 14 | `THEATER_DOSSIER_TEMPLATE.md` | 7 theater pages in `theaters/*.html` |

### Phase 5 — Frontend Map & Feed Pages

| Step | File | Output |
|------|------|--------|
| 15 | `GLOBAL_MAP_FEED_PROMPT.md` | `pages/map-feed.html` |
| 16 | `MAP_AND_FEED_PROMPT.md` | Shared patterns for map/feed pages |
| 17 | `COUNTRY_NEWS_MAP_PROMPT.md` | `pages/news-map.html` |
| 18 | `HISTORICAL_REPORTS_PROMPT.md` | `pages/historical.html` |

### Phase 6 — Taiwan Strait Module

| Step | File | Output |
|------|------|--------|
| 19 | `TAIWAN_STRAIT_WATCH_PROMPT.md` | `pages/taiwan-strait.html` — live monitoring dashboard |
| 20 | `TAIWAN_STRAIT_ANALYSIS_PROMPT.md` | Hub structure + invasion window architecture |
| 21 | `INVASION_WINDOW_PROMPT.md` | All 4 `pages/taiwan-window-*.html` |

### Phase 7 — Iran War & Nuclear Hub Pages

| Step | File | Output |
|------|------|--------|
| 22 | `HUB_CONTENT_SYSTEM_PROMPT.md` | Shared modular section architecture |
| 23 | `IRAN_WAR_ANALYSIS_PROMPT.md` | `pages/iran-war-analysis.html` (sections + maps) |
| 24 | `WEAPONS_PLATFORMS_PROMPT.md` | §07 of iran-war-analysis.html (39 equipment cards) |
| 25 | `GROUND_OPERATIONS_PROMPT.md` | §10A and §10B of iran-war-analysis.html |
| 26 | `NUCLEAR_DEEP_DIVE_PROMPT.md` | `pages/nuclear-deep-dive.html` (14 facility cards) |

### Phase 8 — Research Infrastructure

| Step | File | Output |
|------|------|--------|
| 27 | `PREFERRED_RESOURCES_PROMPT.md` | `data/preferred-resources.json` + `data/think-tanks-guide.md` |

### Phase 9 — Documentation

| Step | File | Output |
|------|------|--------|
| 28 | `FILE_GUIDE.md` | This file — update after adding any new prompt files |

---

## Section 6: Deployment Files

| File | Purpose |
|------|---------|
| `README.md` | GitHub README (~558 lines) — features, quick start, deployment options (Cloudflare Tunnel, Railway, Docker), API reference, tech stack |
| `Dockerfile` | Multi-stage Docker build using `node:20-alpine` — `npm ci --production`, exposes port 5000 |
| `.dockerignore` | Excludes `node_modules`, `screenshots`, `data/articles.json`, `data/flagged-articles.json`, `data/server.log`, generated reports, zip files |
| `LICENSE` | MIT License |

---

## Section 7: Key Data Files

| File | Description |
|------|-------------|
| `data/feeds-config.json` | 153 RSS feed configurations (135 enabled, 18 disabled) |
| `data/nav-config.json` (or `assets/nav-config.json`) | Navigation tree for all dropdowns and sub-menus |
| `data/ai-config.json` | Active AI provider + API keys (gitignored) |
| `data/countries-config.json` | Country slugs + topic configurations |
| `data/flagged-articles.json` | Flagged article storage with snapshots |
| `data/articles.json` | Current article cache (gitignored — large) |
| `data/server.log` | Server log file (ring buffer persistence) |
| `data/preferred-resources.json` | Curated research source library with priority levels |
| `data/think-tanks-guide.md` | Comprehensive think tank reference guide |

---

## Section 8: Key Assets

| File | Description |
|------|-------------|
| `assets/style.css` | Global design system stylesheet |
| `assets/nav-config.json` | Navigation configuration (may also live in `data/`) |
| `assets/MidnightHammerFlightProfile-7.jpg` | B-2/F-35 flight profile infographic for Nuclear Deep Dive §03 |
| `assets/Natanz-Report-March-3-2026-6.pdf` | ISIS Nuclear Security report on Natanz, March 2026 |
| `assets/gbu57-b2-tarmac-mumaw.jpg` | GBU-57 MOP on B-2 tarmac photo (credit: Mumaw) |
| `assets/gbu57-b2-bombbay-usaf.jpg` | GBU-57 in B-2 bomb bay, USAF official photo |

---

## Section 9: Page File Sizes (for context budgeting)

| Page | Lines | Size |
|------|-------|------|
| `pages/iran-war-analysis.html` | ~3,960 | ~270KB |
| `pages/nuclear-deep-dive.html` | ~1,970 | ~143KB |
| `pages/taiwan-strait.html` | ~1,420 | ~95KB |

---

*File Guide v3.0 — Conflict Mapper Prompt Library*
*Total: 28 prompt files + README.md, Dockerfile, .dockerignore, LICENSE in repo root*
