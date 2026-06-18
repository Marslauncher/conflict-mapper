import { appendReportLog, generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';
import {
  getArticleFetchStatus,
  loadArticleSet,
  refreshArticles,
  validateCachedArticleLinks,
} from '../../../cloudflare/lib/articles.js';
import { loadAppSettings } from '../../../cloudflare/lib/app-settings.js';
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
const DEFAULT_WATCH_CRONS = ['15 3 * * *', '25 3 * * *'];
const DEFAULT_FEED_REFRESH_CRON = '* * * * *';
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
      if (url.searchParams.get('wait') === 'true') {
        const results = await runScheduledPlan(env, plan, 'manual');
        return jsonResponse({
          success: true,
          data: {
            message: 'Scheduled report run completed',
            plan: summarizePlan(plan),
            results,
          },
        });
      }
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
  if (plan.feedOnly) {
    return runFeedOnlyPlan(env, plan, trigger, startedAt);
  }

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
    if (!plan.feedOnly) {
      await setReportStatus(env, {
        running: true,
        phase: 'scheduled-feed-refresh',
        progress: 5,
        message: `${plan.label} refreshing RSS feeds before report generation`,
        startedAt,
      });
    }
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
      message: plan.feedOnly
        ? `Scheduled feed refresh failed: ${err.message}`
        : `Scheduled feed refresh failed; using existing article cache: ${err.message}`,
      details: { plan: plan.label },
    });
    if (!plan.feedOnly) {
      await setReportStatus(env, {
        running: true,
        phase: 'scheduled-feed-warning',
        progress: 8,
        message: `Feed refresh failed; using existing article cache: ${err.message}`,
        startedAt,
      });
    }
  }
}

async function runFeedOnlyPlan(env, plan, trigger, startedAt) {
  const decision = await shouldRunFeedRefresh(env);
  if (!decision.run) {
    await maybeValidateArticleLinks(env, trigger);
    if (env.LOG_SKIPPED_FEED_REFRESH === 'true') {
      await appendReportLog(env, {
        category: 'rss',
        message: `Scheduled RSS refresh skipped: ${decision.reason}`,
        details: { trigger, intervalMinutes: decision.intervalMinutes, lastFetch: decision.lastFetch },
      });
    }
    return [];
  }

  await appendReportLog(env, {
    category: 'rss',
    message: `${plan.label} started by ${trigger}`,
    details: { trigger, intervalMinutes: decision.intervalMinutes },
  });
  const articleContext = createArticleContext(env);
  await maybeRefreshArticles(env, articleContext, plan, startedAt);
  await maybeValidateArticleLinks(env, trigger);
  await appendReportLog(env, {
    category: 'rss',
    message: `${plan.label} complete`,
    details: { trigger },
  });
  return [{ success: true, scope: 'rss', slug: 'articles' }];
}

async function maybeValidateArticleLinks(env, trigger) {
  if (env.ARTICLE_LINK_CHECK_ENABLED === 'false') return;
  try {
    const result = await validateCachedArticleLinks(createArticleContext(env), {
      limit: Number(env.ARTICLE_LINK_CHECK_LIMIT || 20),
      intervalMinutes: Number(env.ARTICLE_LINK_CHECK_INTERVAL_MINUTES || 60),
    });
    if (!result?.skipped) {
      await appendReportLog(env, {
        category: 'rss',
        message: `Scheduled article link validation complete: ${result.checked || 0} checked, ${result.removed || 0} removed`,
        details: { trigger, ...result },
      });
    }
  } catch (err) {
    await appendReportLog(env, {
      level: 'warn',
      category: 'rss',
      message: `Scheduled article link validation failed: ${err.message}`,
      details: { trigger },
    });
  }
}

