/**
 * rss-engine.js — RSS/Atom feed fetcher, parser, and deduplicator
 *
 * Fetches XML feeds from configured URLs, parses them into a normalized
 * article format, deduplicates by title similarity, and geotags each article
 * using the built-in geocoder.
 *
 * Article schema:
 * {
 *   id:          string  (hash of title + source)
 *   title:       string
 *   description: string  (plain text, HTML tags stripped)
 *   link:        string  (article URL)
 *   pubDate:     string  (ISO 8601)
 *   source:      string  (feed name)
 *   sourceUrl:   string  (feed URL)
 *   category:    string
 *   country:     string  (from feed config or geocoder)
 *   geo: {
 *     lat:       number|null
 *     lng:       number|null
 *     place:     string|null
 *     country:   string|null
 *     confidence: number
 *   }
 * }
 */

'use strict';

const xml2js   = require('xml2js');
const crypto   = require('crypto');
const { geocode } = require('./geocoder');

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS     = 15000;  // 15 seconds per feed
const MAX_CONCURRENT_FEEDS = 5;       // Parallel fetch limit to avoid rate limiting
const MAX_ARTICLES_PER_FEED = 50;    // Cap articles per feed

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and decode common HTML entities from a string.
 */
function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')  // Unwrap CDATA
    .replace(/<[^>]*>/g, ' ')                   // Remove HTML tags
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&quot;/g,  '"')
    .replace(/&#039;/g,  "'")
    .replace(/&nbsp;/g,  ' ')
    .replace(/\s+/g,     ' ')                   // Collapse whitespace
    .trim();
}

/**
 * Safely extract the text value from an xml2js parsed field.
 * xml2js returns strings as plain strings, arrays as arrays, objects with '_' key, etc.
 */
function extractText(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) return extractText(field[0]);
  if (typeof field === 'object') {
    // xml2js CDATA node: { _: 'content', $: { ... } }
    if (field._) return String(field._);
    // Plain object with no text content
    return '';
  }
  return String(field);
}

/**
 * detectLanguage(text)
 * Simple heuristic language detector.
 * Returns 'en' if the text is predominantly Latin-script, otherwise returns a
 * non-English code ('xx') so articles can be filtered out by default.
 *
 * Heuristic: if more than 30% of the word-characters are non-ASCII (i.e.,
 * outside U+0000–U+007F), the text is considered non-English.
 *
 * This intentionally avoids adding a heavy NLP dependency while still catching
 * Chinese, Arabic, Russian, Korean, Japanese, etc. headlines.
 *
 * @param {string} text - Combined title + description text
 * @returns {'en'|'xx'} 'en' for English/Latin, 'xx' for non-English
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';

  // Consider only characters that are likely word content (ignore spaces/punct)
  const wordChars = text.replace(/[\s\p{P}\d]/gu, '');
  if (wordChars.length === 0) return 'en';

  // Count non-ASCII characters (code point > 127)
  let nonAscii = 0;
  for (let i = 0; i < wordChars.length; i++) {
    if (wordChars.charCodeAt(i) > 127) nonAscii++;
  }

  const ratio = nonAscii / wordChars.length;
  return ratio > 0.30 ? 'xx' : 'en';
}

/**
 * Generate a stable article ID from title + source URL.
 * Uses MD5 for speed (not cryptographic security).
 */
function generateArticleId(title, sourceUrl) {
  const input = `${title}::${sourceUrl}`;
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 16);
}

/**
 * Normalize a pubDate string to ISO 8601.
 * Handles RSS date formats, Atom dates, and partial dates.
 */
function normalizeDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (_) {}
  return new Date().toISOString();
}

/**
 * Relevance filter for general/breaking news feeds.
 * Returns true if the article appears related to geopolitics, military,
 * foreign policy, defense, intelligence, or strategic technology.
 * Returns false for lifestyle, sports, entertainment, local crime, etc.
 */
