import { errorResponse, jsonResponse } from '../../../../cloudflare/lib/http.js';
import { generateAndStoreReport } from '../../../../cloudflare/lib/reports.js';
import { normalizeArticlesPayload, readAssetJson } from '../../../../cloudflare/lib/static-data.js';

export async function onRequestPost(context) {
  try {
    const slug = context.params.slug;
    const payload = await readAssetJson(context, '/data/articles.json', { articles: [] });
    const articles = normalizeArticlesPayload(payload);
    context.waitUntil(generateAndStoreReport(context.env, { scope: 'country', slug, articles }));
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
