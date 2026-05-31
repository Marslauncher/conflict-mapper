import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';
import { appendReportLog, generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';
import { loadArticleSet } from '../../../cloudflare/lib/articles.js';

export async function onRequestPost(context) {
  try {
    const payload = await loadArticleSet(context);
    const articles = payload.articles;
    await setReportStatus(context.env, {
      running: true,
      phase: 'queued',
      progress: 1,
      scope: 'global',
      slug: 'global',
      message: 'Global report queued from API request',
      startedAt: new Date().toISOString(),
    });
    await appendReportLog(context.env, {
      message: 'Global report queued from API request',
      details: { scope: 'global', slug: 'global', articleCount: articles.length },
    });
    context.waitUntil(generateAndStoreReport(context.env, { scope: 'global', slug: 'global', articles }).catch(async (err) => {
      await appendReportLog(context.env, {
        level: 'error',
        message: `Global report background job failed: ${err.message}`,
        details: { scope: 'global', slug: 'global' },
      });
    }));
    return jsonResponse({
      success: true,
      data: {
        message: 'Global report generation queued',
        statusUrl: '/api/analysis/status',
      },
    }, { status: 202 });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
