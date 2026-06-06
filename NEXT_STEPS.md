# Conflict Mapper Resume Notes

Prepared for resumption after the 5h usage window reset.

## Current State

- Workspace: `/Volumes/FastB/Github/conflict-mapper`
- Local server was used for validation on `http://localhost:5000`; stop it before pausing if still running.
- Browser connector was unavailable, so validation used HTTP smoke tests and JavaScript syntax checks.
- Pre-existing dirty/untracked items were present before this work and should not be reverted without review:
  - `node_modules/.bin/uuid`
  - `wrangler.toml`
  - `datasources/`
  - `docker-compose.yml`
  - `functions/api/prompts/Breaking News`
  - `node_modules/.cache/`

## Implemented

- Fixed extensionless report routing for `/reports/.../current/report` by falling back to `.html` in `functions/reports/[[path]].js`.
- Fixed the same extensionless report behavior in local Express dev routing so `npm start` mirrors Cloudflare Pages behavior.
- Updated report manifest metadata so current reports use asset `last-modified` instead of stale hardcoded March/May dates.
- Updated generated report wrapping so AI-returned full HTML bodies are extracted before sanitization and styling.
- Added shared global style runtime at `assets/user-style.js`.
- Added Global Style tab in Settings with five templates, font scale, light/dark/system mode, and color customization.
- Added `/assets/user-style.js` to all static pages, dossiers, theaters, and existing static reports.
- Made Country Dossiers editable in the Navigation Editor instead of requiring direct `nav-config.json` edits.
- Added article dates to News Library article cards; newest-first sorting already exists and remains active.
- Fixed RSS Map visible article panels so zoomed-out/world view shows all current filtered articles, not only mapped/geotagged items.
- Increased RSS fetch defaults and UI fetch parameters:
  - up to 150 feeds by default
  - max 200 feeds
  - higher item and translation limits
- Expanded operational search terms and RSS feed list.
- Added Google News RSS query feeds compatible with the `google-news-scraper` style of query coverage.
- Added Plenary/awesome-rss-feeds-derived feeds where relevant.
- Added Think Tanks top navigation dropdown:
  - `pages/think-tanks.html`
  - `pages/think-tank-latest-news.html`
- Added scripts:
  - `npm run think-tanks:data`
  - `npm run think-tanks:news`
- Generated:
  - `data/think-tanks.json`
  - `data/think-tank-latest-news.json`

## Generated Data Counts

- Think tanks: `105`
- Latest think-tank articles: `375`
- Think tanks with at least one latest-news article: `92`
- RSS feeds: `184`
- Enabled RSS feeds: `166`
- Google News RSS query feeds: `21`
- Plenary/awesome-rss-feeds-derived feeds: `10`

## Validation Already Run

```bash
node --check 'functions/reports/[[path]].js'
node --check cloudflare/lib/report-manifest.js
node --check cloudflare/lib/reports.js
node --check cloudflare/lib/articles.js
node --check cloudflare/lib/monitoring-config.js
node --check functions/api/feeds/fetch.js
node --check scripts/generate-think-tank-data.mjs
node --check scripts/aggregate-think-tank-news.mjs
npm test
```

Notes:

- `npm test` currently only prints `No automated test suite configured`.
- JSON parse checks passed for:
  - `assets/nav-config.json`
  - `data/feeds-config.json`
  - `data/think-tanks.json`
  - `data/think-tank-latest-news.json`
- HTTP smoke tests returned `200` for:
  - `/`
  - `/pages/think-tanks.html`
  - `/pages/think-tank-latest-news.html`
  - `/pages/news-library.html`
  - `/pages/map-feed.html`
  - `/reports/countries/china/current/report.html`
  - `/reports/countries/china/current/report`
  - `/assets/user-style.js`
  - `/data/think-tanks.json`
  - `/data/think-tank-latest-news.json`
  - `/api/status`
- After the resume check, local Express was patched and re-tested so these URL pairs return identical report bytes:
  - `/reports/countries/china/current/report`
  - `/reports/countries/china/current/report.html`
  - `/reports/countries/usa/current/report`
  - `/reports/global/current/report`
- Inline script syntax checks passed for:
  - `index.html`
  - `pages/think-tanks.html`
  - `pages/think-tank-latest-news.html`
  - `pages/news-library.html`
  - `pages/map-feed.html`

## Recommended Resume Steps

1. Confirm no long-running local processes remain:

   ```bash
   ps -axo pid,command | rg 'node server.js|aggregate-think-tank-news|generate-think-tank-data' | rg -v rg
   ```

