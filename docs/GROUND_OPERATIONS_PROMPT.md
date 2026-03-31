# GROUND OPERATIONS — Build Spec
## `§10A Kharg Island Assessment` + `§10B Ground Target Options`
### `pages/iran-war-analysis.html` — Sections 10A and 10B

---

## Overview

Two sequential sections in the Iran War Analysis page covering potential Iranian island seizure (§10A) and a catalog of ground target options along Iran's coastline and islands (§10B). Both sections are modular, follow the standard `data-section` pattern, and use Leaflet maps.

---

## §10A — Kharg Island Assessment

**Section ID:** `section-10a-kharg`
**data-section:** `10A`
**data-title:** `Kharg Island Assessment`

### Map Configuration

```javascript
const khargMap = L.map('kharg-map', {
  center: [29.237, 50.323],
  zoom: 11,
  zoomControl: true,
  scrollWheelZoom: true,
});

// CartoDB Voyager — better land/sea contrast than Dark Matter for coastal maps
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO',
  maxZoom: 19,
}).addTo(khargMap);

// Key markers
L.marker([29.237, 50.323]).bindPopup('<b>Kharg Island</b><br>Main terminal and jetties').addTo(khargMap);
L.marker([29.268, 50.341]).bindPopup('<b>Sea Island Terminal</b><br>Offshore loading platform').addTo(khargMap);
L.marker([29.200, 50.298]).bindPopup('<b>T-Jetty</b><br>Primary tanker berth').addTo(khargMap);
// IRGC positions
L.circle([29.245, 50.310], { radius: 800, color: '#f44336', fillOpacity: 0.2 })
  .bindPopup('<b>IRGC Naval Base</b>').addTo(khargMap);
// SAM coverage arc (approximate)
L.circle([29.237, 50.323], { radius: 15000, color: '#ff9800', fillOpacity: 0.05, dashArray: '6' })
  .bindPopup('Estimated SAM Coverage Radius').addTo(khargMap);
```

**Map container:**
```html
<div id="kharg-map" style="width: 100%; height: 480px; border-radius: var(--radius);"></div>
```

### Trump Truth Social Quote Card

```html
<div class="quote-card truth-social">
  <div class="qc-header">
    <span class="qc-platform">TRUTH SOCIAL</span>
    <span class="qc-date">[DATE]</span>
  </div>
  <blockquote class="qc-text">
    "[Full quote text verbatim]"
  </blockquote>
  <div class="qc-attribution">— Donald J. Trump, 47th President of the United States</div>
  <a href="[truth-social-url]" target="_blank" class="qc-source">View Post ↗</a>
</div>
```

```css
.quote-card.truth-social {
  background: color-mix(in srgb, #ff6719 8%, var(--surface-2));
  border: 1px solid color-mix(in srgb, #ff6719 40%, transparent);
  border-radius: var(--radius); padding: var(--space-6);
  margin: var(--space-6) 0;
}
.qc-platform { font-family: var(--font-mono); font-size: 0.7rem; color: #ff6719; letter-spacing: 0.1em; }
.qc-text { font-size: 1.1rem; line-height: 1.6; color: var(--text); font-style: italic; margin: var(--space-3) 0; }
.qc-attribution { font-size: 0.85rem; color: var(--text-dim); }
```

### Island Profile Stats

Displayed as a horizontal stat row below the map:

```html
<div class="island-stats">
  <div class="is-stat"><div class="is-val">25 km²</div><div class="is-label">ISLAND AREA</div></div>
  <div class="is-stat"><div class="is-val">~90%</div><div class="is-label">PRE-WAR OIL EXPORT SHARE</div></div>
  <div class="is-stat"><div class="is-val">4</div><div class="is-label">MAJOR LOADING JETTIES</div></div>
  <div class="is-stat"><div class="is-val">35 km</div><div class="is-label">FROM MAINLAND</div></div>
</div>
```

### Force Assessment Panel

```html
<div class="force-assess-grid">
  <div class="fa-card">
    <div class="fa-title">IRGC NAVAL</div>
    <ul class="fa-list">
      <li>Fast-attack craft squadrons (10–15 vessels)</li>
      <li>Mine-laying capability</li>
      <li>Anti-ship missile batteries on island</li>
    </ul>
  </div>
  <div class="fa-card">
    <div class="fa-title">AIR DEFENSE</div>
    <ul class="fa-list">
      <li>Shore-based SAM systems (SA-15 / Tor-M1 equivalent)</li>
      <li>MANPADS coverage</li>
      <li>Radar early warning</li>
    </ul>
  </div>
  <div class="fa-card">
    <div class="fa-title">INFRASTRUCTURE</div>
    <ul class="fa-list">
      <li>Storage tanks: ~7 million barrels capacity</li>
      <li>Sea Island offshore platform</li>
      <li>T-Jetty, Y-Jetty, Sea Island jetty</li>
    </ul>
  </div>
</div>
```

### Analyst Assessment Cards

Each card cites a real source URL:

```html
<div class="analyst-grid">
  <div class="analyst-card">
    <div class="ac-outlet">BBC Persian</div>
    <div class="ac-finding">[Key finding about Kharg Island significance or vulnerability]</div>
    <a href="https://www.bbc.com/persian/[path]" target="_blank" class="ac-link">Source ↗</a>
  </div>
  <div class="analyst-card">
    <div class="ac-outlet">Al Jazeera</div>
    <div class="ac-finding">[Key finding]</div>
    <a href="https://www.aljazeera.com/[path]" target="_blank" class="ac-link">Source ↗</a>
  </div>
  <div class="analyst-card">
    <div class="ac-outlet">Responsible Statecraft</div>
    <div class="ac-finding">[Key finding]</div>
    <a href="https://responsiblestatecraft.org/[path]" target="_blank" class="ac-link">Source ↗</a>
  </div>
  <div class="analyst-card">
    <div class="ac-outlet">Stars & Stripes</div>
    <div class="ac-finding">[Key finding on US military assessment]</div>
    <a href="https://www.stripes.com/[path]" target="_blank" class="ac-link">Source ↗</a>
  </div>
</div>
```

```css
.analyst-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
.analyst-card {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius); padding: var(--space-4);
}
.ac-outlet { font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent); margin-bottom: var(--space-2); }
.ac-finding { font-size: 0.875rem; color: var(--text-dim); line-height: 1.5; }
.ac-link { display: inline-block; margin-top: var(--space-2); font-size: 0.75rem; color: var(--accent); }
@media (max-width: 640px) { .analyst-grid { grid-template-columns: 1fr; } }
```

### Snake Island Comparison Card

```html
<div class="comparison-card">
  <div class="cc-header">
    <span class="cc-label">STRATEGIC PARALLEL</span>
    <span class="cc-title">Snake Island — Black Sea, 2022</span>
  </div>
  <div class="cc-body">
    <div class="cc-col">
      <div class="cc-col-title">SNAKE ISLAND (2022)</div>
      <ul>
        <li>33 km² — symbolic + strategic position</li>
        <li>Controls Black Sea shipping corridors</li>
        <li>Ukrainian seizure forced Russian naval repositioning</li>
        <li>Outsized diplomatic / media impact vs. military value</li>
      </ul>
    </div>
    <div class="cc-col">
      <div class="cc-col-title">KHARG ISLAND (2026)</div>
      <ul>
        <li>25 km² — critical economic chokepoint</li>
        <li>~90% of pre-war Iranian oil exports</li>
        <li>Seizure / destruction collapses Iranian revenue</li>
        <li>Defended: IRGC naval + SAMs + mainland proximity</li>
      </ul>
    </div>
  </div>
</div>
```

---

## §10B — Ground Target Options

**Section ID:** `section-10b-targets`
**data-section:** `10B`
**data-title:** `Ground Target Options`

### Layout

8 target cards in a 2-column grid, each containing a mini Leaflet map on the left and analysis content on the right.

```html
<section id="section-10b-targets" class="page-section"
         data-section="10B"
         data-title="Ground Target Options"
         data-last-updated="YYYY-MM-DD">
  <div class="section-badge">
    <span class="sb-num">§ 10B</span>
    <span class="sb-date">UPDATED YYYY-MM-DD</span>
  </div>
  <div class="section">
    <div class="section-header">
      <span class="section-num">10B // TARGETS</span>
      <h2 class="section-title">GROUND TARGET <em>OPTIONS</em></h2>
    </div>
    <div class="target-grid">
      <!-- 8 target cards -->
    </div>
  </div>
</section>
```

```css
.target-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}
@media (max-width: 900px) { .target-grid { grid-template-columns: 1fr; } }
```

### Target Card Structure

```html
<div class="target-card" id="target-[slug]">
  <div class="tc-header">
    <span class="tc-num">[01–08]</span>
    <div class="tc-title-block">
      <div class="tc-name">[TARGET NAME]</div>
      <div class="tc-type">[Island | Port | Naval Base | Airfield]</div>
    </div>
    <div class="tc-feasibility">
      <span class="tc-feas-label">FEASIBILITY</span>
      <div class="tc-stars" data-rating="[1-5]">
        <!-- 5 star spans, filled/empty based on rating -->
        <span class="star filled">★</span>
        <span class="star filled">★</span>
        <span class="star filled">★</span>
        <span class="star">★</span>
        <span class="star">★</span>
      </div>
    </div>
  </div>
  <div class="tc-body">
    <div class="tc-map" id="map-[slug]"></div>
    <div class="tc-content">
      <div class="tc-coords">[LAT]°N [LNG]°E</div>
      <div class="tc-strategic">
        <div class="tc-sec-title">STRATEGIC VALUE</div>
        <p>[1–2 sentence assessment]</p>
      </div>
      <div class="tc-threat">
        <div class="tc-sec-title">THREAT ENVIRONMENT</div>
        <p>[1–2 sentence threat assessment]</p>
      </div>
      <div class="tc-sources">
        <a href="[URL]" target="_blank">[Source] ↗</a>
      </div>
    </div>
  </div>
</div>
```

### CSS

