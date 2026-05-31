import { errorResponse, jsonResponse } from '../../../../cloudflare/lib/http.js';
import { generateAndStoreReport } from '../../../../cloudflare/lib/reports.js';
import { loadArticleSet } from '../../../../cloudflare/lib/articles.js';

export async function onRequestPost(context) {
  try {
    const slug = context.params.slug;
    const payload = await loadArticleSet(context);
    const articles = payload.articles;
    context.waitUntil(generateAndStoreReport(context.env, { scope: 'country', slug, articles }).catch(() => {}));
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