function isRelevantArticle(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // INCLUDE keywords — if any match, article is relevant
  const includePatterns = [
    // Geopolitics & foreign policy
    /\b(geopolitic|foreign policy|diplomat|sanction|treaty|alliance|nato|eu\b|united nations|un\b|security council)/,
    /\b(territory|sovereignty|annex|occupation|border dispute|maritime dispute|strait|chokepoint)/,
    /\b(summit|bilateral|multilateral|ambassador|embassy|consulate|envoy|ceasefire|peace deal|war powers)/,
    // Military & defense
    /\b(military|defense|missile|nuclear|weapon|warship|submarine|fighter jet|bomber|drone strike)/,
    /\b(pentagon|centcom|deployment|troops|airbase|naval|carrier strike|destroyer|frigate|battalion)/,
    /\b(invasion|offensive|airstrike|bombardment|casualties|killed in action|wounded|combat)/,
    /\b(arms control|proliferation|deterrence|escalation|de-escalation|munitions|artillery)/,
    // Intelligence & security
    /\b(intelligence|espionage|cyber attack|cyber warfare|surveillance|classified|covert|cia|nsa|mossad)/,
    /\b(terrorism|insurgency|militia|rebel|guerrilla|extremis|radicali)/,
    // Countries & actors of interest
    /\b(iran|israel|china|taiwan|russia|ukraine|north korea|pyongyang|houthi|hezbollah|hamas)/,
    /\b(irgc|pla|idf|kremlin|xi jinping|putin|khamenei|zelenskyy|netanyahu|trump.*iran|trump.*china)/,
    /\b(strait of hormuz|south china sea|taiwan strait|arctic|indo-pacific|middle east conflict)/,
    // Strategic technology
    /\b(hypersonic|ballistic missile|cruise missile|icbm|nuclear warhead|enrichment|centrifuge)/,
    /\b(satellite|space force|anti-satellite|gps jamming|electronic warfare|radar|stealth)/,
    /\b(artificial intelligence.*military|autonomous weapon|swarm|directed energy|laser weapon)/,
    // Energy & economic warfare
    /\b(oil price|crude oil|energy security|lng|opec|oil embargo|trade war|tariff.*china)/,
    /\b(strategic petroleum|pipeline|refinery.*attack|supply chain.*military|rare earth)/,
  ];

  // EXCLUDE keywords — if these match AND no include pattern matched, reject
  const excludePatterns = [
    /\b(recipe|cooking|restaurant|chef|food truck|dining)/,
    /\b(fashion|celebrity|entertainment|movie|tv show|streaming|netflix|spotify)/,
    /\b(sports|football|soccer|basketball|tennis|cricket|olympics|nfl|nba|premier league)/,
    /\b(real estate|housing market|mortgage rate|home price|rent.*apartment)/,
    /\b(lifestyle|wellness|fitness|yoga|meditation|self-care|beauty)/,
    /\b(contraband|prison.*drone|uber eats|ferrari|advil|supermarket|cost of living.*uk)/,
    /\b(wedding|dating|relationship|horoscope|zodiac)/,
    /\b(pet|dog|cat|animal rescue|zoo)/,
  ];

  const hasRelevant = includePatterns.some(p => p.test(text));
  if (hasRelevant) return true;

  const hasExclude = excludePatterns.some(p => p.test(text));
  if (hasExclude) return false;

  // If no strong signal either way, keep it (err on the side of inclusion)
  return true;
}

/**
 * Parse an RSS 2.0 <channel> into an array of article objects.
 */
function parseRssChannel(channel, feedConfig) {
  const items = channel.item || [];
  const articles = [];

  for (const item of items.slice(0, MAX_ARTICLES_PER_FEED)) {
    const title       = stripHtml(extractText(item.title));
    const description = stripHtml(extractText(item.description || item.summary || item['content:encoded'] || ''));
    const link        = extractText(item.link || (item.guid && typeof item.guid[0] === 'string' ? item.guid : ''));
    const pubDate     = normalizeDate(extractText(item.pubDate || item.published || item.updated));

    if (!title && !link) continue;

    // Relevance filter: skip irrelevant articles from general news feeds
    if ((feedConfig.category === 'breaking' || feedConfig.category === 'general') && !isRelevantArticle(title, description)) {
      continue;
    }

    const id       = generateArticleId(title || link, feedConfig.url);
    const geo      = geocode(`${title} ${description}`);
    const language = feedConfig.language || detectLanguage(`${title} ${description}`);

    articles.push({
      id,
      title,
      description: description.slice(0, 500), // Cap description length
      link,
      pubDate,
      source:    feedConfig.name || feedConfig.url,
      sourceUrl: feedConfig.url,
      category:  feedConfig.category || 'breaking',
      country:   feedConfig.country  || (geo && geo.country) || 'global',
      language,
      geo: geo ? {
        lat:        geo.lat,
        lng:        geo.lng,
        place:      geo.place,
        country:    geo.country,
        confidence: geo.confidence,
      } : {
        lat: null, lng: null, place: null, country: feedConfig.country || null, confidence: 0,
      },
    });
  }

  return articles;
}

/**
 * Parse an Atom <feed> into an array of article objects.
 */
