# RSS Feed Engine — System Prompt
## Conflict Mapper — `lib/rss-engine.js`

You are an expert Node.js developer rebuilding the RSS/Atom feed fetching and parsing engine for Conflict Mapper, a geopolitical intelligence aggregator. This document is the complete specification for `lib/rss-engine.js` (~540 lines, ~22KB). Use it to rebuild, extend, or debug the module from scratch.

---

## Architecture Overview

The pipeline flows in this order:

```
feeds-config.json
      ↓
fetchAllFeeds()         — batch fetches all enabled feeds (5 at a time)
      ↓
fetchFeed()             — fetches one feed URL with 15s timeout
      ↓
xml2js.Parser           — parses raw XML string
      ↓
parseRssChannel()       — handles RSS 2.0 / RSS 1.0 (RDF)
parseAtomFeed()         — handles Atom 1.0
      ↓
normalizeArticle        — title, description (HTML stripped), link, pubDate, ID
      ↓
geocode()               — lib/geocoder.js keyword scan → {lat, lng, place, country}
detectLanguage()        — non-ASCII ratio heuristic
      ↓
deduplicateArticles()   — exact ID dedup + fuzzy Jaccard title similarity
      ↓
return { articles, results, totalFetched, errors }
```

---

## Module Dependencies

```js
const xml2js   = require('xml2js');    // npm install xml2js
const crypto   = require('crypto');    // built-in
const { geocode } = require('./geocoder');
```

---

## Constants

```js
const FETCH_TIMEOUT_MS      = 15000;  // 15 seconds per feed
const MAX_CONCURRENT_FEEDS  = 5;      // parallel batch size
const MAX_ARTICLES_PER_FEED = 50;     // cap per feed
```

---

## Article Schema

Every article produced by the engine conforms to this shape:

```js
{
  id:          string,   // MD5(title + sourceUrl).slice(0,16) — stable across fetches
  title:       string,   // HTML-stripped, trimmed
  description: string,   // HTML-stripped, max 500 chars
  link:        string,   // canonical article URL
  pubDate:     string,   // ISO 8601 e.g. "2026-03-15T12:00:00.000Z"
  source:      string,   // feed config name
  sourceUrl:   string,   // feed config URL
  category:    string,   // from feed config (breaking/geopolitics/military/etc.)
  country:     string,   // from feed config, or geocoder result, or 'global'
  language:    string,   // 'en' or 'xx'
  geo: {
    lat:        number|null,
    lng:        number|null,
    place:      string|null,
    country:    string|null,
    confidence: number     // 0.0–0.95
  }
}
```

---

## Feed Configuration Schema

Feeds are stored in `data/feeds-config.json`:

```json
{
  "feeds": [
    {
      "id":          "feed_abc123",
      "url":         "https://feeds.reuters.com/Reuters/worldNews",
      "name":        "Reuters World News",
      "description": "Reuters international wire",
      "category":    "breaking",
      "country":     "global",
      "language":    "en",
      "enabled":     true,
      "addedAt":     "2026-01-01T00:00:00.000Z"
    }
  ],
  "categories": ["breaking","geopolitics","military","science","technology",
                  "ai","robotics","engineering","spaceflight","research"]
}
```

**All 10 categories:**
| Category    | Description                                        |
|-------------|---------------------------------------------------|
| breaking    | General breaking news                             |
| geopolitics | Diplomacy, international relations, conflict       |
| military    | Defense, weapons, military operations             |
| science     | General science news                              |
| technology  | Tech industry, software, hardware                 |
| ai          | Artificial intelligence, machine learning         |
| robotics    | Robotics, autonomous systems                      |
| engineering | Engineering, manufacturing, infrastructure        |
| spaceflight | Space exploration, launch vehicles, satellites    |
| research    | Academic research, studies, papers                |

---

## Utility Functions

### `stripHtml(html)`

Removes HTML tags and decodes common HTML entities. Also unwraps CDATA sections.

```js
function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<!\\[CDATA\\[(.*?)\\]\\]>/gs, '$1')  // Unwrap CDATA
    .replace(/<[^>]*>/g, ' ')                       // Remove HTML tags
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&quot;/g,  '"')
    .replace(/&#039;/g,  "'")
    .replace(/&nbsp;/g,  ' ')
    .replace(/\\s+/g,    ' ')
    .trim();
}
```

