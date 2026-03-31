# Country News Map — System Prompt
## Conflict Mapper — `pages/news-map.html`

You are an expert frontend developer rebuilding the per-country news map for Conflict Mapper. This document is the complete specification for `pages/news-map.html` (741 lines, ~35KB). The page shows a Leaflet map filtered to a single country's articles, with a collapsible sidebar showing the article feed and controls.

---

## Architecture

```
news-map.html
├── <head>
│   ├── Fonts: Rajdhani, Share Tech Mono, Inter
│   ├── Leaflet 1.9.4 CSS
│   ├── Leaflet MarkerCluster CSS (MarkerCluster.css + MarkerCluster.Default.css)
│   └── Inline <style>
├── .map-shell (flex container, 100vh)
│   ├── .sidebar (350px fixed, collapsible)
│   │   ├── Country Banner (flag + name + tag)
│   │   ├── Live indicator dot
│   │   ├── Stats bar (Articles / On Map / Sources)
│   │   ├── Filters (Time + Categories)
│   │   ├── Actions (Refresh + Open Dossier)
│   │   └── Article feed list (scrollable)
│   └── .map-area (flex: 1)
│       ├── #map (Leaflet)
│       ├── Country nav strip (top-left overlay)
│       └── Map controls (top-right overlay)
├── Flag Modal (article flagging)
├── Toast notification
└── <script> (all inline)
```

---

## URL Parameter System

The page reads `?country=slug` from the URL query string:

```js
function getCountrySlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get('country') || '';
}
```

**Valid slugs:** `usa`, `china`, `russia`, `ukraine`, `taiwan`, `iran`, `israel`, `india`, `pakistan`, `north-korea`, `nato`

If no slug is provided (or an unknown slug), the page shows all countries with center `[20, 0]` zoom 2.

---

## Country Metadata Object

```js
const COUNTRY_DATA = {
  usa:          { name: 'United States', flag: '🇺🇸', center: [39.8, -98.5],  zoom: 4, slug: 'usa' },
  china:        { name: 'China',         flag: '🇨🇳', center: [35.0, 104.0],  zoom: 4, slug: 'china' },
  russia:       { name: 'Russia',        flag: '🇷🇺', center: [61.5, 105.0],  zoom: 3, slug: 'russia' },
  ukraine:      { name: 'Ukraine',       flag: '🇺🇦', center: [48.4,  31.2],  zoom: 6, slug: 'ukraine' },
  taiwan:       { name: 'Taiwan',        flag: '🇹🇼', center: [23.7, 121.0],  zoom: 7, slug: 'taiwan' },
  iran:         { name: 'Iran',          flag: '🇮🇷', center: [32.4,  53.7],  zoom: 5, slug: 'iran' },
  israel:       { name: 'Israel',        flag: '🇮🇱', center: [31.0,  34.8],  zoom: 7, slug: 'israel' },
  india:        { name: 'India',         flag: '🇮🇳', center: [20.6,  78.9],  zoom: 5, slug: 'india' },
  pakistan:     { name: 'Pakistan',      flag: '🇵🇰', center: [30.4,  69.3],  zoom: 5, slug: 'pakistan' },
  'north-korea':{ name: 'North Korea',   flag: '🇰🇵', center: [40.3, 127.5],  zoom: 6, slug: 'north-korea' },
  nato:         { name: 'NATO',          flag: '🇪🇺', center: [50.0,  10.0],  zoom: 4, slug: 'nato' },
};
```

---

## Initialization Flow

```js
function init() {
  countrySlug = getCountrySlug();              // read URL param
  countryMeta = COUNTRY_DATA[countrySlug];     // null if unknown slug

  // Update sidebar header
  document.getElementById('country-flag').textContent = countryMeta?.flag || '🌐';
  document.getElementById('country-name').textContent = countryMeta?.name || 'All Countries';
  document.title = `${countryMeta?.name || ''} News Map — Conflict Mapper`;

  // Populate flag modal country selector
  const sel = document.getElementById('flag-country');
  sel.innerHTML = '<option value="">Global</option>'
    + Object.entries(COUNTRY_DATA).map(([k, v]) =>
        `<option value="${k}" ${k === countrySlug ? 'selected' : ''}>${v.flag} ${v.name}</option>`
      ).join('');

  initMap();
  loadArticles();
}
```

