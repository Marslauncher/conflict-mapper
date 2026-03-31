# NUCLEAR DEEP DIVE — Build Spec
## `pages/nuclear-deep-dive.html`
### Conflict Mapper Hub Page

---

## Overview

A deep-dive intelligence brief on Iran's nuclear program, structured as 8 modular sections. The centerpiece is §04 — 14 facility cards each with dual Leaflet maps (context view + satellite detail), coordinates, damage assessment bars, and sourced analysis.

**File:** `pages/nuclear-deep-dive.html`
**Size:** ~1,970 lines
**Accent color:** Ember Red — `#ff4a1c`
**Accent light:** `#ff6e47`
**Architecture:** Standard hub page modular system (see `HUB_CONTENT_SYSTEM_PROMPT.md`)

---

## Section Map

| data-section | id | Title | Content |
|---|---|---|---|
| 01 | section-01-map | Nuclear Facilities Theater Map | Leaflet map with 14 clickable facility markers |
| 02 | section-02-weapons | GBU-57 / MOP | Weapon specs table + penetration diagram + facility comparison |
| 03 | section-03-hammer | Operation Midnight Hammer | Strike overview + flight profile infographic + force composition |
| 04 | section-04-facilities | Per-Site Facility Analysis | 14 facility cards with dual Leaflet maps |
| 05 | section-05-timeline | Enrichment Progression | Chronological milestones + status bars |
| 06 | section-06-scenarios | Nuclear Breakout Scenarios | 3 scenario cards (worst / DOD estimate / admin case) |
| 07 | section-07-reconstitution | Program Reconstitution Assessment | Capability bars + TESA bottleneck analysis |
| 08 | section-08-fallout | Radiological & Fallout Considerations | 2×2 grid of analysis cards |

---

## §01 — Theater Map

**Center:** `[33.0, 52.0]` **Zoom:** `6`
**Tile:** CartoDB Dark Matter

```javascript
const nuclearMap = L.map('nuclear-theater-map', {
  center: [33.0, 52.0], zoom: 6,
});
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO', maxZoom: 19,
}).addTo(nuclearMap);
```

Marker icons by status:
```javascript
function facilityIcon(status) {
  const colors = {
    destroyed:  '#f44336',
    damaged:    '#ff9800',
    hardening:  '#2196f3',
    active:     '#4caf50',
    unknown:    '#9e9e9e',
  };
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;
                       background:${colors[status]};border:2px solid #fff;"></div>`,
    iconSize: [12, 12],
  });
}
```

Each marker has a popup with facility name, status, and a link to `#site-[slug]`:
```javascript
L.marker([lat, lng], { icon: facilityIcon(status) })
  .bindPopup(`<b>${name}</b><br>Status: ${statusLabel}<br>
              <a href="#site-${slug}">View Analysis ↓</a>`)
  .addTo(nuclearMap);
```

---

## §02 — GBU-57 / MOP (Massive Ordnance Penetrator)

### Specs Table

```html
<div class="mop-specs-grid">
  <div class="mop-image-block">
    <img src="assets/gbu57-b2-tarmac-mumaw.jpg" alt="GBU-57 MOP on B-2 tarmac" loading="lazy">
    <div class="mop-caption">GBU-57 MOP on B-2 Spirit tarmac. Photo: Mumaw/USAF</div>
  </div>
  <div class="mop-image-block">
    <img src="assets/gbu57-b2-bombbay-usaf.jpg" alt="GBU-57 in B-2 bomb bay" loading="lazy">
    <div class="mop-caption">GBU-57 in B-2 bomb bay. Photo: USAF official</div>
  </div>
  <table class="specs-table">
    <tr><th>Designation</th><td>GBU-57A/B</td></tr>
    <tr><th>Common Name</th><td>Massive Ordnance Penetrator (MOP)</td></tr>
    <tr><th>Total Weight</th><td>13,608 kg (30,000 lb)</td></tr>
    <tr><th>Warhead Weight</th><td>2,722 kg (6,000 lb) high explosive</td></tr>
    <tr><th>Length</th><td>6.2 m (20.5 ft)</td></tr>
    <tr><th>Guidance</th><td>GPS-aided inertial navigation</td></tr>
    <tr><th>Delivery</th><td>B-2 Spirit only (internal carriage, 2 per aircraft)</td></tr>
    <tr><th>Penetration</th><td>~60 m (200 ft) reinforced concrete (estimated declassified)</td></tr>
    <tr><th>Primary Targets</th><td>Deeply buried hardened facilities (Fordow, Natanz UF)</td></tr>
    <tr><th>Status</th><td>Operational; upgraded variant in development</td></tr>
  </table>
</div>
```

