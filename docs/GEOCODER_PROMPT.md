# Geocoder — System Prompt
## Conflict Mapper — `lib/geocoder.js` + `COUNTRY_SLUG_MAP` in `lib/feed-store.js`

You are an expert Node.js developer rebuilding the keyword-based geocoder for Conflict Mapper. This module requires no external API — it uses a hardcoded lookup table of ~370 location entries. This document is the complete specification for `lib/geocoder.js` (441 lines) and the `COUNTRY_SLUG_MAP` section of `lib/feed-store.js`.

---

## Architecture Overview

```
geocode(text)
  ↓
text.toLowerCase()
  ↓
scan all LOCATIONS keys (O(n) iteration)
  ↓
score = keyword.length  (longer = more specific = higher confidence)
  ↓
keep bestMatch (highest score)
  ↓
return { lat, lng, country, place, confidence } | null
```

The geocoder is called on every article during RSS parsing. If it finds a match, the article gets `geo.lat/lng` and appears on the map.

---

## Core Function: `geocode(text)`

```js
function geocode(text) {
  if (!text || typeof text !== 'string') return null;

  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [keyword, data] of Object.entries(LOCATIONS)) {
    if (lower.includes(keyword)) {
      const score = keyword.length;  // longer keyword = more specific = higher priority
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          lat:  data.lat,
          lng:  data.lng,
          country: data.country,
          place: keyword.split(' ')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' '),
          type: data.type,
          confidence: Math.min(0.95, 0.4 + (score / 30)),
        };
      }
    }
  }

  return bestMatch;
}
```

**Confidence formula:** `Math.min(0.95, 0.4 + (score / 30))`
- 1-char keyword: 0.43 (effectively never used)
- 5-char keyword ("china", "japan"): 0.57
- 10-char keyword ("south korea"): 0.73
- 20-char keyword ("strait of hormuz"): 0.95
- 30+ chars: capped at 0.95

**Why longest keyword wins:** "south china sea" (15 chars) beats "china" (5 chars), which is correct — an article mentioning the South China Sea is more precisely located than one just mentioning China.

---

## Location Database Schema

Each entry in `LOCATIONS`:
```js
'keyword': { lat: number, lng: number, country: string, type: string }
```

**Type values:**
- `'country'` — Nation-state
- `'capital'` — Capital city
- `'city'` — Major city
- `'region'` — Geographic region or administrative area
- `'base'` — Military base or installation
- `'zone'` — Strategic zone, waterway, conflict area
- `'org'` — International organization

---

## Full LOCATIONS Database (~370 entries)

### Global / Organizations
```js
'united nations':       { lat: 40.75, lng: -73.97, country: 'USA',     type: 'org' },
'nato':                 { lat: 50.88, lng:   4.42, country: 'Belgium', type: 'org' },
'european union':       { lat: 50.85, lng:   4.35, country: 'Belgium', type: 'org' },
'eu':                   { lat: 50.85, lng:   4.35, country: 'Belgium', type: 'org' },
'g7':                   { lat: 51.50, lng:  -0.12, country: 'UK',      type: 'org' },
'g20':                  { lat:  0.00, lng:   0.00, country: 'Global',  type: 'org' },
```

