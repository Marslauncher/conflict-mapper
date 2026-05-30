import { jsonResponse } from '../../cloudflare/lib/http.js';
import { readAssetJson } from '../../cloudflare/lib/static-data.js';

export async function onRequestGet(context) {
  const config = await readAssetJson(context, '/data/feeds-config.json', { feeds: [], categories: [] });
  const feeds = Array.isArray(config.feeds) ? config.feeds : [];
  return jsonResponse({
    success: true,
    data: {
      feeds,
      categories: config.categories || [],
      total: feeds.length,
      enabled: feeds.filter((feed) => feed.enabled !== false).length,
      source: 'static-asset',
    },
  });
}

export async function onRequestPost() {
  return jsonResponse({
    success: false,
    error: 'Feed mutations are not enabled in Cloudflare Pages Functions yet. Store feed config in KV or update data/feeds-config.json through Git.',
  }, { status: 409 });
}
