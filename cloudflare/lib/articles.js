import { filterArticles, normalizeArticlesPayload, readAssetJson } from './static-data.js';
import {
  articleMatchesMonitoringConfig,
  findMatchingCountry,
  loadMonitoringConfig,
} from './monitoring-config.js';

const ARTICLES_KV_KEY = 'articles:v1';
const ARTICLE_FETCH_STATUS_KEY = 'articles:fetch:status';
const MAX_FEED_BYTES = 2_000_000;
const DEFAULT_TRANSLATION_LIMIT = 80;

const GEO_PLACES = [
  { terms: ['naha', 'okinawa'], place: 'Okinawa / Naha', country: 'Japan', lat: 26.2124, lng: 127.6792 },
  { terms: ['amami'], place: 'Amami Islands', country: 'Japan', lat: 28.3772, lng: 129.4937 },
  { terms: ['kyushu', 'fukuoka'], place: 'Kyushu / Fukuoka', country: 'Japan', lat: 33.5902, lng: 130.4017 },
  { terms: ['kanto', 'tokyo'], place: 'Tokyo / Kanto', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { terms: ['kinmen'], place: 'Kinmen', country: 'Taiwan', lat: 24.4368, lng: 118.3186 },
  { terms: ['matsu islands', 'matsu'], place: 'Matsu Islands', country: 'Taiwan', lat: 26.1605, lng: 119.9499 },
  { terms: ['kaohsiung'], place: 'Kaohsiung', country: 'Taiwan', lat: 22.6273, lng: 120.3014 },
  { terms: ['taipei'], place: 'Taipei', country: 'Taiwan', lat: 25.033, lng: 121.5654 },
  { terms: ['taiwan strait'], place: 'Taiwan Strait', country: 'Taiwan', lat: 24.2, lng: 119.8 },
  { terms: ['taiwan'], place: 'Taiwan', country: 'Taiwan', lat: 23.7, lng: 121.0 },
  { terms: ['beijing'], place: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { terms: ['shanghai'], place: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { terms: ['hong kong'], place: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694 },
  { terms: ['guangdong'], place: 'Guangdong', country: 'China', lat: 23.379, lng: 113.7633 },
  { terms: ['pla ', 'people\'s liberation army', 'china', 'chinese'], place: 'China', country: 'China', lat: 35.86, lng: 104.19 },
  { terms: ['washington dc', 'washington, d.c.', 'pentagon'], place: 'Washington DC', country: 'United States', lat: 38.9072, lng: -77.0369 },
  { terms: ['norfolk'], place: 'Norfolk', country: 'United States', lat: 36.8508, lng: -76.2859 },
  { terms: ['san diego'], place: 'San Diego', country: 'United States', lat: 32.7157, lng: -117.1611 },
  { terms: ['united states', 'u.s.', ' usa ', 'america'], place: 'United States', country: 'United States', lat: 38.9, lng: -77.03 },
  { terms: ['moscow'], place: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
  { terms: ['st petersburg', 'saint petersburg'], place: 'Saint Petersburg', country: 'Russia', lat: 59.9311, lng: 30.3609 },
  { terms: ['russia', 'russian'], place: 'Russia', country: 'Russia', lat: 55.76, lng: 37.62 },
  { terms: ['kyiv', 'kiev'], place: 'Kyiv', country: 'Ukraine', lat: 50.4501, lng: 30.5234 },
  { terms: ['odesa', 'odessa'], place: 'Odesa', country: 'Ukraine', lat: 46.4825, lng: 30.7233 },
  { terms: ['kharkiv'], place: 'Kharkiv', country: 'Ukraine', lat: 49.9935, lng: 36.2304 },
  { terms: ['ukraine'], place: 'Ukraine', country: 'Ukraine', lat: 49.0, lng: 31.0 },
  { terms: ['tehran'], place: 'Tehran', country: 'Iran', lat: 35.6892, lng: 51.389 },
  { terms: ['strait of hormuz', 'hormuz'], place: 'Strait of Hormuz', country: 'Iran', lat: 26.5667, lng: 56.25 },
  { terms: ['iran'], place: 'Iran', country: 'Iran', lat: 32.43, lng: 53.69 },
  { terms: ['jerusalem'], place: 'Jerusalem', country: 'Israel', lat: 31.7683, lng: 35.2137 },
  { terms: ['tel aviv'], place: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
  { terms: ['gaza'], place: 'Gaza', country: 'Palestinian Territories', lat: 31.5017, lng: 34.4668 },
  { terms: ['israel'], place: 'Israel', country: 'Israel', lat: 31.5, lng: 34.75 },
  { terms: ['pyongyang'], place: 'Pyongyang', country: 'North Korea', lat: 39.0392, lng: 125.7625 },
  { terms: ['north korea', 'dprk'], place: 'North Korea', country: 'North Korea', lat: 40.34, lng: 127.51 },
  { terms: ['seoul'], place: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
  { terms: ['south korea'], place: 'South Korea', country: 'South Korea', lat: 36.5, lng: 127.8 },
  { terms: ['japan'], place: 'Japan', country: 'Japan', lat: 36.2, lng: 138.25 },
  { terms: ['manila'], place: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842 },
  { terms: ['luzon'], place: 'Luzon', country: 'Philippines', lat: 16.0, lng: 121.0 },
  { terms: ['philippines'], place: 'Philippines', country: 'Philippines', lat: 12.88, lng: 121.77 },
  { terms: ['new delhi'], place: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.209 },
  { terms: ['india'], place: 'India', country: 'India', lat: 20.59, lng: 78.96 },
  { terms: ['islamabad'], place: 'Islamabad', country: 'Pakistan', lat: 33.6844, lng: 73.0479 },
  { terms: ['pakistan'], place: 'Pakistan', country: 'Pakistan', lat: 30.38, lng: 69.35 },
  { terms: ['brussels'], place: 'NATO / Brussels', country: 'Belgium', lat: 50.85, lng: 4.35 },
  { terms: ['nato'], place: 'NATO / Brussels', country: 'Belgium', lat: 50.85, lng: 4.35 },
  { terms: ['bab el-mandeb', 'bab al-mandab'], place: 'Bab el-Mandeb', country: 'Yemen', lat: 12.5833, lng: 43.3333 },
  { terms: ['suez canal', 'suez'], place: 'Suez Canal', country: 'Egypt', lat: 30.5852, lng: 32.2654 },
  { terms: ['red sea'], place: 'Red Sea', country: 'Red Sea', lat: 20.0, lng: 38.0 },
  { terms: ['yemen', 'houthi'], place: 'Yemen', country: 'Yemen', lat: 15.55, lng: 48.5 },
  { terms: ['black sea'], place: 'Black Sea', country: 'Black Sea', lat: 44.4, lng: 34.0 },
  { terms: ['crimea'], place: 'Crimea', country: 'Ukraine', lat: 45.3, lng: 34.4 },
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
  const monitoringConfig = await loadMonitoringConfig(context);
  const enabledFeeds = (feedsPayload.feeds || [])
    .filter((feed) => feed?.enabled !== false && feed.url)
    .slice(0, Math.max(1, Math.min(limitFeeds, 120)));
  const before = await loadArticleSet(context);
  const existing = (before.articles || []).filter((article) => articleMatchesMonitoringConfig(article, monitoringConfig));
  const fetchedAt = new Date().toISOString();
  const nextArticles = [];
  const feedResults = [];
  const translationState = {
    enabled: context.env.TRANSLATE_RSS_ARTICLES !== 'false',
    remaining: readPositiveInt(context.env.RSS_TRANSLATION_LIMIT, DEFAULT_TRANSLATION_LIMIT),
    translated: 0,
    failed: 0,
    skipped: 0,
  };

  await setArticleFetchStatus(context.env, {
    running: true,
    startedAt: fetchedAt,
    message: `Fetching ${enabledFeeds.length} RSS feeds`,
    checkedFeeds: 0,
  });

  for (const feed of enabledFeeds) {
    try {
      const result = await fetchFeedArticles(feed, {
        maxItemsPerFeed,
        fetchedAt,
        monitoringConfig,
        translationState,
      });
      nextArticles.push(...result.articles);
      feedResults.push({
        id: feed.id || feed.name || feed.url,
        ok: true,
        count: result.articles.length,
        ...result.stats,
      });
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
    monitoring: {
      countries: monitoringConfig.countries.length,
      topics: monitoringConfig.topics.length,
    },
    translation: {
      enabled: translationState.enabled,
      translated: translationState.translated,
      failed: translationState.failed,
      skipped: translationState.skipped,
    },
  }));

  await setArticleFetchStatus(context.env, {
    running: false,
    phase: 'complete',
    message: `Fetched ${nextArticles.length} topic-matched articles from ${enabledFeeds.length} feeds`,
    lastFetch: fetchedAt,
    checkedFeeds: enabledFeeds.length,
    totalFeeds: enabledFeeds.length,
    articlesAdded: nextArticles.length,
    totalArticles: merged.length,
    translatedArticles: translationState.translated,
    unmatchedArticles: feedResults.reduce((sum, item) => sum + Number(item.skippedUnmatched || 0), 0),
    feedFailures: feedResults.filter((item) => !item.ok).length,
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

async function fetchFeedArticles(feed, { maxItemsPerFeed, fetchedAt, monitoringConfig, translationState }) {
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
    return parseFeedXml(text, feed, { maxItemsPerFeed, fetchedAt, monitoringConfig, translationState });
  } finally {
    clearTimeout(timer);
  }
}

async function parseFeedXml(xml, feed, { maxItemsPerFeed, fetchedAt, monitoringConfig, translationState }) {
  const itemSegments = extractSegments(xml, 'item');
  const entrySegments = itemSegments.length ? [] : extractSegments(xml, 'entry');
  const segments = (itemSegments.length ? itemSegments : entrySegments).slice(0, maxItemsPerFeed);
  const articles = [];
  const stats = {
    parsed: 0,
    skippedInvalid: 0,
    skippedUnmatched: 0,
    translated: 0,
    geotagged: 0,
  };

  for (const segment of segments) {
    stats.parsed += 1;
    const rawTitle = cleanText(readTag(segment, 'title'));
    const rawDescription = cleanText(readTag(segment, 'description') || readTag(segment, 'summary') || readTag(segment, 'content:encoded') || readTag(segment, 'content'));
    const link = cleanText(readTag(segment, 'link')) || readAtomLink(segment) || feed.url;
    if (!rawTitle || !link) {
      stats.skippedInvalid += 1;
      continue;
    }

    const pubDate = normalizeDate(readTag(segment, 'pubDate') || readTag(segment, 'published') || readTag(segment, 'updated') || fetchedAt);
    const translated = await maybeTranslateArticle(rawTitle, rawDescription, translationState);
    const title = translated.title;
    const description = translated.description;
    const combined = `${title} ${description}`;
    const geo = geotagArticle(combined, feed.country);
    if (geo?.lat && geo?.lng) stats.geotagged += 1;
    if (translated.translated) stats.translated += 1;
    const matchedCountry = findMatchingCountry(combined, monitoringConfig);
    const article = {
      id: await articleId(link, title),
      title,
      description,
      link,
      pubDate,
      source: feed.name || feed.id || new URL(feed.url).hostname,
      sourceUrl: feed.url,
      category: classifyArticle(combined, feed.category),
      country: normalizeCountrySlug(geo?.country || matchedCountry?.slug || feed.country || 'global'),
      geo,
      tags: buildTags(combined, feed.category),
      fetchedAt,
      language: translated.language,
      translated: translated.translated,
      ...(translated.translated ? {
        originalTitle: rawTitle,
        originalDescription: rawDescription,
      } : {}),
    };

    if (!articleMatchesMonitoringConfig(article, monitoringConfig)) {
      stats.skippedUnmatched += 1;
      continue;
    }
    articles.push(article);
  }

  return { articles, stats };
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

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function maybeTranslateArticle(title, description, translationState) {
  const language = detectArticleLanguage(`${title} ${description}`);
  if (!translationState?.enabled || language === 'en') {
    return { title, description, language, translated: false };
  }

  if (translationState.remaining <= 0) {
    translationState.skipped += 1;
    return { title, description, language, translated: false, skipped: 'translation_limit' };
  }

  translationState.remaining -= 1;
  try {
    const translatedTitle = await translateTextToEnglish(title);
    const translatedDescription = description ? await translateTextToEnglish(description.slice(0, 1600)) : '';
    const nextTitle = translatedTitle || title;
    const nextDescription = translatedDescription || description;
    const changed = nextTitle !== title || nextDescription !== description;
    if (changed) translationState.translated += 1;
    return {
      title: nextTitle,
      description: nextDescription,
      language,
      translated: changed,
    };
  } catch (_) {
    translationState.failed += 1;
    return { title, description, language, translated: false, translationError: true };
  }
}

function detectArticleLanguage(text) {
  const value = String(text || '');
  if (/[\u3040-\u30ff]/.test(value)) return 'ja';
  if (/[\u4e00-\u9fff]/.test(value)) return 'zh';
  if (/[\uac00-\ud7af]/.test(value)) return 'ko';
  if (/[\u0400-\u04ff]/.test(value)) return 'ru';
  if (/[\u0600-\u06ff]/.test(value)) return 'ar';
  return 'en';
}

async function translateTextToEnglish(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), 5000);
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(value)}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`translate HTTP ${response.status}`);
    const data = await response.json();
    return (data?.[0] || [])
      .map((part) => Array.isArray(part) ? part[0] : '')
      .filter(Boolean)
      .join('')
      .trim();
  } finally {
    clearTimeout(timer);
  }
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
  const value = normalizeSearchText(text);
  for (const place of GEO_PLACES) {
    if (place.terms.some((term) => hasSearchTerm(value, term))) {
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
    const fallback = GEO_PLACES.find((place) => normalizeCountrySlug(place.country) === normalized && place.confidence !== 0);
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

  return null;
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
    infrastructure: ['power grid', 'telecom', 'subsea cable', 'pipeline', 'port', 'rail', 'airport'],
    maritime: ['shipping', 'vessel', 'port', 'sea', 'strait', 'red sea', 'black sea', 'south china sea'],
    energy: ['oil', 'gas', 'lng', 'pipeline', 'refinery', 'electricity'],
    nuclear: ['nuclear', 'uranium', 'iaea', 'warhead'],
    terrorism: ['terror', 'insurgent', 'isis', 'al qaeda', 'hezbollah', 'houthi', 'hamas'],
    ai: [' ai ', 'artificial intelligence', 'semiconductor', 'chip'],
    robotics: ['robot', 'robotics', 'autonomous', 'unmanned', 'uav', 'uas'],
  })) {
    if (terms.some((term) => value.includes(term))) tags.add(tag);
  }
  return Array.from(tags).slice(0, 8);
}

function normalizeSearchText(value) {
  return ` ${String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function hasSearchTerm(normalizedText, term) {
  const normalizedTerm = normalizeSearchText(term).trim();
  if (!normalizedTerm) return false;
  if (/^[a-z0-9.]+$/i.test(normalizedTerm)) {
    return normalizedText.includes(` ${normalizedTerm} `);
  }
  return normalizedText.includes(normalizedTerm);
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
