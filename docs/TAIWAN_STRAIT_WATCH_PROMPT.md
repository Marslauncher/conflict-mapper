# Taiwan Strait Watch — System Prompt
## Conflict Mapper — `pages/taiwan-strait.html`

You are an expert frontend developer rebuilding the China/Taiwan Strait monitoring dashboard for Conflict Mapper. This document is the complete specification for `pages/taiwan-strait.html` (1,361 lines, ~76KB). The page is a self-contained HTML file — it loads its own navigation, fetches live articles from the API, and embeds a Leaflet operational map with detailed military positions.

---

## Page Architecture

```
taiwan-strait.html
├── <head>
│   ├── Fonts: Rajdhani, Share Tech Mono, Inter (Google Fonts)
│   ├── Leaflet CSS (unpkg 1.9.4)
│   └── Lucide icons (unpkg)
├── Topbar (sticky nav, self-contained — no iframe parent)
├── Hero Section
│   ├── Threat level badges
│   └── 4-metric bar
├── Main Grid (1fr + 380px sidebar)
│   ├── Left Column
│   │   ├── Operational Map (Leaflet, 600px height)
│   │   ├── Weather Embed (Windy.com iframe)
│   │   ├── Weather Conditions Grid
│   │   ├── 7-Day Forecast Table
│   │   ├── SVG Tide Chart
│   │   └── Force Comparison Panel
│   └── Right Column (380px)
│       ├── Situational Status Indicators
│       ├── Activity Feed (from API)
│       ├── Invasion Window Navigator
│       └── Strategic Assessment Cards
├── Cross-reference Dossier Links
└── <script> (all JS inline)
```

**Key architectural decision:** This page is NOT embedded in an iframe. It has its own `<body>`, topbar nav, and full layout. It fetches articles directly from `GET /api/articles?country=taiwan&limit=20`.

---

## Design System

CSS variables (dark military theme):
```css
:root {
  --bg:         #0a0c10;
  --surface:    #12151c;
  --surface-2:  #1a1e28;
  --surface-3:  #222736;
  --navy:       #1A3A5C;
  --navy-dim:   rgba(26,58,92,0.35);
  --border:     rgba(255,255,255,0.1);
  --border-dim: rgba(255,255,255,0.06);
  --accent:     #c41e3a;   /* China Red */
  --amber:      #f59e0b;
  --green:      #22c55e;
  --blue:       #3b82f6;
  --orange:     #f97316;
  --text:       #e8eaf0;
  --text-muted: rgba(232,234,240,0.55);
  --text-faint: rgba(232,234,240,0.3);
  --font-display: 'Rajdhani', sans-serif;
  --font-mono:    'Share Tech Mono', monospace;
  --font-body:    'Inter', sans-serif;
}
```

---

## Hero Section

```html
<section class="hero">
  <div class="hero-inner">
    <div class="hero-top">
      <div>
        <div class="hero-eyebrow">ACTIVE MONITORING</div>
        <h1 class="hero-title">
          <span class="flags">🇨🇳🇹🇼</span>
          China / Taiwan<br>Strait Watch
        </h1>
        <div class="hero-badges">
          <span class="threat-badge elevated">⚡ PLA READINESS: ELEVATED</span>
          <span class="threat-badge high">🔴 STRAIT TENSION: HIGH</span>
          <span class="threat-badge active">📡 ISR: ACTIVE</span>
          <span class="threat-badge guarded">🛡 TAIWAN DEFENSE: GUARDED</span>
        </div>
      </div>
    </div>

    <!-- 4-metric bar -->
    <div class="metrics-bar">
      <div class="metric-cell">
        <div class="metric-label">PLA Naval Vessels</div>
        <div class="metric-value red">47</div>
        <div class="metric-sub">Active in theater</div>
      </div>
      <div class="metric-cell">
        <div class="metric-label">Sorties / 24h</div>
        <div class="metric-value amber">23</div>
        <div class="metric-sub">PLAAF aircraft</div>
      </div>
      <div class="metric-cell">
        <div class="metric-label">US CSGs Present</div>
        <div class="metric-value blue">2</div>
        <div class="metric-sub">Within 800nm</div>
      </div>
      <div class="metric-cell">
        <div class="metric-label">Days to Window</div>
        <div class="metric-value green" id="days-to-window">—</div>
        <div class="metric-sub">Apr 2026 optimal</div>
      </div>
    </div>
  </div>
</section>
```