async function shouldRunFeedRefresh(env) {
  const settings = await loadAppSettings(env);
  if (!settings.autoFetch) {
    return {
      run: false,
      reason: 'automatic refresh disabled in settings',
      intervalMinutes: settings.feedRefreshIntervalMinutes,
    };
  }

  const status = await getArticleFetchStatus(env).catch(() => null);
  if (status?.running) {
    return {
      run: false,
      reason: 'previous feed refresh is still running',
      intervalMinutes: settings.feedRefreshIntervalMinutes,
      lastFetch: status.lastFetch || null,
    };
  }
  const lastFetch = status?.lastFetch || null;
  const lastFetchMs = lastFetch ? new Date(lastFetch).getTime() : 0;
  const intervalMs = settings.feedRefreshIntervalMinutes * 60 * 1000;
  if (Number.isFinite(lastFetchMs) && lastFetchMs > 0 && Date.now() - lastFetchMs < intervalMs - 60000) {
    return {
      run: false,
      reason: 'configured interval has not elapsed',
      intervalMinutes: settings.feedRefreshIntervalMinutes,
      lastFetch,
    };
  }

  return {
    run: true,
    intervalMinutes: settings.feedRefreshIntervalMinutes,
    lastFetch,
  };
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
    await appendReportLog(env, {
      level: 'error',
      category: 'analysis',
      message: `Scheduled ${job.scope}:${job.slug} report failed: ${err.message}`,
      details: {
        scope: job.scope,
        slug: job.slug,
        promptId: job.promptId || defaultPromptIdForJob(env, job),
        stack: String(err.stack || '').slice(0, 1600),
      },
    });
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
  const feedRefreshCron = normalizeCron(env.FEED_REFRESH_CRON || DEFAULT_FEED_REFRESH_CRON);
  const globalCron = normalizeCron(env.REPORT_GLOBAL_CRON || DEFAULT_GLOBAL_CRON);
  const watchCrons = getWatchCrons(env);
  if (trigger === feedRefreshCron) {
    return {
      label: 'Scheduled RSS article refresh',
      refreshFeeds: true,
      feedOnly: true,
      concurrency: 1,
      jobs: [],
    };
  }
  const matchesGlobal = trigger === globalCron;
  const watchIndex = watchCrons.indexOf(trigger);
  const matchesWatch = watchIndex >= 0;
  if (matchesGlobal || matchesWatch) {
    const watchSlugs = getWatchSlugs(env);
    const selectedWatchSlugs = matchesWatch
      ? watchSlugs.filter((_, index) => index % watchCrons.length === watchIndex)
      : [];
    const jobs = [
      ...(matchesGlobal ? [{ scope: 'global', slug: 'global' }] : []),
      ...selectedWatchSlugs.map((slug) => ({ scope: 'watch', slug })),
    ];
    return {
      label: matchesGlobal && matchesWatch
        ? 'Daily global and theater watch jobs'
        : matchesGlobal
          ? 'Daily global analysis job'
          : `Daily theater watch shard ${watchIndex + 1}/${watchCrons.length}`,
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

function getWatchCrons(env) {
  const configured = env.REPORT_WATCH_CRONS || env.REPORT_WATCH_CRON || DEFAULT_WATCH_CRONS.join('|');
  return configured
    .split('|')
    .map(normalizeCron)
    .filter(Boolean);
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
        async fetch(request) {
          const url = new URL(request.url);
          if (url.pathname === '/data/articles.json') {
            const limit = url.searchParams.get('limit') || '5000';
            const response = await fetch(`${cleanBase}/api/articles?limit=${encodeURIComponent(limit)}`, {
              headers: { accept: 'application/json' },
            });
            const payload = response.ok ? await response.json().catch(() => ({})) : {};
            const data = payload.data || payload;
            return jsonResponse({
              articles: Array.isArray(data.articles) ? data.articles : [],
              lastFetch: data.lastFetch || null,
            }, { status: response.ok ? 200 : response.status });
          }
          if (url.pathname === '/data/feeds-config.json') {
            const response = await fetch(`${cleanBase}/api/feeds`, {
              headers: { accept: 'application/json' },
            });
            const payload = response.ok ? await response.json().catch(() => ({})) : {};
            const data = payload.data || payload;
            return jsonResponse({
              feeds: Array.isArray(data.feeds) ? data.feeds : [],
              categories: Array.isArray(data.categories) ? data.categories : [],
            }, { status: response.ok ? 200 : response.status });
          }
          return fetch(new Request(`${cleanBase}${url.pathname}${url.search}`, request));
        },
      },
    },
  };
}
