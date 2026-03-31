# HUB CONTENT SYSTEM — Build Spec
## Modular Section Architecture
### Applies to: iran-war-analysis.html, nuclear-deep-dive.html, taiwan-strait.html, and all future hub pages

---

## Overview

Hub pages are long-form intelligence briefs covering a single topic in exhaustive detail. Each hub page uses a **modular section architecture** — every content section is a self-contained HTML block identified by `data-section`, `data-title`, and `data-last-updated` attributes.

---

## Modular Section Pattern

Every content section in a hub page follows this exact structure:

```html
<section id="section-XX-slug" class="page-section [alt-bg]"
         data-section="XX"
         data-title="Human-Readable Section Title"
         data-last-updated="YYYY-MM-DD">
  <div class="section-badge">
    <span class="sb-num">§ XX</span>
    <span class="sb-date">UPDATED YYYY-MM-DD</span>
  </div>
  <div class="section">
    <div class="section-header">
      <span class="section-num">XX // SHORT_LABEL</span>
      <h2 class="section-title">SECTION <em>TITLE</em></h2>
    </div>
    <!-- Section content here -->
  </div>
</section>
```

### Data Attributes

| Attribute | Purpose | Example |
|---|---|---|
| `data-section` | Zero-padded section number | `"03"` |
| `data-title` | Machine-readable section title | `"Operation Midnight Hammer"` |
| `data-last-updated` | ISO date of last content update | `"2026-03-31"` |
| `id` | Anchor link target | `"section-03-hammer"` |
| `class` | Styling + alternating backgrounds | `"page-section alt-bg"` |

### Section Alternation
Odd sections use `page-section alt-bg`, even sections use `page-section`. This creates visual rhythm without heavy dividers. The hero section is NOT part of the numbered system.

### Section Numbering
- Zero-pad to two digits: `01`, `02`, … `15`
- Sub-sections for related content: `10A`, `10B`
- The hero/banner section is unnumbered — exists outside the modular system

---

## Required CSS

Include in every hub page `<style>` block:

```css
/* ── MODULAR SECTION SYSTEM ── */
.page-section { position: relative; }
.page-section + .page-section { border-top: 1px solid var(--border); }
.page-section.alt-bg { background: var(--surface); }

/* Section badge — top-right corner, shows § number and last update date */
.section-badge {
  position: absolute; top: var(--space-4); right: var(--space-6);
  display: flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.08em;
  color: var(--text-faint); z-index: 10;
  background: var(--surface-2); border: 1px solid var(--border);
  padding: 3px 8px; border-radius: var(--radius);
  pointer-events: none;
}
.section-badge .sb-num  { color: var(--accent); }
.section-badge .sb-date { color: var(--text-faint); }

/* Section header */
.section-header { margin-bottom: var(--space-6); }
.section-num {
  font-family: var(--font-mono); font-size: 0.7rem;
  color: var(--accent); letter-spacing: 0.1em;
}
.section-title {
  font-family: var(--font-display); font-size: 2rem;
  font-weight: 700; letter-spacing: 0.05em;
  color: var(--text); margin-top: var(--space-1);
}
.section-title em { color: var(--accent); font-style: normal; }
```

Mobile (inside `@media (max-width: 768px)`):
```css
.section-badge { display: none; }
.section-title { font-size: 1.5rem; }
```

---

## Page Shell

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[PAGE TITLE] — Conflict Mapper Intelligence Brief</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<!-- Leaflet (include only if page uses maps) -->
<link  rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<!-- Lucide icons -->
<script src="https://unpkg.com/lucide@latest"></script>
<style>
/* CSS variables, modular section CSS, page-specific styles */
</style>
</head>
<body>
<!-- Classification banner -->
<div class="classification-banner">
  ANALYTICAL INTELLIGENCE PRODUCT — OPEN SOURCE COMPILATION — NOT CLASSIFIED
</div>
<!-- Top nav (links to section anchors) -->
<nav class="page-nav">
  <a href="#section-01-slug">LABEL</a>
  <!-- ... -->