---

## Map Configuration

```js
function initMap() {
  const center = countryMeta ? countryMeta.center : [20, 0];
  const zoom   = countryMeta ? countryMeta.zoom   : 2;

  map = L.map('map', { center, zoom, zoomControl: true });

  // Default: CartoDB dark tiles
  currentTileLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }
  ).addTo(map);

  // MarkerCluster group for article markers
  markersLayer = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
  });
  map.addLayer(markersLayer);
}
```

**Tile layer URLs:**
```js
const TILE_LAYERS = {
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  topo:      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
};
```

---

## Article Loading

```js
async function loadArticles() {
  try {
    const endpoint = countrySlug
      ? `/api/articles?country=${countrySlug}&limit=200`
      : '/api/articles?limit=200';

    // Fetch geo articles (for map) and feed articles (for sidebar) in parallel
    const [geoRes, feedRes] = await Promise.all([
      fetch('/api/articles/geo' + (countrySlug ? `?country=${countrySlug}` : '')),
      fetch(endpoint),
    ]);

    let geoArticles = [], feedArticles = [];
    if (geoRes.ok)  { const d = await geoRes.json();  geoArticles  = d?.data?.articles || d?.articles || []; }
    if (feedRes.ok) { const d = await feedRes.json(); feedArticles = d?.data?.articles || d?.articles || []; }

    // Merge: feed articles get geo data attached
    const geoMap = {};
    geoArticles.forEach(a => { if (a.id) geoMap[a.id] = a; });
    allArticles = feedArticles.length
      ? feedArticles.map(a => ({ ...a, ...(geoMap[a.id] || {}) }))
      : geoArticles;

    // Fallback to mock data if API unavailable
    if (!allArticles.length) allArticles = getMockArticles();
  } catch (e) {
    allArticles = getMockArticles();
  }

  applyFilters();
}
```

---

## Sidebar Components

### Country Banner

```html
<div class="country-banner">
  <div class="country-flag" id="country-flag">🌐</div>
  <div class="country-info">
    <div class="country-name" id="country-name">Loading...</div>
    <div class="country-tag" id="country-tag">News Map</div>
  </div>
</div>
<div class="sidebar-live">
  <div class="live-dot"></div>
  <span>Live Feed — Country Filtered</span>
</div>
```

The `.live-dot` pulses with CSS animation (green glow pulse).

### Stats Bar

```html
<div class="stats-bar">
  <div class="stat-item">
    <div class="stat-val" id="stat-total">—</div>
    <div class="stat-key">Articles</div>
  </div>
  <div class="stat-item">
    <div class="stat-val" id="stat-geo">—</div>
    <div class="stat-key">On Map</div>
  </div>
  <div class="stat-item">
    <div class="stat-val" id="stat-sources">—</div>
    <div class="stat-key">Sources</div>
  </div>
</div>
```

Updated by `updateStats()` after every filter change.

### Time and Category Filters

```html
<div class="sidebar-filters">
  <div class="filter-row">
    <span class="filter-label">Time</span>
    <select class="filter-select" id="filter-time" onchange="applyFilters()">
      <option value="24h" selected>Last 24 hours</option>
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      <option value="all">All time</option>
    </select>
  </div>
  <div>
    <div class="filter-label">Categories</div>
    <div class="category-checks">
      <label class="cat-check"><input type="checkbox" value="conflict"   checked onchange="applyFilters()"> 🔴 Conflict</label>
      <label class="cat-check"><input type="checkbox" value="political"  checked onchange="applyFilters()"> 🟡 Political</label>
      <label class="cat-check"><input type="checkbox" value="technology" checked onchange="applyFilters()"> 🔵 Tech</label>
      <label class="cat-check"><input type="checkbox" value="economic"   checked onchange="applyFilters()"> 🟢 Economic</label>
      <label class="cat-check"><input type="checkbox" value="general"    checked onchange="applyFilters()"> ⚪ General</label>
    </div>
  </div>
</div>
```