### `extractText(field)`

Safely extracts string value from xml2js-parsed fields. xml2js can return strings, arrays, or objects with `_` key (CDATA nodes).

```js
function extractText(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) return extractText(field[0]);
  if (typeof field === 'object') {
    if (field._) return String(field._);  // CDATA node
    return '';
  }
  return String(field);
}
```

### `detectLanguage(text)`

**Non-ASCII character ratio heuristic.** Strips whitespace, punctuation, and digits; counts characters with code point > 127. If ratio > 30%, returns `'xx'` (non-English); otherwise returns `'en'`.

Catches: Chinese, Arabic, Russian (Cyrillic), Korean, Japanese, Thai, etc.

```js
function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  const wordChars = text.replace(/[\\s\\p{P}\\d]/gu, '');
  if (wordChars.length === 0) return 'en';

  let nonAscii = 0;
  for (let i = 0; i < wordChars.length; i++) {
    if (wordChars.charCodeAt(i) > 127) nonAscii++;
  }

  const ratio = nonAscii / wordChars.length;
  return ratio > 0.30 ? 'xx' : 'en';
}
```

- Feed configs can hardcode `"language": "en"` to skip detection for known-English feeds.
- The article store filters out `language === 'xx'` by default (unless `?language=all` is passed).

### `generateArticleId(title, sourceUrl)`

MD5 hash of `"title::sourceUrl"`, first 16 hex chars. Stable across re-fetches of the same article.

```js
function generateArticleId(title, sourceUrl) {
  return crypto.createHash('md5').update(`${title}::${sourceUrl}`).digest('hex').slice(0, 16);
}
```

### `normalizeDate(dateStr)`

Converts any date string to ISO 8601. Falls back to `new Date().toISOString()` if parsing fails.

---

## XML Parsing

Uses `xml2js` with these options:

```js
const parser = new xml2js.Parser({
  explicitArray: true,   // all fields are arrays (even singles)
  ignoreAttrs:   false,  // keep $ attribute objects
  trim:          true,
  normalize:     true,
});
const parsed = await parser.parseStringPromise(xmlText);
```

**Format detection logic:**
```js
if (parsed.rss && parsed.rss.channel) {
  // RSS 2.0
} else if (parsed.feed) {
  // Atom 1.0
} else if (parsed['rdf:RDF']) {
  // RSS 1.0 (RDF format)
} else {
  return { articles: [], error: 'Unrecognized feed format' };
}
```

---

## RSS 2.0 Parsing (`parseRssChannel`)

```js
function parseRssChannel(channel, feedConfig) {
  const items = channel.item || [];
  for (const item of items.slice(0, MAX_ARTICLES_PER_FEED)) {
    const title       = stripHtml(extractText(item.title));
    const description = stripHtml(extractText(
      item.description || item.summary || item['content:encoded'] || ''
    ));
    const link   = extractText(item.link || (typeof item.guid?.[0] === 'string' ? item.guid : ''));
    const pubDate = normalizeDate(extractText(item.pubDate || item.published || item.updated));

    if (!title && !link) continue;  // skip empty items

    const id       = generateArticleId(title || link, feedConfig.url);
    const geo      = geocode(`${title} ${description}`);
    const language = feedConfig.language || detectLanguage(`${title} ${description}`);

    articles.push({ id, title, description: description.slice(0, 500), link, pubDate,
      source: feedConfig.name, sourceUrl: feedConfig.url,
      category: feedConfig.category || 'breaking',
      country: feedConfig.country || geo?.country || 'global',
      language,
      geo: geo ? { lat: geo.lat, lng: geo.lng, place: geo.place,
                   country: geo.country, confidence: geo.confidence }
               : { lat: null, lng: null, place: null, country: null, confidence: 0 }
    });
  }
}
```

---

## Atom 1.0 Parsing (`parseAtomFeed`)

Atom uses `<entry>` elements instead of `<item>`. Link extraction is more complex because Atom links are attribute objects:

```js
// Atom link extraction
if (entry.link) {
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  const altLink = links.find(l => l.$ && l.$.rel === 'alternate') || links[0];
  link = (altLink && altLink.$) ? altLink.$.href : extractText(altLink);
}
```

