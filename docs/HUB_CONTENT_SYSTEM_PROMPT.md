# HUB CONTENT SYSTEM — MODULAR SECTION ARCHITECTURE
## Conflict Mapper Hub Pages | Reusable Architecture Pattern
### Applies to: iran-war-analysis.html, nuclear-deep-dive.html, taiwan-strait.html, future hub pages

---

## Overview

Hub pages are the deep-dive analysis pages in Conflict Mapper — long-form intelligence briefs covering a single topic in exhaustive detail. Each hub page uses a **modular section architecture** that allows individual sections to be updated independently without touching the rest of the page.

This prompt defines the modular system, how to create new hub pages, and how to update individual sections within existing ones.

---

## Modular Section Architecture

### Core Pattern

Every content section in a hub page follows this structure:

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

### Why Modular?

1. **Per-section updates**: When new intelligence arrives, update just one section without re-reading the entire 2000+ line page
2. **Admin integration**: Future admin panel can display sections as a list, allowing editors to select and update individual modules
3. **Diffing**: `data-last-updated` shows which sections are stale vs recently refreshed
4. **Reordering**: Sections are self-contained — they can be reordered by changing IDs and renumbering
5. **Templates**: New hub pages can be scaffolded by assembling section modules

---

## Required CSS

Every hub page must include this CSS in its `<style>` block:

```css
/* ── MODULAR SECTION SYSTEM ── */
.page-section { position: relative; }
.page-section + .page-section { border-top: 1px solid var(--border); }
.page-section.alt-bg { background: var(--surface); }

/* Section info badge — shows section number and last update date */
.section-badge {
  position: absolute; top: var(--space-4); right: var(--space-6);
  display: flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.08em;
  color: var(--text-faint); z-index: 10;
  background: var(--surface-2); border: 1px solid var(--border);
  padding: 3px 8px; border-radius: var(--radius);
  pointer-events: none;
}
.section-badge .sb-num { color: var(--accent); }
.section-badge .sb-date { color: var(--text-faint); }
```

Mobile responsive rule (inside `@media (max-width: 768px)`):
```css
.section-badge { display: none; }
```

---

## Existing Hub Pages

### 1. Iran War Analysis (`pages/iran-war-analysis.html`)
**Sections:** 15 modular sections
**Accent:** Desert Gold #C8962E / #E8B84B
**Size:** ~2,800 lines / ~190KB

| § | ID | Title | Content Type |
|---|---|---|---|
| 01 | overview | Executive Summary | Text + stat cards + red alert box |
| 02 | timeline | Conflict Chronology | Day-by-day timeline cards |
| 03 | map | Multi-Theater Overview | Leaflet map + base markers |
| 04 | thinktanks | Think Tank Consensus | 17 institution cards with URLs |
| 05 | iran-politics | Post-Decapitation Leadership | Leader cards + scenario tabs |
| 06 | nuclear | Nuclear Stockpile Analysis | Facility status table + breakout chart |
| 07 | weapons | Weapons Systems Analysis | 4-tab system (US/Iran/Israel/Proxy) |
| 08 | losses | Battle Damage Assessment | Dual loss tables with costs |
| 09 | forces | Ground Assault Planning | Force comparison + geography |
| 10 | hormuz | Strait of Hormuz | Leaflet map + chokepoint analysis |
| 11 | lebanon | Lebanon Ground Campaign | Timeline + casualty data |
| 12 | taiwan | Impact on Taiwan Scenario | Munition depletion + deterrence |
| 13 | economy | Global Economic Fallout | Oil prices + GDP + sectoral |
| 14 | outlook | Endgame Analysis | Scenarios + probability ranking |
| 15 | sources | Sources & Citations | 6-column grid, 40+ URLs |

### 2. Nuclear Deep Dive (`pages/nuclear-deep-dive.html`)
**Sections:** 8 modular sections
**Accent:** Ember Red #ff4a1c
**Size:** ~1,780 lines / ~143KB

