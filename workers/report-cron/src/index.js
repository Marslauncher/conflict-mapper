import { generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';
import { normalizeArticlesPayload, readRemoteJson } from '../../../cloudflare/lib/static-data.js';
import { jsonResponse } from '../../../cloudflare/lib/http.js';

const DEFAULT_COUNTRIES = [
  'usa',
  'china',
  'russia',
  'ukraine',
  'taiwan',
  'iran',
  'israel',
  'india',
  'pakistan',
  'north-korea',
  'nato',
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/__scheduled') {
      ctx.waitUntil(runDailyReports(env, 'manual'));
      return jsonResponse({ success: true, data: { message: 'Scheduled report run queued' } }, { status: 202 });
    }
    return jsonResponse({ success: true, data: { service: 'conflict-mapper-report-cron' } });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runDailyReports(env, controller.cron));
  },
};

async function runDailyReports(env, trigger) {
  const startedAt = new Date().toISOString();
  await setReportStatus(env, {
    running: true,
    phase: 'scheduled',
    message: `Daily report generation started by ${trigger}`,
    startedAt,
  });

  const staticBaseUrl = env.STATIC_SITE_BASE_URL || 'https://conflict-mapper.pages.dev';
  const payload = await readRemoteJson(staticBaseUrl, '/data/articles.json', { articles: [] });
  const articles = normalizeArticlesPayload(payload);
  const countries = (env.REPORT_COUNTRIES || DEFAULT_COUNTRIES.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const results = [];
  results.push(await generateAndStoreReport(env, { scope: 'global', slug: 'global', articles }));

  for (const slug of countries) {
    results.push(await generateAndStoreReport(env, { scope: 'country', slug, articles }));
  }

  await setReportStatus(env, {
    running: false,
    phase: 'complete',
    message: `Daily report generation complete: ${results.length} report(s)`,
    lastRun: new Date().toISOString(),
    lastResult: { trigger, results },
  });

  return results;
}