**Threat badge classes:** `.elevated` (amber), `.high` (red/orange), `.critical` (dark red), `.active` (green), `.guarded` (blue)

---

## Leaflet Operational Map

Map ID: `strait-map`, height: 600px

### Initialization
```js
const map = L.map('strait-map', {
  center: [24.5, 121.5],  // Taiwan Strait center
  zoom: 6,
  zoomControl: true,
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 18,
}).addTo(map);
```

### Custom Marker Styles

```js
// PLA Installation — red filled circle
function plaMarker(lat, lng, radius = 8) {
  return L.circleMarker([lat, lng], {
    radius, fillColor: '#c41e3a', color: '#ff0000',
    weight: 2, opacity: 1, fillOpacity: 0.8,
  });
}

// Taiwan/ROC Defense — blue triangle (via DivIcon)
function rocMarker(lat, lng) {
  return L.marker([lat, lng], {
    icon: L.divIcon({
      html: '<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid #3b82f6;"></div>',
      iconSize: [14, 12], iconAnchor: [7, 12], className: '',
    })
  });
}

// US/Allied — green diamond (via DivIcon)
function usMarker(lat, lng) {
  return L.marker([lat, lng], {
    icon: L.divIcon({
      html: '<div style="width:10px;height:10px;background:#22c55e;transform:rotate(45deg);border:1px solid #16a34a;"></div>',
      iconSize: [10, 10], iconAnchor: [5, 5], className: '',
    })
  });
}

// Amphibious Landing Zone — orange triangle
function landingMarker(lat, lng) {
  return L.marker([lat, lng], {
    icon: L.divIcon({
      html: '<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid #f97316;"></div>',
      iconSize: [16, 14], iconAnchor: [8, 14], className: '',
    })
  });
}
```

---

### PLA Military Installations (8 markers, red circles)

```js
const PLA_INSTALLATIONS = [
  { lat: 26.05, lng: 119.30, name: 'Fuzhou Eastern Theater HQ', desc: 'PLA Eastern Theater Command land forces HQ. Primary command node for Taiwan operations.' },
  { lat: 24.48, lng: 118.09, name: 'Xiamen Garrison Base', desc: 'Frontline garrison, artillery positions. 8km from Kinmen Island. Key amphibious staging point.' },
  { lat: 25.45, lng: 119.98, name: 'Pingtan Island Staging', desc: 'Closest mainland point to Taiwan (126km). Naval staging, drone launch facilities.' },
  { lat: 24.90, lng: 118.59, name: 'Quanzhou Air Base', desc: 'J-20 stealth fighter wing. Eastern Theater Air Force primary strike platform.' },
  { lat: 23.00, lng: 113.23, name: 'Guangzhou PLAN Base', desc: 'South Sea Fleet headquarters. Type 075 LHD home port. Amphibious task force staging.' },
  { lat: 29.94, lng: 121.95, name: 'Zhoushan Naval Base', desc: 'East Sea Fleet major base. Submarine pens, destroyer squadrons. Blockade force staging.' },
  { lat: 22.67, lng: 114.07, name: 'Shenzhen Logistics Hub', desc: 'PLA logistics and supply chain center. Military-civilian dual-use port facilities.' },
  { lat: 21.48, lng: 109.13, name: 'Zhanjiang PLAN HQ', desc: 'South Sea Fleet command. Aircraft carrier home port (Liaoning). Southern flank anchor.' },
];
```

### Taiwan ROC Defense Positions (8 markers, blue triangles)

