import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';
import { generateAndStoreReport } from '../../../cloudflare/lib/reports.js';
import { normalizeArticlesPayload, readAssetJson } from '../../../cloudflare/lib/static-data.js';

export async function onRequestPost(context) {
  try {
    const payload = await readAssetJson(context, '/data/articles.json', { articles: [] });
    const articles = normalizeArticlesPayload(payload);
    context.waitUntil(generateAndStoreReport(context.env, { scope: 'global', slug: 'global', articles }));
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
