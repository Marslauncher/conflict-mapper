# Cloudflare-Native Deployment Setup

This repo now includes a Cloudflare-native backend path:

- Pages Functions serve `/api/*`.
- R2 stores generated HTML reports.
- D1 stores current and historical report metadata.
- KV stores runtime status, encrypted AI settings, report logs, and fetched RSS articles.
- A separate Worker runs the daily cron job.

## 1. Deploy The Code

1. Commit and push this repo to `master`.
2. Cloudflare Pages should automatically deploy `Marslauncher/conflict-mapper`.
3. Pages build settings:
   - Build command: empty
   - Build output directory: `.`
   - Root directory: empty
   - Production branch: `master`
   - Compatibility date: `2026-05-28` or newer

## 2. Create Cloudflare Storage

Run these from the repo root after authenticating Wrangler:

```bash
npx wrangler login
npx wrangler kv namespace create CONFIG_KV
npx wrangler r2 bucket create conflict-mapper-reports
npx wrangler d1 create conflict-mapper
```

Record the KV namespace ID and D1 database ID returned by Wrangler.

Apply the D1 schema:

```bash
npx wrangler d1 migrations apply conflict-mapper --remote
```

## 3. Bind Storage To The Pages Project

Cloudflare dashboard path:

`Workers & Pages` -> `conflict-mapper` -> `Settings` -> `Bindings`

Add these production bindings:

| Type | Binding name | Resource |
| --- | --- | --- |
| KV namespace | `CONFIG_KV` | namespace created above |
| R2 bucket | `REPORTS_BUCKET` | `conflict-mapper-reports` |
| D1 database | `DB` | `conflict-mapper` |

Then redeploy the Pages project.

## 4. Add Pages Secrets And Variables

Cloudflare dashboard path:

`Workers & Pages` -> `conflict-mapper` -> `Settings` -> `Variables and Secrets`

Set:

| Name | Type | Example |
| --- | --- | --- |
| `AI_PROVIDER` | variable | `perplexity` |
| `AI_CONFIG_ENCRYPTION_KEY` | secret | long random value; required for saving keys from the app |
| `PERPLEXITY_MODEL` | variable | `sonar-pro` |
| `OPENROUTER_MODEL` | variable | `openai/gpt-4o-mini` |
| `NVIDIA_MODEL` | variable | `nvidia/llama-3.3-nemotron-super-49b-v1` |
| `REPORT_STATUS_STALE_MINUTES` | variable | `5` |
| `REPORT_AI_TIMEOUT_MS` | variable | `45000` |
| `REPORT_AI_ARTICLE_LIMIT` | variable | `32` |
| `ALLOW_REPORT_FALLBACK` | variable | `true` |
| `PERPLEXITY_API_KEY` | secret, optional fallback | only needed if you do not save it from the app |
| `OPENROUTER_API_KEY` | secret, optional fallback | only needed if you do not save it from the app |
| `OPENAI_API_KEY` | secret, optional fallback | only needed if you do not save it from the app |
| `ANTHROPIC_API_KEY` | secret, optional fallback | only needed if you do not save it from the app |
| `GOOGLE_API_KEY` | secret, optional fallback | only needed if you do not save it from the app |
| `NVIDIA_API_KEY` | secret, optional fallback | only needed if you do not save it from the app |

`AI_CONFIG_ENCRYPTION_KEY` is the bootstrap secret that lets the app save provider API keys securely. The admin Settings UI sends provider config to `/api/ai/config`; the Pages Function encrypts the API key with this secret and stores the ciphertext in `CONFIG_KV`. Cloudflare environment secrets remain supported as fallback/default values.

Generate a strong encryption key:

```bash
openssl rand -base64 32
```

Set it for Pages:

```bash
npx wrangler pages secret put AI_CONFIG_ENCRYPTION_KEY --project-name conflict-mapper
```

Do not store AI keys in `assets/*.json`, browser localStorage, or committed files.

## 5. Deploy The Cron Worker

Copy the example config:

```bash
cp workers/report-cron/wrangler.example.toml workers/report-cron/wrangler.toml
```

Edit `workers/report-cron/wrangler.toml`:

- Replace `REPLACE_WITH_KV_NAMESPACE_ID`.
- Replace `REPLACE_WITH_D1_DATABASE_ID`.
- Confirm `STATIC_SITE_BASE_URL = "https://conflict-mapper.pages.dev"`.
- Leave `FETCH_FEEDS_BEFORE_REPORTS = "true"` if the cron job should refresh RSS into KV before generating reports.
- Adjust the cron expression if needed.

Add the same encryption secret to the Worker so scheduled reports can read the saved provider config:

```bash
cd workers/report-cron
npx wrangler secret put AI_CONFIG_ENCRYPTION_KEY
npx wrangler deploy
```

If you prefer fixed Cloudflare secrets instead of app-managed encrypted KV config, also set the provider key on both Pages and the cron Worker:

