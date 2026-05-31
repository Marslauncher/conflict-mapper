import { errorResponse, jsonResponse, readJsonRequest } from '../../../../cloudflare/lib/http.js';
import { appendReportLog, generateAndStoreReport, setReportStatus } from '../../../../cloudflare/lib/reports.js';
import { loadArticleSet } from '../../../../cloudflare/lib/articles.js';

export async function onRequestPost(context) {
  try {
    const slug = context.params.slug;
    const payload = await loadArticleSet(context);
    const body = await readJsonRequest(context.request);
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
    const result = await generateAndStoreReport(context.env, {
      scope: 'country',
      slug,
      articles,
      promptId: body.promptId || '',
    });
    return jsonResponse({
      success: true,
      data: {
        message: `Country report generation complete: ${slug}`,
        result,
        statusUrl: '/api/analysis/status',
      },
    });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