</nav>
<!-- Hero section (NOT modular — always unnumbered) -->
<section class="hero-section"><!-- ... --></section>
<!-- Modular sections § 01 through § NN -->
<!-- JavaScript at bottom -->
<script>lucide.createIcons();</script>
</body>
</html>
```

---

## Global CSS Variables (all hub pages)

```css
:root {
  /* Background layers */
  --bg:        #0a0c10;
  --surface:   #0d1117;
  --surface-2: #161b22;
  --surface-3: #1c2128;

  /* Text */
  --text:       #e6edf3;
  --text-dim:   #8b949e;
  --text-faint: #484f58;

  /* Borders */
  --border:     #30363d;
  --border-dim: #21262d;

  /* Typography */
  --font-display: 'Rajdhani', sans-serif;
  --font-mono:    'Share Tech Mono', monospace;
  --font-body:    'Inter', sans-serif;

  /* Spacing scale */
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px;
  --space-4: 16px; --space-5: 20px;  --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px;

  /* Radius */
  --radius: 6px;

  /* Accent: set per-page (examples below) */
  --accent:       #C8962E;  /* Desert Gold — Iran War */
  --accent-light: #E8B84B;
}
```

Per-page accent color examples:
| Hub Page | Accent |
|---|---|
| Iran War Analysis | Desert Gold `#C8962E` / `#E8B84B` |
| Nuclear Deep Dive | Ember Red `#ff4a1c` |
| Taiwan Strait Watch | Teal `#29b6f6` / Neon `#00ffc8` |
| Arctic | Ice Blue `#4fc3f7` |
| Cyber | Matrix Green `#00ff41` |

---

## Design Rules

- **Background:** `#0a0c10` or `#0a0b0d`
- **Fonts:** Rajdhani (display/headings), Share Tech Mono (labels, badges, mono text), Inter (body paragraphs)
- **Icons:** Lucide via CDN
- **Images:** `object-fit: contain` with `max-height` — **never** `object-fit: cover` with a fixed `height`
- **Maps:** CartoDB Dark Matter for overview/operational maps; CartoDB Voyager for island/coastal detail; Esri World Imagery for satellite-detail zoom
- **External links:** always `target="_blank"`
- **Classification banner:** present on every hub page, text: `ANALYTICAL INTELLIGENCE PRODUCT — OPEN SOURCE COMPILATION — NOT CLASSIFIED`

---

## Existing Hub Pages

### 1. Iran War Analysis (`pages/iran-war-analysis.html`)
**Accent:** Desert Gold `#C8962E`
**Size:** ~3,960 lines

| § | id | Title | Content Type |
|---|---|---|---|
| 01 | section-01-overview | Executive Summary | Text + stat cards + red alert box |
| 02 | section-02-timeline | Conflict Timeline | Day-by-day alternating timeline cards |
| 03 | section-03-map | Theater Map | Leaflet map, base/strike/front markers |
| 04 | section-04-thinktanks | Think Tank Consensus | 17 institution cards |
| 05 | section-05-politics | Post-Decapitation Leadership | Real photo leader cards + post-conflict scenario cards (Stimson/ESCP/ICDI sources) |
| 06 | section-06-nuclear | Nuclear Program | Facility status + Deep Dive link card |
| 07 | section-07-weapons | Weapons Platforms | 4 sub-sections (07-A/B/C/D), 39 equip cards total — no tabs |
| 08 | section-08-losses | Equipment Losses | Dual tables (US vs Iran); E-3 AWACS, KC-135 updates; Day counter |
| 09 | section-09-ground | Ground Assault Analysis | Force comparison + geography + objectives |
| 10 | section-10-hormuz | Strait of Hormuz | Leaflet map + chokepoint + mine warfare zones |
| 10A | section-10a-kharg | Kharg Island Assessment | Leaflet map, Truth Social quote, island profile, analyst cards, Snake Island comparison |
| 10B | section-10b-targets | Ground Target Options | 8 target cards with mini Leaflet maps, feasibility ratings |
| 11 | section-11-lebanon | Lebanon Front | IDF operations + Hezbollah + casualties |
| 12 | section-12-taiwan | Taiwan Impact | Munition depletion + PLA lessons + deterrence |
| 13 | section-13-economy | Economic Impact | Oil prices + GDP + supply chains |
| 14 | section-14-outlook | Endgame Analysis | Scenario cards + probability ranking |
| 15 | section-15-sources | Sources & Citations | 6-column grid, 40+ URLs |

