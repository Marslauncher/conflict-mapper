import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';
import { refreshArticles } from '../../../cloudflare/lib/articles.js';

export async function onRequestPost(context) {
  try {
    const url = new URL(context.request.url);
    const limitFeeds = Number(url.searchParams.get('limitFeeds') || 50);
    const maxItemsPerFeed = Number(url.searchParams.get('maxItemsPerFeed') || 20);
    const result = await refreshArticles(context, { limitFeeds, maxItemsPerFeed });
    return jsonResponse({
      success: true,
      articlesAdded: result.articlesAdded,
      data: {
        ...result,
        message: `Fetched ${result.articlesAdded} articles from ${result.feedsChecked} RSS feeds`,
      },
    });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
