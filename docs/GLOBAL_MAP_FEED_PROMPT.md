# Global Map & Feed — System Prompt
## Conflict Mapper — `pages/map-feed.html`

You are an expert frontend developer rebuilding the global intelligence map and feed page for Conflict Mapper. This document is the complete specification for `pages/map-feed.html` (1,167 lines, ~37KB). The page shows a full-screen Leaflet map with a collapsible sidebar containing filters and live article feed.

---

## Architecture

```
map-feed.html
├── <head>
│   ├── Fonts: Rajdhani, Share Tech Mono, Inter
│   ├── Leaflet 1.9.4 CSS
│   ├── Leaflet MarkerCluster CSS (both files)
│   └── Inline <style> (~310 lines)
├── .map-shell (display: flex; height: 100vh)
│   ├── .sidebar (350px, collapsible)
│   │   ├── Header (title + live dot)
│   │   ├── Stats bar (Articles / Geotagged / Sources)
│   │   ├── Filters (Time / Country / Categories)
│   │   ├── Actions (Fetch Feeds button + theme toggle)
│   │   └── Article feed (scrollable list)
│   └── .map-area (flex: 1)
│       ├── #map (Leaflet, full remaining width/height)
│       └── Map controls overlay (top-right)
├── Flag Modal
├── Toast notification
└── <script> (~600 lines, all inline)
    ├── Constants (CAT_COLORS, TILE_LAYERS, API_BASE)
    ├── State variables
    ├── init()
    ├── loadGeoArticles() + loadFeedArticles()
    ├── applyFilters()
    ├── updateMapMarkers() + buildPopup()
    ├── updateHeatmap() + toggleHeatmap()
    ├── setMapLayer()
    ├── updateFeedList()
    ├── flagging functions
    └── utility functions
```

---

## Design System (Same as news-map.html)

```css
:root {
  --bg:         #0a0c10;
  --surface:    #12151c;
  --surface-2:  #1a1e28;
  --surface-3:  #222736;
  --border:     rgba(255,255,255,0.1);
  --border-dim: rgba(255,255,255,0.06);
  --accent:     #c41e3a;
  --accent-dim: rgba(196,30,58,0.08);
  --amber:      #f59e0b;
  --green:      #22c55e;
  --blue:       #3b82f6;
  --purple:     #a855f7;
  --text:       #e8eaf0;
  --text-muted: rgba(232,234,240,0.55);
  --text-faint: rgba(232,234,240,0.3);
  --font-display: 'Rajdhani', sans-serif;
  --font-mono:    'Share Tech Mono', monospace;
  --font-body:    'Inter', sans-serif;
  --sidebar-w:  350px;
}
```

Light theme override supported via `[data-theme="light"]`.

---

## Initialization

```js
const API_BASE = window.location.origin;  // http://localhost:5000

let map, markersLayer, heatLayer, currentTileLayer;
let allGeoArticles = [];      // articles with lat/lng (from /api/articles/geo)
let allFeedArticles = [];     // all articles (from /api/articles)
let filteredArticles = [];    // currently visible
let heatmapOn = false;
let pendingFlag = null;
let toastTimer = null;
let sidebarOpen = true;

async function init() {
  initMap();
  await Promise.all([loadGeoArticles(), loadFeedArticles()]);
  applyFilters();
}

document.addEventListener('DOMContentLoaded', init);
```

---

## Map Initialization