### USA
```js
'united states':        { lat: 38.90, lng: -77.03, country: 'USA', type: 'country' },
'united states of america': { lat: 38.90, lng: -77.03, country: 'USA', type: 'country' },
'usa':                  { lat: 38.90, lng: -77.03, country: 'USA', type: 'country' },
'america':              { lat: 38.90, lng: -77.03, country: 'USA', type: 'country' },
'american':             { lat: 38.90, lng: -77.03, country: 'USA', type: 'country' },
'washington':           { lat: 38.90, lng: -77.03, country: 'USA', type: 'capital' },
'washington dc':        { lat: 38.90, lng: -77.03, country: 'USA', type: 'capital' },
'pentagon':             { lat: 38.87, lng: -77.06, country: 'USA', type: 'base' },
'langley':              { lat: 38.95, lng: -77.15, country: 'USA', type: 'base' },
'joint base pearl harbor': { lat: 21.36, lng: -157.97, country: 'USA', type: 'base' },
'guam':                 { lat: 13.44, lng: 144.79, country: 'USA', type: 'territory' },
'okinawa':              { lat: 26.33, lng: 127.80, country: 'Japan', type: 'base' },
'camp humphreys':       { lat: 36.97, lng: 126.99, country: 'South Korea', type: 'base' },
'ramstein':             { lat: 49.44, lng:   7.60, country: 'Germany', type: 'base' },
'new york':             { lat: 40.71, lng: -74.00, country: 'USA', type: 'city' },
'los angeles':          { lat: 34.05, lng:-118.24, country: 'USA', type: 'city' },
'chicago':              { lat: 41.88, lng: -87.63, country: 'USA', type: 'city' },
'houston':              { lat: 29.76, lng: -95.37, country: 'USA', type: 'city' },
'miami':                { lat: 25.77, lng: -80.19, country: 'USA', type: 'city' },
'san francisco':        { lat: 37.77, lng:-122.42, country: 'USA', type: 'city' },
```

### Russia
```js
'russia':               { lat: 55.75, lng:  37.62, country: 'Russia', type: 'country' },
'russian':              { lat: 55.75, lng:  37.62, country: 'Russia', type: 'country' },
'moscow':               { lat: 55.75, lng:  37.62, country: 'Russia', type: 'capital' },
'kremlin':              { lat: 55.75, lng:  37.62, country: 'Russia', type: 'capital' },
'saint petersburg':     { lat: 59.93, lng:  30.32, country: 'Russia', type: 'city' },
'st. petersburg':       { lat: 59.93, lng:  30.32, country: 'Russia', type: 'city' },
'vladivostok':          { lat: 43.12, lng: 131.90, country: 'Russia', type: 'city' },
'kaliningrad':          { lat: 54.71, lng:  20.51, country: 'Russia', type: 'region' },
'crimea':               { lat: 45.35, lng:  34.10, country: 'Ukraine', type: 'zone' },
'sevastopol':           { lat: 44.60, lng:  33.53, country: 'Ukraine', type: 'city' },
'murmansk':             { lat: 68.97, lng:  33.08, country: 'Russia', type: 'city' },
'siberia':              { lat: 60.00, lng:  90.00, country: 'Russia', type: 'region' },
'ukraine war':          { lat: 49.00, lng:  32.00, country: 'Ukraine', type: 'zone' },
'donbas':               { lat: 48.00, lng:  37.80, country: 'Ukraine', type: 'zone' },
'zaporizhzhia':         { lat: 47.83, lng:  35.14, country: 'Ukraine', type: 'city' },
'mariupol':             { lat: 47.10, lng:  37.55, country: 'Ukraine', type: 'city' },
'belgorod':             { lat: 50.60, lng:  36.60, country: 'Russia', type: 'city' },
'kursk':                { lat: 51.73, lng:  36.19, country: 'Russia', type: 'city' },
```

### Ukraine
```js
'ukraine':              { lat: 50.45, lng:  30.52, country: 'Ukraine', type: 'country' },
'ukrainian':            { lat: 50.45, lng:  30.52, country: 'Ukraine', type: 'country' },
'kyiv':                 { lat: 50.45, lng:  30.52, country: 'Ukraine', type: 'capital' },
'kiev':                 { lat: 50.45, lng:  30.52, country: 'Ukraine', type: 'capital' },
'kharkiv':              { lat: 49.99, lng:  36.23, country: 'Ukraine', type: 'city' },
'odessa':               { lat: 46.48, lng:  30.73, country: 'Ukraine', type: 'city' },
'lviv':                 { lat: 49.84, lng:  24.03, country: 'Ukraine', type: 'city' },
'kherson':              { lat: 46.64, lng:  32.62, country: 'Ukraine', type: 'city' },
'mykolaiv':             { lat: 46.96, lng:  31.99, country: 'Ukraine', type: 'city' },
'dnipro':               { lat: 48.46, lng:  34.98, country: 'Ukraine', type: 'city' },
'donetsk':              { lat: 48.00, lng:  37.80, country: 'Ukraine', type: 'city' },
'luhansk':              { lat: 48.57, lng:  39.31, country: 'Ukraine', type: 'city' },
'bakhmut':              { lat: 48.60, lng:  37.99, country: 'Ukraine', type: 'city' },
'avdiivka':             { lat: 48.14, lng:  37.76, country: 'Ukraine', type: 'city' },
```

