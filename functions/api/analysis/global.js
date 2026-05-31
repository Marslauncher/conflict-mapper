import { errorResponse, jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { appendReportLog, generateAndStoreReport, setReportStatus } from '../../../cloudflare/lib/reports.js';
import { loadArticleSet } from '../../../cloudflare/lib/articles.js';

export async function onRequestPost(context) {
  try {
    const payload = await loadArticleSet(context);
    const body = await readJsonRequest(context.request);
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
    const result = await generateAndStoreReport(context.env, {
      scope: 'global',
      slug: 'global',
      articles,
      promptId: body.promptId || '',
    });
    return jsonResponse({
      success: true,
      data: {
        message: 'Global report generation complete',
        result,
        statusUrl: '/api/analysis/status',
      },
    });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
