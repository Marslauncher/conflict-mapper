import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';
import { loadArticleSet } from '../../../cloudflare/lib/articles.js';
import { appendReportLog, generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';

const JOBS = [
  { scope: 'global', slug: 'global' },
  { scope: 'watch', slug: 'taiwan' },
  ...['usa', 'china', 'russia', 'ukraine', 'taiwan', 'iran', 'israel', 'india', 'pakistan', 'north-korea', 'nato']
    .map((slug) => ({ scope: 'country', slug })),
];

export async function onRequestPost(context) {
  try {
    const payload = await loadArticleSet(context);
    await appendReportLog(context.env, {
      message: 'All-report batch queued from API request',
      details: { jobs: JOBS.length, articleCount: payload.articles.length },
    });
    context.waitUntil(runAllBatch(context.env, payload.articles));
    return jsonResponse({
      success: true,
      data: {
        message: 'All report generation queued',
        statusUrl: '/api/analysis/status',
      },
    }, { status: 202 });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}

async function runAllBatch(env, articles) {
  const reports = {};
  for (let i = 0; i < JOBS.length; i++) {
    const job = JOBS[i];
    const key = `${job.scope}:${job.slug}`;
    reports[key] = { done: false };
    await setReportStatus(env, {
      running: true,
      phase: 'batch',
      current: i,
      total: JOBS.length,
      progress: Math.round((i / JOBS.length) * 100),
      message: `Generating report ${i + 1}/${JOBS.length}: ${key}`,
      reports,
    });
    try {
      const result = await generateAndStoreReport(env, { ...job, articles });
      reports[key] = { done: true, success: true, path: result.path };
      await appendReportLog(env, {
        message: `Batch report complete: ${key}`,
        details: { key, path: result.path, articleCount: result.articleCount },
      });
    } catch (err) {
      reports[key] = { done: true, success: false, error: err.message };
      await appendReportLog(env, {
        level: 'error',
        message: `Batch report failed: ${key}: ${err.message}`,
        details: { key },
      });
    }
  }

  await setReportStatus(env, {
    running: false,
    phase: 'complete',
    current: JOBS.length,
    total: JOBS.length,
    progress: 100,
    message: 'All reports complete',
    reports,
    lastRun: new Date().toISOString(),
  });
}