```js
function initMap() {
  map = L.map('map', {
    center: [20, 0],   // Global view centered on equator/prime meridian
    zoom: 2,
    zoomControl: true,
    preferCanvas: true,  // better performance for many markers
  });

  currentTileLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }
  ).addTo(map);

  markersLayer = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    iconCreateFunction: cluster => {
      // Custom cluster icon with article count
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="custom-cluster">${count}</div>`,
        className: '', iconSize: [36, 36],
      });
    },
  });
  map.addLayer(markersLayer);
}
```

---

## Data Loading

### Geo Articles (for map markers)

```js
async function loadGeoArticles() {
  try {
    const timeRange = getTimeRange();  // hours, e.g. 48
    const country   = getCountryFilter();  // or null
    let url = `${API_BASE}/api/articles/geo?timeRange=${timeRange}`;
    if (country) url += `&country=${country}`;

    const res  = await fetch(url);
    const data = await res.json();
    allGeoArticles = data?.data?.articles || data?.articles || [];
  } catch (e) {
    allGeoArticles = [];
  }
}
```

`GET /api/articles/geo` returns only articles with valid `lat`/`lng` coordinates. Default timeRange is 48 hours if not specified.

### Feed Articles (for sidebar list)

```js
async function loadFeedArticles() {
  try {
    const timeRange = getTimeRange();
    const country   = getCountryFilter();
    let url = `${API_BASE}/api/articles?limit=200`;
    if (timeRange) url += `&timeRange=${timeRange}`;
    if (country)   url += `&country=${country}`;

    const res  = await fetch(url);
    const data = await res.json();
    allFeedArticles = data?.data?.articles || data?.articles || [];
  } catch (e) {
    allFeedArticles = [];
  }
}
```

---

## Sidebar Filters

### Time Range Filter

```html
<div class="filter-row">
  <span class="filter-label">Time</span>
  <select class="filter-select" id="filter-time" onchange="handleFilterChange()">
    <option value="1">Last 1 hour</option>
    <option value="6">Last 6 hours</option>
    <option value="24" selected>Last 24 hours</option>
    <option value="168">Last 7 days</option>
    <option value="720">Last 30 days</option>
    <option value="0">All time</option>
  </select>
</div>
```

Value is number of hours (passed directly to API `?timeRange=`).

### Country Filter

```html
<div class="filter-row">
  <span class="filter-label">Country</span>
  <select class="filter-select" id="filter-country" onchange="handleFilterChange()">
    <option value="">All Countries</option>
    <option value="usa">🇺🇸 United States</option>
    <option value="china">🇨🇳 China</option>
    <option value="russia">🇷🇺 Russia</option>
    <option value="ukraine">🇺🇦 Ukraine</option>
    <option value="taiwan">🇹🇼 Taiwan</option>
    <option value="iran">🇮🇷 Iran</option>
    <option value="israel">🇮🇱 Israel</option>
    <option value="india">🇮🇳 India</option>
    <option value="pakistan">🇵🇰 Pakistan</option>
    <option value="north-korea">🇰🇵 North Korea</option>
    <option value="nato">🇪🇺 NATO</option>
  </select>
</div>
```

### Category Checkboxes

```html
<div class="category-checks">
  <label class="cat-check"><input type="checkbox" value="conflict"   checked onchange="applyFilters()"> 🔴 Conflict/Military</label>
  <label class="cat-check"><input type="checkbox" value="political"  checked onchange="applyFilters()"> 🟡 Political</label>
  <label class="cat-check"><input type="checkbox" value="technology" checked onchange="applyFilters()"> 🔵 Technology</label>
  <label class="cat-check"><input type="checkbox" value="economic"   checked onchange="applyFilters()"> 🟢 Economic</label>
  <label class="cat-check"><input type="checkbox" value="general"    checked onchange="applyFilters()"> ⚪ General</label>
</div>
```

---

## Filter Application

Country/time changes require a new API fetch (server-side filtering is more accurate). Category changes are client-side only.

```js
async function handleFilterChange() {
  // Re-fetch from API with new time/country params
  await Promise.all([loadGeoArticles(), loadFeedArticles()]);
  applyFilters();
}

