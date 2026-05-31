import { errorResponse, jsonResponse } from '../../../../cloudflare/lib/http.js';
import { appendReportLog, generateAndStoreReport, setReportStatus } from '../../../../cloudflare/lib/reports.js';
import { loadArticleSet } from '../../../../cloudflare/lib/articles.js';

export async function onRequestPost(context) {
  try {
    const slug = context.params.slug;
    const payload = await loadArticleSet(context);
    const articles = payload.articles;
    await setReportStatus(context.env, {
      running: true,
      phase: 'queued',
      progress: 1,
      scope: 'country',
      slug,
      message: `Country report queued from API request: ${slug}`,
      startedAt: new Date().toISOString(),
    });
    await appendReportLog(context.env, {
      message: `Country report queued from API request: ${slug}`,
      details: { scope: 'country', slug, articleCount: articles.length },
    });
    context.waitUntil(generateAndStoreReport(context.env, { scope: 'country', slug, articles }).catch(async (err) => {
      await appendReportLog(context.env, {
        level: 'error',
        message: `Country report background job failed for ${slug}: ${err.message}`,
        details: { scope: 'country', slug },
      });
    }));
    return jsonResponse({
      success: true,
      data: {
        message: `Country report generation queued: ${slug}`,
        statusUrl: '/api/analysis/status',
      },
    }, { status: 202 });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