### China
```js
'china':                { lat: 39.91, lng: 116.39, country: 'China', type: 'country' },
'chinese':              { lat: 39.91, lng: 116.39, country: 'China', type: 'country' },
'prc':                  { lat: 39.91, lng: 116.39, country: 'China', type: 'country' },
'beijing':              { lat: 39.91, lng: 116.39, country: 'China', type: 'capital' },
'peking':               { lat: 39.91, lng: 116.39, country: 'China', type: 'capital' },
'shanghai':             { lat: 31.23, lng: 121.47, country: 'China', type: 'city' },
'shenzhen':             { lat: 22.55, lng: 114.06, country: 'China', type: 'city' },
'guangzhou':            { lat: 23.13, lng: 113.26, country: 'China', type: 'city' },
'hong kong':            { lat: 22.32, lng: 114.17, country: 'China', type: 'city' },
'chengdu':              { lat: 30.66, lng: 104.07, country: 'China', type: 'city' },
'wuhan':                { lat: 30.58, lng: 114.27, country: 'China', type: 'city' },
'xinjiang':             { lat: 43.79, lng:  87.60, country: 'China', type: 'region' },
'tibet':                { lat: 29.65, lng:  91.12, country: 'China', type: 'region' },
'south china sea':      { lat: 15.00, lng: 115.00, country: 'Regional', type: 'zone' },
'east china sea':       { lat: 29.00, lng: 125.00, country: 'Regional', type: 'zone' },
'yellow sea':           { lat: 35.00, lng: 122.00, country: 'Regional', type: 'zone' },
'taiwan strait':        { lat: 24.50, lng: 119.50, country: 'Regional', type: 'zone' },
'spratly islands':      { lat:  9.80, lng: 114.50, country: 'Regional', type: 'zone' },
'paracel islands':      { lat: 16.50, lng: 112.20, country: 'Regional', type: 'zone' },
```

### Taiwan
```js
'taiwan':               { lat: 25.03, lng: 121.56, country: 'Taiwan', type: 'country' },
'taiwanese':            { lat: 25.03, lng: 121.56, country: 'Taiwan', type: 'country' },
'roc':                  { lat: 25.03, lng: 121.56, country: 'Taiwan', type: 'country' },
'taipei':               { lat: 25.03, lng: 121.56, country: 'Taiwan', type: 'capital' },
'kaohsiung':            { lat: 22.63, lng: 120.30, country: 'Taiwan', type: 'city' },
```

### North Korea
```js
'north korea':          { lat: 39.03, lng: 125.75, country: 'North Korea', type: 'country' },
'dprk':                 { lat: 39.03, lng: 125.75, country: 'North Korea', type: 'country' },
'pyongyang':            { lat: 39.03, lng: 125.75, country: 'North Korea', type: 'capital' },
'panmunjom':            { lat: 37.95, lng: 126.67, country: 'Regional', type: 'zone' },
'demilitarized zone':   { lat: 38.00, lng: 127.00, country: 'Regional', type: 'zone' },
'dmz':                  { lat: 38.00, lng: 127.00, country: 'Regional', type: 'zone' },
```

