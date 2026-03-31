# TAIWAN STRAIT ANALYSIS — System Prompt & Developer Guide
## Conflict Mapper Platform | `pages/taiwan-strait.html` · `pages/taiwan-window-*.html`

> Use this document as a standalone system prompt when working on the China/Taiwan invasion window analysis pages. Paste the full contents into a new prompt window along with the specific window HTML file you want to modify.

---

## 1. Page Structure Overview

The Taiwan Strait module consists of **five HTML files**:

| File | Role |
|---|---|
| `pages/taiwan-strait.html` | Hub page — overview map, status dashboard, links to 4 windows |
| `pages/taiwan-window-apr-2026.html` | Deep dive: April 2026 invasion window |
| `pages/taiwan-window-oct-2026.html` | Deep dive: October 2026 invasion window |
| `pages/taiwan-window-apr-2027.html` | Deep dive: April 2027 invasion window |
| `pages/taiwan-window-oct-2027.html` | Deep dive: October 2027 invasion window |

All 5 files are self-contained standalone HTML pages loaded inside the main shell's iframe. They do not share JS or CSS with `index.html`.

---

## 2. The Hub Page (`taiwan-strait.html`)

### Hero Section

The hero displays:
- Eyebrow: `CONFLICT MAPPER // ACTIVE MONITORING`
- Main title: `CHINA / TAIWAN WATCH`
- Subtitle with live status indicator
- A live status badge showing current assessment (e.g., `ELEVATED TENSION`)
- Summary stat cards (PLA Vessels Tracked, Violations, Sorties, Intercepts)

### Hub Map (Leaflet)

The hub page has a Leaflet map showing the Taiwan Strait region at zoom level 6, centered on `[23.5, 120.5]`. It shows:
- PLA military bases (red icons)
- Taiwan defense installations (blue icons)
- US regional bases (green icons)
- Recent event markers pulled from `GET /api/articles/geo?country=Taiwan&timeRange=72`

### Window Cards

Four cards link to the window deep-dive pages. Each card shows:
- Window designation (e.g., `WINDOW A — APRIL 2026`)
- Season and year
- Environmental conditions summary (weather, sea state)
- Overall probability badge
- "View Full Analysis" link → `taiwan-window-apr-2026.html`

---

## 3. Invasion Window Deep-Dive Structure

Each window page (`taiwan-window-*.html`) is a large self-contained HTML file (~120KB). The page structure:

```
├── Sticky navigation (window tabs)
├── Hero Section
│   ├── Classification banner
│   ├── Window title + date range
│   ├── Threat assessment badge
│   └── Quick-stat grid
├── Environmental Conditions Panel
│   ├── Weather / sea state
│   ├── Tidal data
│   ├── Moon phase
│   └── Visibility window calendar
├── Interactive Leaflet Map
│   ├── Layer controls (PLA / Taiwan / US / Beaches)
│   ├── Custom military markers
│   └── Popup details per installation
├── Force Assessment / Capability Matrix
│   ├── PLA Order of Battle
│   ├── Taiwan defense assets
│   └── US regional forces
├── 4 Tabbed Invasion Scenarios
│   ├── Scenario A: Blitz (72h seizure)
│   ├── Scenario B: Blockade-first
│   ├── Scenario C: Phased amphibious
│   └── Scenario D: Decapitation strike
├── Casualty Estimates Panel
├── Probability Assessment
├── Escalation Ladder Component
├── Technological Game-Changers
└── Recent Intelligence Feed
```

---

## 4. Updating Window-Specific Environmental Data

Environmental data is hardcoded directly in each window HTML file. To update it:

### Weather and Sea State

Find the environmental conditions section. Data follows this pattern:

```html
<div class="env-card">
  <div class="env-label">Sea State</div>
  <div class="env-value">MODERATE — 1.5-2.0m</div>
  <div class="env-detail">Beaufort 4, SW swell — borderline for LST operations</div>
</div>
```

Update `env-value` and `env-detail` with current seasonal forecast data for the strait region.

### Tidal Windows

Each window page includes a tidal calendar showing favorable amphibious landing tides. The data is in a table with classes `tidal-table`. Update date/time/height values:

```html
<tr class="tide-row favorable">
  <td class="tide-date">Apr 15, 2026</td>
  <td class="tide-time">06:42 CST</td>
  <td class="tide-height">+1.8m</td>
  <td class="tide-type">High — Beach Optimal</td>
</tr>
```

### Moon Phase Data

Moon phase displays as an SVG icon + text label. Find `moon-phase-display` and update:

```html
<div class="moon-phase-display">
  <!-- SVG of moon phase -->
  <span class="moon-label">WANING GIBBOUS — 62%</span>
  <span class="moon-note">Moderate illumination — partial concealment for night ops</span>
</div>
```

---

## 5. Interactive Leaflet Map Configuration

Each window page has a Leaflet map initialized at:

```js
const map = L.map('strait-map', {
  center: [24.5, 120.5],   // Center of Taiwan Strait
  zoom: 7,
  minZoom: 5,
  maxZoom: 14,
});

// Dark military tile layer
L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
).addTo(map);
```

### Map Layer Groups

```js
const layers = {
  plaForces:      L.layerGroup(),   // PLA bases, vessels, air assets
  taiwanDefenses: L.layerGroup(),   // ROCAF bases, missile batteries
  usBases:        L.layerGroup(),   // USN/USAF assets in region
  beaches:        L.layerGroup(),   // Viable amphibious landing beaches
};
```

All layer groups start visible. Layer toggles in the sidebar show/hide each group.

### Custom Military Marker Icons

Icons are created using `L.divIcon()` with CSS classes rather than image files, so they're self-contained in the HTML:

```js
function createMilitaryIcon(type, label) {
  const iconConfig = {
    pla:      { color: '#ef4444', symbol: '★', bg: 'rgba(239,68,68,0.15)' },
    taiwan:   { color: '#3b82f6', symbol: '◆', bg: 'rgba(59,130,246,0.15)' },
    us:       { color: '#22c55e', symbol: '▲', bg: 'rgba(34,197,94,0.15)' },
    beach:    { color: '#f59e0b', symbol: '⊕', bg: 'rgba(245,158,11,0.15)' },
    naval:    { color: '#a855f7', symbol: '⚓', bg: 'rgba(168,85,247,0.15)' },
    missile:  { color: '#ff6600', symbol: '⚡', bg: 'rgba(255,102,0,0.15)' },
  };
  const cfg = iconConfig[type] || iconConfig.pla;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px; height:32px; border-radius:50%;
      background:${cfg.bg}; border:2px solid ${cfg.color};
      display:flex; align-items:center; justify-content:center;
      color:${cfg.color}; font-size:14px;
      box-shadow: 0 0 8px ${cfg.color}44;
    ">${cfg.symbol}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}
```

### Adding a New Military Installation

```js
// Add to the relevant layer group, e.g., plaForces:
L.marker([26.08, 119.28], { icon: createMilitaryIcon('pla', 'Fuzhou Air Base') })
  .bindPopup(`
    <div class="map-popup">
      <div class="popup-title">FUZHOU AIR BASE</div>
      <div class="popup-type">PLA AF — Fighter/Bomber Wing</div>
      <div class="popup-detail">Su-35 regiment, J-20 squadron. Primary threat axis: NW Taiwan.</div>
      <div class="popup-range">Strike range to Taipei: 185 km</div>
    </div>
  `)
  .addTo(layers.plaForces);
```

### Known PLA Bases Already Mapped

| Base | Coordinates | Type |
|---|---|---|
| Fuzhou Yixu | 26.08, 119.28 | Air base |
| Jinjiang | 24.80, 118.60 | Air base |
| Quanzhou | 24.97, 118.59 | Amphibious staging |
| Zhangzhou | 24.52, 117.65 | Army garrison |
| Zhoushan | 29.98, 122.16 | Naval base (PLAN) |
| Sanya | 18.25, 109.51 | Submarine base |

### Known Taiwan Defense Installations

| Base | Coordinates | Type |
|---|---|---|
| Ching Chuan Kang AB | 24.27, 120.62 | ROCAF primary |
| Tainan AB | 22.95, 120.21 | ROCAF F-16s |
| Hualien AB | 24.02, 121.62 | ROCAF eastern dispersal |
| Hsiungfeng batteries | 25.04, 121.51 | AShM installations |
| Patriot batteries | 25.03, 121.56 | AMD |

---

## 6. Capability Matrix and Force Assessments

The capability matrix is a comparison table rendered in HTML. Each row represents a capability domain:

```html
<tr class="matrix-row">
  <td class="cap-domain">Surface Naval</td>
  <td class="cap-pla">
    <div class="bar-fill pla" style="width:82%"></div>
    <span>82 — MAJOR ADVANTAGE</span>
  </td>
  <td class="cap-taiwan">
    <div class="bar-fill taiwan" style="width:35%"></div>
    <span>35 — SIGNIFICANT GAP</span>
  </td>
  <td class="cap-us">
    <div class="bar-fill us" style="width:90%"></div>
    <span>90 (if committed)</span>
  </td>
</tr>
```

