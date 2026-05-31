import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';
import { loadArticleSet } from '../../../cloudflare/lib/articles.js';
import { appendReportLog, generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';

export async function onRequestPost(context) {
  try {
    const payload = await loadArticleSet(context);
    await setReportStatus(context.env, {
      running: true,
      phase: 'queued',
      progress: 1,
      scope: 'watch',
      slug: 'taiwan',
      message: 'China/Taiwan threat watch queued from API request',
      startedAt: new Date().toISOString(),
    });
    await appendReportLog(context.env, {
      message: 'China/Taiwan threat watch queued from API request',
      details: { scope: 'watch', slug: 'taiwan', articleCount: payload.articles.length },
    });
    context.waitUntil(generateAndStoreReport(context.env, {
      scope: 'watch',
      slug: 'taiwan',
      articles: payload.articles,
    }).catch(async (err) => {
      await appendReportLog(context.env, {
        level: 'error',
        message: `China/Taiwan threat watch background job failed: ${err.message}`,
        details: { scope: 'watch', slug: 'taiwan' },
      });
    }));
    return jsonResponse({
      success: true,
      data: {
        message: 'China/Taiwan threat watch generation queued',
        statusUrl: '/api/analysis/status',
      },
    }, { status: 202 });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
