import { appendReportLog, generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';
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

const DEFAULT_GLOBAL_CRON = '0 3 * * *';
const DEFAULT_WATCH_CRON = '0 3 * * *';
const DEFAULT_WATCH_SLUGS = ['taiwan', 'korea'];
const DEFAULT_COUNTRY_CRONS = [
  '30 8 * * *',
  '35 8 * * *',
  '40 8 * * *',
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/__scheduled') {
      const plan = createManualPlan(env, url.searchParams);
      ctx.waitUntil(runScheduledPlan(env, plan, 'manual'));
      return jsonResponse({
        success: true,
        data: {
          message: 'Scheduled report run queued',
          plan: summarizePlan(plan),
        },
      }, { status: 202 });
    }
    return jsonResponse({ success: true, data: { service: 'conflict-mapper-report-cron' } });
  },

  async scheduled(controller, env, ctx) {
    const plan = createCronPlan(env, controller.cron);
    ctx.waitUntil(runScheduledPlan(env, plan, controller.cron));
  },
};

async function runScheduledPlan(env, plan, trigger) {
  const startedAt = new Date().toISOString();
  if (!plan.jobs.length) {
    await appendReportLog(env, {
      level: 'warn',
      category: 'analysis',
      message: `Scheduled trigger ${trigger} did not match any report job`,
      details: { trigger },
    });
    return [];
  }

  await setReportStatus(env, {
    running: true,
    phase: 'scheduled',
    progress: 1,
    message: `${plan.label} started by ${trigger}`,
    startedAt,
    trigger,
    jobs: summarizePlan(plan).jobs,
  });

  const articleContext = createArticleContext(env);
  await maybeRefreshArticles(env, articleContext, plan, startedAt);
  const payload = await loadArticleSet(articleContext);
  const articles = payload.articles;
  await appendReportLog(env, {
    category: 'analysis',
    message: `${plan.label} loaded article cache`,
    details: { trigger, articleCount: articles.length, jobs: summarizePlan(plan).jobs },
  });

  const results = await runJobsWithConcurrency(env, plan.jobs, articles, plan.concurrency);

  await setReportStatus(env, {
    running: false,
    phase: 'complete',
    progress: 100,
    message: `${plan.label} complete: ${results.length} report(s)`,
    lastRun: new Date().toISOString(),
    lastResult: { trigger, results },
  });

  return results;
}