### South Korea / Japan
```js
'south korea':          { lat: 37.57, lng: 126.98, country: 'South Korea', type: 'country' },
'korea':                { lat: 37.57, lng: 126.98, country: 'South Korea', type: 'country' },
'seoul':                { lat: 37.57, lng: 126.98, country: 'South Korea', type: 'capital' },
'busan':                { lat: 35.18, lng: 129.07, country: 'South Korea', type: 'city' },
'japan':                { lat: 35.69, lng: 139.69, country: 'Japan', type: 'country' },
'japanese':             { lat: 35.69, lng: 139.69, country: 'Japan', type: 'country' },
'tokyo':                { lat: 35.69, lng: 139.69, country: 'Japan', type: 'capital' },
'osaka':                { lat: 34.69, lng: 135.50, country: 'Japan', type: 'city' },
'senkaku':              { lat: 25.75, lng: 123.50, country: 'Regional', type: 'zone' },
```

### Iran
```js
'iran':                 { lat: 35.69, lng:  51.42, country: 'Iran', type: 'country' },
'iranian':              { lat: 35.69, lng:  51.42, country: 'Iran', type: 'country' },
'tehran':               { lat: 35.69, lng:  51.42, country: 'Iran', type: 'capital' },
'isfahan':              { lat: 32.66, lng:  51.68, country: 'Iran', type: 'city' },
'natanz':               { lat: 33.72, lng:  51.73, country: 'Iran', type: 'base' },
'fordow':               { lat: 34.88, lng:  50.99, country: 'Iran', type: 'base' },
'strait of hormuz':     { lat: 26.57, lng:  56.60, country: 'Regional', type: 'zone' },
'hormuz':               { lat: 26.57, lng:  56.60, country: 'Regional', type: 'zone' },
'persian gulf':         { lat: 26.00, lng:  52.00, country: 'Regional', type: 'zone' },
```

### Israel / Palestine
```js
'israel':               { lat: 31.77, lng:  35.21, country: 'Israel', type: 'country' },
'israeli':              { lat: 31.77, lng:  35.21, country: 'Israel', type: 'country' },
'jerusalem':            { lat: 31.77, lng:  35.21, country: 'Israel', type: 'capital' },
'tel aviv':             { lat: 32.08, lng:  34.78, country: 'Israel', type: 'city' },
'haifa':                { lat: 32.82, lng:  34.99, country: 'Israel', type: 'city' },
'gaza':                 { lat: 31.50, lng:  34.47, country: 'Palestine', type: 'zone' },
'west bank':            { lat: 31.90, lng:  35.20, country: 'Palestine', type: 'zone' },
'rafah':                { lat: 31.29, lng:  34.24, country: 'Palestine', type: 'city' },
'lebanon':              { lat: 33.89, lng:  35.50, country: 'Lebanon', type: 'country' },
'beirut':               { lat: 33.89, lng:  35.50, country: 'Lebanon', type: 'capital' },
'hezbollah':            { lat: 33.89, lng:  35.50, country: 'Lebanon', type: 'zone' },
```

### India / Pakistan
```js
'india':                { lat: 28.63, lng:  77.22, country: 'India', type: 'country' },
'indian':               { lat: 28.63, lng:  77.22, country: 'India', type: 'country' },
'new delhi':            { lat: 28.63, lng:  77.22, country: 'India', type: 'capital' },
'delhi':                { lat: 28.63, lng:  77.22, country: 'India', type: 'capital' },
'mumbai':               { lat: 19.08, lng:  72.88, country: 'India', type: 'city' },
'bangalore':            { lat: 12.97, lng:  77.59, country: 'India', type: 'city' },
'line of actual control': { lat: 34.00, lng: 78.00, country: 'Regional', type: 'zone' },
'lac':                  { lat: 34.00, lng:  78.00, country: 'Regional', type: 'zone' },
'galwan valley':        { lat: 33.95, lng:  78.77, country: 'Regional', type: 'zone' },
'kashmir':              { lat: 34.08, lng:  74.80, country: 'India', type: 'region' },
'ladakh':               { lat: 34.16, lng:  77.58, country: 'India', type: 'region' },
'indian ocean':         { lat: -10.0, lng:  70.00, country: 'Regional', type: 'zone' },
'pakistan':             { lat: 33.72, lng:  73.04, country: 'Pakistan', type: 'country' },
'pakistani':            { lat: 33.72, lng:  73.04, country: 'Pakistan', type: 'country' },
'islamabad':            { lat: 33.72, lng:  73.04, country: 'Pakistan', type: 'capital' },
'karachi':              { lat: 24.86, lng:  67.01, country: 'Pakistan', type: 'city' },
'lahore':               { lat: 31.55, lng:  74.34, country: 'Pakistan', type: 'city' },
```