2. Run a final status review:

   ```bash
   git status --short
   git diff --stat
   ```

3. Start the local server if browser validation is needed:

   ```bash
   npm start
   ```

4. Visit and smoke-test:

   - `http://localhost:5000/`
   - `http://localhost:5000/pages/think-tanks.html`
   - `http://localhost:5000/pages/think-tank-latest-news.html`
   - `http://localhost:5000/pages/news-library.html`
   - `http://localhost:5000/pages/map-feed.html`
   - `http://localhost:5000/reports/countries/china/current/report`
   - `http://localhost:5000/reports/countries/china/current/report.html`

5. In the UI, manually verify:

   - Top nav opens the Country Dossiers current reports.
   - `report` and `report.html` both resolve.
   - Global Style settings apply to shell, static pages, and reports.
   - News Library cards show calendar dates and remain sorted newest first.
   - RSS Map visible articles list shows all current filtered articles when zoomed out.
   - Think Tanks dropdown opens both new pages.
   - Think Tank Latest News filters by organization, country, date, and search.

7. Note from the resumed validation:

   - Local Express originally returned the app shell for extensionless report URLs because the catch-all route handled them.
   - `server.js` now normalizes `/reports/.../report` to `/reports/.../report.html` before the catch-all.
   - Static checked-in report HTML still contains old March 31 report text/titles. The routing/formatting fixes ensure newly generated current reports are served and styled correctly; replacing historical static content requires a fresh report generation run or production R2 current objects.

6. If deploying to Cloudflare Pages, prefer:

   ```bash
   npm run cf:pages:dev
   ```

   Then retest extensionless report routing because the production fix is in the Cloudflare Pages Function.

## Security / Operations Notes

- No credentials or API keys were added.
- The Google News RSS feeds are public query feeds; they may be rate-limited and should be monitored before high-frequency scheduling.
- Think-tank aggregation uses network calls and timeouts; keep concurrency conservative if running from shared infrastructure.
- The latest-news JSON is about 1.3 MB after the first aggregation run.

## 2026-06-04 Follow-up Fix Pass

### Implemented In This Pass

- Fixed generic Navigation Editor dropdown add-row placeholders so Think Tanks and other dropdowns no longer show France/country dossier prompts.
- Updated News Library to render all matching articles instead of starting from a 300-card render cap, and added a visible "Showing all..." note.
- Added `/assets/user-style.js` to News Library so global font/theme settings apply there too.
- Sanitized News Library and Think Tank Latest News summaries before display.
- Fixed `scripts/aggregate-think-tank-news.mjs` so escaped Google News RSS anchor tags are decoded first and then stripped.
- Regenerated:
  - `data/think-tanks.json`
  - `data/think-tank-latest-news.json`
- Think Tank Latest News now has 368 articles and zero raw HTML descriptions.
- Constrained the Think Tank Latest News coverage panel to its right column with its own scroll area, preventing it from covering article rows.
- Added compact, sortable Cloudflare Storage table rendering:
  - default uploaded-date descending sort
  - clickable sort headers for object key, size, and uploaded
  - tighter max width and smaller key/size gap
  - storage font size tied to the global style scale
- Broadened `assets/user-style.js` report/page overrides so theme and font settings propagate across pages, cards, storage rows, current reports, and historical reports where the runtime is loaded or injected.
- Updated China/Taiwan Watch:
  - removed stale `UPDATED 2026-03-31` fallback badge text
  - section badges now initialize as `UPDATED LIVE FEED`
  - runtime updates section dates from the newest loaded Taiwan/China article timestamp
  - top metrics derive from recent feed keyword/category signals instead of staying purely static
- Top navigation now compresses at narrower desktop widths and switches to the hamburger/mobile menu at tablet widths (`1180px`) to avoid bunched menus.

### Validation Run In This Pass

```bash
npm test
node --check scripts/aggregate-think-tank-news.mjs
node --check assets/user-style.js
node -e "inline script syntax checks for index/news-library/think-tank-latest-news/taiwan-strait"
npx wrangler pages dev . --port 8788
npm start
Browser / Playwright MCP checks against http://localhost:5000
```

Local Wrangler normalized `.html` page URLs to extensionless URLs. These returned `200`:

- `http://localhost:8788/`
- `http://localhost:8788/pages/news-library`
- `http://localhost:8788/pages/think-tank-latest-news`
- `http://localhost:8788/pages/taiwan-strait`

