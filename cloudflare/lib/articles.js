import { filterArticles, normalizeArticlesPayload, readAssetJson } from './static-data.js';
import {
  articleMatchesMonitoringConfig,
  findMatchingCountry,
  loadMonitoringConfig,
} from './monitoring-config.js';
import { appendReportLog } from './reports.js';

const ARTICLES_KV_KEY = 'articles:v1';
const ARTICLES_R2_KEY = 'articles/cache.json';
const ARTICLE_FETCH_STATUS_KEY = 'articles:fetch:status';
const MAX_FEED_BYTES = 2_000_000;
const DEFAULT_TRANSLATION_LIMIT = 80;

const GEO_PLACES = [
  { terms: ['沖縄', '那覇', 'naha', 'okinawa'], place: 'Okinawa / Naha', country: 'Japan', lat: 26.2124, lng: 127.6792 },
  { terms: ['奄美', 'amami'], place: 'Amami Islands', country: 'Japan', lat: 28.3772, lng: 129.4937 },
  { terms: ['九州', '福岡', 'kyushu', 'fukuoka'], place: 'Kyushu / Fukuoka', country: 'Japan', lat: 33.5902, lng: 130.4017 },
  { terms: ['関東', '東京', 'kanto', 'tokyo'], place: 'Tokyo / Kanto', country: 'Japan', lat: 35.6762, lng: 139.6503 },
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
  const monitoringConfig = await loadMonitoringConfig(context);
  const storedPayload = await readStoredArticlePayload(context);

  if (!storedPayload) {
    const articles = normalizeExistingArticles(staticArticles, monitoringConfig);
    return {
      articles,
      lastFetch: staticPayload.lastFetch || null,
      source: 'static-asset',
    };
  }

  try {
    const payload = storedPayload.payload;
    const kvArticles = normalizeArticlesPayload(payload);
    const articles = kvArticles.length
      ? filterCachedArticles(kvArticles, monitoringConfig)
      : normalizeExistingArticles(staticArticles, monitoringConfig);
    return {
      articles,
      lastFetch: payload.lastFetch || staticPayload.lastFetch || null,
      source: kvArticles.length ? storedPayload.source : 'static-asset',
    };
  } catch (_) {
    const articles = normalizeExistingArticles(staticArticles, monitoringConfig);
    return {
      articles,
      lastFetch: staticPayload.lastFetch || null,
      source: 'static-asset',
    };
  }
}

async function readStoredArticlePayload(context) {
  const env = context.env || {};

  if (env.REPORTS_BUCKET) {
    try {
      const object = await env.REPORTS_BUCKET.get(ARTICLES_R2_KEY);
      if (object) {
        return {
          payload: JSON.parse(await object.text()),
          source: 'r2',
        };
      }
    } catch (err) {
      console.warn(`R2 article cache read skipped: ${err.message}`);
    }
  }

  if (env.CONFIG_KV) {
    try {
      const raw = await env.CONFIG_KV.get(ARTICLES_KV_KEY);
      if (raw) {
        return {
          payload: JSON.parse(raw),
          source: 'config-kv',
        };
      }
    } catch (err) {
      console.warn(`KV article cache read skipped: ${err.message}`);
    }
  }

  return null;
}

async function writeArticlePayload(env, payload) {
  const body = JSON.stringify(payload);
  if (env.REPORTS_BUCKET) {
    await env.REPORTS_BUCKET.put(ARTICLES_R2_KEY, body, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    });
    return 'r2';
  }
  if (env.CONFIG_KV) {
    await env.CONFIG_KV.put(ARTICLES_KV_KEY, body);
    return 'config-kv';
  }
  throw new Error('REPORTS_BUCKET or CONFIG_KV binding is required to persist fetched articles');
}

function filterCachedArticles(articles, monitoringConfig) {
  return (articles || [])
    .filter((article) => article && (article.title || article.description || article.link))
    .filter((article) => articleMatchesMonitoringConfig(article, monitoringConfig))
    .slice(0, 5000);
}

export async function loadArticles(context, { country = '', limit = 200, geoOnly = false } = {}) {
  const payload = await loadArticleSet(context);
  const dedupedArticles = dedupeArticles(payload.articles || []);
  const articles = filterArticles(dedupedArticles, { country, limit, geoOnly });
  return {
    articles,
    total: dedupedArticles.length,
    rawTotal: payload.articles.length,
    returned: articles.length,
    lastFetch: payload.lastFetch,
    source: payload.source,
  };
}