### Penetration Diagram

SVG cross-section showing soil/rock layers and GBU-57 penetration depth vs. facility depth for Fordow and Natanz:
```html
<div class="penetration-diagram">
  <!-- SVG diagram showing: surface → soil ~10m → rock → facility at ~80m -->
  <!-- Labeled arrows: GBU-57 reaches ~60m, Fordow hall at ~80m (margin of uncertainty) -->
</div>
```

---

## §03 — Operation Midnight Hammer

### Flight Profile Infographic

```html
<div class="infographic-block">
  <img src="assets/MidnightHammerFlightProfile-7.jpg"
       alt="Operation Midnight Hammer B-2/F-35 flight profile infographic"
       loading="lazy"
       style="width: 100%; object-fit: contain; max-height: 600px;">
  <div class="infographic-credit">
    Flight profile visualization — <a href="https://twitter.com/ianellisjones" target="_blank">@ianellisjones</a>
  </div>
</div>
```

### ISIS Natanz Report

```html
<div class="report-card">
  <div class="rc-label">SOURCE DOCUMENT</div>
  <div class="rc-title">ISIS Natanz Nuclear Security Report — March 3, 2026</div>
  <div class="rc-desc">Satellite imagery analysis and damage assessment from the Institute for Science and International Security.</div>
  <a href="assets/Natanz-Report-March-3-2026-6.pdf" target="_blank" class="rc-link">
    View PDF ↗
  </a>
  <a href="https://isis-online.org" target="_blank" class="rc-link secondary">
    ISIS Online ↗
  </a>
</div>
```

### Strike Overview Stats

```html
<div class="hammer-stats">
  <div class="hs-stat"><div class="hs-val">7</div><div class="hs-label">B-2 SPIRITS DEPLOYED</div></div>
  <div class="hs-stat"><div class="hs-val">14</div><div class="hs-label">GBU-57 MOPs DROPPED</div></div>
  <div class="hs-stat"><div class="hs-val">4</div><div class="hs-label">SITES TARGETED</div></div>
  <div class="hs-stat"><div class="hs-val">Feb 28</div><div class="hs-label">STRIKE DATE</div></div>
</div>
```

### Source: The War Zone (TWZ)

The Warzone reporting at `thedrive.com/the-war-zone` is the primary public source for Operation Midnight Hammer strike details, aircraft deployment numbers, and weapon loads. Always link to specific TWZ articles when citing strike details.

---

## §04 — Per-Site Facility Analysis

The most complex section: 14 facility cards. Each card has:
1. Header (number, name, province, status badge)
2. Coordinates row with Google Maps and Wikimapia links
3. Description paragraphs
4. Metadata key-value pairs
5. Tag badges
6. Damage/assessment bars
7. Source links
8. Dual Leaflet maps (context + detail)

### Facility Card Full Structure