```js
const ROC_POSITIONS = [
  { lat: 25.03, lng: 121.56, name: 'Taipei — Presidential Command', desc: 'ROC Presidential Office, National Security Council. C2 hardened bunker below.' },
  { lat: 22.63, lng: 120.30, name: 'Kaohsiung — Southern Defense', desc: 'ROC Navy main base. Submarine base (IDS class). Major port, industrial target.' },
  { lat: 24.80, lng: 120.97, name: 'Hsinchu Air Base', desc: 'F-16V wing. Primary CAP for northern strait intercept. ROCAF HQ nearby.' },
  { lat: 22.67, lng: 120.48, name: 'Tainan Air Base', desc: 'F-CK-1 indigenous fighter wing. Southern air defense. Close to landing beaches.' },
  { lat: 24.26, lng: 120.62, name: 'Taichung — Central Command', desc: 'ROC Army Central Defense Command. Largest ground force concentration.' },
  { lat: 24.43, lng: 118.37, name: 'Kinmen Island Garrison', desc: '8km from Xiamen. ROC marines, Hsiung Feng missile batteries. Forward outpost.' },
  { lat: 25.06, lng: 121.99, name: 'Suao Naval Base', desc: 'Northeast coast naval base. Torpedo defense, fast attack craft. Mountain tunnel facilities.' },
  { lat: 26.16, lng: 119.96, name: 'Matsu Islands Defense', desc: 'Northernmost ROC outpost. Artillery, coast defense missiles. Surveillance forward position.' },
];
```

### US / Allied Bases (5 markers, green diamonds)

```js
const US_BASES = [
  { lat: 26.33, lng: 127.80, name: 'Kadena Air Base (Okinawa)', desc: 'USAF primary Pacific strike base. F-15C/D wing, B-52 rotations. 500nm from Taiwan.' },
  { lat: 13.44, lng: 144.79, name: 'Andersen AFB (Guam)', desc: 'Strategic bomber base. B-2, B-52, B-1 rotations. 2,800km from Taiwan. THAAD deployed.' },
  { lat: 36.97, lng: 126.99, name: 'Camp Humphreys (South Korea)', desc: 'USFK HQ. Largest US overseas base. Patriot batteries, Apache attack helos.' },
  { lat: 21.36, lng:-157.97, name: 'Pearl Harbor–Hickam', desc: 'USPACOM HQ. CSG home port. Primary reinforcement staging for Taiwan scenario.' },
  { lat: 1.35,  lng: 103.82, name: 'Singapore — Changi Naval', desc: 'US Navy 7th Fleet logistics. Freedom-class LCS home port. Indian Ocean gateway.' },
];
```

### Amphibious Landing Beaches (4 markers, orange triangles)

```js
const LANDING_ZONES = [
  { lat: 25.15, lng: 121.47, name: 'Danshui Beach (Northern)', desc: 'Broad sandy beach north of Taipei. Primary northern landing zone in PLA plans. Urban terrain immediately inland.' },
  { lat: 23.10, lng: 120.10, name: 'Tainan Coast (Southern)', desc: 'Flat coastal plain, widest beaches. Historical landing area. Proximity to Kaohsiung industrial port.' },
  { lat: 24.15, lng: 120.35, name: 'Taichung Harbor Area', desc: 'Central Taiwan industrial coast. Port seizure objective. Rail corridor to Taipei.' },
  { lat: 22.30, lng: 120.48, name: 'Pingtung Southern Zone', desc: 'Southern tip beaches. Flanking maneuver landing. US/Japanese reinforcement cut-off objective.' },
];
```

---

### ADIZ Boundary Polygon

```js
// Taiwan Air Defense Identification Zone (approximate)
const ADIZ_COORDS = [
  [27.0, 116.0], [27.0, 122.0], [25.5, 124.0],
  [22.0, 124.0], [20.0, 120.0], [20.0, 116.0],
  [23.0, 114.0], [27.0, 116.0]
];

L.polygon(ADIZ_COORDS, {
  color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.04,
  weight: 1.5, dashArray: '6,4',
}).addTo(map).bindPopup('<b>Taiwan ADIZ</b><br>Air Defense Identification Zone');
```

### Median Line

