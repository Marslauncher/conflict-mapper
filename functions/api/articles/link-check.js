import { jsonResponse } from '../../../cloudflare/lib/http.js';
import { validateCachedArticleLinks } from '../../../cloudflare/lib/articles.js';

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const result = await validateCachedArticleLinks(context, {
    limit: boundedInt(url.searchParams.get('limit'), 20, 1, 250),
    force: url.searchParams.get('force') === '1',
  });
  return jsonResponse({
    success: true,
    data: {
      ...result,
      message: result.skipped
        ? `Skipped article link validation: ${result.reason}`
        : `Checked ${result.checked || 0} cached article links; removed ${result.removed || 0}`,
    },
  });
}

function boundedInt(value, fallback, min, max) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  const next = Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
  return Math.max(min, Math.min(next, max));
}