```html
<div class="facility-card status-[destroyed|damaged|hardening|active]" id="site-[slug]">
  <div class="fc-header">
    <span class="fc-num">[01–14]</span>
    <div class="fc-title-block">
      <div class="fc-title">[FACILITY NAME]</div>
      <div class="fc-subtitle">[PROVINCE] / [BRIEF DESCRIPTION]</div>
    </div>
    <span class="fc-status [status-class]">[STATUS LABEL]</span>
  </div>
  <div class="fc-body">
    <div class="fc-content">
      <div class="fc-coords-row">
        <span class="fc-coords">[LAT]°N  [LNG]°E</span>
        <div class="fc-map-links">
          <a href="https://www.google.com/maps/@[LAT],[LNG],15z" target="_blank">Google Maps ↗</a>
          <a href="https://wikimapia.org/#lat=[LAT]&lon=[LNG]&z=15" target="_blank">Wikimapia ↗</a>
        </div>
      </div>
      <p class="fc-desc">[Description paragraph 1]</p>
      <p class="fc-desc">[Description paragraph 2 — role in enrichment chain or weapons program]</p>
      <div class="fc-meta">
        <div class="fc-meta-row"><span class="fm-key">OPERATOR</span><span class="fm-val">[AEOI / IRGC / SPND]</span></div>
        <div class="fc-meta-row"><span class="fm-key">ESTABLISHED</span><span class="fm-val">[YEAR]</span></div>
        <div class="fc-meta-row"><span class="fm-key">DEPTH</span><span class="fm-val">[meters, if known]</span></div>
        <div class="fc-meta-row"><span class="fm-key">HARDENING</span><span class="fm-val">[description]</span></div>
      </div>
      <div class="fc-tags">
        <span class="fc-tag">[Enrichment|Weaponization|Centrifuge R&D|Reactor|etc.]</span>
      </div>
      <div class="assessment">
        <div class="assess-row">
          <span class="assess-label">STRUCTURAL DAMAGE</span>
          <div class="assess-bar">
            <div class="assess-fill" style="width: [0–100]%; background: [color-by-damage];"></div>
          </div>
          <span class="assess-pct">[X]%</span>
        </div>
        <div class="assess-row">
          <span class="assess-label">PROGRAM SETBACK</span>
          <div class="assess-bar">
            <div class="assess-fill" style="width: [0–100]%;"></div>
          </div>
          <span class="assess-pct">[X]%</span>
        </div>
      </div>
      <div class="fc-sources">
        <a href="[URL]" target="_blank">[Source name] ↗</a>
      </div>
    </div>
    <div class="fc-imagery">
      <div class="fc-dual-maps">
        <div class="fc-map-label">REGIONAL CONTEXT</div>
        <div id="ctx-map-[slug]" class="fc-ctx-map"></div>
        <div class="fc-map-label">SITE DETAIL</div>
        <div id="det-map-[slug]" class="fc-det-map"></div>
      </div>
    </div>
  </div>
</div>
```

### Status Classes & Colors

```css
.facility-card.status-destroyed { border-left: 4px solid #f44336; }
.facility-card.status-damaged   { border-left: 4px solid #ff9800; }
.facility-card.status-hardening { border-left: 4px solid #2196f3; }
.facility-card.status-active    { border-left: 4px solid #4caf50; }

.fc-status.status-destroyed { background: #f4433622; color: #f44336; }
.fc-status.status-damaged   { background: #ff980022; color: #ff9800; }
.fc-status.status-hardening { background: #2196f322; color: #2196f3; }
.fc-status.status-active    { background: #4caf5022; color: #4caf50; }
```

### Dual Map Configuration

```javascript
function initFacilityMaps(slug, lat, lng) {
  // Context map — CartoDB Dark Matter, zoom 10, non-interactive
  const ctxEl = document.getElementById(`ctx-map-${slug}`);
  const ctxMap = L.map(ctxEl, {
    center: [lat, lng], zoom: 10,
    zoomControl: false, dragging: false,
    scrollWheelZoom: false, doubleClickZoom: false,
    attributionControl: false,
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(ctxMap);
  L.circleMarker([lat, lng], {
    radius: 5, color: '#ff4a1c', fillColor: '#ff4a1c', fillOpacity: 0.8
  }).addTo(ctxMap);

  // Detail map — Esri World Imagery (satellite), zoom 15, non-interactive
  const detEl = document.getElementById(`det-map-${slug}`);
  const detMap = L.map(detEl, {
    center: [lat, lng], zoom: 15,
    zoomControl: false, dragging: false,
    scrollWheelZoom: false, doubleClickZoom: false,
    attributionControl: false,
  });
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19
  }).addTo(detMap);
  L.circleMarker([lat, lng], {
    radius: 8, color: '#ff4a1c', fillOpacity: 0, weight: 2
  }).addTo(detMap);
}
```

Map container CSS:
```css
.fc-dual-maps { display: flex; flex-direction: column; gap: var(--space-2); }
.fc-ctx-map, .fc-det-map { width: 100%; height: 200px; border-radius: var(--radius); }
.fc-map-label { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-faint); }
```

---

## Facility Inventory (14 Cards)

