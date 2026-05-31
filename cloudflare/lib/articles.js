import { filterArticles, normalizeArticlesPayload, readAssetJson } from './static-data.js';

const ARTICLES_KV_KEY = 'articles:v1';
const ARTICLE_FETCH_STATUS_KEY = 'articles:fetch:status';
const MAX_FEED_BYTES = 2_000_000;

const GEO_PLACES = [
  { terms: ['taiwan strait', 'taiwan', 'taipei'], place: 'Taiwan', country: 'Taiwan', lat: 23.7, lng: 121.0 },
  { terms: ['china', 'beijing', 'pla ', 'chinese'], place: 'China', country: 'China', lat: 35.86, lng: 104.19 },
  { terms: ['united states', 'u.s.', ' us ', 'usa', 'washington'], place: 'United States', country: 'United States', lat: 38.9, lng: -77.03 },
  { terms: ['russia', 'moscow', 'russian'], place: 'Russia', country: 'Russia', lat: 55.76, lng: 37.62 },
  { terms: ['ukraine', 'kyiv', 'odessa', 'odesa'], place: 'Ukraine', country: 'Ukraine', lat: 49.0, lng: 31.0 },
  { terms: ['iran', 'tehran'], place: 'Iran', country: 'Iran', lat: 32.43, lng: 53.69 },
  { terms: ['israel', 'jerusalem', 'tel aviv', 'gaza'], place: 'Israel/Gaza', country: 'Israel', lat: 31.5, lng: 34.75 },
  { terms: ['north korea', 'pyongyang', 'dprk'], place: 'North Korea', country: 'North Korea', lat: 40.34, lng: 127.51 },
  { terms: ['south korea', 'seoul'], place: 'South Korea', country: 'South Korea', lat: 36.5, lng: 127.8 },
  { terms: ['japan', 'tokyo', 'okinawa'], place: 'Japan', country: 'Japan', lat: 36.2, lng: 138.25 },
  { terms: ['philippines', 'manila', 'luzon'], place: 'Philippines', country: 'Philippines', lat: 12.88, lng: 121.77 },
  { terms: ['india', 'new delhi'], place: 'India', country: 'India', lat: 20.59, lng: 78.96 },
  { terms: ['pakistan', 'islamabad'], place: 'Pakistan', country: 'Pakistan', lat: 30.38, lng: 69.35 },
  { terms: ['nato', 'brussels'], place: 'NATO / Brussels', country: 'Belgium', lat: 50.85, lng: 4.35 },
  { terms: ['red sea', 'yemen', 'houthi'], place: 'Red Sea / Yemen', country: 'Yemen', lat: 15.55, lng: 48.5 },
  { terms: ['black sea', 'crimea'], place: 'Black Sea', country: 'Ukraine', lat: 44.4, lng: 34.0 },
  { terms: ['south china sea', 'spratly', 'scarborough'], place: 'South China Sea', country: 'China', lat: 12.0, lng: 114.0 },
  { terms: ['arctic', 'greenland'], place: 'Arctic', country: 'Arctic', lat: 75.0, lng: -42.0 },
  { terms: ['europe', 'eu ', 'european'], place: 'Europe', country: 'Europe', lat: 50.1, lng: 14.4 },
  { terms: ['middle east', 'persian gulf'], place: 'Middle East', country: 'Middle East', lat: 29.3, lng: 47.5 },
];

export async function loadArticleSet(context) {
  const staticPayload = await readAssetJson(context, '/data/articles.json', { articles: [] });
  const staticArticles = normalizeArticlesPayload(staticPayload);

  if (!context.env.CONFIG_KV) {
    return {
      articles: staticArticles,
      lastFetch: staticPayload.lastFetch || null,
      source: 'static-asset',
    };
  }

  const raw = await context.env.CONFIG_KV.get(ARTICLES_KV_KEY);
  if (!raw) {
    return {
      articles: staticArticles,
      lastFetch: staticPayload.lastFetch || null,
      source: 'static-asset',
    };
  }

  try {
    const payload = JSON.parse(raw);
    const kvArticles = normalizeArticlesPayload(payload);
    return {
      articles: kvArticles.length ? kvArticles : staticArticles,
      lastFetch: payload.lastFetch || staticPayload.lastFetch || null,
      source: kvArticles.length ? 'config-kv' : 'static-asset',
    };
  } catch (_) {
    return {
      articles: staticArticles,
      lastFetch: staticPayload.lastFetch || null,
      source: 'static-asset',
    };
  }
}