```js
// Informal median line of the Taiwan Strait (historically observed)
const MEDIAN_LINE = [
  [26.5, 120.5], [25.5, 120.0], [24.5, 119.7],
  [23.5, 119.5], [22.5, 119.3], [21.5, 119.0]
];

L.polyline(MEDIAN_LINE, {
  color: '#ffffff', weight: 1.5, opacity: 0.4, dashArray: '4,8',
}).addTo(map).bindPopup('<b>Median Line</b><br>Informal maritime boundary (no longer observed by PLA)');
```

### First Island Chain

```js
const FIRST_ISLAND_CHAIN = [
  [35.69, 139.69],  // Japan
  [26.33, 127.80],  // Okinawa
  [25.03, 121.56],  // Taiwan
  [14.60, 120.98],  // Philippines
  [1.35,  103.82],  // Singapore
];

L.polyline(FIRST_ISLAND_CHAIN, {
  color: '#3b82f6', weight: 2, opacity: 0.5, dashArray: '8,4',
}).addTo(map).bindPopup('<b>First Island Chain</b><br>Strategic containment perimeter');
```

### PLA Exercise Exclusion Zones

```js
// Based on August 2022 and subsequent PLA exercise zones
const EXCLUSION_ZONES = [
  { bounds: [[25.5, 119.3], [26.5, 120.8]], label: 'Exercise Zone Alpha (North)' },
  { bounds: [[22.0, 120.5], [23.0, 122.0]], label: 'Exercise Zone Bravo (Southeast)' },
  { bounds: [[22.5, 118.5], [24.0, 119.8]], label: 'Exercise Zone Charlie (Southwest)' },
];

EXCLUSION_ZONES.forEach(z => {
  L.rectangle(z.bounds, {
    color: '#c41e3a', fillColor: '#c41e3a', fillOpacity: 0.06,
    weight: 1, dashArray: '4,4',
  }).addTo(map).bindPopup(`<b>${z.label}</b><br>PLA exercise exclusion zone`);
});
```

---

## Map Legend

```html
<div class="map-legend leaflet-bottom leaflet-left">
  <div class="legend-title">FORCE DISPOSITION</div>
  <div class="legend-row">
    <div class="legend-dot" style="background:#c41e3a;border:1px solid #ff0000"></div>
    PLA Installation
  </div>
  <div class="legend-row">
    <div class="legend-tri" style="border-bottom-color:#3b82f6"></div>
    ROC Defense Position
  </div>
  <div class="legend-row">
    <div class="legend-diamond" style="background:#22c55e"></div>
    US/Allied Base
  </div>
  <div class="legend-row">
    <div class="legend-tri" style="border-bottom-color:#f97316"></div>
    Landing Zone
  </div>
</div>
```

---

## Weather Embed (Windy.com)

```html
<div class="weather-iframe-wrap">
  <iframe
    src="https://embed.windy.com/embed2.html?lat=24.5&lon=121.5&detailLat=24.5&detailLon=121.5&width=650&height=450&zoom=6&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=true&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1"
    width="100%"
    height="450"
    frameborder="0"
    title="Taiwan Strait Weather — Windy.com">
  </iframe>
</div>
```

**Key parameters:**
- `lat=24.5&lon=121.5` — Taiwan Strait center
- `zoom=6` — regional view
- `overlay=wind` — shows wind vectors
- `metricWind=kt` — knots for naval operations

---

## Weather Conditions Panel

4-cell grid showing current sea state:

```html
<div class="conditions-grid">
  <!-- Wind Speed -->
  <div class="condition-cell">
    <div class="cond-icon">💨</div>
    <div class="cond-value amber" id="wind-speed">18kt</div>
    <div class="cond-label">Wind Speed</div>
    <div class="cond-sub">NE Monsoon</div>
  </div>
  <!-- Wave Height -->
  <div class="condition-cell">
    <div class="cond-icon">🌊</div>
    <div class="cond-value amber" id="wave-height">2.4m</div>
    <div class="cond-label">Wave Height</div>
    <div class="cond-sub">Moderate sea</div>
  </div>
  <!-- Visibility -->
  <div class="condition-cell">
    <div class="cond-icon">👁</div>
    <div class="cond-value green" id="visibility">12nm</div>
    <div class="cond-label">Visibility</div>
    <div class="cond-sub">Good</div>
  </div>
  <!-- Sea State -->
  <div class="condition-cell">
    <div class="cond-icon">⚓</div>
    <div class="cond-value amber" id="sea-state">4</div>
    <div class="cond-label">Beaufort Scale</div>
    <div class="cond-sub">Moderate breeze</div>
  </div>
</div>
```