---

## Filtering Logic

```js
function applyFilters() {
  const cats  = Array.from(document.querySelectorAll('.cat-check input:checked')).map(i => i.value);
  const since = getTimeFilter();  // returns cutoff timestamp or null

  filteredArticles = allArticles.filter(a => {
    if (cats.length && !cats.includes(a.category || 'general')) return false;
    if (since && a.publishedAt && new Date(a.publishedAt).getTime() < since) return false;
    return true;
  });

  updateMapMarkers();
  updateFeedList();
  updateStats();
}

function getTimeFilter() {
  const val = document.getElementById('filter-time')?.value || '24h';
  if (val === 'all') return null;
  const ms = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
  return Date.now() - (ms[val] || ms['24h']);
}
```

---

## Map Marker Rendering

Category color map:
```js
const CAT_COLORS = {
  conflict:   '#c41e3a',   // red
  political:  '#f59e0b',   // amber
  technology: '#3b82f6',   // blue
  economic:   '#22c55e',   // green
  general:    '#9ca3af',   // gray
};
```

Markers are `L.circleMarker` with radius 7, placed in the MarkerCluster layer:

```js
function updateMapMarkers() {
  markersLayer.clearLayers();

  filteredArticles.filter(a => a.lat && a.lng).forEach(article => {
    const color = CAT_COLORS[article.category || 'general'] || CAT_COLORS.general;
    const marker = L.circleMarker([article.lat, article.lng], {
      radius: 7, fillColor: color, color: '#000',
      weight: 1, opacity: 0.9, fillOpacity: 0.8,
    });
    marker.bindPopup(buildPopup(article), { maxWidth: 280, minWidth: 220 });
    markersLayer.addLayer(marker);
  });

  if (heatmapOn) updateHeatmap();
}
```

### Popup HTML

```js
function buildPopup(article) {
  const cat = article.category || 'general';
  const catColor = CAT_COLORS[cat] || CAT_COLORS.general;
  return `
    <div class="popup-title">${escHtml(article.title || 'Untitled')}</div>
    <div class="popup-meta">
      <span class="cat-badge ${cat}" style="background:${catColor}22;color:${catColor}">${cat}</span>
      <span class="popup-source">${escHtml(article.source || 'Unknown')}</span>
    </div>
    <div style="font-size:0.7rem;color:#888">${timeAgo(article.publishedAt)}</div>
    <div class="popup-actions">
      ${article.url
        ? `<a href="${escHtml(article.url)}" target="_blank" class="popup-btn primary">Read →</a>`
        : ''}
      <button class="popup-btn"
        onclick="openFlagModal(${JSON.stringify({ id: article.id, title: article.title }).replace(/"/g, '&quot;')})">
        ⚑ Flag
      </button>
    </div>
  `;
}
```

---

## Country Navigation Strip (Sub-page Links)

```html
<div class="country-nav-strip" id="country-nav-strip">
  <button class="country-nav-link active" id="nav-newsmap">News Map</button>
  <button class="country-nav-link" id="nav-analysis"   onclick="openSubPage('analysis')">Analysis</button>
  <button class="country-nav-link" id="nav-historical" onclick="openSubPage('historical')">Historical</button>
  <button class="country-nav-link" id="nav-dossier"    onclick="openSubPage('dossier')">Dossier</button>
</div>
```

Navigation routes:
```js
function openSubPage(type) {
  const routes = {
    analysis:   `../reports/countries/${countrySlug}/current/report.html`,
    historical: `../pages/historical.html?country=${countrySlug}`,
    dossier:    `../countries/${countrySlug}-dossier.html`,
  };
  const url = routes[type];
  if (url) {
    // If embedded in parent iframe, message parent; else direct navigate
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'navigate', url }, '*');
    } else {
      window.location.href = url;
    }
  }
}
```

---

