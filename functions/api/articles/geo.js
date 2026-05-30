import { jsonResponse } from '../../../cloudflare/lib/http.js';
import { filterArticles, normalizeArticlesPayload, readAssetJson } from '../../../cloudflare/lib/static-data.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const payload = await readAssetJson(context, '/data/articles.json', { articles: [] });
  const allArticles = normalizeArticlesPayload(payload);
  const limit = Number(url.searchParams.get('limit') || 200);
  const country = url.searchParams.get('country') || '';
  const articles = filterArticles(allArticles, { country, limit, geoOnly: true });

  return jsonResponse({
    success: true,
    data: {
      articles,
      total: articles.length,
      source: 'static-asset',
    },
  });
}
