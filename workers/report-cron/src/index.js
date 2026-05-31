import { generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';
import { loadArticleSet, refreshArticles } from '../../../cloudflare/lib/articles.js';
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
  const articleContext = createArticleContext(env, staticBaseUrl);
  if (env.FETCH_FEEDS_BEFORE_REPORTS !== 'false') {
    try {
      await refreshArticles(articleContext, {
        limitFeeds: Number(env.REPORT_FEED_LIMIT || 80),
        maxItemsPerFeed: Number(env.REPORT_FEED_ITEMS_PER_FEED || 20),
      });
    } catch (err) {
      await setReportStatus(env, {
        running: true,
        phase: 'scheduled-feed-warning',
        message: `Feed refresh failed; using existing article cache: ${err.message}`,
        startedAt,
      });
    }
  }

  const payload = await loadArticleSet(articleContext);
  const articles = payload.articles;
  const countries = (env.REPORT_COUNTRIES || DEFAULT_COUNTRIES.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const results = [];
  results.push(await runReport(env, { scope: 'global', slug: 'global', articles }));
  results.push(await runReport(env, { scope: 'watch', slug: 'taiwan', articles }));

  for (const slug of countries) {
    results.push(await runReport(env, { scope: 'country', slug, articles }));
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

async function runReport(env, job) {
  try {
    return {
      success: true,
      ...(await generateAndStoreReport(env, job)),
    };
  } catch (err) {
    return {
      success: false,
      scope: job.scope,
      slug: job.slug,
      error: err.message,
    };
  }
}

function createArticleContext(env, staticBaseUrl) {
  const cleanBase = String(staticBaseUrl || '').replace(/\/+$/, '');
  return {
    request: new Request(`${cleanBase}/`),
    env: {
      ...env,
      ASSETS: {
        fetch(request) {
          const url = new URL(request.url);
          return fetch(new Request(`${cleanBase}${url.pathname}${url.search}`, request));
        },
      },
    },
  };
}
