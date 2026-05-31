import { jsonResponse } from '../../../cloudflare/lib/http.js';
import { loadArticles } from '../../../cloudflare/lib/articles.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const limit = Number(url.searchParams.get('limit') || 200);
  const country = url.searchParams.get('country') || '';
  const result = await loadArticles(context, { country, limit, geoOnly: true });

  return jsonResponse({
    success: true,
    data: {
      ...result,
    },
  });
}
