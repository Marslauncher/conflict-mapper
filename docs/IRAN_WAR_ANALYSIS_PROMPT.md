# IRAN WAR ANALYSIS — Build Spec
## `pages/iran-war-analysis.html`
### Conflict Mapper Hub Page

---

## Overview

A long-form intelligence hub covering the US/Israel-Iran conflict that began February 28, 2026. The page is structured as 17+ modular sections using the standard hub page architecture (see `HUB_CONTENT_SYSTEM_PROMPT.md`).

**File:** `pages/iran-war-analysis.html`
**Size:** ~3,960 lines
**Accent color:** Desert Gold — `#C8962E` (dark), `#E8B84B` (light/hover)
**Conflict start date (hardcoded constant):** `2026-02-28T00:00:00Z`

---

## Section Map

| data-section | id | Title | Content type |
|---|---|---|---|
| hero | section-hero | Hero Banner | Day counter + 6 stat cards + CRITICAL badge |
| 01 | section-01-overview | Executive Summary | Red intel alert + 3-para summary + stat cards |
| 02 | section-02-timeline | Conflict Timeline | Day-by-day alternating event cards |
| 03 | section-03-map | Theater Map | Leaflet map, base/strike/front markers |
| 04 | section-04-thinktanks | Think Tank Consensus | 17 institution cards |
| 05 | section-05-politics | Post-Decapitation Leadership | Leader photo cards + post-conflict scenario cards |
| 06 | section-06-nuclear | Nuclear Program | Facility status + Deep Dive link card |
| 07 | section-07-weapons | Weapons Platforms | 4 sub-sections, 39 equipment cards total |
| 08 | section-08-losses | Equipment Losses | Dual loss tables (US vs Iran) |
| 09 | section-09-ground | Ground Assault Analysis | Force comparison + geography + objectives |
| 10 | section-10-hormuz | Strait of Hormuz | Leaflet map + chokepoint analysis |
| 10A | section-10a-kharg | Kharg Island Assessment | Leaflet map + island profile + analyst cards |
| 10B | section-10b-targets | Ground Target Options | 8 target cards with mini maps + feasibility ratings |
| 11 | section-11-lebanon | Lebanon Front | IDF operations + Hezbollah + casualty data |
| 12 | section-12-taiwan | Taiwan Impact | Munition depletion + PLA lessons + deterrence |
| 13 | section-13-economy | Economic Impact | Oil prices + GDP + inflation + supply chains |
| 14 | section-14-outlook | Endgame Analysis | Scenario cards + probability ranking |
| 15 | section-15-sources | Sources & Citations | 6-column grid, 40+ verified URLs |

---

## Hero Section

Not a modular section — sits above the numbered section system.

```html
<section id="section-hero" class="hero-section">
  <div class="hero-inner">
    <div class="hero-tag">ACTIVE CONFLICT // MIDDLE EAST THEATER</div>
    <h1 class="hero-title">US-ISRAEL / IRAN <em>WAR ANALYSIS</em></h1>
    <div class="hero-day-counter">
      DAY <span id="day-counter">--</span>
    </div>
    <div class="threat-badge critical">THREAT LEVEL: CRITICAL</div>
    <div class="stat-row">
      <!-- 6 stat cards: Theater, Status, Coaltion Forces, Iran Forces, Casualties (approx), Nuclear Sites -->
    </div>
  </div>
</section>
```

Day counter JavaScript (runs on page load and every 60s):
```javascript
function updateDayCounter() {
  const warStart = new Date('2026-02-28T00:00:00Z');
  const days = Math.floor((Date.now() - warStart) / 86400000);
  document.getElementById('day-counter').textContent = days;
}
updateDayCounter();
setInterval(updateDayCounter, 60000);
```

---

## §03 — Theater Map

**Library:** Leaflet 1.9.4
**Tile layer:** CartoDB Dark Matter
```javascript
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO',
  maxZoom: 19
})
```
**Center:** `[28, 52]` **Zoom:** `5`

Marker sets:
| Symbol | Color | Represents |
|---|---|---|
| Diamond | Green `#4caf50` | US/Coalition bases |
| Circle | Red `#f44336` | Iran military/nuclear sites |
| Square | Blue `#2196f3` | Israeli air bases |
| Circle | Orange `#ff9800` | Lebanon front positions |
| Arrow polyline | Yellow `#ffeb3b` | Houthi attack trajectories |
| Polygon | Cyan `#00bcd4` | Strait of Hormuz shipping lanes |

