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