Source/runtime checks confirmed:

- no `e.g. 🇫🇷 France` or `countries/france-dossier.html` placeholder in the edited admin shell
- no raw `&lt;a href` RSS description leakage in the edited pages or generated think-tank news JSON
- no remaining `UPDATED 2026-03-31` marker in `pages/taiwan-strait.html`
- storage sort CSS/functions present in the served admin shell
- report HTML includes `/assets/user-style.js`

Browser validation confirmed:

## 2026-06-05 War Games / Navigation Repair Pass

### Implemented In This Pass

- Removed the duplicate preview-card navigation behavior from the China/Taiwan and Korean Peninsula top-nav dropdowns.
- Added a shared War Gaming Hub link under both theater menus and standardized the labels for the China/Taiwan and Korean Peninsula war-game pages.
- Rebuilt the China/Taiwan and Korean Peninsula war-game pages as standalone flagship pages without a second top navigation bar.
- Added dedicated scenario deep-review pages for six Taiwan scenarios and six Korean Peninsula scenarios, with direct source links and outcome sections.
- Replaced the old Operational Geometry / Conflict Munitions blocks on the war-game pages with sourced terrain/geography and scenario-analysis sections.
- Patched Taiwan force-comparison report pages to use the site action strip, add contents navigation, load global styling, and use `object-fit: contain` so report images are not cropped.
- Updated Taiwan Watch layout:
  - narrower operational map column
  - wider Invasion Window Navigator / Current Threat Picture column
  - longer invasion-window assessments
  - larger text tied to global style variables
  - dedicated prompt keys for Force Comparison and Strategic Assessment sections
  - dynamic Strategic Assessment cards with things to note, things to watch, and 24h / 7d / 1m escalation likelihoods
- Tightened Taiwan Watch latest-reporting filters so unrelated Iran, Somalia, Hezbollah, and North Korea items do not populate the Referenced Reporting section.
- Set default theme to light across the nav config, global style defaults, current static pages, country dossiers, theater pages, war-game pages, and generation templates.
- Added `/api/ai/models` to the local server so the Settings AI model picker no longer 404s, with safe fallback model catalogs when API keys are not configured.
- Added `/favicon.ico` 204 handling to suppress default browser favicon 404 noise.
- Corrected the local server banner to display the active API port.

### Validation Run In This Pass

```bash
node --check server.js
node --check scripts/rebuild-flagship-war-game-pages.mjs
node --check scripts/generate-war-games-deep-dives.mjs
node --check scripts/enhance-war-games-output.mjs
node inline script syntax checks for index.html and pages/taiwan-strait.html
curl -X POST http://localhost:5001/api/ai/models
Playwright/Chrome render checks against http://localhost:5001
```

Rendered checks passed at desktop `1440x1000` and mobile `390x844` for:

- `/index.html`
- `/pages/taiwan-strait.html`
- `/pages/taiwan-war-games.html`
- `/pages/korean-peninsula-war-games.html`
- `/pages/war-gaming-hub.html`
- `/pages/taiwan-scenario-csis-invasion.html`
- `/pages/korea-scenario-guardian-tiger-limited-strike.html`
- `/pages/china-vs-allied-naval-forces-taiwan.html`

The rendered checks confirmed:

- default theme is light
- global style dark-mode settings propagate across shell, watch, war-game, scenario, and force-report pages
- no horizontal overflow at tested desktop or mobile widths
- no standalone `nav.top-nav` remains on the war-game, scenario, or force-report pages checked
- no old `Operational Geometry` or `Conflict Munitions` labels remain on checked war-game surfaces
- no force-report image checked was using `object-fit: cover`
- Taiwan Watch referenced reporting did not include the previously observed unrelated examples
- source-index links on both war-game pages point to report/article URLs, not source homepages

### Resume Notes

- The local validation server was run on `http://localhost:5001`; stop any remaining `node server.js` process before starting another server.
- The Browser connector was not available during this pass, so validation used Playwright with local Chrome.
- The unrelated untracked file `datasources/OSINT & Geopolitics Multi-Region Monitor List.md` should remain uncommitted unless intentionally reviewed.