## Map Layer Controls

```html
<div class="map-controls">
  <div class="map-control-group">
    <button class="map-ctrl-btn active" id="layer-dark"      onclick="setMapLayer('dark')">Dark</button>
    <button class="map-ctrl-btn"        id="layer-satellite"  onclick="setMapLayer('satellite')">Satellite</button>
    <button class="map-ctrl-btn"        id="layer-topo"       onclick="setMapLayer('topo')">Topographic</button>
  </div>
  <div class="map-control-group">
    <button class="map-ctrl-btn" id="heatmap-toggle" onclick="toggleHeatmap()">Heatmap</button>
    <button class="map-ctrl-btn" onclick="centerOnCountry()">Center Country</button>
  </div>
</div>
```

`centerOnCountry()` uses `countryMeta.center` and `countryMeta.zoom`.

---

## Heatmap Overlay

```js
function updateHeatmap() {
  if (heatLayer) map.removeLayer(heatLayer);
  const points = filteredArticles
    .filter(a => a.lat && a.lng)
    .map(a => [a.lat, a.lng, 0.5]);

  if (points.length && typeof L.heatLayer === 'function') {
    heatLayer = L.heatLayer(points, {
      radius: 35, blur: 20,
      gradient: { 0.4: '#3b82f6', 0.65: '#f59e0b', 1: '#c41e3a' },
    }).addTo(map);
  }
}
```

Requires `leaflet.heat.js`: `https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js`

---

## Article Flagging Modal

```html
<div class="modal-overlay" id="flag-modal">
  <div class="modal-card">
    <div class="modal-title">Flag for Analysis</div>
    <div class="modal-subtitle" id="flag-article-title"></div>
    <div class="form-group">
      <label class="form-label">Country Association</label>
      <select class="form-select" id="flag-country"></select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes (optional)</label>
      <textarea class="form-textarea" id="flag-notes" placeholder="Why is this article relevant?"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary btn-sm" onclick="closeFlagModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="submitFlag()">Flag Article</button>
    </div>
  </div>
</div>
```

Submit calls `POST /api/articles/flag` with `{ articleId, country, notes }`.

---

## Sidebar Toggle

```js
let sidebarOpen = true;
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
  document.getElementById('toggle-arrow').textContent = sidebarOpen ? '◀' : '▶';
  setTimeout(() => map.invalidateSize(), 200);  // re-render map after CSS transition
});
```

The `.sidebar.collapsed` class sets `width: 0; min-width: 0; border-right: none;`

---

## Article Feed List Rendering

```js
function updateFeedList() {
  const container = document.getElementById('article-feed');

  const sorted = [...filteredArticles].sort((a, b) =>
    new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );

  container.innerHTML = `
    <div class="feed-section-label">${countryMeta?.name || 'All'} Articles (${sorted.length})</div>
    ${sorted.map(a => `
      <div class="article-item" onclick="focusArticle(${JSON.stringify(a).replace(/"/g, '&quot;')})">
        <button class="flag-btn" onclick="event.stopPropagation(); openFlagModal(...)">⚑</button>
        <div class="article-title">${escHtml(a.title || 'Untitled')}</div>
        <div class="article-meta">
          <span class="cat-badge ${a.category || 'general'}">${a.category || 'general'}</span>
          <span class="article-source">${escHtml(a.source || 'Unknown')}</span>
          <span class="article-time">${timeAgo(a.publishedAt)}</span>
        </div>
      </div>
    `).join('')}
  `;
}

function focusArticle(article) {
  if (article.lat && article.lng) {
    map.setView([article.lat, article.lng], 8, { animate: true });
  }
}
```

The flag button only appears on hover (CSS `opacity: 0` → `opacity: 1` on `.article-item:hover .flag-btn`).

---

## Mock Data Fallback

If the API is unavailable, `getMockArticles()` generates 5 placeholder articles using the country's center coordinates with ±3° random spread. This ensures the page is always usable for demo purposes.

---

## How to Add a New Country