| § | ID | Title | Content Type |
|---|---|---|---|
| 01 | section-01-map | Nuclear Facilities Theater Map | Leaflet map + clickable popup info cards |
| 02 | section-02-weapons | GBU-57 / MOP | Specs table + penetration chart + images |
| 03 | section-03-hammer | Operation Midnight Hammer | Strike overview + flight profile + force comp |
| 04 | section-04-facilities | Per-Site Facility Analysis | 11 facility cards with dual zoom maps |
| 05 | section-05-timeline | Enrichment Progression Timeline | Chronological + status bars |
| 06 | section-06-scenarios | Nuclear Breakout Scenarios | 3 scenario cards (worst/DOD/admin) |
| 07 | section-07-reconstitution | Program Reconstitution Assessment | Capability bars + TESA bottleneck |
| 08 | section-08-fallout | Radiological & Fallout Considerations | 2×2 grid of analysis cards |

### 3. Taiwan Strait Watch (`pages/taiwan-strait.html`)
**Sections:** 6 modular sections
**Accent:** Teal #29b6f6 / Neon #00ffc8
**Size:** ~1,420 lines / ~95KB

| § | ID | Title | Content Type |
|---|---|---|---|
| 01 | section-01-map | Operational Map | Leaflet map + force positions |
| 02 | section-02-weather | Weather & Sea State | Live conditions + 7-day forecast + Windy embed |
| 03 | section-03-tides | Tide Charts & Landing Windows | SVG tide chart + beach windows |
| 04 | section-04-forces | Force Comparison | PLA vs ROC vs US stat blocks |
| 05 | section-05-assessment | Strategic Assessment | 4 analysis cards |
| 06 | section-06-sidebar | Sidebar Panel | Status + invasion windows + intel feed + xref |

---

## Creating a New Hub Page

### Step 1: Choose the Topic and Accent Color

Each hub page has its own accent color that matches the theater or subject. Examples:
- Middle East / Iran: Desert Gold #C8962E
- Nuclear weapons: Ember Red #ff4a1c
- Taiwan / Pacific: Teal #29b6f6
- Arctic: Ice Blue #4fc3f7
- Cyber: Matrix Green #00ff41

### Step 2: Plan Sections

Before writing any HTML, define every section:
```
§ 01 — [slug] — [title] — [content type]
§ 02 — [slug] — [title] — [content type]
...
```

Common section types used across hubs:
- **Theater Map** — Leaflet map with markers and popups
- **Timeline / Chronology** — Ordered event cards with dates
- **Force Comparison** — Side-by-side stat blocks
- **Weapons / Platforms** — Tabbed specification cards
- **Facility Analysis** — Cards with dual-zoom maps, coords, damage bars
- **Scenario Analysis** — 2–3 color-coded cards (worst/baseline/best)
- **Think Tank / Source Grid** — Institution cards with external links
- **Economic Impact** — Charts, stat bars, sector breakdown
- **Strategic Assessment** — Analysis text in 2-column card grid
- **Sources / Citations** — Multi-column link grid

### Step 3: Scaffold the Page

Use the shared page shell:
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
<!-- Add Leaflet if maps are needed -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
/* CSS variables, modular section CSS, page-specific styles */
</style>
</head>
<body>
<!-- Classification banner -->
<!-- Top nav -->
<!-- Hero section (NOT modular — always section 00) -->
<!-- Modular sections § 01 through § NN -->
<!-- JavaScript at bottom -->
</body>
</html>
```

### Step 4: Build Section by Section

Each section is self-contained. Build and verify one section at a time. Alternate `page-section` and `page-section alt-bg` for visual rhythm.

### Step 5: Wire Up Navigation

The top nav bar links to section anchors. Use the section IDs:
```html
<nav class="nav-links">
  <a href="#section-01-map">MAP</a>
  <a href="#section-02-timeline">TIMELINE</a>
  ...