Field mappings:
- Title: `entry.title`
- Description: `entry.summary || entry.content`
- Date: `entry.updated || entry.published`

---

## Feed Fetching

### `fetchFeed(feedConfig)` — single feed

```js
async function fetchFeed(feedConfig) {
  // 1. Fetch with 15s AbortController timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(feedConfig.url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'ConflictMapper/1.0 (+https://conflictmapper.com; RSS reader)',
      'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
    },
  });
  clearTimeout(timeout);

  // 2. Parse XML
  // 3. Return { articles: [], error: null } or { articles: [], error: 'message' }
}
```

**Error returns** (does NOT throw):
- Network failure: `{ articles: [], error: 'ECONNREFUSED ...' }`
- Timeout: `{ articles: [], error: 'Timeout after 15s' }`
- Bad HTTP: `{ articles: [], error: 'HTTP 404 Not Found' }`
- Parse failure: `{ articles: [], error: 'XML parse error: ...' }`

### `fetchAllFeeds(feedsConfig, progressCallback)` — all feeds

Processes enabled feeds in batches of 5 with a 500ms inter-batch delay:

```js
async function fetchAllFeeds(feedsConfig, progressCallback = null) {
  const enabledFeeds = (feedsConfig.feeds || []).filter(f => f.enabled !== false);

  for (let i = 0; i < enabledFeeds.length; i += MAX_CONCURRENT_FEEDS) {
    const batch = enabledFeeds.slice(i, i + MAX_CONCURRENT_FEEDS);
    const batchResults = await Promise.all(batch.map(feed => fetchFeed(feed)));

    // collect results, call progressCallback({ fetched, total, current, errors })

    // Inter-batch delay
    if (i + MAX_CONCURRENT_FEEDS < enabledFeeds.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const deduped = deduplicateArticles(allArticles);
  return { articles: deduped, results, totalFetched: deduped.length, errors };
}
```

**Return shape:**
```js
{
  articles:     Article[],    // deduplicated articles
  results:      Array<{ feedId, feedName, url, articles: number, error: string|null }>,
  totalFetched: number,
  errors:       number        // count of failed feeds
}
```

**Progress callback signature:**
```js
progressCallback({ fetched: 3, total: 153, current: 'Reuters World', errors: 0 })
```

---

## Deduplication

### `deduplicateArticles(articles, threshold = 0.75)`

**Two-pass approach:**

**Pass 1 — Exact ID dedup** (fast, O(n)):
```js
const idMap = new Map();
for (const article of articles) {
  if (!idMap.has(article.id)) idMap.set(article.id, article);
}
const unique = Array.from(idMap.values());
```

**Pass 2 — Fuzzy title similarity** (O(n²), skipped if n > 2000):
```js
for (const candidate of unique) {
  let isDuplicate = false;
  for (const existing of kept) {
    if (titleSimilarity(candidate.title, existing.title) >= threshold) {
      isDuplicate = true;
      // Keep the one with the more recent pubDate
      if (new Date(candidate.pubDate) > new Date(existing.pubDate)) {
        kept[kept.indexOf(existing)] = candidate;
      }
      break;
    }
  }
  if (!isDuplicate) kept.push(candidate);
}
```

### `titleSimilarity(a, b)`

**Jaccard similarity on word sets.** Returns 0.0–1.0.

```js
function titleSimilarity(a, b) {
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\\s]/g, '').split(/\\s+/).filter(w => w.length > 2);
  const setA = new Set(normalize(a));
  const setB = new Set(normalize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(w => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
```

At threshold 0.75: "Russia launches missile strike on Kyiv" and "Russia fires missiles at Kyiv" would be deduplicated (both about the same story). "Russia strikes Ukraine" and "Ukraine economic crisis" would not.

---

## `getGeotaggedArticles(articles)`

Filters to articles with valid geo coordinates, reformats for map display:

```js
function getGeotaggedArticles(articles) {
  return articles
    .filter(a => a.geo && a.geo.lat !== null && a.geo.lng !== null)
    .map(a => ({
      id, title, link, pubDate, source, category, country,
      lat: a.geo.lat, lng: a.geo.lng, place: a.geo.place, confidence: a.geo.confidence
    }));
}
```

Called by `GET /api/articles/geo` in server.js.

---

## The 153 Pre-Configured Feeds