### Middle East Strategic Zones
```js
'suez canal':           { lat: 30.50, lng:  32.35, country: 'Egypt', type: 'zone' },
'suez':                 { lat: 30.50, lng:  32.35, country: 'Egypt', type: 'zone' },
'bab-el-mandeb':        { lat: 12.60, lng:  43.35, country: 'Regional', type: 'zone' },
'red sea':              { lat: 20.00, lng:  38.00, country: 'Regional', type: 'zone' },
'yemen':                { lat: 15.55, lng:  48.52, country: 'Yemen', type: 'country' },
'houthi':               { lat: 15.35, lng:  44.20, country: 'Yemen', type: 'zone' },
'houthis':              { lat: 15.35, lng:  44.20, country: 'Yemen', type: 'zone' },
```

### European Entries (selected)
```js
'united kingdom':       { lat: 51.50, lng:  -0.12, country: 'UK', type: 'country' },
'london':               { lat: 51.50, lng:  -0.12, country: 'UK', type: 'capital' },
'france':               { lat: 48.85, lng:   2.35, country: 'France', type: 'country' },
'paris':                { lat: 48.85, lng:   2.35, country: 'France', type: 'capital' },
'germany':              { lat: 52.52, lng:  13.40, country: 'Germany', type: 'country' },
'berlin':               { lat: 52.52, lng:  13.40, country: 'Germany', type: 'capital' },
'turkey':               { lat: 39.92, lng:  32.85, country: 'Turkey', type: 'country' },
'bosphorus':            { lat: 41.11, lng:  29.07, country: 'Turkey', type: 'zone' },
'black sea':            { lat: 43.00, lng:  34.00, country: 'Regional', type: 'zone' },
'baltics':              { lat: 57.00, lng:  24.00, country: 'Regional', type: 'region' },
'transnistria':         { lat: 47.10, lng:  29.36, country: 'Moldova', type: 'zone' },
```

### Arctic / Strategic
```js
'arctic':               { lat: 80.00, lng:  10.00, country: 'Regional', type: 'zone' },
'svalbard':             { lat: 78.22, lng:  15.63, country: 'Norway', type: 'zone' },
'northwest passage':    { lat: 74.00, lng: -95.00, country: 'Regional', type: 'zone' },
'northern sea route':   { lat: 75.00, lng: 100.00, country: 'Russia', type: 'zone' },
```

### Space Facilities
```js
'cape canaveral':       { lat: 28.39, lng: -80.61, country: 'USA', type: 'base' },
'kennedy space center': { lat: 28.57, lng: -80.65, country: 'USA', type: 'base' },
'vandenberg':           { lat: 34.76, lng:-120.52, country: 'USA', type: 'base' },
'baikonur':             { lat: 45.96, lng:  63.31, country: 'Kazakhstan', type: 'base' },
'jiuquan':              { lat: 40.96, lng: 100.29, country: 'China', type: 'base' },
'wenchang':             { lat: 19.62, lng: 110.96, country: 'China', type: 'base' },
'satish dhawan':        { lat: 13.73, lng:  80.24, country: 'India', type: 'base' },
```

---

## COUNTRY_SLUG_MAP (in `lib/feed-store.js`)