See `IRAN_WAR_ANALYSIS_PROMPT.md` for full build spec.
See `WEAPONS_PLATFORMS_PROMPT.md` for §07 card inventory.
See `GROUND_OPERATIONS_PROMPT.md` for §10A and §10B specs.

---

### 2. Nuclear Deep Dive (`pages/nuclear-deep-dive.html`)
**Accent:** Ember Red `#ff4a1c`
**Size:** ~1,970 lines

| § | id | Title | Content Type |
|---|---|---|---|
| 01 | section-01-map | Nuclear Facilities Theater Map | Leaflet map, clickable facility popups |
| 02 | section-02-weapons | GBU-57 / MOP | Specs table + penetration chart + images |
| 03 | section-03-hammer | Operation Midnight Hammer | Strike overview + flight profile infographic + force composition |
| 04 | section-04-facilities | Per-Site Facility Analysis | 14 facility cards with dual Leaflet maps |
| 05 | section-05-timeline | Enrichment Progression Timeline | Chronological events + status bars |
| 06 | section-06-scenarios | Nuclear Breakout Scenarios | 3 scenario cards (worst / DOD estimate / admin) |
| 07 | section-07-reconstitution | Program Reconstitution Assessment | Capability bars + TESA bottleneck analysis |
| 08 | section-08-fallout | Radiological & Fallout Considerations | 2×2 grid of analysis cards |

See `NUCLEAR_DEEP_DIVE_PROMPT.md` for full build spec.

---

### 3. Taiwan Strait Watch (`pages/taiwan-strait.html`)
**Accent:** Teal `#29b6f6` / Neon `#00ffc8`
**Size:** ~1,420 lines

| § | id | Title | Content Type |
|---|---|---|---|
| 01 | section-01-map | Operational Map | Leaflet map + force positions |
| 02 | section-02-weather | Weather & Sea State | Live conditions + 7-day forecast + Windy embed |
| 03 | section-03-tides | Tide Charts & Landing Windows | SVG tide chart + beach landing windows |
| 04 | section-04-forces | Force Comparison | PLA vs ROC vs US stat blocks |
| 05 | section-05-assessment | Strategic Assessment | 4 analysis cards |
| 06 | section-06-sidebar | Sidebar Panel | Status + invasion windows + intel feed + xrefs |

---

## Shared Components

### Facility Card (Nuclear Deep Dive §04)
```html
<div class="facility-card status-[destroyed|damaged|hardening|active]" id="site-[slug]">
  <div class="fc-header">
    <span class="fc-num">XX</span>
    <div class="fc-title-block">
      <div class="fc-title">[FACILITY NAME]</div>
      <div class="fc-subtitle">[PROVINCE] / [DESCRIPTION]</div>
    </div>
    <span class="fc-status [class]">[STATUS TEXT]</span>
  </div>
  <div class="fc-body">
    <div class="fc-content">
      <div class="fc-coords-row">
        <span class="fc-coords">XX.XXXX°N  XX.XXXX°E</span>
        <div class="fc-map-links">
          <a href="https://www.google.com/maps/@LAT,LNG,15z" target="_blank">Google Maps ↗</a>
          <a href="https://wikimapia.org/#lat=LAT&lon=LNG&z=15" target="_blank">Wikimapia ↗</a>
        </div>
      </div>
      <p class="fc-desc">[Description paragraphs]</p>
      <div class="fc-meta">[Key-value metadata pairs]</div>
      <div class="fc-tags">[Tag badges]</div>
      <div class="assessment">[Damage % bars]</div>
      <div class="fc-sources">[Source links]</div>
    </div>
    <div class="fc-imagery">
      <div class="fc-dual-maps">
        <!-- Context mini-map (CartoDB Dark Matter, zoom 10) -->
        <!-- Detail mini-map (Esri satellite, zoom 15) -->
      </div>
    </div>
  </div>
</div>
```

