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
