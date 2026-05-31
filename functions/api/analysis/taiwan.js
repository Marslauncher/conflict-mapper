import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';
import { loadArticleSet } from '../../../cloudflare/lib/articles.js';
import { generateAndStoreReport } from '../../../cloudflare/lib/reports.js';

export async function onRequestPost(context) {
  try {
    const payload = await loadArticleSet(context);
    context.waitUntil(generateAndStoreReport(context.env, {
      scope: 'watch',
      slug: 'taiwan',
      articles: payload.articles,
    }).catch(() => {}));
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
