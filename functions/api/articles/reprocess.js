import { jsonResponse } from '../../../cloudflare/lib/http.js';
import { reprocessStoredArticleCache } from '../../../cloudflare/lib/articles.js';

export async function onRequestPost(context) {
  const result = await reprocessStoredArticleCache(context);
  return jsonResponse({
    success: true,
    data: {
      ...result,
      message: `Reprocessed ${result.totalArticles} cached RSS library articles`,
    },
  });
}