1. **Add to `COUNTRY_DATA`** in `news-map.html`:
```js
myanmar: { name: 'Myanmar', flag: '🇲🇲', center: [16.8, 96.2], zoom: 5, slug: 'myanmar' },
```

2. **Add to `COUNTRY_SLUG_MAP`** in `lib/feed-store.js`:
```js
'myanmar': ['myanmar', 'burma', 'burmese', 'naypyidaw', 'tatmadaw'],
```

3. **Add to `COUNTRY_SLUGS`** in `lib/geocoder.js`:
```js
'myanmar': 'Myanmar',
```

4. **Add to historical.html and map-feed.html** `COUNTRY_DATA` objects (same structure).

5. Create a dossier file `countries/myanmar-dossier.html` (copy existing dossier as template).

6. Create feed configs in `data/feeds-config.json` for Myanmar-specific feeds.

---

## CSS Architecture (Key Classes)

| Class | Description |
|-------|-------------|
| `.map-shell` | flex container, height: 100vh, overflow: hidden |
| `.sidebar` | 350px, collapsible via `.collapsed` class |
| `.country-banner` | flag + name + tag header block |
| `.stats-bar` | 3-column count display |
| `.sidebar-filters` | time select + category checkboxes |
| `.article-item` | individual feed entry, hover to show flag btn |
| `.cat-badge` | colored category label |
| `.map-area` | flex: 1, contains #map and overlay controls |
| `.map-controls` | position: absolute, top-right |
| `.country-nav-strip` | position: absolute, top-left, sub-page links |
| `.modal-overlay` | fixed, opacity: 0 → 1 via `.open` class |

---

## Known Fixes & Correct Patterns (March 2026)

### Fix 1: Geo Coordinate Access

Articles store coordinates in a nested `geo` object set by `lib/geocoder.js`. Use the fallback pattern for both current and legacy flat-format articles:

```js
// CORRECT — handles both article.geo.lat and legacy article.lat:
const lat = article.lat || article.geo?.lat;
const lng = article.lng || article.geo?.lng;

// Filter:
filteredArticles.filter(a => (a.lat || a.geo?.lat) && (a.lng || a.geo?.lng)).forEach(article => {
  const lat = article.lat || article.geo?.lat;
  const lng = article.lng || article.geo?.lng;
  const marker = L.circleMarker([lat, lng], { ... });
});

// Fly-to on article click:
if (article.lat || article.geo?.lat) {
  const lat = article.lat || article.geo?.lat;
  const lng = article.lng || article.geo?.lng;
  map.setView([lat, lng], 8, { animate: true });
}
```

The existing code `[article.lat, article.lng]` will fail silently (placing markers at [0,0]) if the article only has `article.geo.lat`. Always use the fallback pattern.

---

### Fix 2: Category Checkbox Values

The `value` attributes on category checkboxes must match the **article**-side category strings. Correct values:

```html
<input type="checkbox" value="breaking"    checked onchange="applyFilters()"> Breaking
<input type="checkbox" value="geopolitics" checked onchange="applyFilters()"> Geopolitics
<input type="checkbox" value="military"    checked onchange="applyFilters()"> Military
<input type="checkbox" value="political"   checked onchange="applyFilters()"> Political
<input type="checkbox" value="technology"  checked onchange="applyFilters()"> Tech
<input type="checkbox" value="general"     checked onchange="applyFilters()"> General
```

> **Do not use** `value="conflict"` or `value="geopolitical"` — these don't match any article category string in the current data schema. Articles use `"geopolitics"` (not `"geopolitical"`) and there is no `"conflict"` category in the default set.

---

### Fix 3: Mock Data Fallback Should Be Empty

If no articles are returned from the API, the map should show a proper empty state — not hardcoded demo articles. Hardcoded placeholder data causes incorrect markers to appear permanently.

```js
// CORRECT empty state handling:
if (articles.length === 0) {
  document.getElementById('article-list').innerHTML =
    `<p class="no-articles">No articles yet for this country.<br>Go to Settings → RSS Feeds → Fetch All Now.</p>`;
  return;
}
```