function applyFilters() {
  const activeCats = Array.from(document.querySelectorAll('.cat-check input:checked'))
    .map(i => i.value);

  // Filter geo articles (for map) by category
  const geoFiltered = allGeoArticles.filter(a =>
    activeCats.length === 0 || activeCats.includes(a.category || 'general')
  );

  // Filter feed articles (for sidebar) by category
  filteredArticles = allFeedArticles.filter(a =>
    activeCats.length === 0 || activeCats.includes(a.category || 'general')
  );

  updateMapMarkers(geoFiltered);
  updateFeedList();
  updateStats(geoFiltered);
}
```

---

## Category Color Coding

```js
const CAT_COLORS = {
  conflict:    '#c41e3a',   // 🔴 red
  military:    '#c41e3a',   // 🔴 red (same as conflict)
  political:   '#f59e0b',   // 🟡 amber
  technology:  '#3b82f6',   // 🔵 blue
  ai:          '#a855f7',   // 🟣 purple
  robotics:    '#a855f7',   // 🟣 purple
  economic:    '#22c55e',   // 🟢 green
  science:     '#06b6d4',   // 🩵 cyan
  spaceflight: '#06b6d4',   // 🩵 cyan
  research:    '#64748b',   // gray-blue
  engineering: '#78716c',   // gray-brown
  breaking:    '#ef4444',   // bright red
  geopolitics: '#f59e0b',   // amber
  general:     '#9ca3af',   // ⚪ gray
};
```

---

## Marker Rendering

```js
function updateMapMarkers(geoArticles) {
  markersLayer.clearLayers();

  geoArticles.forEach(article => {
    const color  = CAT_COLORS[article.category || 'general'] || CAT_COLORS.general;
    const marker = L.circleMarker([article.lat, article.lng], {
      radius: 7, fillColor: color, color: 'rgba(0,0,0,0.6)',
      weight: 1, opacity: 0.9, fillOpacity: 0.85,
    });
    marker.bindPopup(buildPopup(article), { maxWidth: 300, minWidth: 240 });
    markersLayer.addLayer(marker);
  });

  if (heatmapOn) updateHeatmap(geoArticles);
}
```

### Popup Structure

```js
function buildPopup(article) {
  const cat      = article.category || 'general';
  const catColor = CAT_COLORS[cat] || '#9ca3af';
  const timeStr  = timeAgo(article.pubDate || article.publishedAt);

  return `
    <div style="font-family:'Rajdhani',sans-serif;font-size:0.88rem;font-weight:600;
                color:#e8eaf0;line-height:1.3;margin-bottom:6px;">
      ${escHtml(article.title || 'Untitled')}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
      <span style="font-family:'Share Tech Mono',monospace;font-size:0.52rem;
                   padding:2px 6px;border-radius:3px;font-weight:600;text-transform:uppercase;
                   background:${catColor}22;color:${catColor}">
        ${escHtml(cat)}
      </span>
      <span style="font-family:'Share Tech Mono',monospace;font-size:0.58rem;color:#888;">
        ${escHtml(article.source || 'Unknown')}
      </span>
    </div>
    <div style="font-size:0.65rem;color:#888;margin-bottom:8px;">${timeStr}</div>
    <div style="display:flex;gap:6px;">
      ${article.link
        ? `<a href="${escHtml(article.link)}" target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;padding:4px 8px;
                      border-radius:3px;background:#c41e3a;color:#fff;
                      font-family:'Share Tech Mono',monospace;font-size:0.6rem;
                      text-decoration:none;text-transform:uppercase;">Read →</a>`
        : ''}
      <button onclick="openFlagModal(${JSON.stringify({ id: article.id, title: article.title }).replace(/"/g,'&quot;')})"
              style="padding:4px 8px;border-radius:3px;background:transparent;
                     border:1px solid rgba(255,255,255,0.15);color:#888;
                     font-family:'Share Tech Mono',monospace;font-size:0.6rem;
                     cursor:pointer;text-transform:uppercase;">
        ⚑ Flag
      </button>
    </div>
  `;
}
```

---

## Heatmap Overlay