- top nav stays desktop at 1200px with no horizontal overflow
- top nav switches to hamburger at 900px, and the mobile drawer opens with Think Tanks, Country Dossiers, and other menu entries
- News Library renders all matching local articles (`3938` cards for `3938` matching) with no raw RSS HTML leakage
- News Library mobile layout at 390px has zero horizontal overflow after the card-grid wrapping fix
- Think Tank Latest News renders all `368` generated articles, with no raw `<a href>` text
- Think Tank coverage panel no longer overlaps articles on desktop and drops into normal flow on mobile
- China/Taiwan Watch no longer shows `2026-03-31`; section badges update to the current page date (`2026-06-04` during validation)
- Storage renderer was validated with sample object data: 3 sort headers, row order changes on sort, key-to-size gap about 13px, font size follows style scale, zero overflow
- Local `/reports/countries/china/current/report` and `/reports/countries/china/current/report.html` both load the report and include `/assets/user-style.js`

### Current Validation Limits

- Opera Browser Connector is still unavailable: `Browser not connected`.
- Playwright MCP Browser is available and was used for local visual/layout checks.
- Local Wrangler report extensionless checks can redirect-loop when production R2 objects are not present locally; verify extensionless report URLs on production after deployment.
- Local article cache returned zero items for the News Library `Last 24 hours` filter, even though the all-articles render path works; production should be checked because the user's screenshot showed current production data.

### Next Steps If Resuming

1. Stop any local Wrangler server still running:

   ```bash
   ps -axo pid,command | rg 'wrangler pages dev|aggregate-think-tank-news|node scripts/aggregate' | rg -v rg
   ```

2. Review the intended dirty files before committing:

   ```bash
   git status --short
   git diff --stat
   ```

3. Commit only the project files touched by this pass, leaving pre-existing unrelated dirty files alone:

   ```bash
   git add assets/user-style.js index.html pages/news-library.html pages/think-tank-latest-news.html pages/taiwan-strait.html scripts/aggregate-think-tank-news.mjs data/think-tanks.json data/think-tank-latest-news.json NEXT_STEPS.md
   git commit -m "Fix navigation, news, storage, and watch page rendering"
   git push
   ```

## 2026-06-04 War Games Deep Dive Pass

### Implemented In This Pass

- Created planning files under `docs/planning/`:
  - `WAR_GAMES_DEEP_DIVE_MASTER_PLAN.md`
  - `AGENT_PROGRESS.md`
  - task-specific prompt files for Tasks 1-4
  - `DEPLOYED_TEST_PLAN.md`
- Spawned and incorporated audit-agent output for scenario sources, force-comparison source inventory, and sourced terrain/map recommendations.
- Added local sourced map assets under `assets/maps/`:
  - Taiwan physiography
  - Operation Causeway historical Taiwan planning map
  - North Korea physiography
  - South Korea physiography
  - Pusan Perimeter historical context map
- Updated `pages/taiwan-war-games.html`:
  - Scenario Deep Review cards now include outcome footers and compact scenario data panels.
  - Operational Geometry now uses sourced Taiwan terrain and historical planning maps.
  - The former China/Taiwan munitions card grid was replaced with a Force Comparison Reports index.
- Updated `pages/korean-peninsula-war-games.html`:
  - Scenario Deep Review cards now include outcome footers and compact scenario data panels.
  - Operational Geometry now uses sourced Korean Peninsula terrain and historical logistics-depth maps.
- Generated five Taiwan force-comparison report pages from local datasource reports:
  - `pages/china-vs-allied-naval-forces-taiwan.html`
  - `pages/air-power-china-vs-allies-taiwan.html`
  - `pages/army-forces-china-vs-allies-taiwan.html`
  - `pages/marines-china-vs-allies-taiwan.html`
  - `pages/special-forces-china-vs-allies-taiwan.html`
- Copied local report imagery to `assets/force-comparison/`.
- Added `pages/taiwan-contingency-ai-chip-war.html` as a non-operational strategic risk game with source synthesis, map-led context, assumptions, campaign phases, warning markers, losses/costs, and outcome assessment.
- Added reproducible scripts:
  - `scripts/generate-war-games-deep-dives.mjs`
  - `scripts/enhance-war-games-output.mjs`

### Validation Run In This Pass

```bash
node --check scripts/generate-war-games-deep-dives.mjs
node --check scripts/enhance-war-games-output.mjs
node - <<'NODE'
// Validated 8 war-game/force-comparison pages, local image references,
// /assets/user-style.js inclusion, references sections, preserved force tables,
// and removal of the old Taiwan munitions section.
NODE
```

Local server and browser validation also passed on `http://localhost:5001`:

- HTTP `200` for the two war-game pages, five force-comparison pages, final Taiwan scenario page, and core map assets.
- Playwright/System Chrome checks at 1440px and 390px for the Taiwan war-game page, Korean Peninsula war-game page, final Taiwan scenario page, naval force page, and air force page.
- Browser checks showed zero horizontal overflow, zero broken images, and required page text visible at both viewport widths.

### Remaining Validation Before/After Deploy

1. Start the local app:

   ```bash
   PORT=5001 node server.js
   ```

2. Smoke-test locally:

   - `http://localhost:5001/pages/taiwan-war-games.html`
   - `http://localhost:5001/pages/korean-peninsula-war-games.html`
   - `http://localhost:5001/pages/taiwan-contingency-ai-chip-war.html`
   - each generated Taiwan force-comparison page

3. After GitHub push and Cloudflare deploy, run the checklist in `docs/planning/DEPLOYED_TEST_PLAN.md` against `https://conflictmapper.com`.

4. After Cloudflare Pages deploys, verify production:

   - `https://conflictmapper.com/pages/news-library.html`
   - `https://conflictmapper.com/pages/think-tank-latest-news.html`
   - `https://conflictmapper.com/pages/taiwan-strait.html`
   - `https://conflictmapper.com/reports/countries/china/current/report`
   - `https://conflictmapper.com/reports/countries/china/current/report.html`
   - one historical report URL under `/reports/countries/china/historical/`

5. Manual UI checks still recommended after deploy:

   - storage table sorting and font size from Global Style
   - mobile/tablet top navigation hamburger behavior
   - Think Tank coverage panel no longer overlaps long article links
   - News Library displays all current filtered articles, grouped newest first

## 2026-06-05 Production Validation / Hygiene Patch

### Production Validation Run

- Confirmed latest pushed commit before this patch: `cc0df09 Fix Korean peninsula watch and war games pages`.
- Production routes returned `200`:
  - `https://conflictmapper.com/`
  - `https://conflictmapper.com/pages/korean-peninsula.html`
  - `https://conflictmapper.com/pages/korean-peninsula-war-games.html`
  - `https://conflictmapper.com/pages/war-gaming-hub.html`
  - `https://conflictmapper.com/pages/taiwan-war-games.html`
  - `https://conflictmapper.com/pages/taiwan-strait.html`
  - `https://conflictmapper.com/pages/china-vs-allied-naval-forces-taiwan.html`
  - `https://conflictmapper.com/pages/taiwan-contingency-ai-chip-war.html`
- Playwright/System Chrome rendered production checks at desktop and mobile widths found:
  - no horizontal overflow on checked pages
  - no visible broken images
  - no duplicate `top-subnav` / `local-war-nav` headers
  - Korean watch article and think-tank cards include thumbnails
  - Korean mapped node cards remain hidden behind the collapsed node drawer
  - Korean war page has 6 scenario cards, 5 family cards, 9 matrix cards, and 7 source cards
  - War Gaming Hub has no Taiwan Force Comparison Reports section inside the Korean path

### Hygiene Fixes Prepared

- Added Cloudflare Pages middleware handling for `/favicon.ico` so direct static page loads do not create browser console 404 noise.
- Updated generated war-game lightbox placeholder markup so hidden lightbox images are not counted as broken images before a user opens a map.
- Updated `scripts/rebuild-flagship-war-game-pages.mjs` so future generated pages preserve the fixed lightbox placeholder.

### Validation Run For This Patch

```bash
node --check functions/_middleware.js
node --check scripts/rebuild-flagship-war-game-pages.mjs
git diff --check
npm test
PORT=5002 node server.js
curl -I http://localhost:5002/favicon.ico
Playwright/System Chrome against http://localhost:5002 for affected war-game pages at desktop and mobile widths
npx wrangler pages dev . --port 8789
curl -I http://localhost:8789/favicon.ico
curl http://localhost:8789/pages/korean-peninsula-war-games.html
```

Notes:

- Local Express returned `204` for `/favicon.ico`.
- Wrangler Pages dev returned `204` for `/favicon.ico` and served the updated Korean war-game page with the placeholder lightbox image.
- Wrangler emitted a shutdown-time temporary bundle cleanup error after pressing `x`, after the successful middleware/page checks; it did not affect the validation results.
- Untracked files still intentionally left alone:
  - `datasources/OSINT & Geopolitics Multi-Region Monitor List.md`
  - `datasources/SYSTEM_PROMPT.md`
  - `datasources/korean-peninsula-war-games.html`
  - `datasources/korean-peninsula.html`
  - `datasources/war-gaming-hub.html`