### Scenario Card
```html
<div class="scenario-card [worst|likely|best]">
  <div class="sc-label [class]">// LABEL</div>
  <div class="sc-title">TITLE</div>
  <div class="sc-prob [class]">Timeline / Probability</div>
  <p class="sc-desc">Description paragraph</p>
</div>
```

### Think Tank Card
```html
<div class="tt-card">
  <div class="tt-name">[Name]</div>
  <div class="tt-url"><a href="[URL]" target="_blank">[domain]</a></div>
  <div class="tt-assessment">[Key quote or finding]</div>
  <div class="tt-relevance">Relevance: [HIGH|MEDIUM]</div>
</div>
```

### Equipment Card (Weapons §07)
```html
<div class="equip-card" id="equip-[slug]">
  <div class="equip-img-wrap">
    <img src="[URL]" alt="[NAME]" loading="lazy">
  </div>
  <div class="equip-body">
    <div class="equip-name">[SYSTEM NAME]</div>
    <div class="equip-desc">[Description]</div>
    <div class="equip-specs">
      <div class="spec-row"><span class="spec-label">RANGE</span><span class="spec-val">[value]</span></div>
      <div class="spec-row"><span class="spec-label">PAYLOAD</span><span class="spec-val">[value]</span></div>
      <div class="spec-row"><span class="spec-label">GUIDANCE</span><span class="spec-val">[value]</span></div>
      <div class="spec-row"><span class="spec-label">TARGETS</span><span class="spec-val">[value]</span></div>
    </div>
  </div>
</div>
```

---

## Map Configuration Patterns

### Overview / Theater Map
```javascript
// CartoDB Dark Matter
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO', maxZoom: 19
});
```

### Coastal / Island Detail Map
```javascript
// CartoDB Voyager — better land/sea contrast for coastal operations
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors © CARTO', maxZoom: 19
});
```

### Context Mini-Map (facility cards, target cards)
```javascript
// CartoDB Dark Matter, zoom 10, disabled interactions
const ctxMap = L.map(el, { zoomControl: false, dragging: false,
                            scrollWheelZoom: false, doubleClickZoom: false });
ctxMap.setView([lat, lng], 10);
```

### Satellite Detail Mini-Map
```javascript
// Esri World Imagery, zoom 15
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© Esri', maxZoom: 19
});
```

---

## Updating an Existing Section

1. Identify the section by its `data-section` number and `data-title`
2. Read only that section — from opening `<section>` to closing `</section>`
3. Modify the content inside
4. Update `data-last-updated` on the section tag to today's ISO date
5. Update `<span class="sb-date">UPDATED YYYY-MM-DD</span>` to match
6. Write back only the modified section — do not touch other sections

---

## Navigation Configuration

Hub pages appear in `assets/nav-config.json`:

```json
{
  "label": "IRAN CONFLICT",
  "dropdown": true,
  "items": [
    { "label": "War Analysis",     "href": "/pages/iran-war-analysis.html",  "icon": "swords" },
    { "label": "Nuclear Deep Dive","href": "/pages/nuclear-deep-dive.html",  "icon": "atom"   }
  ]
}
```

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| `< 1280px` | 3-col grids → 2-col |
| `< 1024px` | Narrower 2-col grids → 1-col |
| `< 768px` | All grids → 1-col; section badges hidden; map `min-height: 300px` |
| `< 480px` | Hero font sizes reduce ~15–20%; stat cards stack vertically |

---

## Future: Admin Section Editor

The `data-section` and `data-title` attributes support a future admin interface that:
1. Lists all sections in a hub page as a selectable menu
2. Allows editors to pick a section for AI-assisted update
3. Replaces only the selected section's HTML and sets `data-last-updated` to today
4. Leaves all other sections untouched
