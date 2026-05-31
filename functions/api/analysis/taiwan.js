import { errorResponse, jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { loadArticleSet } from '../../../cloudflare/lib/articles.js';
import { appendReportLog, generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';

export async function onRequestPost(context) {
  try {
    const payload = await loadArticleSet(context);
    const body = await readJsonRequest(context.request);
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
    const result = await generateAndStoreReport(context.env, {
      scope: 'watch',
      slug: 'taiwan',
      articles: payload.articles,
      promptId: body.promptId || '',
    });
    return jsonResponse({
      success: true,
      data: {
        message: 'China/Taiwan threat watch generation complete',
        result,
        statusUrl: '/api/analysis/status',
      },
    });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