**153 total feeds — 135 enabled by default, 18 disabled.**

Disabled feeds are typically sources that were problematic (frequent timeouts, 403 errors, non-English content) but have been preserved in config in case the issues resolve.

Category distribution (approximate):
| Category    | Feed Count |
|-------------|-----------|
| breaking    | ~35        |
| geopolitics | ~25        |
| military    | ~20        |
| ai          | ~15        |
| technology  | ~15        |
| science     | ~12        |
| spaceflight | ~12        |
| robotics    | ~8         |
| engineering | ~6         |
| research    | ~5         |

---

## Known Feed Issues & Workarounds

### Reuters feeds
Reuters deprecated many of their public RSS feeds in 2023. The `https://feeds.reuters.com/...` URLs frequently return 404. **Workaround:** Use Reuters via Google News RSS proxy: `https://news.google.com/rss/search?q=reuters&hl=en-US&gl=US&ceid=US:en`

### XML encoding errors
Some feeds return malformed XML (unescaped `&` in URLs). The xml2js parser will throw. The error is caught by `fetchFeed()` and returned as `{ error: 'XML parse error: ...' }`. The feed continues to appear in results with 0 articles.

### Atom vs RSS differences
- Atom feeds: links are in `<link rel="alternate" href="..."/>` — must read `$` attributes
- RSS 2.0 feeds: links are in `<link>` text content
- RSS 1.0 (RDF): same structure as RSS 2.0 items

### CDATA-wrapped descriptions
Many feeds use `<description><![CDATA[<p>Text</p>]]></description>`. The `stripHtml()` function handles this by first unwrapping CDATA, then stripping tags.

---

## Exports

```js
module.exports = {
  fetchFeed,           // fetch + parse a single feed
  fetchAllFeeds,       // fetch all enabled feeds with batching
  deduplicateArticles, // deduplicate an article array
  getGeotaggedArticles,// filter to geotagged articles for map display
  // Exported for testing:
  titleSimilarity,
  stripHtml,
  generateArticleId,
  detectLanguage,
};
```

---

## How to Add a New Feed (Manual)

**Via API:**
```bash
curl -X POST http://localhost:5000/api/feeds \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.defensenews.com/rss/",
    "name": "Defense News",
    "category": "military",
    "country": "global",
    "enabled": true
  }'
```

**Via bulk import:**
```bash
curl -X POST http://localhost:5000/api/feeds/import \
  -H "Content-Type: application/json" \
  -d '{
    "feeds": [
      { "url": "...", "name": "...", "category": "breaking", "country": "global" },
      { "url": "...", "name": "...", "category": "military", "country": "usa" }
    ]
  }'
```

**Direct edit of `data/feeds-config.json`:** Add an entry to the `feeds` array with a unique `id` field. Server reads this file fresh on every fetch.

---

## How to Add a New Feed Category

1. Add the string to the `categories` array in `data/feeds-config.json`
2. No code changes required — `category` is just a string field
3. The admin panel feed manager will display it in the category dropdown

---

## Extending the Parser — Custom Field Extraction

To extract a custom field (e.g., `<media:thumbnail>` for article images):

```js
// Inside parseRssChannel(), after the existing field extractions:
const thumbnail = item['media:thumbnail']?.[0]?.['$']?.url
  || item['media:content']?.[0]?.['$']?.url
  || null;

articles.push({
  ...existingFields,
  thumbnail,  // add to article schema
});
```

Remember to also update the article schema comment at the top of the file.

---

## Testing

```bash
# Fetch a specific feed manually
node -e "
  const { fetchFeed } = require('./lib/rss-engine');
  fetchFeed({ url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC', category: 'breaking', country: 'global' })
    .then(r => console.log('Articles:', r.articles.length, 'Error:', r.error));
"

# Test deduplication
node -e "
  const { titleSimilarity } = require('./lib/rss-engine');
  console.log(titleSimilarity('Russia fires missiles at Kyiv', 'Russia launches missile strikes on Kyiv'));
  // Should be ~0.5–0.7
"

# Test language detection
node -e "
  const { detectLanguage } = require('./lib/rss-engine');
  console.log(detectLanguage('Breaking news from Washington'));  // 'en'
  console.log(detectLanguage('北京宣布新军事演习计划'));  // 'xx'
"
```