Key marker coordinates:
```javascript
const US_BASES = [
  { latlng: [25.117, 51.315], label: 'Al Udeid AB, Qatar' },
  { latlng: [24.248, 54.651], label: 'Al Dhafra AB, UAE' },
  { latlng: [33.100, 38.750], label: 'H3 Airbase, Jordan' },
  { latlng: [-7.313, 72.424], label: 'Diego Garcia' },
];
const IRAN_SITES = [
  { latlng: [32.628, 51.725], label: 'Isfahan Nuclear/Air Complex' },
  { latlng: [33.726, 51.461], label: 'Natanz Enrichment Facility' },
  { latlng: [26.825, 58.376], label: 'Bandar Abbas Naval Base' },
  { latlng: [29.237, 50.323], label: 'Kharg Island Terminal' },
];
const ISRAEL_BASES = [
  { latlng: [31.207, 34.887], label: 'Nevatim AB' },
  { latlng: [30.776, 34.956], label: 'Ramon AB' },
];
```

---

## §04 — Think Tank Consensus

17 institution cards in a responsive grid (3-col → 2-col → 1-col).

```html
<div class="tt-grid">
  <div class="tt-card">
    <div class="tt-name">Institute for the Study of War</div>
    <div class="tt-url"><a href="https://understandingwar.org" target="_blank">understandingwar.org</a></div>
    <div class="tt-assessment">Daily operational updates on strike effectiveness and Iranian force reconstitution.</div>
    <div class="tt-relevance">Relevance: HIGH</div>
  </div>
  <!-- ... 16 more cards -->
</div>
```

**CSS:**
```css
.tt-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
.tt-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-4); }
.tt-name { font-family: var(--font-display); font-weight: 600; font-size: 1rem; color: var(--accent); }
.tt-url a { font-size: 0.75rem; color: var(--text-dim); }
.tt-assessment { font-size: 0.875rem; margin-top: var(--space-2); line-height: 1.5; }
.tt-relevance { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-faint); margin-top: var(--space-2); }
@media (max-width: 1024px) { .tt-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .tt-grid { grid-template-columns: 1fr; } }
```

---

## §05 — Post-Decapitation Leadership

### Leader Cards
Each card uses a **real sourced photograph** (not an icon or emoji). Images from Wikimedia Commons or official government archives. Structure:

```html
<div class="leader-card">
  <div class="leader-img-wrap">
    <img src="[WIKIMEDIA_OR_GOV_URL]" alt="[NAME]" loading="lazy">
  </div>
  <div class="leader-body">
    <div class="leader-name">[FULL NAME]</div>
    <div class="leader-title">[ROLE / FACTION]</div>
    <div class="leader-assessment">[Brief assessment paragraph]</div>
  </div>
</div>
```

### Post-Conflict Scenario Cards
Three scenario cards covering successor governance models, each linked to supporting analysis:

```html
<div class="scenario-grid">
  <div class="scenario-card worst">
    <div class="sc-label">// SCENARIO A</div>
    <div class="sc-title">IRGC Hardline Continuity</div>
    <div class="sc-desc">IRGC assumes direct administrative control...</div>
    <div class="sc-sources">
      <a href="https://www.stimson.org/[path]" target="_blank">Stimson Center ↗</a>
    </div>
  </div>
  <div class="scenario-card likely">
    <div class="sc-label">// SCENARIO B</div>
    <div class="sc-title">Technocratic Transitional Government</div>
    <div class="sc-desc">Western-backed technocrats attempt interim governance...</div>
    <div class="sc-sources">
      <a href="https://escp.eu/[path]" target="_blank">ESCP Analysis ↗</a>
    </div>
  </div>
  <div class="scenario-card best">
    <div class="sc-label">// SCENARIO C</div>
    <div class="sc-title">Fragmentation / Regional Warlordism</div>
    <div class="sc-desc">State authority collapses along ethnic and regional lines...</div>
    <div class="sc-sources">
      <a href="https://icdi.nl/[path]" target="_blank">ICDI ↗</a>
    </div>
  </div>
</div>
```

---

## §06 — Nuclear Program

Contains facility status summary and a prominent link card to the Nuclear Deep Dive page:

```html
<a href="pages/nuclear-deep-dive.html" class="deep-dive-card">
  <span class="dd-icon">⚛</span>
  <div class="dd-text">
    <div class="dd-title">NUCLEAR DEEP DIVE</div>
    <div class="dd-sub">Full facility-by-facility analysis — 14 sites, damage assessment, reconstitution timeline</div>
  </div>
  <span class="dd-arrow">→</span>
</a>
```