**Beaufort Scale for naval operations:**
| Scale | Description | Wave Height | Amphibious Ops |
|-------|-------------|------------|----------------|
| 0–2   | Calm–Light  | 0–0.3m     | Optimal        |
| 3     | Gentle      | 0.3–0.6m   | Favorable      |
| 4     | Moderate    | 0.6–1.5m   | Acceptable     |
| 5     | Fresh       | 1.5–2.5m   | Marginal       |
| 6+    | Strong+     | 2.5m+      | Prohibitive    |

---

## 7-Day Forecast Table

Color-coded sea state column:
```html
<table class="forecast-table">
  <thead>
    <tr><th>Date</th><th>Wind</th><th>Wave Ht</th><th>Sea State</th><th>Visibility</th><th>Amphibious</th></tr>
  </thead>
  <tbody id="forecast-tbody">
    <!-- Rows generated by JS, sea-state cell colored green/amber/red -->
  </tbody>
</table>
```

---

## SVG Tide Chart

Generated inline using SVG path elements. Shows spring/neap tide cycles over 30 days with:
- Blue wave path (sine curve approximating tidal cycle)
- Vertical markers for optimal landing windows (low tide = beach accessible)
- Moon phase indicators (new moon = spring tides = higher amplitude)
- "Optimal Window" shaded regions

```js
function generateTideChart() {
  const width = 700, height = 120;
  const days = 30;
  // Spring-neap cycle: ~14.75 days
  const springNeapPeriod = 14.75;
  // Tidal cycle: ~12.4 hours (2 cycles per day)
  const tidalPeriod = 0.517;  // in days

  let pathD = 'M 0 60';
  for (let d = 0; d <= days; d += 0.1) {
    const x = (d / days) * width;
    // Spring-neap amplitude modulation
    const amplitude = 30 + 20 * Math.cos((2 * Math.PI * d) / springNeapPeriod);
    const y = 60 + amplitude * Math.sin((2 * Math.PI * d) / tidalPeriod);
    pathD += ` L ${x} ${y}`;
  }

  return `<svg width="${width}" height="${height}">
    <path d="${pathD}" stroke="#3b82f6" stroke-width="2" fill="none"/>
    <!-- optimal window shading -->
  </svg>`;
}
```

---

## Force Comparison Panel

Three columns: PLA vs ROC vs US/Allied, each with animated stat bars.

```html
<div class="force-compare">
  <div class="force-col pla">
    <div class="force-header">🇨🇳 PLA</div>
    <div class="force-stat">
      <div class="force-label">Amphibious Assault Ships</div>
      <div class="force-bar-wrap">
        <div class="force-bar" style="width:72%;background:#c41e3a"></div>
      </div>
      <div class="force-val">3 LHD + 8 LPD</div>
    </div>
    <!-- more stats -->
  </div>
  <div class="force-col roc">
    <div class="force-header">🇹🇼 ROC</div>
    <!-- stats -->
  </div>
  <div class="force-col us">
    <div class="force-header">🇺🇸 US/Allied</div>
    <!-- stats -->
  </div>
</div>
```

---

## 8 Situational Status Indicators

Right column, status card grid:

```js
const STATUS_INDICATORS = [
  { label: 'PLA Naval Readiness',    status: 'elevated', value: 'HIGH' },
  { label: 'Strait Air Activity',    status: 'elevated', value: 'ELEVATED' },
  { label: 'Taiwan Defensive Posture', status: 'guarded', value: 'GUARDED' },
  { label: 'US 7th Fleet Position',  status: 'active',   value: 'DEPLOYED' },
  { label: 'Median Line Crossings',  status: 'high',     value: 'FREQUENT' },
  { label: 'Cyber Activity',         status: 'elevated', value: 'ELEVATED' },
  { label: 'Taiwan Strait ISR',      status: 'active',   value: 'ACTIVE' },
  { label: 'Economic Pressure',      status: 'elevated', value: 'HIGH' },
];
```

Status classes and colors: `elevated` (amber), `high` (red), `active` (green), `guarded` (blue), `normal` (gray)

---

## Activity Feed (Live from API)

```js
async function loadActivityFeed() {
  try {
    const res = await fetch('/api/articles?country=taiwan&limit=20');
    const data = await res.json();
    const articles = data?.data?.articles || data?.articles || [];
    renderFeed(articles);
  } catch (e) {
    // Graceful fallback: show static placeholder items
    renderFeedFallback();
  }
}

function renderFeed(articles) {
  const container = document.getElementById('activity-feed');
  if (!articles.length) {
    container.innerHTML = '<div class="feed-empty">No recent activity. Fetch feeds to update.</div>';
    return;
  }
  container.innerHTML = articles.map(a => `
    <div class="feed-item">
      <div class="feed-time">${timeAgo(a.pubDate)}</div>
      <a href="${escHtml(a.link)}" target="_blank" rel="noopener" class="feed-title">
        ${escHtml(a.title)}
      </a>
      <div class="feed-source">${escHtml(a.source)}</div>
    </div>
  `).join('');
}
```

Articles are clickable links. No flag button on this page (flagging is in map-feed.html and news-map.html).

---

## Invasion Window Navigator (4 Cards)

```js
const INVASION_WINDOWS = [
  {
    month: 'April 2026', days: /* computed from now */,
    probability: 8,   // percent
    weather: 'Transitional — improving',
    moonPhase: 'New Moon Apr 2',
    url: '../pages/taiwan-window-apr-2026.html',
    active: true,  // currently analyzed window
  },
  {
    month: 'October 2026', days: /* computed */,
    probability: 12,
    weather: 'Post-typhoon season',
    moonPhase: 'New Moon Oct 1',
    url: '../pages/taiwan-window-oct-2026.html',
    active: false,
  },
  // ... April 2027, October 2027
];
```

Each card shows: month, countdown, probability bar, weather note, moon phase, link to detailed analysis page.

---

## Strategic Assessment Cards

3–4 cards with key takeaways:
- **PLA Capability Assessment** — readiness level, key gaps
- **Taiwan Defense Strength** — asymmetric advantages, vulnerabilities
- **US Response Timeline** — 72hr / 7-day / 30-day force posture
- **Escalation Risk** — nuclear threshold, red lines

---

## Cross-Reference Dossier Links

```html
<div class="dossier-links">
  <a href="../countries/china-dossier.html">China Dossier →</a>
  <a href="../countries/taiwan-dossier.html">Taiwan Dossier →</a>
  <a href="../pages/news-map.html?country=taiwan">Taiwan News Map →</a>
  <a href="../pages/news-map.html?country=china">China News Map →</a>
  <a href="../pages/taiwan-window-apr-2026.html">April 2026 Window →</a>
</div>
```

---

## How to Update Military Positions

To update a PLA installation:
1. Find the entry in `PLA_INSTALLATIONS` array
2. Update `lat`, `lng`, or `desc`
3. Re-initialize markers: `initMap()` is called on DOMContentLoaded

To add a new base:
```js
PLA_INSTALLATIONS.push({
  lat: 24.12, lng: 120.68,
  name: 'New PLAN Base',
  desc: 'Description of the installation and strategic significance.'
});
```

## How to Update Threat Levels

Find the `.threat-badge` elements in the hero section and update:
- Class: `.elevated`, `.high`, `.critical`, `.active`, `.guarded`
- Text content: the label string

## How to Update Force Numbers

Find the `.metric-value` elements in the 4-metric bar and update the text content. The `id="days-to-window"` element is computed by JavaScript from the target date.