async function maybeRefreshArticles(env, articleContext, plan, startedAt) {
  if (!plan.refreshFeeds) return;
  try {
    await setReportStatus(env, {
      running: true,
      phase: 'scheduled-feed-refresh',
      progress: 5,
      message: `${plan.label} refreshing RSS feeds before report generation`,
      startedAt,
    });
    const timeoutMs = Number(env.REPORT_FEED_REFRESH_TIMEOUT_MS || 45000);
    await Promise.race([
      refreshArticles(articleContext, {
        limitFeeds: Number(env.REPORT_FEED_LIMIT || 80),
        maxItemsPerFeed: Number(env.REPORT_FEED_ITEMS_PER_FEED || 20),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Feed refresh exceeded ${timeoutMs}ms`)), timeoutMs)),
    ]);
  } catch (err) {
    await appendReportLog(env, {
      level: 'warn',
      category: 'rss',
      message: `Scheduled feed refresh failed; using existing article cache: ${err.message}`,
      details: { plan: plan.label },
    });
    await setReportStatus(env, {
      running: true,
      phase: 'scheduled-feed-warning',
      progress: 8,
      message: `Feed refresh failed; using existing article cache: ${err.message}`,
      startedAt,
    });
  }
}

async function runJobsWithConcurrency(env, jobs, articles, concurrency = 1) {
  const pending = [...jobs];
  const results = [];
  const workerCount = Math.max(1, Math.min(Number(concurrency) || 1, pending.length));
  const runners = Array.from({ length: workerCount }, async () => {
    while (pending.length) {
      const job = pending.shift();
      results.push(await runReport(env, { ...job, articles }));
    }
  });
  await Promise.all(runners);
  return results.sort((a, b) => `${a.scope}:${a.slug}`.localeCompare(`${b.scope}:${b.slug}`));
}

async function runReport(env, job) {
  try {
    return {
      success: true,
      ...(await generateAndStoreReport(env, {
        ...job,
        promptId: job.promptId || defaultPromptIdForJob(env, job),
      })),
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

function createCronPlan(env, cron) {
  const trigger = normalizeCron(cron);
  const countries = getReportCountries(env);
  const countryCrons = getCountryCrons(env);
  const countryIndex = countryCrons.indexOf(trigger);
  const globalCron = normalizeCron(env.REPORT_GLOBAL_CRON || DEFAULT_GLOBAL_CRON);
  const watchCron = normalizeCron(env.REPORT_WATCH_CRON || DEFAULT_WATCH_CRON);
  const matchesGlobal = trigger === globalCron;
  const matchesWatch = trigger === watchCron;
  if (matchesGlobal || matchesWatch) {
    const watchSlugs = getWatchSlugs(env);
    const jobs = [
      ...(matchesGlobal ? [{ scope: 'global', slug: 'global' }] : []),
      ...(matchesWatch ? watchSlugs.map((slug) => ({ scope: 'watch', slug })) : []),
    ];
    return {
      label: matchesGlobal && matchesWatch
        ? 'Daily global and theater watch jobs'
        : matchesGlobal
          ? 'Daily global analysis job'
          : 'Daily theater watch jobs',
      refreshFeeds: matchesGlobal
        ? env.FETCH_FEEDS_BEFORE_REPORTS !== 'false'
        : env.FETCH_FEEDS_BEFORE_WATCH !== 'false' && env.FETCH_FEEDS_BEFORE_REPORTS === 'always',
      concurrency: 1,
      jobs,
    };
  }
  if (countryIndex >= 0) {
    const shardCountries = countries.filter((_, index) => index % countryCrons.length === countryIndex);
    return {
      label: `Daily country analysis shard ${countryIndex + 1}/${countryCrons.length}`,
      refreshFeeds: env.FETCH_FEEDS_BEFORE_COUNTRY_REPORTS === 'true',
      concurrency: Number(env.REPORT_COUNTRY_PARALLELISM || 2),
      jobs: shardCountries.map((country) => ({ scope: 'country', slug: country })),
    };
  }
  return { label: `Unmatched scheduled job ${trigger}`, refreshFeeds: false, concurrency: 1, jobs: [] };
}

function createManualPlan(env, params) {
  const scope = String(params.get('scope') || 'global').toLowerCase();
  const slug = String(params.get('slug') || '').trim();
  if (scope === 'countries' || scope === 'all-countries') {
    return {
      label: 'Manual all-country analysis batch',
      refreshFeeds: params.get('refreshFeeds') === 'true',
      concurrency: Number(params.get('concurrency') || env.REPORT_COUNTRY_PARALLELISM || 3),
      jobs: getReportCountries(env).map((country) => ({ scope: 'country', slug: country })),
    };
  }
  if (scope === 'country') {
    return {
      label: `Manual country analysis job: ${slug || 'usa'}`,
      refreshFeeds: params.get('refreshFeeds') === 'true',
      concurrency: 1,
      jobs: [{ scope: 'country', slug: slug || 'usa' }],
    };
  }
  if (scope === 'watch') {
    return {
      label: `Manual watch analysis job: ${slug || 'taiwan'}`,
      refreshFeeds: params.get('refreshFeeds') === 'true',
      concurrency: 1,
      jobs: [{ scope: 'watch', slug: slug || 'taiwan' }],
    };
  }
  return {
    label: 'Manual global analysis job',
    refreshFeeds: params.get('refreshFeeds') !== 'false',
    concurrency: 1,
    jobs: [{ scope: 'global', slug: 'global' }],
  };
}

function defaultPromptIdForJob(env, job) {
  if (job.scope === 'global') return env.REPORT_GLOBAL_PROMPT_ID || 'global';
  if (job.scope === 'watch') {
    const slug = String(job.slug || '').toLowerCase();
    if (slug === 'korea' || slug === 'korean-peninsula') {
      return env.REPORT_KOREA_WATCH_PROMPT_ID || 'watch-korea';
    }
    if (slug === 'taiwan' || slug === 'china-taiwan') {
      return env.REPORT_TAIWAN_WATCH_PROMPT_ID || env.REPORT_WATCH_PROMPT_ID || 'watch-taiwan';
    }
    return env.REPORT_WATCH_PROMPT_ID || 'watch-taiwan';
  }
  return env.REPORT_COUNTRY_PROMPT_ID || 'country';
}

function getWatchSlugs(env) {
  return (env.REPORT_WATCH_SLUGS || DEFAULT_WATCH_SLUGS.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getReportCountries(env) {
  return (env.REPORT_COUNTRIES || DEFAULT_COUNTRIES.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCountryCrons(env) {
  return (env.REPORT_COUNTRY_CRONS || DEFAULT_COUNTRY_CRONS.join('|'))
    .split('|')
    .map(normalizeCron)
    .filter(Boolean);
}

function normalizeCron(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function summarizePlan(plan) {
  return {
    label: plan.label,
    refreshFeeds: plan.refreshFeeds,
    concurrency: plan.concurrency,
    jobs: plan.jobs.map((job) => `${job.scope}:${job.slug}`),
  };
}

function createArticleContext(env) {
  const staticBaseUrl = env.STATIC_SITE_BASE_URL || 'https://conflict-mapper.pages.dev';
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