```css
.deep-dive-card {
  display: flex; align-items: center; gap: var(--space-4);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface-2));
  border: 1px solid var(--accent); border-radius: var(--radius);
  padding: var(--space-4) var(--space-6);
  text-decoration: none; color: inherit;
  transition: background 0.2s;
}
.deep-dive-card:hover { background: color-mix(in srgb, var(--accent) 18%, var(--surface-2)); }
.dd-title { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: var(--accent); }
.dd-sub { font-size: 0.85rem; color: var(--text-dim); margin-top: 2px; }
.dd-arrow { font-size: 1.5rem; color: var(--accent); margin-left: auto; }
```

---

## §07 — Weapons Platforms

Four sequential sub-sections (not tabs). Each sub-section has its own header and card grid.

### Sub-section headers
```html
<div class="weapons-subsection" id="weapons-07a">
  <div class="ws-header">
    <span class="ws-num">07-A</span>
    <span class="ws-title">US / COALITION ARSENAL</span>
    <span class="ws-count">15 SYSTEMS</span>
  </div>
  <div class="equip-grid">
    <!-- equipment cards -->
  </div>
</div>
```

### Equipment card structure
```html
<div class="equip-card" id="equip-[slug]">
  <div class="equip-img-wrap">
    <img src="[URL]" alt="[NAME]" loading="lazy">
  </div>
  <div class="equip-body">
    <div class="equip-name">[SYSTEM NAME]</div>
    <div class="equip-desc">[1–2 sentence description]</div>
    <div class="equip-specs">
      <div class="spec-row"><span class="spec-label">RANGE</span><span class="spec-val">[value]</span></div>
      <div class="spec-row"><span class="spec-label">PAYLOAD</span><span class="spec-val">[value]</span></div>
      <div class="spec-row"><span class="spec-label">GUIDANCE</span><span class="spec-val">[value]</span></div>
      <div class="spec-row"><span class="spec-label">TARGETS</span><span class="spec-val">[value]</span></div>
    </div>
  </div>
</div>
```

### Grid layout
```css
.equip-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-top: var(--space-4);
}
@media (max-width: 1024px) { .equip-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .equip-grid { grid-template-columns: 1fr; } }
```

### Card inventory (all 39 systems)

See `WEAPONS_PLATFORMS_PROMPT.md` for the complete card inventory with specs, image sources, and add-new instructions.