```js
function toggleHeatmap() {
  heatmapOn = !heatmapOn;
  document.getElementById('heatmap-toggle')?.classList.toggle('active', heatmapOn);
  if (heatmapOn) {
    updateHeatmap(allGeoArticles);
  } else {
    if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
  }
}

function updateHeatmap(articles) {
  if (heatLayer) map.removeLayer(heatLayer);
  const points = (articles || allGeoArticles)
    .filter(a => a.lat && a.lng)
    .map(a => [a.lat, a.lng, 0.5]);

  if (points.length && typeof L.heatLayer === 'function') {
    heatLayer = L.heatLayer(points, {
      radius: 35,
      blur:   20,
      gradient: { 0.4: '#3b82f6', 0.65: '#f59e0b', 1: '#c41e3a' },
    }).addTo(map);
  }
}
```

Requires `leaflet-heat.js` from `https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js`.

---

## Map Layer Switching

```js
const TILE_LAYERS = {
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  topo:      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
};

const TILE_ATTRS = {
  dark:      '&copy; OpenStreetMap &copy; CARTO',
  satellite: 'Tiles &copy; Esri',
  topo:      'Map data: &copy; OpenStreetMap',
};

function setMapLayer(type) {
  if (currentTileLayer) map.removeLayer(currentTileLayer);
  currentTileLayer = L.tileLayer(TILE_LAYERS[type], {
    attribution: TILE_ATTRS[type],
    subdomains:  type === 'dark' ? 'abcd' : 'abc',
    maxZoom: 19,
  }).addTo(map);

  // Update active button state
  document.querySelectorAll('[id^="layer-"]').forEach(b => b.classList.remove('active'));
  document.getElementById(`layer-${type}`)?.classList.add('active');
}
```

---

## Sidebar Actions

### Fetch Feeds Button

```html
<button class="btn btn-primary btn-sm" id="fetch-btn" onclick="triggerFetch()">
  ↓ Fetch Feeds
</button>
```

```js
async function triggerFetch() {
  const btn = document.getElementById('fetch-btn');
  btn.textContent = '↓ Fetching...';
  btn.disabled = true;

  try {
    await fetch(`${API_BASE}/api/feeds/fetch`, { method: 'POST' });
    showToast('Feed fetch started');
    // Poll for completion
    pollFetchStatus();
  } catch (e) {
    showToast('Fetch failed — is the server running?', true);
  }
  btn.textContent = '↓ Fetch Feeds';
  btn.disabled = false;
}

async function pollFetchStatus() {
  let attempts = 0;
  const poll = async () => {
    if (attempts++ > 120) return;  // max 60 seconds
    const res  = await fetch(`${API_BASE}/api/feeds/fetch-status`);
    const data = await res.json();
    const status = data?.data;

    if (status && !status.running) {
      // Fetch complete — reload articles
      await Promise.all([loadGeoArticles(), loadFeedArticles()]);
      applyFilters();
      showToast(`Fetch complete: ${status.message}`);
    } else {
      setTimeout(poll, 500);
    }
  };
  setTimeout(poll, 1000);
}
```

---

## Stats Bar

```html
<div class="stats-bar">
  <div class="stat-item">
    <div class="stat-val" id="stat-articles">—</div>
    <div class="stat-key">Articles</div>
  </div>
  <div class="stat-item">
    <div class="stat-val" id="stat-geo">—</div>
    <div class="stat-key">Geotagged</div>
  </div>
  <div class="stat-item">
    <div class="stat-val" id="stat-sources">—</div>
    <div class="stat-key">Sources</div>
  </div>
</div>
```

```js
function updateStats(geoArticles) {
  document.getElementById('stat-articles').textContent = filteredArticles.length;
  document.getElementById('stat-geo').textContent = (geoArticles || allGeoArticles).length;
  const sources = new Set(filteredArticles.map(a => a.source).filter(Boolean));
  document.getElementById('stat-sources').textContent = sources.size;
}
```

---

## Article Feed List