Maps URL slugs (used in `?country=usa`) to arrays of search terms matched against article text fields. This enables country filtering even when the geocoder assigns a different `country` value.

> **Updated March 2026:** The COUNTRY_SLUG_MAP now uses a `matchesWholeWord()` helper (see below) instead of simple `String.includes()`. The term list was also cleaned up to remove problematic short terms that caused false positives.

```js
const COUNTRY_SLUG_MAP = {
  'usa': [
    // REMOVED: 'us ', ' us,' — these matched words like 'thus', 'focus', 'bus'
    'united states', 'america', 'american',
    'washington', 'pentagon', 'u.s.', 'cia', 'nsa', 'fbi',
    'white house', 'congress', 'senate', 'democrat', 'republican',
    'biden', 'trump'
  ],
  'china': [
    'china', 'chinese', 'beijing', 'prc', 'xi jinping',
    // CHANGED: 'pla' → "people's liberation army" to avoid matching 'explain', 'replace', etc.
    // 'pla ' (with space) also works but "people's liberation army" is cleaner
    "people's liberation army", 'pla ',
    "people's republic", 'ccp', 'shanghai', 'hong kong', 'guangdong'
  ],
  'russia': [
    'russia', 'russian', 'moscow', 'kremlin', 'putin', 'fsb',
    'svr', 'wagner', 'siberia', 'st. petersburg'
  ],
  'ukraine': [
    'ukraine', 'ukrainian', 'kyiv', 'kiev', 'zelensky',
    'donbas', 'donbass', 'zaporizhzhia', 'kharkiv', 'odessa',
    'kherson', 'mariupol'
  ],
  'taiwan': [
    'taiwan', 'taiwanese', 'taipei', 'roc', 'republic of china',
    'tsai', 'strait', 'formosa'
  ],
  'iran': [
    'iran', 'iranian', 'tehran', 'persian', 'irgc',
    'khamenei', 'rouhani', 'raisi', 'nuclear deal', 'jcpoa'
  ],
  'israel': [
    'israel', 'israeli', 'jerusalem', 'tel aviv', 'idf',
    'hamas', 'netanyahu', 'mossad', 'gaza', 'west bank', 'hezbollah'
  ],
  'india': [
    'india', 'indian', 'delhi', 'new delhi', 'mumbai',
    'modi', 'bjp', 'kashmir', 'hindutva', 'chennai'
  ],
  'pakistan': [
    'pakistan', 'pakistani', 'islamabad', 'lahore', 'karachi',
    'isi', 'imf pakistan'
  ],
  'north-korea': [
    'north korea', 'dprk', 'pyongyang', 'kim jong',
    'kim jong-un', 'korean peninsula', 'icbm korea'
  ],
  'nato': [
    'nato', 'north atlantic treaty', 'alliance',
    'brussels hq', 'article 5', 'collective defense'
  ],
};
```

### Word-Boundary Matching Helper

To prevent short terms like `'pla'` from matching inside words like `'explain'` or `'replace'`, the filtering uses a `matchesWholeWord()` helper:

```js
/**
 * Check if a search term appears as a whole word in text.
 * For short terms (≤3 chars), requires regex word boundaries (\b).
 * For longer terms, uses simple case-insensitive includes.
 */
function matchesWholeWord(text, term) {
  if (!text || !term) return false;
  if (term.length <= 3) {
    const escaped = term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const regex = new RegExp(`\\\\b${escaped}\\\\b`, 'i');
    return regex.test(text);
  }
  return text.toLowerCase().includes(term.toLowerCase());
}
```

### How Country Filtering Works in `getArticles()`