```bash
npx wrangler pages secret put OPENROUTER_API_KEY --project-name conflict-mapper
cd workers/report-cron
npx wrangler secret put OPENROUTER_API_KEY
```

The default cron is `15 8 * * *`, which runs daily at 08:15 UTC. It refreshes the RSS article cache, then generates the global report, the China/Taiwan watch report, and all configured country reports.

## 6. Verify

Pages endpoints:

```bash
curl https://conflict-mapper.pages.dev/api/status
curl https://conflict-mapper.pages.dev/api/feeds
curl https://conflict-mapper.pages.dev/api/articles?limit=1
curl https://conflict-mapper.pages.dev/api/reports?scope=global
curl https://conflict-mapper.pages.dev/api/storage/reports?prefix=reports/
curl https://conflict-mapper.pages.dev/api/storage/files?prefix=
```

Save a provider key from the deployed app:

1. Open `https://conflict-mapper.pages.dev`.
2. Go to Settings -> AI Config.
3. Select a provider, for example `OpenRouter`.
4. Enter a model, for example `openai/gpt-4o-mini`.
5. Paste the provider API key.
6. Click `Models` to load the latest model list from the selected provider.
7. Select or type the model ID.
8. Click `Test Connection`.
9. Click `Save AI Config`.

The key is encrypted server-side and stored in `CONFIG_KV`; it is not written to the static site or browser storage.

The Model Name field uses `/api/ai/models`. The endpoint queries live provider model-list APIs when available, caches saved-provider lookups in KV for six hours, and falls back to curated defaults if a provider does not expose model discovery or credentials are missing.

Trigger a report manually from the Pages API:

```bash
curl -X POST https://conflict-mapper.pages.dev/api/analysis/global
curl -X POST https://conflict-mapper.pages.dev/api/analysis/country/taiwan
curl -X POST https://conflict-mapper.pages.dev/api/analysis/taiwan
curl https://conflict-mapper.pages.dev/api/analysis/status
```

If a previous deployment left a stale `running: true` status in KV, clear it:

```bash
curl -X POST https://conflict-mapper.pages.dev/api/analysis/status
```

The status endpoint also auto-marks running jobs stale when they have not updated for `REPORT_STATUS_STALE_MINUTES` minutes.

Fetch RSS feeds into the Cloudflare KV article cache:

```bash
curl -X POST "https://conflict-mapper.pages.dev/api/feeds/fetch?limitFeeds=50&maxItemsPerFeed=20"
curl "https://conflict-mapper.pages.dev/api/articles/geo?limit=25"
```

RSS ingestion now loads the monitored Countries and Topics from `CONFIG_KV`, translates non-English article titles/summaries to English when `TRANSLATE_RSS_ARTICLES=true`, filters out articles that do not match monitored topics, and geotags articles to the closest known city, chokepoint, or major place reference instead of falling back to one global coordinate.

The Settings -> Logs page and `/api/logs` expose queued/running/failed report phases plus RSS fetch progress. If report generation fails before calling the AI provider, the log entry includes a mitigation field, for example missing D1 migrations or Cloudflare bindings.

Single-report generation runs inside the request instead of relying on a long background Pages `waitUntil` job. `REPORT_AI_TIMEOUT_MS` prevents stalled provider calls; Perplexity report generation enforces a 45-second minimum because Sonar-Pro can exceed shorter limits. `REPORT_AI_ARTICLE_LIMIT` controls how many top-ranked articles are sent to the AI provider; the report still archives and links the full selected source set, but a smaller AI working set keeps Sonar-Pro and similar models from timing out. If `ALLOW_REPORT_FALLBACK=true`, a provider failure or timeout is logged and the app still writes a source-based fallback report to D1/R2 so storage, archives, and review links complete. `REPORT_STATUS_STALE_MINUTES=5` clears abandoned statuses quickly if an older deployment left `running: true` in KV.

The Settings -> AI Prompts page reads `/api/prompts/reports` and shows editable Global, Country, and China/Taiwan Watch prompt templates for external model runs. Each template can be copied, duplicated, downloaded as a local `.md` prompt file, or saved to Cloudflare R2 under `prompts/*.md`.

The admin Storage section includes an R2 object browser backed by `/api/storage/files`, so generated reports, historical archives, and saved prompt templates can be reviewed from the Settings UI. Report objects are also available through `/api/storage/reports`.

Test the cron Worker manually:

```bash
cd workers/report-cron
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=15+8+*+*+*"
```

## Security Notes

- The frontend admin password remains a browser-local UI gate. It is not equivalent to Cloudflare Access or server-side auth.
- Use Cloudflare Access if this admin panel should be restricted.
- AI-generated report HTML is sanitized before storage to remove scripts and inline event handlers, but generated content should still be reviewed before high-trust use.
- R2 report objects are served through the `/reports/*` Pages Function. Existing checked-in static reports remain as fallback content.