```js
function updateFeedList() {
  const container = document.getElementById('article-feed');
  if (!container) return;

  if (!filteredArticles.length) {
    container.innerHTML = `<div class="empty-feed">No articles found. Try adjusting filters or fetching feeds.</div>`;
    return;
  }

  const sorted = [...filteredArticles].sort((a, b) =>
    new Date(b.pubDate || b.publishedAt || 0) - new Date(a.pubDate || a.publishedAt || 0)
  );

  // Group by category for section labels
  const grouped = {};
  sorted.forEach(a => {
    const cat = a.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  const sections = Object.entries(grouped).map(([cat, articles]) => {
    const color = CAT_COLORS[cat] || '#9ca3af';
    return `
      <div class="feed-section-label" style="color:${color}">
        ${cat.toUpperCase()} (${articles.length})
      </div>
      ${articles.slice(0, 50).map(a => renderArticleItem(a)).join('')}
    `;
  }).join('');

  container.innerHTML = sections;
}

function renderArticleItem(a) {
  const cat   = a.category || 'general';
  const color = CAT_COLORS[cat] || '#9ca3af';
  const time  = timeAgo(a.pubDate || a.publishedAt);
  const hasBadge = `<span class="source-badge">${escHtml(a.source || 'Unknown')}</span>`;

  return `
    <div class="article-item" onclick="focusOnArticle(${JSON.stringify(a).replace(/"/g,'&quot;')})">
      <button class="flag-btn"
        onclick="event.stopPropagation(); openFlagModal(${JSON.stringify({id:a.id,title:a.title}).replace(/"/g,'&quot;')})">⚑</button>
      <div class="article-title">${escHtml(a.title || 'Untitled')}</div>
      <div class="article-meta">
        <span class="cat-badge" style="background:${color}20;color:${color}">${cat}</span>
        ${hasBadge}
        <span class="article-time">${time}</span>
      </div>
    </div>
  `;
}

function focusOnArticle(article) {
  if (article.lat && article.lng) {
    map.setView([article.lat, article.lng], 8, { animate: true });
  }
}
```

---

## Map Controls Overlay (HTML)

```html
<div class="map-controls">
  <div class="map-control-group">
    <button class="map-ctrl-btn active" id="layer-dark"      onclick="setMapLayer('dark')">Dark</button>
    <button class="map-ctrl-btn"        id="layer-satellite"  onclick="setMapLayer('satellite')">Satellite</button>
    <button class="map-ctrl-btn"        id="layer-topo"       onclick="setMapLayer('topo')">Topographic</button>
  </div>
  <div class="map-control-group">
    <button class="map-ctrl-btn" id="heatmap-toggle" onclick="toggleHeatmap()">Heatmap</button>
  </div>
</div>
```

Map controls are `position: absolute; top: 10px; right: 10px; z-index: 500`.

---

## Article Flagging

```js
function openFlagModal(articleInfo) {
  pendingFlag = articleInfo;  // { id, title }
  document.getElementById('flag-article-title').textContent = articleInfo.title || 'Article';
  document.getElementById('flag-notes').value = '';
  document.getElementById('flag-modal').classList.add('open');
}

async function submitFlag() {
  if (!pendingFlag) return;
  const country = document.getElementById('flag-country').value || 'global';
  const notes   = document.getElementById('flag-notes').value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/articles/flag`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ articleId: pendingFlag.id, country, notes }),
    });
    if (res.ok) {
      showToast('Article flagged for analysis');
    } else {
      showToast('Flag failed', true);
    }
  } catch (e) {
    showToast('Could not connect to server', true);
  }

  closeFlagModal();
}
```

---

## Sidebar Toggle

```js
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
  document.getElementById('toggle-arrow').textContent = sidebarOpen ? '◀' : '▶';
  setTimeout(() => map.invalidateSize(), 200);  // re-render map post-transition
});
```

---

## Utilities

```js
function timeAgo(dateStr) {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000)    return 'Just now';
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}
```

---

## External JS Dependencies

Loaded from CDN at bottom of `<body>`:
```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
```