export async function loadArticles(context, { country = '', limit = 200, geoOnly = false } = {}) {
  const payload = await loadArticleSet(context);
  const articles = filterArticles(payload.articles, { country, limit, geoOnly });
  return {
    articles,
    total: payload.articles.length,
    returned: articles.length,
    lastFetch: payload.lastFetch,
    source: payload.source,
  };
}

export async function refreshArticles(context, { limitFeeds = 50, maxItemsPerFeed = 20 } = {}) {
  if (!context.env.CONFIG_KV) throw new Error('CONFIG_KV binding is required to persist fetched articles');

  const feedsPayload = await readAssetJson(context, '/data/feeds-config.json', { feeds: [] });
  const enabledFeeds = (feedsPayload.feeds || [])
    .filter((feed) => feed?.enabled !== false && feed.url)
    .slice(0, Math.max(1, Math.min(limitFeeds, 120)));
  const before = await loadArticleSet(context);
  const existing = before.articles || [];
  const fetchedAt = new Date().toISOString();
  const nextArticles = [];
  const feedResults = [];

  await setArticleFetchStatus(context.env, {
    running: true,
    startedAt: fetchedAt,
    message: `Fetching ${enabledFeeds.length} RSS feeds`,
    checkedFeeds: 0,
  });

  for (const feed of enabledFeeds) {
    try {
      const items = await fetchFeedArticles(feed, { maxItemsPerFeed, fetchedAt });
      nextArticles.push(...items);
      feedResults.push({ id: feed.id || feed.name || feed.url, ok: true, count: items.length });
    } catch (err) {
      feedResults.push({ id: feed.id || feed.name || feed.url, ok: false, error: err.message });
    }

    await setArticleFetchStatus(context.env, {
      running: true,
      startedAt: fetchedAt,
      message: `Fetched ${feedResults.length}/${enabledFeeds.length} feeds`,
      checkedFeeds: feedResults.length,
      totalFeeds: enabledFeeds.length,
    });
  }

  const merged = dedupeArticles([...nextArticles, ...existing])
    .sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime())
    .slice(0, 5000);

  await context.env.CONFIG_KV.put(ARTICLES_KV_KEY, JSON.stringify({
    version: 1,
    lastFetch: fetchedAt,
    articles: merged,
    feedResults: feedResults.slice(0, 200),
  }));

  await setArticleFetchStatus(context.env, {
    running: false,
    phase: 'complete',
    message: `Fetched ${nextArticles.length} articles from ${enabledFeeds.length} feeds`,
    lastFetch: fetchedAt,
    checkedFeeds: enabledFeeds.length,
    totalFeeds: enabledFeeds.length,
    articlesAdded: nextArticles.length,
    totalArticles: merged.length,
  });

  return {
    articlesAdded: nextArticles.length,
    totalArticles: merged.length,
    feedsChecked: enabledFeeds.length,
    feedResults,
    lastFetch: fetchedAt,
  };
}