function parseAtomFeed(feed, feedConfig) {
  const entries = feed.entry || [];
  const articles = [];

  for (const entry of entries.slice(0, MAX_ARTICLES_PER_FEED)) {
    const title       = stripHtml(extractText(entry.title));
    const description = stripHtml(extractText(entry.summary || entry.content || ''));

    // Atom links can be arrays of objects with $ attributes
    let link = '';
    if (entry.link) {
      const links = Array.isArray(entry.link) ? entry.link : [entry.link];
      const altLink = links.find(l => l.$ && l.$.rel === 'alternate') || links[0];
      link = (altLink && altLink.$) ? altLink.$.href : extractText(altLink);
    }

    const pubDate  = normalizeDate(extractText(entry.updated || entry.published));

    if (!title && !link) continue;

    // Relevance filter: skip irrelevant articles from general news feeds
    if ((feedConfig.category === 'breaking' || feedConfig.category === 'general') && !isRelevantArticle(title, description)) {
      continue;
    }

    const id       = generateArticleId(title || link, feedConfig.url);
    const geo      = geocode(`${title} ${description}`);
    const language = feedConfig.language || detectLanguage(`${title} ${description}`);

    articles.push({
      id,
      title,
      description: description.slice(0, 500),
      link,
      pubDate,
      source:    feedConfig.name || feedConfig.url,
      sourceUrl: feedConfig.url,
      category:  feedConfig.category || 'breaking',
      country:   feedConfig.country  || (geo && geo.country) || 'global',
      language,
      geo: geo ? {
        lat:        geo.lat,
        lng:        geo.lng,
        place:      geo.place,
        country:    geo.country,
        confidence: geo.confidence,
      } : {
        lat: null, lng: null, place: null, country: feedConfig.country || null, confidence: 0,
      },
    });
  }

  return articles;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FETCH + PARSE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * fetchFeed(feedConfig)
 * Fetch and parse a single RSS/Atom feed.
 *
 * @param {{ url, name, category, country }} feedConfig
 * @returns {Promise<{ articles: Array, error: string|null }>}
 */
async function fetchFeed(feedConfig) {
  let xmlText;

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(feedConfig.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ConflictMapper/2.0 (RSS Reader; +https://conflictmapper.com)',
        'Accept':     'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    xmlText = await response.text();
  } catch (fetchErr) {
    const msg = fetchErr.name === 'AbortError' ? 'Timeout after 15s' : fetchErr.message;
    return { articles: [], error: msg };
  }

  try {
    // Parse XML
    const parser = new xml2js.Parser({
      explicitArray: true,
      ignoreAttrs:   false,
      trim:          true,
      normalize:     true,
    });

    const parsed = await parser.parseStringPromise(xmlText);

    // Detect feed format: RSS 2.0 vs Atom
    let articles = [];

    if (parsed.rss && parsed.rss.channel) {
      // RSS 2.0 format
      const channel = Array.isArray(parsed.rss.channel) ? parsed.rss.channel[0] : parsed.rss.channel;
      articles = parseRssChannel(channel, feedConfig);
    } else if (parsed.feed) {
      // Atom format
      articles = parseAtomFeed(parsed.feed, feedConfig);
    } else if (parsed['rdf:RDF']) {
      // RSS 1.0 / RDF format
      const items = parsed['rdf:RDF'].item || [];
      // Treat items like RSS channel items
      const pseudoChannel = { item: items };
      articles = parseRssChannel(pseudoChannel, feedConfig);
    } else {
      return { articles: [], error: 'Unrecognized feed format (not RSS 2.0, Atom, or RSS 1.0)' };
    }

    return { articles, error: null };
  } catch (parseErr) {
    return { articles: [], error: `XML parse error: ${parseErr.message}` };
  }
}

/**
 * fetchAllFeeds(feedsConfig, progressCallback)
 * Fetch all enabled feeds in parallel batches.
 *
 * @param {{ feeds: Array }} feedsConfig
 * @param {Function} progressCallback - Called with ({ fetched, total, current, errors })
 * @returns {Promise<{ articles: Array, results: Array, totalFetched: number, errors: number }>}
 */
async function fetchAllFeeds(feedsConfig, progressCallback = null) {
  const enabledFeeds = (feedsConfig.feeds || []).filter(f => f.enabled !== false);
  const totalFeeds   = enabledFeeds.length;
  let fetched = 0;
  let errors  = 0;
  const results  = [];
  const allArticles = [];

  // Process in batches to respect rate limits
  for (let i = 0; i < enabledFeeds.length; i += MAX_CONCURRENT_FEEDS) {
    const batch = enabledFeeds.slice(i, i + MAX_CONCURRENT_FEEDS);

    const batchResults = await Promise.all(
      batch.map(feed => fetchFeed(feed).then(result => ({ feed, ...result })))
    );

    for (const result of batchResults) {
      fetched++;
      results.push({
        feedId:   result.feed.id,
        feedName: result.feed.name,
        url:      result.feed.url,
        articles: result.articles.length,
        error:    result.error,
      });

      if (result.error) {
        errors++;
        console.warn(`[rss-engine] Error fetching ${result.feed.name}: ${result.error}`);
      } else {
        allArticles.push(...result.articles);
      }

      if (progressCallback) {
        progressCallback({
          fetched,
          total:   totalFeeds,
          current: result.feed.name,
          errors,
        });
      }
    }

    // Small delay between batches to be polite to servers
    if (i + MAX_CONCURRENT_FEEDS < enabledFeeds.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Deduplicate across all feeds
  const deduped = deduplicateArticles(allArticles);

  return {
    articles:     deduped,
    results,
    totalFetched: deduped.length,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * titleSimilarity(a, b)
 * Compute a simple token-based similarity score between two titles.
 * Returns 0.0 (totally different) to 1.0 (identical).
 *
 * Uses Jaccard similarity on word sets, which is fast and effective
 * for news headlines.
 */
function titleSimilarity(a, b) {
  if (!a || !b) return 0;

  // Normalize: lowercase, remove punctuation, split on whitespace
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);

  const setA = new Set(normalize(a));
  const setB = new Set(normalize(b));

  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(w => setB.has(w)));
  const union        = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * normalizeTitle(title)
 * Normalize a title for exact-match deduplication:
 * lowercase + remove punctuation + collapse whitespace.
 *
 * @param {string} title
 * @returns {string}
 */
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * deduplicateArticles(articles, threshold)
 * Remove duplicate articles.
 *
 * Two-pass deduplication:
 *  1. Exact ID deduplication (fastest)
 *  2. Exact normalized-title match (case-insensitive, punctuation-stripped) — keep newest
 *  3. Fuzzy title similarity (>85% Jaccard overlap) — keep newest
 *
 * @param {Array}  articles  - Array of article objects
 * @param {number} threshold - Similarity threshold (0-1, default 0.85)
 * @returns {Array} Deduplicated articles
 */
function deduplicateArticles(articles, threshold = 0.85) {
  if (!articles || articles.length === 0) return [];

  // Pass 1: exact ID deduplication (fast) — keep newest pub date for same ID
  const idMap = new Map();
  for (const article of articles) {
    if (!idMap.has(article.id)) {
      idMap.set(article.id, article);
    } else {
      // Keep newer
      const existing = idMap.get(article.id);
      const newDate  = article.pubDate ? new Date(article.pubDate).getTime() : 0;
      const exstDate = existing.pubDate ? new Date(existing.pubDate).getTime() : 0;
      if (newDate > exstDate) idMap.set(article.id, article);
    }
  }

  // Pass 2: exact normalized-title deduplication — keep newest
  const titleMap = new Map();
  for (const article of idMap.values()) {
    const nt = normalizeTitle(article.title);
    if (!nt) {
      // No title — keep as-is (use ID as key)
      titleMap.set(`__id__${article.id}`, article);
      continue;
    }
    if (!titleMap.has(nt)) {
      titleMap.set(nt, article);
    } else {
      const existing = titleMap.get(nt);
      const newDate  = article.pubDate ? new Date(article.pubDate).getTime() : 0;
      const exstDate = existing.pubDate ? new Date(existing.pubDate).getTime() : 0;
      if (newDate > exstDate) titleMap.set(nt, article);
    }
  }

  const unique = Array.from(titleMap.values());

  // Pass 3: fuzzy title similarity (O(n²), only run if n < 2000)
  if (unique.length > 2000) {
    return unique;
  }

  const kept = [];

  for (const candidate of unique) {
    let isDuplicate = false;

    for (let i = 0; i < kept.length; i++) {
      if (titleSimilarity(candidate.title, kept[i].title) >= threshold) {
        isDuplicate = true;
        // Keep the one with the more recent pubDate
        const candDate = candidate.pubDate ? new Date(candidate.pubDate).getTime() : 0;
        const exstDate = kept[i].pubDate   ? new Date(kept[i].pubDate).getTime()   : 0;
        if (candDate > exstDate) {
          kept[i] = candidate;
        }
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}

/**
 * getGeotaggedArticles(articles)
 * Filter to only articles that have valid geo coordinates.
 *
 * @param {Array} articles
 * @returns {Array} Articles with lat/lng, formatted for map display
 */
function getGeotaggedArticles(articles) {
  return articles
    .filter(a => a.geo && a.geo.lat !== null && a.geo.lng !== null)
    .map(a => ({
      id:          a.id,
      title:       a.title,
      link:        a.link,
      pubDate:     a.pubDate,
      source:      a.source,
      category:    a.category,
      country:     a.country,
      lat:         a.geo.lat,
      lng:         a.geo.lng,
      place:       a.geo.place,
      confidence:  a.geo.confidence,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  fetchFeed,
  fetchAllFeeds,
  deduplicateArticles,
  getGeotaggedArticles,
  // Exported for testing
  titleSimilarity,
  stripHtml,
  generateArticleId,
  detectLanguage,
};