export async function refreshArticles(context, {
  limitFeeds = 6,
  maxItemsPerFeed = 4,
  translationLimit = null,
  batchOffset = 0,
  concurrency = 1,
  reprocessExisting = false,
} = {}) {
  if (!context.env.CONFIG_KV && !context.env.REPORTS_BUCKET) {
    throw new Error('REPORTS_BUCKET or CONFIG_KV binding is required to persist fetched articles');
  }

  const feedsPayload = await readAssetJson(context, '/data/feeds-config.json', { feeds: [] });
  const monitoringConfig = await loadMonitoringConfig(context);
  const safeLimitFeeds = Math.max(1, Math.min(readPositiveInt(limitFeeds, 150), 200));
  const safeMaxItems = Math.max(1, Math.min(readPositiveInt(maxItemsPerFeed, 4), 25));
  const safeConcurrency = Math.max(1, Math.min(readPositiveInt(concurrency, 1), 6));
  const safeBatchOffset = Math.max(0, readNonNegativeInt(batchOffset, 0));
  const configuredTranslationLimit = readNonNegativeInt(context.env.RSS_TRANSLATION_LIMIT, DEFAULT_TRANSLATION_LIMIT);
  const safeTranslationLimit = translationLimit === null
    ? configuredTranslationLimit
    : Math.min(configuredTranslationLimit, readNonNegativeInt(translationLimit, 4));
  const allEnabledFeeds = (feedsPayload.feeds || [])
    .filter((feed) => feed?.enabled !== false && feed.url);
  const enabledFeeds = allEnabledFeeds.slice(safeBatchOffset, safeBatchOffset + safeLimitFeeds);
  const before = await loadArticleSet(context);
  const fetchedAt = new Date().toISOString();
  const nextArticles = [];
  const feedResults = [];
  const translationState = {
    enabled: context.env.TRANSLATE_RSS_ARTICLES !== 'false',
    remaining: safeTranslationLimit,
    translated: 0,
    failed: 0,
    skipped: 0,
  };
  const existing = reprocessExisting
    ? await reprocessExistingArticles(before.articles || [], monitoringConfig, translationState)
    : preserveExistingArticles(before.articles || []);

  await setArticleFetchStatus(context.env, {
    running: true,
    startedAt: fetchedAt,
    message: `Fetching ${enabledFeeds.length} RSS feeds`,
    checkedFeeds: 0,
  });
  await appendReportLog(context.env, {
    category: 'rss',
    message: `RSS fetch started for ${enabledFeeds.length} feeds`,
    details: {
      limitFeeds: enabledFeeds.length,
      batchOffset: safeBatchOffset,
      totalEnabledFeeds: allEnabledFeeds.length,
      concurrency: safeConcurrency,
      maxItemsPerFeed: safeMaxItems,
      translationLimit: safeTranslationLimit,
      reprocessExisting,
      existingArticles: existing.length,
    },
  });

  for (let index = 0; index < enabledFeeds.length; index += safeConcurrency) {
    const batch = enabledFeeds.slice(index, index + safeConcurrency);
    const results = await Promise.all(batch.map(async (feed) => {
      try {
        const result = await fetchFeedArticles(feed, {
          maxItemsPerFeed: safeMaxItems,
          fetchedAt,
          monitoringConfig,
          translationState,
        });
        return { feed, result };
      } catch (err) {
        return { feed, error: err };
      }
    }));

    for (const item of results) {
      if (item.error) {
        feedResults.push({ id: item.feed.id || item.feed.name || item.feed.url, ok: false, error: item.error.message });
      } else {
        nextArticles.push(...item.result.articles);
        feedResults.push({
          id: item.feed.id || item.feed.name || item.feed.url,
          ok: true,
          count: item.result.articles.length,
          ...item.result.stats,
        });
      }
    }
    await setArticleFetchStatus(context.env, {
      running: true,
      startedAt: fetchedAt,
      message: `Fetched ${feedResults.length}/${enabledFeeds.length} feeds`,
      checkedFeeds: feedResults.length,
      totalFeeds: enabledFeeds.length,
      totalEnabledFeeds: allEnabledFeeds.length,
      batchOffset: safeBatchOffset,
      concurrency: safeConcurrency,
    });
    if (feedResults.length === enabledFeeds.length || feedResults.length % 10 === 0) {
      await appendReportLog(context.env, {
        category: 'rss',
        message: `RSS fetch progress ${feedResults.length}/${enabledFeeds.length}`,
        details: {
          accepted: nextArticles.length,
          unmatched: feedResults.reduce((sum, item) => sum + Number(item.skippedUnmatched || 0), 0),
          failures: feedResults.filter((item) => !item.ok).length,
          concurrency: safeConcurrency,
        },
      });
    }
  }

  const merged = dedupeArticles([...nextArticles, ...existing])
    .sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime())
    .slice(0, 5000);

  const storageSource = await writeArticlePayload(context.env, {
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
  });

  await setArticleFetchStatus(context.env, {
    running: false,
    phase: 'complete',
    message: `Fetched ${nextArticles.length} topic-matched articles from ${enabledFeeds.length} feeds`,
    lastFetch: fetchedAt,
    checkedFeeds: enabledFeeds.length,
    totalFeeds: enabledFeeds.length,
    totalEnabledFeeds: allEnabledFeeds.length,
    batchOffset: safeBatchOffset,
    concurrency: safeConcurrency,
    articlesAdded: nextArticles.length,
    totalArticles: merged.length,
    translatedArticles: translationState.translated,
    unmatchedArticles: feedResults.reduce((sum, item) => sum + Number(item.skippedUnmatched || 0), 0),
    feedFailures: feedResults.filter((item) => !item.ok).length,
    storageSource,
  });
  await appendReportLog(context.env, {
    category: 'rss',
    message: `RSS fetch complete: ${nextArticles.length} topic-matched articles`,
    details: {
      feedsChecked: enabledFeeds.length,
      totalEnabledFeeds: allEnabledFeeds.length,
      batchOffset: safeBatchOffset,
      concurrency: safeConcurrency,
      totalArticles: merged.length,
      translatedArticles: translationState.translated,
      translationFailures: translationState.failed,
      unmatchedArticles: feedResults.reduce((sum, item) => sum + Number(item.skippedUnmatched || 0), 0),
      feedFailures: feedResults.filter((item) => !item.ok).length,
      storageSource,
    },
  });

  return {
    articlesAdded: nextArticles.length,
    totalArticles: merged.length,
    feedsChecked: enabledFeeds.length,
    totalEnabledFeeds: allEnabledFeeds.length,
    batchOffset: safeBatchOffset,
    concurrency: safeConcurrency,
    storageSource,
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
  try {
    await env.CONFIG_KV.put(ARTICLE_FETCH_STATUS_KEY, JSON.stringify({
      updatedAt: new Date().toISOString(),
      ...status,
    }));
  } catch (err) {
    console.warn(`Article fetch status write skipped: ${err.message}`);
  }
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

function normalizeExistingArticles(articles, monitoringConfig) {
  const result = [];
  for (const article of articles || []) {
    const normalized = normalizeExistingArticle(article, monitoringConfig);
    if (normalized && articleMatchesMonitoringConfig(normalized, monitoringConfig)) result.push(normalized);
  }
  return result;
}

function preserveExistingArticles(articles) {
  return (articles || [])
    .filter((article) => article && (article.title || article.description || article.link))
    .slice(0, 5000);
}

async function reprocessExistingArticles(articles, monitoringConfig, translationState) {
  const result = [];
  for (const article of articles || []) {
    const translated = article.translated
      ? { title: article.title, description: article.description || '', language: article.language || 'en', translated: true }
      : await maybeTranslateArticle(article.title || '', article.description || '', translationState);
    const normalized = normalizeExistingArticle({
      ...article,
      title: translated.title || article.title,
      description: translated.description || article.description,
      language: translated.language || article.language,
      translated: translated.translated || article.translated || false,
      ...(translated.translated ? {
        originalTitle: article.originalTitle || article.title,
        originalDescription: article.originalDescription || article.description,
      } : {}),
    }, monitoringConfig);
    if (normalized && articleMatchesMonitoringConfig(normalized, monitoringConfig)) result.push(normalized);
  }
  return result;
}

function normalizeExistingArticle(article, monitoringConfig) {
  if (!article) return null;
  const title = cleanText(article.title || article.headline || '');
  const description = cleanText(article.description || article.summary || '');
  const link = article.link || article.url || article.href || '';
  if (!title && !description) return null;

  const combined = `${title} ${description} ${article.geo?.place || ''} ${article.geo?.country || ''}`;
  const freshGeo = geotagArticle(combined, article.country || article.geo?.country || 'global');
  const existingGeo = validNonGenericGeo(article.geo) ? article.geo : null;
  const geo = freshGeo || existingGeo;
  const matchedCountry = findMatchingCountry(combined, monitoringConfig);
  const category = classifyArticle(combined, article.category);
  const tags = Array.from(new Set([
    ...buildTags(combined, category),
    ...((article.tags || []).filter(Boolean)),
  ])).slice(0, 12);

  return {
    ...article,
    title,
    description,
    link,
    url: article.url || link,
    pubDate: normalizeDate(article.pubDate || article.publishedAt || article.date || article.fetchedAt || new Date().toISOString()),
    source: article.source || article.feed || 'Unknown',
    category,
    country: normalizeCountrySlug(geo?.country || matchedCountry?.slug || article.country || 'global'),
    geo,
    tags,
    language: article.language || detectArticleLanguage(combined),
  };
}

function validNonGenericGeo(geo) {
  if (!geo) return false;
  const lat = Number(geo.lat);
  const lng = Number(geo.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (String(geo.country || '').toLowerCase() === 'global') return false;
  const place = String(geo.place || '').toLowerCase();
  const country = String(geo.country || '').toLowerCase();
  const confidence = Number(geo.confidence ?? 0.72);
  const genericPlaces = new Set([
    'global', 'world', 'united states', 'china', 'russia', 'ukraine', 'iran', 'israel',
    'north korea', 'south korea', 'japan', 'philippines', 'india', 'pakistan', 'europe',
    'middle east', 'yemen', 'lebanon', 'belgium', 'american', 'chinese', 'german', 'ukrainian',
    'iranian', 'indian', 'israeli', 'hezbollah', 'houthi', 'hamas', 'nato / brussels',
  ]);
  if (confidence < 0.6) return false;
  if (genericPlaces.has(place)) return false;
  if (place && country && place === country) return false;
  return true;
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

function readNonNegativeInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
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
  const seenExact = new Set();
  const groupsByStory = new Map();
  const result = [];
  const sorted = [...articles].sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime());

  for (const article of sorted) {
    const key = String(article.link || article.id || article.title || '').toLowerCase();
    if (!key || seenExact.has(key)) continue;
    seenExact.add(key);

    const storyKey = articleStoryKey(article);
    const existing = storyKey ? groupsByStory.get(storyKey) : null;
    if (existing) {
      existing.additionalReporting = [
        ...(existing.additionalReporting || []),
        compactArticleReference(article),
      ].slice(0, 12);
      continue;
    }

    const primary = { ...article };
    if (storyKey) groupsByStory.set(storyKey, primary);
    result.push(primary);
  }
  return result;
}

function articleStoryKey(article) {
  const title = String(article.title || '').toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) return '';

  const stop = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'after', 'before',
    'says', 'said', 'new', 'live', 'news', 'update', 'updates', 'analysis', 'report',
    'a', 'an', 'to', 'of', 'in', 'on', 'as', 'by', 'at', 'is', 'are', 'be', 'was', 'were',
  ]);
  const tokens = title.split(' ')
    .filter((token) => token.length > 2 && !stop.has(token))
    .slice(0, 16);
  if (tokens.length < 3) return title.slice(0, 90);
  return tokens.sort().slice(0, 12).join('|');
}

function compactArticleReference(article) {
  return {
    id: article.id || '',
    title: article.title || '',
    source: article.source || '',
    link: article.link || article.url || '',
    pubDate: article.pubDate || article.publishedAt || '',
    category: article.category || '',
  };
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
  let best = null;
  for (const place of GEO_PLACES) {
    if (isGenericGeoPlace(place)) continue;
    for (const term of place.terms) {
      if (!hasSearchTerm(value, term)) continue;
      const score = normalizeSearchText(term).trim().length;
      if (!best || score > best.score) best = { place, score };
    }
  }
  if (best) {
    return {
      lat: best.place.lat,
      lng: best.place.lng,
      place: best.place.place,
      country: best.place.country,
      confidence: 0.82,
    };
  }

  return null;
}

function isGenericGeoPlace(place) {
  const generic = new Set([
    'taiwan', 'china', 'united states', 'russia', 'ukraine', 'iran', 'israel',
    'north korea', 'south korea', 'japan', 'philippines', 'india', 'pakistan',
    'yemen', 'lebanon', 'belgium', 'europe', 'middle east',
  ]);
  return generic.has(String(place.place || '').toLowerCase());
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
