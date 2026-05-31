import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';
import { loadArticleSet } from '../../../cloudflare/lib/articles.js';
import { generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';

const COUNTRY_SLUGS = ['usa', 'china', 'russia', 'ukraine', 'taiwan', 'iran', 'israel', 'india', 'pakistan', 'north-korea', 'nato'];

export async function onRequestPost(context) {
  try {
    const payload = await loadArticleSet(context);
    context.waitUntil(runCountryBatch(context.env, payload.articles));
    return jsonResponse({
      success: true,
      data: {
        message: 'All country report generation queued',
        statusUrl: '/api/analysis/status',
      },
    }, { status: 202 });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}

async function runCountryBatch(env, articles) {
  const reports = {};
  for (let i = 0; i < COUNTRY_SLUGS.length; i++) {
    const slug = COUNTRY_SLUGS[i];
    reports[slug] = { done: false };
    await setReportStatus(env, {
      running: true,
      phase: 'batch',
      current: i,
      total: COUNTRY_SLUGS.length,
      progress: Math.round((i / COUNTRY_SLUGS.length) * 100),
      message: `Generating country report ${i + 1}/${COUNTRY_SLUGS.length}: ${slug}`,
      reports,
    });
    try {
      const result = await generateAndStoreReport(env, { scope: 'country', slug, articles });
      reports[slug] = { done: true, success: true, path: result.path };
    } catch (err) {
      reports[slug] = { done: true, success: false, error: err.message };
    }
  }

  await setReportStatus(env, {
    running: false,
    phase: 'complete',
    current: COUNTRY_SLUGS.length,
    total: COUNTRY_SLUGS.length,
    progress: 100,
    message: 'All country reports complete',
    reports,
    lastRun: new Date().toISOString(),
  });
}
