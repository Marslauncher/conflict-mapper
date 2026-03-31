# MAP & FEED SYSTEM — System Prompt & Developer Guide
## Conflict Mapper Platform | `lib/rss-engine.js` · `lib/feed-store.js` · `lib/geocoder.js` · `pages/map-feed.html` · `pages/news-map.html`

> Use this document as a standalone system prompt when working on the RSS ingestion pipeline, the geocoder, or the Leaflet map frontend. Paste the full contents into a new prompt window along with any specific files you want to modify.

---

## 1. Architecture Overview

```
feeds-config.json
       │
       ▼
rss-engine.js ─── fetchAllFeeds()
  • Fetch XML from each feed URL (15s timeout, 5 parallel)
  • Parse RSS 2.0 / Atom / RSS 1.0
  • Strip HTML, normalize dates
  • Call geocoder on title + description
  • Deduplicate by ID and title similarity (Jaccard ≥ 0.75)
       │
       ▼
feed-store.js ─── saveArticles()
  • Merge with existing data/articles.json
  • Cap at 5,000 most recent articles
  • Atomic write (temp file + rename)
       │
       ├──► GET /api/articles          → Article list (filtered)
       ├──► GET /api/articles/geo      → Geotagged articles for map
       └──► POST /api/analysis/*       → Articles fed to AI
                                            │
                                            ▼
                                   Leaflet Frontend
                                   pages/map-feed.html  (global map)
                                   pages/news-map.html  (per-country map)
```

---

## 2. Feed Configuration: `data/feeds-config.json`

Structure:

```json
{
  "feeds": [
    {
      "id": "feed_1711663728000",
      "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
      "name": "BBC World News",
      "category": "breaking",
      "country": "global",
      "enabled": true,
      "addedAt": "2026-03-28T22:48:48.000Z"
    }
  ],
  "categories": ["breaking", "geopolitical", "military", "economic", "science", "ai", "robotics"]
}
```

### Feed Schema

| Field | Type | Description |
|---|---|---|
| `id` | string | Auto-generated unique ID (`feed_${Date.now()}`) |
| `url` | string | RSS/Atom feed URL |
| `name` | string | Display name shown in UI |
| `category` | string | Must match a value in `categories` array |
| `country` | string | Country tag: `"global"`, `"Russia"`, `"China"`, etc. |
| `enabled` | boolean | `false` skips this feed during fetch |
| `addedAt` | ISO string | Timestamp when added |

### Adding a Feed (via API)

```bash
curl -X POST http://localhost:5000/api/feeds \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tass.com/rss/v2.xml",
    "name": "TASS News Agency",
    "category": "geopolitical",
    "country": "Russia",
    "enabled": true
  }'
```

### Removing a Feed

```bash
curl -X DELETE http://localhost:5000/api/feeds/feed_1711663728000
```

### Bulk Import Feeds

Send an array of feed objects. Duplicates (by URL) are silently skipped:

```bash
curl -X POST http://localhost:5000/api/feeds/import \
  -H "Content-Type: application/json" \
  -d '{
    "feeds": [
      { "url": "...", "name": "...", "category": "military", "country": "China" },
      { "url": "...", "name": "...", "category": "breaking", "country": "global" }
    ]
  }'
```

### Enabling / Disabling a Feed

The API doesn't have a dedicated toggle endpoint; use the Admin panel or manually edit `data/feeds-config.json` and set `"enabled": false`.

---

## 3. How Feeds Are Fetched and Parsed

### Fetch Settings (in `rss-engine.js`)

```js
const FETCH_TIMEOUT_MS     = 15000;  // 15 seconds per feed
const MAX_CONCURRENT_FEEDS = 5;      // Parallel fetch limit
const MAX_ARTICLES_PER_FEED = 50;    // Articles taken per feed
```

### Format Detection

The engine auto-detects feed format by inspecting the parsed XML root:

| XML Root | Format Detected |
|---|---|
| `parsed.rss.channel` | RSS 2.0 |
| `parsed.feed` | Atom |
| `parsed['rdf:RDF']` | RSS 1.0 / RDF |

If none match, the feed returns an error: `"Unrecognized feed format"`.

### Article Normalization

Each article is normalized into:

```js
{
  id:          "md5(title + sourceUrl).slice(0,16)",
  title:       "Stripped plain text",
  description: "Stripped, capped at 500 chars",
  link:        "Article URL",
  pubDate:     "ISO 8601",
  source:      "Feed name",
  sourceUrl:   "Feed URL",
  category:    "From feed config",
  country:     "From feed config or geocoder",
  geo: {
    lat:        number | null,
    lng:        number | null,
    place:      "City/region name" | null,
    country:    "Country name" | null,
    confidence: 0.0 - 1.0
  }
}
```

### Deduplication

Two-pass deduplication:
1. **Exact ID match** (same `title + sourceUrl` hash) — O(n) via Map
2. **Fuzzy title similarity** — Jaccard similarity on word sets. Threshold: `0.75`. When similar, keeps the more recent article.

To increase deduplication aggressiveness (reduce near-duplicates from similar outlets):

```js
// In feed-store.js saveArticles() call or rss-engine.js fetchAllFeeds():
const deduped = deduplicateArticles(allArticles, 0.65);  // Lower threshold = more aggressive
```

---

## 4. The Geocoder

**File:** `lib/geocoder.js`

The geocoder is a pure keyword-lookup engine — no external API calls. It searches article text for place names against a hardcoded database of ~400+ locations.

### How It Works

```js
const { geocode } = require('./geocoder');
const result = geocode("Russian forces near Kyiv pushing toward Kharkiv");
// Returns: { lat: 50.45, lng: 30.52, country: 'Ukraine', place: 'Kyiv', confidence: 0.9 }
```

The engine tokenizes the input text, then scans `LOCATIONS` object keys from longest to shortest (to prioritize more specific matches like "Saint Petersburg" over "Petersburg"). Returns `null` if no known location is found.

### Confidence Scores

| Location Type | Confidence |
|---|---|
| Country name match | 0.7 |
| Capital city | 0.9 |
| Major city | 0.85 |
| Region/zone | 0.75 |
| Military base | 0.85 |

### Extending the Geocoder

Add entries to the `LOCATIONS` object in `lib/geocoder.js`:

```js
// Single city entry:
'kherson':   { lat: 46.64, lng: 32.62, country: 'Ukraine', type: 'city' },

// Conflict zone entry:
'south china sea': { lat: 15.00, lng: 114.00, country: 'China', type: 'zone' },

// Military base entry:
'raf lakenheath': { lat: 52.41, lng: 0.56, country: 'UK', type: 'base' },
```

Keys must be **lowercase**. The geocoder lowercases input before matching.

Also add the country name → slug mapping in `getCountryFromSlug()` at the bottom of `geocoder.js`:

```js
function getCountryFromSlug(slug) {
  const map = {
    'usa':         'United States',
    'russia':      'Russia',
    // ... add:
    'myanmar':     'Myanmar',
    'venezuela':   'Venezuela',
  };
  return map[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}
```

---

## 5. Leaflet Map: Global Feed Map (`pages/map-feed.html`)

### CDN Dependencies

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
```

### Category Color Coding

Articles are rendered as colored circle markers based on category:

| Category | Color | Hex |
|---|---|---|
| `breaking` | Red | `#ef4444` |
| `geopolitical` | Amber | `#f59e0b` |
| `military` | Blue | `#3b82f6` |
| `economic` | Green | `#22c55e` |
| `science` | Purple | `#a855f7` |
| `ai` | Cyan | `#06b6d4` |
| `robotics` | Orange | `#f97316` |
| `default` | Gray | `#94a3b8` |

To change a category color, find the color mapping in `pages/map-feed.html` and `pages/news-map.html` — both files define the same constant:

```js
const CATEGORY_COLORS = {
  breaking:     '#ef4444',
  geopolitical: '#f59e0b',
  military:     '#3b82f6',
  economic:     '#22c55e',
  science:      '#a855f7',
  ai:           '#06b6d4',
  robotics:     '#f97316',
};
```

### Map Initialization

```js
const map = L.map('map', {
  center: [25, 10],
  zoom: 2,
  minZoom: 2,
  maxZoom: 18,
  zoomControl: true,
});

// Dark tile layer (CartoDB Dark Matter)
L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  { attribution: '© OpenStreetMap contributors © CARTO' }
).addTo(map);
```

### Marker Clustering

Articles within proximity are automatically clustered using MarkerCluster:

```js
const markers = L.markerClusterGroup({
  maxClusterRadius: 40,
  showCoverageOnHover: false,
  iconCreateFunction: (cluster) => {
    const count = cluster.getChildCount();
    // Dynamic size based on count
    const size = count < 10 ? 28 : count < 50 ? 34 : 40;
    return L.divIcon({
      html: `<div class="cluster-icon">${count}</div>`,
      iconSize: [size, size],
      className: 'custom-cluster',
    });
  },
});
```

### Heatmap Layer

The map optionally renders a heatmap overlay using Leaflet.heat. Toggle with the "Heatmap" button in the UI layer controls.

### Adding a New Map Layer

Add a new tile layer option to the layers panel:

```js
const tileLayers = {
  dark:      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
  // Add:
  terrain:   L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'),
};
```

---

## 6. Per-Country News Maps (`pages/news-map.html`)

`news-map.html` accepts a `country` URL parameter to show a filtered view:

```
pages/news-map.html?country=Russia
pages/news-map.html?country=China
```

The page fetches:
```
GET /api/articles/geo?country=Russia&timeRange=48
```

And renders only articles geocoded to that country. The map auto-zooms to that country's bounding box using Leaflet's `fitBounds()`.

---

## 7. Article Flagging

Users can flag articles from the map popup or feed list for inclusion in AI analysis. Flagged articles bypass the 72-hour recency filter and are always included at the top of the AI prompt.

### Flagging via API

```bash
curl -X POST http://localhost:5000/api/articles/flag \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "abc123def456",
    "country": "russia",
    "notes": "Confirms troop redeployment near Kursk"
  }'
```

### Map Popup Flag Button

Each map marker popup contains a "Flag for Analysis" button. When clicked:

```js
async function flagArticle(articleId, country) {
  const resp = await fetch('/api/articles/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleId, country, notes: '' }),
  });
  const data = await resp.json();
  if (data.success) {
    showToast('Article flagged for next AI analysis run');
  }
}
```

---