### Updating Force Numbers

Force assessment numbers are hardcoded as text in the HTML. Use find/replace within the relevant window file. Look for elements with class `force-count`:

```html
<span class="force-count">~400 amphibious capable vessels</span>
```

Update these to reflect current PLA/ROC/US force levels from open-source IISS Military Balance data.

---

## 7. The 4 Tabbed Invasion Scenarios

Each window page contains 4 scenario tabs. JavaScript shows/hides scenario panels on tab click:

```js
document.querySelectorAll('.scenario-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.scenario;  // 'blitz' | 'blockade' | 'phased' | 'decapitation'
    document.querySelectorAll('.scenario-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`scenario-${target}`).classList.add('active');
    document.querySelectorAll('.scenario-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});
```

### Scenario Identifiers and Descriptions

| ID | Name | Description |
|---|---|---|
| `blitz` | 72-Hour Seizure | Rapid airborne + amphibious seizure of key nodes before US response |
| `blockade` | Blockade-First | Naval/air blockade to force capitulation without full invasion |
| `phased` | Phased Amphibious | Methodical multi-week amphibious campaign securing beachheads |
| `decapitation` | Decapitation Strike | Targeting political/military leadership and critical infrastructure first |

### Adding a New Scenario Tab

1. Add a tab button in the `.scenario-tabs` container:
```html
<button class="scenario-tab" data-scenario="gray-zone">E: Gray Zone Escalation</button>
```

2. Add the scenario panel HTML:
```html
<div class="scenario-panel" id="scenario-gray-zone">
  <!-- Scenario content: timeline, forces, objectives, risk assessment -->
</div>
```

---

## 8. Casualty Estimates

Casualty estimates are displayed in a structured panel with sourced ranges. The layout:

```html
<div class="casualty-row">
  <div class="casualty-actor">PLA Forces</div>
  <div class="casualty-range">
    <span class="low">18,000</span>–<span class="high">55,000</span>
  </div>
  <div class="casualty-note">72-hour blitz scenario; amphibious attrition from ATACMS/Hsiungfeng</div>
  <div class="casualty-source">RAND, CSIS War Games 2023-2024</div>
</div>
```

**Update sources:** Casualty estimates are based on unclassified RAND Corporation, CSIS, and Congressional Research Service war game data. When updating, cite the source publication and year in `casualty-source`.

---

## 9. Probability Assessment

The probability gauge is a CSS-animated arc. Probability values are set via `data-` attributes:

```html
<div class="prob-gauge"
     data-value="23"
     data-label="CONFLICT PROBABILITY"
     data-timeframe="12 MONTHS">
</div>
```

```js
// Initialization (runs on DOMContentLoaded):
document.querySelectorAll('.prob-gauge').forEach(el => {
  const value = parseInt(el.dataset.value);
  const arc = el.querySelector('.gauge-arc');
  // CSS conic-gradient from 0% to value%
  arc.style.background = `conic-gradient(
    var(--color-accent) 0% ${value}%,
    rgba(255,255,255,0.08) ${value}% 100%
  )`;
  el.querySelector('.gauge-value').textContent = `${value}%`;
});
```

To update probability: change the `data-value` attribute. Values over 60% trigger a color shift to amber/red via CSS classes:

```js
if (value >= 60) arc.classList.add('high-prob');
if (value >= 80) arc.classList.add('critical-prob');
```

---

## 10. The Escalation Ladder

The escalation ladder is a vertical infographic showing escalation steps from baseline to nuclear exchange. Each step has a color-coded threat level:

```html
<div class="escalation-rung" data-level="4" data-status="current">
  <div class="rung-number">4</div>
  <div class="rung-title">MILITARY EXERCISES — LIVE FIRE</div>
  <div class="rung-desc">PLA conducts encirclement drills with live ammunition near median line</div>
  <div class="rung-indicators">
    <span class="indicator active">ASAT tests</span>
    <span class="indicator active">Carrier group deployments</span>
    <span class="indicator">Missile tests over strait</span>
  </div>
</div>
```

The `data-status` attribute controls styling:
- `past` — Gray, historical escalation step
- `current` — Amber, present assessed position
- `future` — Dim outline, projected escalation

To update current escalation level: change `data-status="current"` to the appropriate rung. Only one rung should have `current` at a time.

---

## 11. Adding New Invasion Windows