</nav>
```

---

## Updating an Existing Section

### Single Section Update Workflow

1. **Identify the section** by its `data-section` number and `data-title`
2. **Read only that section** — from the opening `<section>` tag to its closing `</section>`
3. **Modify the content** inside the section
4. **Update `data-last-updated`** on the section tag to today's date
5. **Update the badge date** `<span class="sb-date">UPDATED YYYY-MM-DD</span>`
6. **Write back** only the modified section

### Example: Updating Iran War Timeline

```
Target: data-section="02" data-title="Conflict Chronology"
Action: Add new timeline entry for today's events
Update: data-last-updated="2026-04-01"
Badge: UPDATED 2026-04-01
```

### Bulk Updates

When updating multiple sections at once, update each section's `data-last-updated` and badge independently. Only sections that actually changed should get new dates.

---

## Shared Content Components

### Facility Card (used in Nuclear Deep Dive § 04)
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
      <div class="fc-dual-maps">[Context + Detail Leaflet maps]</div>
      <div class="fc-sat-img">[Satellite imagery]</div>
    </div>
  </div>
</div>
```

### Scenario Card (used in Nuclear Deep Dive § 06)
```html
<div class="scenario-card [worst|likely|best]">
  <div class="sc-label [class]">// LABEL</div>
  <div class="sc-title">TITLE</div>
  <div class="sc-prob [class]">Timeline</div>
  <p class="sc-desc">Description</p>
</div>
```

### Think Tank Card (used in Iran War § 04)
```html
<div class="tt-card">
  <div class="tt-logo">[Institution icon]</div>
  <div class="tt-name">[Name]</div>
  <div class="tt-assessment">[Key quote/finding]</div>
  <a href="[URL]" target="_blank" class="tt-link">Read Analysis ↗</a>
</div>
```

---

## Design Rules (ALL Hub Pages)

### Mandatory
- Dark background: `#0a0c10` or `#0a0b0d`
- Fonts: Rajdhani (display), Share Tech Mono (labels/mono), Inter (body) — Google Fonts CDN
- Icons: Lucide via CDN
- Images: `object-fit: contain` with `max-height` — NEVER `object-fit: cover` with fixed `height`
- Leaflet maps: CartoDB Dark Matter for overview maps, Esri World Imagery for satellite detail maps
- All external links: `target="_blank"`
- Classification banner at top: `ANALYTICAL INTELLIGENCE PRODUCT — OPEN SOURCE COMPILATION — NOT CLASSIFIED`

### Section Alternation
Odd sections: `page-section alt-bg` (slightly lighter background)
Even sections: `page-section` (default background)
This creates visual rhythm without heavy dividers.

### Section Numbering
- Zero-pad to two digits: `01`, `02`, ... `15`
- The hero section is NOT numbered — it exists outside the modular system
- Section numbers appear in: `data-section`, badge `§ XX`, and header `XX // LABEL`

### Responsive
- All grids collapse to single column on mobile (`max-width: 768px`)
- Section badges hidden on mobile
- Maps get `min-height: 300px` on mobile
- Font sizes reduced by ~15% on mobile

---

## Navigation Configuration

Hub pages appear in the main site nav via `assets/nav-config.json`. When a hub page is part of a dropdown group:

```json
{
  "label": "IRAN CONFLICT",
  "dropdown": true,
  "items": [
    { "label": "War Analysis", "href": "/pages/iran-war-analysis.html", "icon": "swords" },
    { "label": "Nuclear Deep Dive", "href": "/pages/nuclear-deep-dive.html", "icon": "atom" }
  ]
}
```

---

## Future: Admin Section Editor

The modular architecture is designed to support a future admin interface where:
1. Admin sees a list of all sections in a hub page (parsed from `data-section` and `data-title` attributes)
2. Admin selects a section to update
3. AI generates updated content for just that section
4. Only the selected section's HTML is replaced; `data-last-updated` is set to today
5. Other sections remain untouched

This is not yet implemented but the data attributes are in place to support it.