## 8. API Endpoints for Feeds and Articles

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/feeds` | List all configured feeds |
| `POST` | `/api/feeds` | Add a single feed |
| `DELETE` | `/api/feeds/:id` | Remove feed by ID |
| `POST` | `/api/feeds/import` | Bulk import feeds array |
| `POST` | `/api/feeds/fetch` | Trigger async fetch of all enabled feeds |
| `GET` | `/api/feeds/fetch-status` | Poll current fetch progress |
| `GET` | `/api/articles` | Get articles (query: `country`, `category`, `timeRange`, `search`, `limit`) |
| `GET` | `/api/articles/geo` | Geotagged articles only (query: `country`, `timeRange`) |
| `POST` | `/api/articles/flag` | Flag article (body: `articleId`, `country`, `notes`) |
| `GET` | `/api/articles/flagged` | Get all flagged articles (query: `country`) |
| `DELETE` | `/api/articles/flag/:id` | Remove flag by flag ID |

### Article Filters (GET /api/articles)

```
/api/articles?country=Russia&category=military&timeRange=24&search=drone&limit=50
```

| Param | Type | Description |
|---|---|---|
| `country` | string | Case-insensitive substring match on `article.country` |
| `category` | string | Exact match on `article.category` |
| `timeRange` | number | Hours back to include (e.g., `24`, `48`, `72`) |
| `search` | string | Text search across title + description |
| `limit` | number | Max results to return (default: 200) |

---

## 9. Fetch Status Schema

Poll `GET /api/feeds/fetch-status` during an active fetch:

```json
{
  "success": true,
  "data": {
    "running": true,
    "progress": 23,
    "total": 47,
    "current": "TASS News Agency",
    "errors": 2,
    "lastRun": "2026-03-28T22:48:00.000Z",
    "message": "Fetching: TASS News Agency (23/47)"
  }
}
```

When complete:

```json
{
  "data": {
    "running": false,
    "message": "Fetch complete. 284 new articles. 3 feed errors.",
    "lastResult": {
      "totalArticles": 1847,
      "newArticles": 284,
      "savedTotal": 2131,
      "feedErrors": 3,
      "feedResults": [...]
    }
  }
}
```

---

## 10. Troubleshooting Feed Parsing Errors

### Feed timeout errors
- Default: 15 seconds per feed
- **Fix:** Disable slow feeds with `"enabled": false`, or increase `FETCH_TIMEOUT_MS` in `rss-engine.js`

### "Unrecognized feed format" error
- The XML root is not `rss`, `feed`, or `rdf:RDF`
- Some outlets serve JSON API responses at their "feed" URLs
- **Fix:** Find the actual RSS/Atom URL — most news sites have a separate `/feed/` or `/rss/` endpoint

### "XML parse error" on a valid feed
- The feed may return HTML (e.g., a 403 error page) instead of XML
- Check if the feed requires a browser `User-Agent` header (already set in the engine)
- **Fix:** Test with `curl -A "ConflictMapper/1.0" [url]` to see actual response

### Articles not geotagged (lat/lng is null)
- The geocoder found no recognizable place names in title + description
- **Fix:** Set `country` field explicitly on the feed config — this acts as a fallback geo for all articles from that feed

### Duplicate articles from multiple feeds covering same story
- Title similarity deduplication uses threshold `0.75` (Jaccard)
- **Fix:** Lower to `0.65` in `deduplicateArticles()` call for more aggressive deduplication
- Trade-off: may merge articles about related-but-different events

### Article store grows too large
- `saveArticles()` caps at 5,000 articles
- **Fix:** Reduce cap or add time-based pruning:
```js
// In saveArticles(), after sort:
const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
merged = merged.filter(a => new Date(a.pubDate).getTime() > cutoff);
```

---

*This prompt covers `lib/rss-engine.js`, `lib/feed-store.js`, `lib/geocoder.js`, and the Leaflet map pages. Cross-reference `ANALYSIS_ENGINE_PROMPT.md` for how articles are used by the AI, `ADMIN_SETTINGS_PROMPT.md` for the feed management UI, and `SITE_ARCHITECTURE_PROMPT.md` for the full system overview.*

---

## 11. Country Slug Mapping Fix (`COUNTRY_SLUG_MAP`)

A bug existed where per-country article filtering only checked whether `article.country === getCountryFromSlug(slug)` (e.g., `article.country === 'United States'`). Articles from globally-tagged feeds that mentioned the USA — e.g., via "Pentagon", "White House", or "Washington" — were excluded from USA country analysis.

**The fix:** A `COUNTRY_SLUG_MAP` constant in `lib/feed-store.js` (and mirrored in `lib/analysis-generator.js`) maps each country slug to a list of relevant search terms. The country filter now matches against these terms across the article's `country`, `title`, and `description` fields.

```js
// In lib/feed-store.js and lib/analysis-generator.js
const COUNTRY_SLUG_MAP = {
  'usa': [
    'United States', 'USA', 'America', 'American',
    'Pentagon', 'White House', 'Washington', 'Congress',
    'Biden', 'Trump', 'US Army', 'US Navy', 'US Air Force',
  ],
  'russia': [
    'Russia', 'Russian', 'Moscow', 'Kremlin', 'Putin',
    'FSB', 'GRU', 'Rosneft', 'Gazprom', 'Wagner',
  ],
  'china': [
    'China', 'Chinese', 'Beijing', 'PRC', 'PLA',
    'Xi Jinping', 'CPC', 'PLAN', 'PLAAF', 'Hong Kong',
  ],
  'ukraine': [
    'Ukraine', 'Ukrainian', 'Kyiv', 'Zelensky',
    'Donbas', 'Crimea', 'Kharkiv', 'Kherson', 'Odessa',
  ],
  'taiwan': [
    'Taiwan', 'Taiwanese', 'Taipei', 'ROC', 'ROCAF',
    'Taiwan Strait', 'Tsai', 'Lai Ching-te',
  ],
  'iran': [
    'Iran', 'Iranian', 'Tehran', 'IRGC', 'Khamenei',
    'Rouhani', 'Raisi', 'Persian Gulf', 'JCPOA',
  ],
  'israel': [
    'Israel', 'Israeli', 'Jerusalem', 'IDF', 'Netanyahu',
    'Gaza', 'Hamas', 'West Bank', 'Tel Aviv', 'Hezbollah',
  ],
  'india': [
    'India', 'Indian', 'New Delhi', 'Modi', 'BJP',
    'Mumbai', 'Chennai', 'IAF', 'Indian Army', 'RAW',
  ],
  'pakistan': [
    'Pakistan', 'Pakistani', 'Islamabad', 'Karachi',
    'ISI', 'Lahore', 'COAS',
  ],
  'north-korea': [
    'North Korea', 'DPRK', 'Pyongyang', 'Kim Jong-un',
    'North Korean', 'Korean People\'s Army', 'KPA',
  ],
  'nato': [
    'NATO', 'Alliance', 'Brussels', 'SHAPE',
    'European defense', 'Article 5', 'Stoltenberg',
  ],
};
```

**How the filter is applied in `GET /api/articles?country=usa`:**

```js
function filterArticlesByCountry(articles, countryQuery) {
  const slug = countryQuery.toLowerCase();
  const terms = COUNTRY_SLUG_MAP[slug];

  if (terms) {
    // Use slug map for known countries — searches title/description/country field
    return articles.filter(article => {
      const text = `${article.country || ''} ${article.title || ''} ${article.description || ''}`;
      return terms.some(term => text.toLowerCase().includes(term.toLowerCase()));
    });
  }

  // Fallback: substring match on article.country for unknown slugs
  return articles.filter(a =>
    (a.country || '').toLowerCase().includes(slug)
  );
}
```

---

## 12. Language Detection and Filtering

The RSS engine attaches a `language` field to every article. This is computed by `detectLanguage()` in `lib/rss-engine.js` unless the feed config hardcodes `"language": "en"`.

### Detection Algorithm

Non-ASCII character ratio heuristic:

```js
function detectLanguage(text) {
  const wordChars = text.replace(/[\s\p{P}\d]/gu, '');
  if (wordChars.length === 0) return 'en';
  let nonAscii = 0;
  for (let i = 0; i < wordChars.length; i++) {
    if (wordChars.charCodeAt(i) > 127) nonAscii++;
  }
  return (nonAscii / wordChars.length) > 0.30 ? 'xx' : 'en';
}
```

- **`'en'`** — Article is in English (or has <30% non-ASCII characters)
- **`'xx'`** — Article is in a non-English language (Chinese, Arabic, Russian, Korean, Japanese, Thai, etc.)

### How Language Affects Article Display

| Context | Behavior |
|---|---|
| Map display (`GET /api/articles/geo`) | All languages included by default |
| Feed list (`GET /api/articles`) | All languages included unless `?language=en` is passed |
| AI analysis prompt | English only — `language === 'xx'` articles are excluded |
| Flagged articles | Not filtered — flagged articles always included regardless of language |

### Forcing English on Known Feeds

For feeds you know are always in English, hardcode in `feeds-config.json` to skip detection:

```json
{
  "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
  "name": "BBC World News",
  "language": "en"
}
```

---

## 13. The 153 Pre-Configured Feeds

`data/feeds-config.json` ships with 153 pre-configured feed entries. Category distribution:

| Category | Count | Coverage |
|---|---|---|
| `breaking` | ~35 | Major wire services, global breaking news |
| `geopolitics` | ~25 | Diplomacy, international relations, think-tanks |
| `military` | ~20 | Defense news, military analysis, procurement |
| `ai` | ~15 | AI research, LLM releases, AI policy |
| `technology` | ~15 | Tech industry, semiconductors, hardware |
| `science` | ~12 | General science, physics, biology |
| `spaceflight` | ~12 | Launch vehicles, satellites, NASA/SpaceX/ESA |
| `robotics` | ~8 | Robotics systems, autonomous vehicles |
| `engineering` | ~6 | Engineering, manufacturing, infrastructure |
| `research` | ~5 | Academic papers, research institutions |

**Total:** 153 feeds across 10 categories.

The feed list is editable inline via the admin panel (name, category, country fields editable without a modal). See `ADMIN_SETTINGS_PROMPT.md` §15 for the UI implementation.

### Adding Feeds in Bulk

To expand the feed list, use the bulk import endpoint:

```bash
curl -X POST http://localhost:5000/api/feeds/import \
  -H "Content-Type: application/json" \
  -d '{ "feeds": [ { "url": "...", "name": "...", "category": "military", "country": "global" } ] }'