To add a 5th window (e.g., April 2028):

1. **Copy the nearest existing file:**
```bash
cp pages/taiwan-window-oct-2027.html pages/taiwan-window-apr-2028.html
```

2. **Update the page title and all date references** in the new file.

3. **Update environmental data** (weather, tides, moon phase) for the new window's season.

4. **Update probability assessment** `data-value` based on current trend projection.

5. **Add a window card** in `pages/taiwan-strait.html`:
```html
<div class="window-card">
  <div class="window-label">WINDOW E — APRIL 2028</div>
  <!-- ... card content ... -->
  <a href="taiwan-window-apr-2028.html" class="window-cta">View Full Analysis →</a>
</div>
```

6. **Add to the nav configuration** in `assets/nav-config.json` if the window should appear in the dropdown.

---

## 12. Integration with News API

Each window page can optionally show a live intelligence feed from the RSS system. The fetch call pattern:

```js
async function loadRecentIntel() {
  try {
    const resp = await fetch('/api/articles?country=Taiwan&category=geopolitical&timeRange=72&limit=10');
    const data = await resp.json();
    if (!data.success) return;

    const articles = data.data.articles;
    const feedEl = document.getElementById('intel-feed');
    feedEl.innerHTML = articles.map(a => `
      <div class="intel-item">
        <div class="intel-source">${a.source} · ${formatDate(a.pubDate)}</div>
        <div class="intel-title"><a href="${a.link}" target="_blank">${a.title}</a></div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('intel-feed').innerHTML = '<p class="feed-offline">Intel feed offline</p>';
  }
}
```

If the server is not running (static hosting), the feed section gracefully shows "Intel feed offline."

---

## 13. Flagged Articles Integration

The window pages can display analyst-flagged articles separately from the general feed:

```js
async function loadFlaggedArticles() {
  const resp = await fetch('/api/articles/flagged?country=taiwan');
  const data = await resp.json();
  // data.data.flagged → array of flag entries with embedded article snapshot
}
```

Flagged articles are rendered in a highlighted "ANALYST FLAGGED" section above the general intel feed, styled with an amber border and flag icon.

---

## 14. Technological Game-Changers Section

The final section of each window page covers emerging technologies that could alter invasion calculus. Structure:

```html
<div class="tech-card" data-impact="FORCE_MULTIPLIER">
  <div class="tech-icon">🤖</div>
  <div class="tech-title">Autonomous Ground Vehicles</div>
  <div class="tech-impact-badge">PLA ADVANTAGE</div>
  <div class="tech-desc">
    PLA "Sharp Claw" UGV units eliminate human risk in initial beach clearing operations.
    Removes one of the primary deterrence calculations for amphibious assault...
  </div>
  <div class="tech-timeline">Operational: 2025-2026 (estimated)</div>
</div>
```

### Technology Categories Currently Covered

| Technology | Assessed Advantage | Timeline |
|---|---|---|
| Autonomous Ground Vehicles | PLA | 2025-2026 |
| Drone Decoy Swarms | PLA | Operational |
| AI-Directed Fire Control | Mixed | 2026-2027 |
| Hypersonic ASMs | PLA | Operational |
| Undersea drones / UUVs | PLA | 2026 |
| Directed energy (SHORAD) | Taiwan/US | 2027-2028 |
| AI C2 / Decision support | US | Operational |

To add a new technology, duplicate a `tech-card` div and update the content.

---

## 15. Design System — Window Pages

The window pages use a **deep navy blue accent** rather than the global site's teal:

```css
:root {
  --color-bg:           #0a0c10;
  --color-accent:       #2E5F99;      /* Navy blue — different from global teal */
  --color-accent-bright:#4A8FD4;
  --color-teal:         #2dd4bf;      /* Secondary accent */
  --color-red:          #f87171;
  --color-green:        #4ade80;
  --color-orange:       #fb923c;
  --font-display:       'Rajdhani', sans-serif;
  --font-mono:          'Share Tech Mono', monospace;
  --font-body:          'Inter', sans-serif;
}
```

The hub page (`taiwan-strait.html`) uses the standard global accent `#c41e3a` (crimson red) inherited from the main site theme.

---

*This prompt covers `pages/taiwan-strait.html` and all four `pages/taiwan-window-*.html` files. Cross-reference `MAP_AND_FEED_PROMPT.md` for the news API integration, `NAVIGATION_SYSTEM_PROMPT.md` for the nav item that links to these pages, and `SITE_ARCHITECTURE_PROMPT.md` for the full platform overview.*