**Sub-section counts:**
- §07-A US/Coalition: 15 cards (B-2 Spirit, B-52H, F-15E Strike Eagle, F-35A, F/A-18E/F, EA-18G Growler, MQ-9 Reaper, KC-135 Stratotanker, E-3 AWACS, JDAM, GBU-57 MOP, JASSM-ER, TLAM Tomahawk, THAAD, Patriot PAC-3)
- §07-B Israeli: 8 cards (F-35I Adir, F-15I Ra'am, F-16I Sufa, Jericho III, Popeye Turbo SLCM, Delilah, Iron Dome, Arrow-3)
- §07-C Iranian Arsenal: 13 cards (Fattah-1, Khorramshahr-4, Shahab-3, Emad, Qadr-H, Sejjil-2, Zolfaghar, Fateh-110, Hoveizeh LACM, Shahed-136, Shahed-131, Toufan ATM, Bavar-373 SAM)
- §07-D Proxy Forces: 3 cards (Hezbollah Raad-3, Houthi Samad-3 UAV, Houthi Quds-1 LACM)

---

## §08 — Equipment Losses

Two-column layout: US/Coalition left, Iran right.

```html
<div class="losses-dual">
  <div class="losses-col losses-us">
    <div class="losses-header">US / COALITION LOSSES</div>
    <table class="losses-table">
      <thead><tr><th>System</th><th>Qty</th><th>Date</th><th>Cause</th><th>Source</th></tr></thead>
      <tbody>
        <tr>
          <td>E-3 AWACS</td><td>1</td><td>Mar 27</td>
          <td>SAM (Bavar-373)</td>
          <td><a href="[source-url]" target="_blank">↗</a></td>
        </tr>
        <tr><td>KC-135 Stratotanker</td><td>5+</td><td>Various</td><td>AAM / SAM</td><td>...</td></tr>
        <tr><td>MQ-9 Reaper</td><td>12+</td><td>Various</td><td>AAM / Jamming</td><td>...</td></tr>
        <tr><td>F-15E Strike Eagle</td><td>3</td><td>Various</td><td>SAM</td><td>...</td></tr>
        <tr><td>THAAD Radar (AN/TPY-2)</td><td>1</td><td>Mar 4</td><td>Ballistic missile</td><td>...</td></tr>
        <tr><td>Personnel KIA</td><td>12+</td><td>—</td><td>—</td><td>...</td></tr>
        <tr><td>Personnel WIA</td><td>24+</td><td>—</td><td>—</td><td>...</td></tr>
      </tbody>
    </table>
  </div>
  <div class="losses-col losses-iran">
    <div class="losses-header">IRAN LOSSES</div>
    <table class="losses-table"><!-- ... --></table>
  </div>
</div>
```

Day counter badge displayed above tables:
```html
<div class="day-badge">DAY <span id="day-counter-losses">--</span> OF CONFLICT</div>
```

---

## §10 — Strait of Hormuz

**Center:** `[26.5, 56.2]` **Zoom:** `8`
**Tile:** CartoDB Dark Matter

Overlays:
- Shipping lanes: blue polylines
- IRGC naval bases: red markers
- Island positions: Qeshm, Larak, Hormuz Island
- Anti-ship missile coverage arcs: translucent red circles
- Mine warfare zones: hatch-pattern polygons
- Annotation: "33km — narrowest point" text marker

---

## §10A — Kharg Island Assessment

See `GROUND_OPERATIONS_PROMPT.md` for full build spec. Summary:
- Leaflet map centered `[29.237, 50.323]`, zoom 11, CartoDB Voyager tile
- Trump Truth Social quote card (styled `.quote-card.truth-social`)
- Island profile stats: 25km², ~90% pre-war Iranian oil export capacity
- Force assessment: IRGC Naval assets, shore-based SAMs, fast-boat squadrons
- Snake Island comparison card
- Analyst assessment cards sourced from: BBC, Al Jazeera, Responsible Statecraft, Stars & Stripes

---

## §10B — Ground Target Options

See `GROUND_OPERATIONS_PROMPT.md` for full build spec. Summary:
- 8 target cards in a 2-col grid, each with mini Leaflet map + feasibility rating
- Targets: Abu Musa, Greater Tunb, Bandar Abbas, Chabahar, Jask, Kish, Lavan, Qeshm
- Feasibility rating: 1–5 star system, color-coded (red → amber → green)

---

## Timeline Event HTML Pattern

```html
<div class="tl-event tl-left">
  <div class="tl-date">MAR 27, 2026</div>
  <div class="tl-tag military">MILITARY</div>
  <div class="tl-title">E-3 AWACS Lost Over Gulf</div>
  <div class="tl-desc">
    US Air Force E-3 Sentry shot down by Bavar-373 SAM system while conducting
    ISR operations. First AWACS loss in combat since the type entered service.
    <a href="[source]" target="_blank">[Source] ↗</a>
  </div>
</div>
```

Tag color classes: `.tl-tag.military` (red), `.tl-tag.political` (blue), `.tl-tag.diplomatic` (purple), `.tl-tag.humanitarian` (amber)

---

## §14 — Endgame Analysis Scenarios

```html
<div class="outlook-grid">
  <div class="outlook-card scenario-a">
    <div class="oc-prob">32%</div>
    <div class="oc-title">Negotiated Ceasefire</div>
    <div class="oc-timeline">6–18 months</div>
    <div class="oc-desc">...</div>
  </div>
  <!-- repeat for B, C, D -->
</div>
```

---

## Sources & Citations (§15)

6-column link grid. All URLs must be real and verified before adding.

```html
<div class="sources-grid">
  <div class="source-col">
    <div class="sc-heading">GOVERNMENT / MILITARY</div>
    <ul>
      <li><a href="https://www.centcom.mil" target="_blank">CENTCOM</a></li>
      <li><a href="https://www.defense.gov" target="_blank">DoD Press Releases</a></li>
      <li><a href="https://www.idf.il" target="_blank">IDF Spokesperson</a></li>
    </ul>
  </div>
  <!-- columns: Think Tanks | OSINT | News | Academic | Regional -->
</div>
```

---

## CSS Variables (Desert Gold accent)

```css
:root {
  --accent:        #C8962E;
  --accent-light:  #E8B84B;
  --accent-dim:    color-mix(in srgb, #C8962E 40%, transparent);
}
```

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| `< 1280px` | 3-col grids → 2-col |
| `< 1024px` | 2-col grids → 1-col for narrow cards |
| `< 768px` | All grids → 1-col; section badges hidden; nav collapses |
| `< 480px` | Hero font sizes reduce ~20%; stat cards stack vertically |