| # | id | Name | Lat | Lng | Status | Tags |
|---|---|---|---|---|---|---|
| 01 | natanz | Natanz Enrichment Facility | 33.7256 | 51.7278 | damaged | Enrichment, Centrifuge, Underground |
| 02 | fordow | Fordow Fuel Enrichment Plant | 34.8841 | 50.9773 | damaged | Enrichment, Deeply Buried, Mountain |
| 03 | isfahan-ucf | Isfahan UCF (Uranium Conversion Facility) | 32.5481 | 51.3893 | damaged | Conversion, UF6 |
| 04 | tesa-karaj | TESA Karaj (Centrifuge R&D) | 35.8008 | 50.9119 | damaged | Centrifuge R&D, AEOI |
| 05 | kalaye | Kalaye Electric | 35.7497 | 51.4192 | active | Historic, Centrifuge Testing |
| 06 | sanjarian | Sanjarian Site | 35.5167 | 51.9333 | active | Suspected weapons-related |
| 07 | lavisan2 | Lavisan-2 | 35.7897 | 51.5036 | active | Suspected weapons-related, SPND |
| 08 | spnd-nour | SPND Nour HQ | 35.6892 | 51.4014 | active | Weaponization, SPND |
| 09 | meysami | Meysami Complex | 35.7197 | 51.5489 | active | Weaponization, Neutron initiator |
| 10 | pickaxe | Pickaxe Mountain (Torud) | 35.4422 | 54.5883 | hardening | Hardened storage, Missile/warhead |
| 11 | taleghan2 | Taleghan-2 | 36.1700 | 50.7600 | active | Suspected, High explosives testing |
| 12 | arak | Arak Heavy Water Reactor (IR-40) | 34.1617 | 49.1739 | active | Reactor, Plutonium |
| 13 | bushehr | Bushehr Nuclear Power Plant | 28.8331 | 50.8878 | active | Civilian reactor, Russian-built |
| 14 | isfahan-ntc | Isfahan Nuclear Technology Center | 32.5633 | 51.4700 | active | Research, Fuel fabrication |

### KMZ/KML Coordinate Data

Facility coordinates are sourced from ISIS-Online.org KMZ/KML files and cross-referenced with:
- Google Earth imagery
- Wikimapia community mapping
- IAEA safeguards reports (for declared facilities)
- CIA Abbottabad compound analytical methods (for undeclared facilities — applying same grid analysis to OSINT imagery)

---

## §05 — Enrichment Progression Timeline

Chronological milestones from 1988 to present, with status bar showing enrichment level achieved at each stage:

```html
<div class="enrichment-timeline">
  <div class="et-event">
    <div class="et-year">2006</div>
    <div class="et-milestone">First successful 3.5% LEU enrichment at Natanz</div>
    <div class="et-bar-wrap">
      <div class="et-bar" style="width: 3.5%; background: #4caf50;"></div>
      <span class="et-pct">3.5% U-235</span>
    </div>
  </div>
  <!-- Continue through: 20% (2010), 60% (2021), 84% (2023), post-strike status -->
</div>
```

Weapons-grade threshold annotation at 90%:
```html
<div class="weapons-grade-line">
  <div class="wg-marker" style="left: 90%;">
    <div class="wg-label">WEAPONS GRADE<br>THRESHOLD — 90%</div>
  </div>
</div>
```

---

## §06 — Nuclear Breakout Scenarios

Three scenario cards:

```html
<div class="scenario-row">
  <div class="scenario-card worst">
    <div class="sc-label">// WORST CASE</div>
    <div class="sc-title">Rapid Reconstitution</div>
    <div class="sc-prob worst">6–12 months to weapons-grade material</div>
    <p class="sc-desc">Dispersed centrifuge cascades survive strikes; TESA Karaj maintains
      component manufacturing. Clandestine sites provide backup enrichment capacity.</p>
    <div class="sc-source"><a href="https://isis-online.org" target="_blank">ISIS-Online ↗</a></div>
  </div>
  <div class="scenario-card likely">
    <div class="sc-label">// DOD ESTIMATE</div>
    <div class="sc-title">Significant Setback</div>
    <div class="sc-prob likely">2–3 years to resume significant enrichment</div>
    <p class="sc-desc">Natanz and Fordow cascade halls severely damaged. Centrifuge manufacturing
      disrupted by TESA strikes. Reconstitution possible but requires international procurement.</p>
    <div class="sc-source"><a href="https://www.defense.gov" target="_blank">DoD Briefings ↗</a></div>
  </div>
  <div class="scenario-card best">
    <div class="sc-label">// ADMIN CASE</div>
    <div class="sc-title">Program Termination</div>
    <div class="sc-prob best">Permanent capability degradation</div>
    <p class="sc-desc">Political decapitation + nuclear facility destruction eliminates both
      technical and political infrastructure. Successor government opts for NPT compliance.</p>
    <div class="sc-source"><a href="https://armscontrol.org" target="_blank">Arms Control Association ↗</a></div>
  </div>
</div>
```

---

## §07 — Program Reconstitution Assessment

Capability bars with TESA Karaj bottleneck analysis:

```html
<div class="reconstitution-grid">
  <div class="rc-capability">
    <div class="rcc-name">Centrifuge Manufacturing (TESA Karaj)</div>
    <div class="rcc-status">CRITICALLY DEGRADED</div>
    <div class="rcc-bar-wrap">
      <div class="rcc-bar" style="width: 15%; background: #f44336;"></div>
    </div>
    <div class="rcc-note">TESA Karaj is the sole domestic manufacturer of IR-1 and IR-2m rotors.
      Without this facility, Iran cannot produce new centrifuges domestically.
      <a href="https://isis-online.org/[path]" target="_blank">ISIS Analysis ↗</a>
    </div>
  </div>
  <!-- Additional capabilities: UF6 production, cascade assembly, enrichment operations, etc. -->
</div>
```

---

## §08 — Radiological & Fallout Considerations

2×2 card grid:

```html
<div class="fallout-grid">
  <div class="fo-card">
    <div class="fo-title">NATANZ — Fallout Modeling</div>
    <p>Subsurface detonation minimizes surface contamination. Primary release pathway:
       dust and particulate from crater ejecta. Prevailing winds [direction] carry
       plume toward [populated areas]. Estimated contamination radius: [X] km².</p>
  </div>
  <div class="fo-card">
    <div class="fo-title">FORDOW — Tunnel Release</div>
    <p>Mountain tunnel structure channels blast and any radioactive material.
       Exit portals become contamination point sources. Access roads impassable
       for [X] days post-strike.</p>
  </div>
  <div class="fo-card">
    <div class="fo-title">BUSHEHR — Reactor Safety</div>
    <p>Civilian VVER-1000 reactor. Not targeted in strikes. Russian fuel rods
       remain under IAEA safeguards. Secondary cooling system intact.
       <a href="https://iaea.org" target="_blank">IAEA Safeguards ↗</a></p>
  </div>
  <div class="fo-card">
    <div class="fo-title">ARAK — Heavy Water Reactor</div>
    <p>IR-40 reactor modified under JCPOA to reduce plutonium production capacity.
       Core filled with concrete per 2015 agreement. Not operational.
       <a href="https://armscontrol.org" target="_blank">ACA ↗</a></p>
  </div>
</div>
```

---

## Primary Sources

| Source | URL | What it covers |
|---|---|---|
| ISIS-Online | https://isis-online.org | Satellite imagery, facility reports, enrichment calculations |
| Arms Control Association | https://armscontrol.org | Treaty compliance, enrichment timelines, policy |
| IAEA Safeguards | https://iaea.org/topics/safeguards | Official inspection findings, GOV/ documents |
| The Warzone (TWZ) | https://thedrive.com/the-war-zone | Operation Midnight Hammer strike details |
| @ianellisjones (Twitter/X) | https://twitter.com/ianellisjones | Flight profile infographic (assets/MidnightHammerFlightProfile-7.jpg) |

---

## Assets Referenced

| Asset | Path | Usage |
|---|---|---|
| Flight profile infographic | `assets/MidnightHammerFlightProfile-7.jpg` | §03 Operation Midnight Hammer |
| GBU-57 tarmac photo | `assets/gbu57-b2-tarmac-mumaw.jpg` | §02 MOP specs section |
| GBU-57 bomb bay photo | `assets/gbu57-b2-bombbay-usaf.jpg` | §02 MOP specs section |
| Natanz ISIS PDF report | `assets/Natanz-Report-March-3-2026-6.pdf` | §03 source document card |

---

## Adding a New Facility Card

1. Assign the next sequential number (15, 16, …)
2. Look up coordinates via ISIS-Online KMZ files, Google Earth, or Wikimapia
3. Set status: `destroyed` | `damaged` | `hardening` | `active`
4. Populate metadata: operator (AEOI / IRGC / SPND), established date, depth, hardening
5. Set damage assessment bars (0–100%) based on latest satellite imagery or ISIS reporting
6. Call `initFacilityMaps('[slug]', lat, lng)` in the DOMContentLoaded block
7. Add a marker to the §01 theater map using `facilityIcon(status)`
8. Update `data-last-updated` on the `<section>` and the `.sb-date` badge

---

## CSS Variables (Ember Red accent)

```css
:root {
  --accent:       #ff4a1c;
  --accent-light: #ff6e47;
  --accent-dim:   color-mix(in srgb, #ff4a1c 40%, transparent);
}
```

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| `< 1200px` | Facility card body: side-by-side → stacked (content above maps) |
| `< 768px` | Section badges hidden; all grids 1-col; map heights 160px |
| `< 480px` | Hero and section title font size –20% |