```css
.target-card {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
}
.tc-header {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-3); border-bottom: 1px solid var(--border);
}
.tc-num { font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent); }
.tc-name { font-family: var(--font-display); font-weight: 600; font-size: 0.95rem; }
.tc-type { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-faint); }
.tc-feasibility { margin-left: auto; text-align: right; }
.tc-feas-label { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-faint); display: block; }
.tc-stars { color: var(--text-faint); font-size: 0.9rem; }
.tc-stars .star.filled { color: var(--accent); }

.tc-body { display: grid; grid-template-columns: 1fr 1fr; }
.tc-map { height: 200px; background: var(--surface-3); }
.tc-content { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
.tc-coords { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-faint); }
.tc-sec-title { font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent); letter-spacing: 0.08em; margin-bottom: 4px; }
.tc-content p { font-size: 0.8rem; color: var(--text-dim); line-height: 1.5; margin: 0; }
.tc-sources a { font-size: 0.75rem; color: var(--accent); }

/* Feasibility color coding */
.tc-stars[data-rating="1"] .star.filled { color: #f44336; }
.tc-stars[data-rating="2"] .star.filled { color: #ff5722; }
.tc-stars[data-rating="3"] .star.filled { color: #ff9800; }
.tc-stars[data-rating="4"] .star.filled { color: #cddc39; }
.tc-stars[data-rating="5"] .star.filled { color: #4caf50; }

@media (max-width: 640px) { .tc-body { grid-template-columns: 1fr; } .tc-map { height: 180px; } }
```

### Mini-Map Initialization

Each target card gets a Leaflet mini-map with these settings:
```javascript
function initTargetMap(elementId, lat, lng) {
  const map = L.map(elementId, {
    center: [lat, lng],
    zoom: 10,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    attributionControl: false,
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(map);
  // Target marker
  L.circleMarker([lat, lng], {
    radius: 6, color: '#C8962E', fillColor: '#E8B84B', fillOpacity: 0.9, weight: 2,
  }).addTo(map);
  return map;
}
```

Initialize all 8 maps after DOM ready:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  initTargetMap('map-abu-musa',      25.876, 55.033);
  initTargetMap('map-greater-tunb',  26.253, 55.317);
  initTargetMap('map-bandar-abbas',  27.181, 56.279);
  initTargetMap('map-chabahar',      25.292, 60.622);
  initTargetMap('map-jask',          25.643, 57.770);
  initTargetMap('map-kish',          26.526, 53.980);
  initTargetMap('map-lavan',         26.803, 53.367);
  initTargetMap('map-qeshm',         26.958, 56.270);
});
```

---

## Target Coordinates & Feasibility Ratings

| # | id | Target | Lat | Lng | Type | Feasibility |
|---|---|---|---|---|---|---|
| 01 | abu-musa | Abu Musa Island | 25.876 | 55.033 | Island / Military | ★★★☆☆ (3) |
| 02 | greater-tunb | Greater Tunb Island | 26.253 | 55.317 | Island / Strategic | ★★★☆☆ (3) |
| 03 | bandar-abbas | Bandar Abbas Port | 27.181 | 56.279 | Port / Naval Base | ★★★★☆ (4) |
| 04 | chabahar | Chabahar | 25.292 | 60.622 | Port / Deepwater | ★★★☆☆ (3) |
| 05 | jask | Jask | 25.643 | 57.770 | Naval Base / Airfield | ★★★★☆ (4) |
| 06 | kish | Kish Island | 26.526 | 53.980 | Island / Economic | ★★★☆☆ (3) |
| 07 | lavan | Lavan Island | 26.803 | 53.367 | Island / Oil Terminal | ★★★★☆ (4) |
| 08 | qeshm | Qeshm Island | 26.958 | 56.270 | Island / Industrial | ★★★☆☆ (3) |

---

## Adding a New Target Assessment

1. Add a new `<div class="target-card" id="target-[slug]">` to the `.target-grid`
2. Add a `<div class="tc-map" id="map-[slug]"></div>` inside the card
3. Call `initTargetMap('map-[slug]', lat, lng)` in the DOMContentLoaded handler
4. Fill in: coordinates, strategic value, threat environment, feasibility rating (1–5), and at least one source URL
5. Update `data-last-updated` on the parent `<section>` and the `.sb-date` badge

---

## Research Methodology & Primary Sources

For updating or adding assessments, check these sources in priority order:

1. **CENTCOM / DoD press releases** — centcom.mil, defense.gov
2. **IISS** (International Institute for Strategic Studies) — iiss.org/research
3. **CSIS** (Center for Strategic and International Studies) — csis.org
4. **Responsible Statecraft** — responsiblestatecraft.org (Persian Gulf analysis)
5. **Stars & Stripes** — stripes.com (US military operational reporting)
6. **Al Jazeera** — aljazeera.com (regional/Iranian perspective)
7. **BBC Persian** — bbc.com/persian
8. **USNI News** — news.usni.org (naval operations)

**Cross-reference** with `data/preferred-resources.json` — see `PREFERRED_RESOURCES_PROMPT.md`.