```js
if (filters.country && filters.country !== 'global') {
  const slug  = filters.country.toLowerCase();
  const terms = COUNTRY_SLUG_MAP[slug];

  if (terms) {
    articles = articles.filter(a => {
      // Priority 1: feed-assigned country field exact match
      const feedCountry = (a.country || '').toLowerCase();
      const slugCountry = getCountryFromSlug(slug).toLowerCase();
      if (feedCountry === slugCountry) return true;

      // Priority 2: geo.country matches (word-boundary safe)
      const geoCountry = (a.geo?.country || '').toLowerCase();
      if (terms.some(term => matchesWholeWord(geoCountry, term))) return true;

      // Priority 3: title contains country-relevant terms (word-boundary safe)
      const title = (a.title || '').toLowerCase();
      return terms.some(term => matchesWholeWord(title, term));
    });
  } else {
    // Fallback: direct substring match on country field
    articles = articles.filter(a =>
      (a.country || '').toLowerCase().includes(slug)
    );
  }
}
```

---

## Auxiliary Exports

### `getCountryFromSlug(slug)`
Converts `'north-korea'` → `'North Korea'` using the `COUNTRY_SLUGS` map.

```js
const COUNTRY_SLUGS = {
  'usa': 'USA', 'russia': 'Russia', 'china': 'China',
  'ukraine': 'Ukraine', 'taiwan': 'Taiwan', 'iran': 'Iran',
  'israel': 'Israel', 'india': 'India', 'pakistan': 'Pakistan',
  'north-korea': 'North Korea', 'nato': 'NATO/Europe',
};

function getCountryFromSlug(slug) {
  return COUNTRY_SLUGS[slug] || slug.replace(/-/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase());
}
```

### `getAllLocations()`
Returns the full LOCATIONS object. Used by admin tools or map initialization.

---

## Exports

```js
module.exports = { geocode, getCountryFromSlug, getAllLocations, COUNTRY_SLUGS };
```

---

## How to Add a New Location

Add an entry to the `LOCATIONS` object in `geocoder.js`:

```js
// Example: add Ramstein Air Base, Germany
'ramstein air base': { lat: 49.44, lng: 7.60, country: 'Germany', type: 'base' },

// Example: add Strait of Gibraltar
'strait of gibraltar': { lat: 35.99, lng: -5.49, country: 'Regional', type: 'zone' },

// Example: add a conflict zone
'donbas':  { lat: 48.00, lng: 37.80, country: 'Ukraine', type: 'zone' },
```

**Rules:**
- Key must be lowercase (matching is case-insensitive)
- Longer/more specific keywords naturally win over shorter ones
- For contested territories, assign `country: 'Regional'`
- Bases on foreign soil: use the host country

---

## How to Add a New Country to the Slug Map

1. Add entry to `COUNTRY_SLUG_MAP` in `feed-store.js`:
```js
'myanmar': [
  'myanmar', 'burma', 'burmese', 'rangoon', 'yangon',
  'naypyidaw', 'tatmadaw', 'nld'
],
```

2. Add country center to `COUNTRY_SLUGS` in `geocoder.js`:
```js
'myanmar': 'Myanmar',
```

3. Add to `COUNTRY_DATA` in `pages/news-map.html` and `pages/historical.html`:
```js
myanmar: { name: 'Myanmar', flag: '🇲🇲', center: [16.8, 96.2], zoom: 5, slug: 'myanmar' }
```

4. Add a feed category for it in `data/feeds-config.json` — set `"country": "myanmar"` on relevant feeds.

---

## Country Centers Reference (for map views)

| Slug        | Center Lat | Center Lng | Zoom |
|-------------|-----------|-----------|------|
| usa         | 39.8      | -98.5     | 4    |
| china       | 35.0      | 104.0     | 4    |
| russia      | 61.5      | 105.0     | 3    |
| ukraine     | 48.4      | 31.2      | 6    |
| taiwan      | 23.7      | 121.0     | 7    |
| iran        | 32.4      | 53.7      | 5    |
| israel      | 31.0      | 34.8      | 7    |
| india       | 20.6      | 78.9      | 5    |
| pakistan    | 30.4      | 69.3      | 5    |
| north-korea | 40.3      | 127.5     | 6    |
| nato        | 50.0      | 10.0      | 4    |
