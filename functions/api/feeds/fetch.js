import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';
import { refreshArticles } from '../../../cloudflare/lib/articles.js';
import { appendReportLog } from '../../../cloudflare/lib/reports.js';

export async function onRequestPost(context) {
  try {
    const url = new URL(context.request.url);
    const limitFeeds = boundedInt(url.searchParams.get('limitFeeds'), 6, 1, 30);
    const maxItemsPerFeed = boundedInt(url.searchParams.get('maxItemsPerFeed'), 4, 1, 12);
    const translationLimit = boundedInt(url.searchParams.get('translationLimit'), 4, 0, 40);
    const batchOffset = boundedInt(url.searchParams.get('batchOffset'), 0, 0, 500);
    const concurrency = boundedInt(url.searchParams.get('concurrency'), 1, 1, 6);
    const reprocessExisting = url.searchParams.get('reprocessExisting') === '1';
    const result = await refreshArticles(context, {
      limitFeeds,
      maxItemsPerFeed,
      translationLimit,
      batchOffset,
      concurrency,
      reprocessExisting,
    });
    return jsonResponse({
      success: true,
      articlesAdded: result.articlesAdded,
      data: {
        ...result,
        message: `Fetched ${result.articlesAdded} articles from ${result.feedsChecked} RSS feeds`,
      },
    });
  } catch (err) {
    await appendReportLog(context.env, {
      level: 'error',
      category: 'rss',
      message: `RSS fetch failed: ${err.message}`,
      details: {
        mitigation: 'Use smaller limitFeeds/maxItemsPerFeed values or run the larger refresh from the cron Worker.',
      },
    });
    return errorResponse(err.message, err.status || 500);
  }
}

function boundedInt(value, fallback, min, max) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  const next = Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
  return Math.max(min, Math.min(next, max));
}