export async function getArticleFetchStatus(env) {
  if (!env.CONFIG_KV) return null;
  const raw = await env.CONFIG_KV.get(ARTICLE_FETCH_STATUS_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function setArticleFetchStatus(env, status) {
  if (!env.CONFIG_KV) return;
  await env.CONFIG_KV.put(ARTICLE_FETCH_STATUS_KEY, JSON.stringify({
    updatedAt: new Date().toISOString(),
    ...status,
  }));
}

async function fetchFeedArticles(feed, { maxItemsPerFeed, fetchedAt }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), 12000);
  try {
    const response = await fetch(feed.url, {
      headers: {
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
        'user-agent': 'ConflictMapper/1.0 (+https://conflict-mapper.pages.dev)',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_FEED_BYTES) throw new Error(`Feed too large: ${length} bytes`);

    const text = await response.text();
    if (text.length > MAX_FEED_BYTES) throw new Error(`Feed too large: ${text.length} bytes`);
    return parseFeedXml(text, feed, { maxItemsPerFeed, fetchedAt });
  } finally {
    clearTimeout(timer);
  }
}

async function parseFeedXml(xml, feed, { maxItemsPerFeed, fetchedAt }) {
  const itemSegments = extractSegments(xml, 'item');
  const entrySegments = itemSegments.length ? [] : extractSegments(xml, 'entry');
  const segments = (itemSegments.length ? itemSegments : entrySegments).slice(0, maxItemsPerFeed);
  const articles = [];

  for (const segment of segments) {
    const title = cleanText(readTag(segment, 'title'));
    const description = cleanText(readTag(segment, 'description') || readTag(segment, 'summary') || readTag(segment, 'content:encoded') || readTag(segment, 'content'));
    const link = cleanText(readTag(segment, 'link')) || readAtomLink(segment) || feed.url;
    if (!title || !link) continue;

    const pubDate = normalizeDate(readTag(segment, 'pubDate') || readTag(segment, 'published') || readTag(segment, 'updated') || fetchedAt);
    const combined = `${title} ${description}`;
    const geo = geotagArticle(combined, feed.country);
    const article = {
      id: await articleId(link, title),
      title,
      description,
      link,
      pubDate,
      source: feed.name || feed.id || new URL(feed.url).hostname,
      sourceUrl: feed.url,
      category: classifyArticle(combined, feed.category),
      country: normalizeCountrySlug(geo?.country || feed.country || 'global'),
      geo,
      tags: buildTags(combined, feed.category),
      fetchedAt,
    };
    articles.push(article);
  }

  return articles;
}

function extractSegments(xml, tagName) {
  const regex = new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return xml.match(regex) || [];
}

function readTag(segment, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = segment.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? decodeEntities(stripCdata(match[1])) : '';
}

function readAtomLink(segment) {
  const match = segment.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match ? decodeEntities(match[1]) : '';
}

function cleanText(value) {
  return decodeEntities(String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function stripCdata(value) {
  return String(value || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function decodeEntities(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity) => {
    const key = entity.toLowerCase();
    if (key[0] === '#') {
      const code = key[1] === 'x' ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    }
    return named[key] || _;
  });
}

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function articleId(link, title) {
  const bytes = new TextEncoder().encode(`${link}|${title}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function dedupeArticles(articles) {
  const seen = new Set();
  const result = [];
  for (const article of articles) {
    const key = String(article.link || article.id || article.title || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(article);
  }
  return result;
}

function classifyArticle(text, fallback = 'breaking') {
  const value = ` ${String(text || '').toLowerCase()} `;
  if (/( missile| drone| airstrike| warship| defense| defence| military| troop| weapon| nato| army| navy| air force )/.test(value)) return 'military';
  if (/( cyber| ransomware| malware| telecom| satellite| space| ai | artificial intelligence| semiconductor| chip )/.test(value)) return 'technology';
  if (/( oil| gas| energy| shipping| port| supply chain| sanctions| market| trade )/.test(value)) return 'economic';
  if (/( election| diplomacy| minister| president| parliament| un | treaty )/.test(value)) return 'political';
  return fallback || 'breaking';
}

function geotagArticle(text, fallbackCountry = 'global') {
  const value = ` ${String(text || '').toLowerCase()} `;
  for (const place of GEO_PLACES) {
    if (place.terms.some((term) => value.includes(` ${term.toLowerCase()} `) || value.includes(term.toLowerCase()))) {
      return {
        lat: place.lat,
        lng: place.lng,
        place: place.place,
        country: place.country,
        confidence: 0.72,
      };
    }
  }

  const normalized = normalizeCountrySlug(fallbackCountry);
  if (normalized && normalized !== 'global') {
    const fallback = GEO_PLACES.find((place) => normalizeCountrySlug(place.country) === normalized);
    if (fallback) {
      return {
        lat: fallback.lat,
        lng: fallback.lng,
        place: fallback.place,
        country: fallback.country,
        confidence: 0.45,
      };
    }
  }

  return {
    lat: 20,
    lng: 0,
    place: 'Global',
    country: 'global',
    confidence: 0.25,
  };
}

function buildTags(text, fallback) {
  const value = String(text || '').toLowerCase();
  const tags = new Set([fallback || 'breaking']);
  for (const [tag, terms] of Object.entries({
    taiwan: ['taiwan', 'strait', 'pla'],
    china: ['china', 'chinese', 'beijing'],
    russia: ['russia', 'russian', 'moscow'],
    ukraine: ['ukraine', 'kyiv'],
    iran: ['iran', 'tehran'],
    israel: ['israel', 'gaza'],
    cyber: ['cyber', 'ransomware', 'malware'],
    maritime: ['shipping', 'vessel', 'port', 'sea'],
    ai: [' ai ', 'artificial intelligence', 'semiconductor', 'chip'],
  })) {
    if (terms.some((term) => value.includes(term))) tags.add(tag);
  }
  return Array.from(tags).slice(0, 8);
}

function normalizeCountrySlug(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'global';
  const aliases = {
    'united states': 'usa',
    us: 'usa',
    'u.s.': 'usa',
    america: 'usa',
    'north korea': 'north-korea',
    dprk: 'north-korea',
    'south korea': 'south-korea',
    nato: 'nato',
  };
  return aliases[normalized] || normalized.replace(/\s+/g, '-');
}