```

Duplicates are skipped by URL match.

---

## 14. Known Fixes & Correct Patterns (March 2026)

### Fix 1: Geo Coordinate Access

Articles store geographic coordinates in a nested `geo` object set by `lib/geocoder.js`:

```js
// Set by geocoder:
article.geo = { lat: 39.91, lng: 116.39, country: 'China', place: 'Beijing', ... }
```

The map pages use **both** the nested and flat patterns for backward compatibility with any articles stored in the old flat format:

```js
// CORRECT pattern (used in both map-feed.html and news-map.html):
const lat = article.lat || article.geo?.lat;
const lng = article.lng || article.geo?.lng;

// WRONG — breaks on articles that only have geo.lat:
const lat = article.lat;   // may be undefined
```

When adding new map features that need coordinates, always use the `article.lat || article.geo?.lat` fallback pattern.

---

### Fix 2: Category Checkbox Values

The sidebar category checkboxes filter articles by comparing `article.category` against the checkbox `value`. The `value` attributes must match the **article**-side category string, not the feed-side category.

**Correct checkbox values** (as of current codebase):

```html
<input type="checkbox" value="breaking"     checked onchange="applyFilters()"> Breaking
<input type="checkbox" value="geopolitics"  checked onchange="applyFilters()"> Geopolitics
<input type="checkbox" value="military"     checked onchange="applyFilters()"> Military
<input type="checkbox" value="political"    checked onchange="applyFilters()"> Political
<input type="checkbox" value="technology"   checked onchange="applyFilters()"> Tech
<input type="checkbox" value="general"      checked onchange="applyFilters()"> General
```

> **Note:** Feed configs use `"category": "geopolitical"` (with 'al') but articles normalize to `"geopolitics"` (without 'al'). The checkbox `value` must be `"geopolitics"` to match articles. If you add a new category, ensure the feed config value and the article-side value are consistent.

---

### Fix 3: SCMP Placeholder Removal

The `pages/map-feed.html` file previously contained hardcoded SCMP demo articles as fallback data. This caused SCMP articles to always appear on the map even when no real articles were loaded. The fallback data was removed — the map now shows an empty state when no articles are available, which correctly prompts the user to fetch feeds.

If rebuilding `map-feed.html`, do **not** include hardcoded fallback article objects. Use a proper empty state message instead:

```js
if (articles.length === 0) {
  document.getElementById('article-list').innerHTML =
    '<p class="empty-state">No articles yet. Go to Settings → RSS Feeds → Fetch All Now.</p>';
  return;
}
```
