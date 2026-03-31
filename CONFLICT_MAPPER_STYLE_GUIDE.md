# CONFLICT MAPPER — SITE STYLE & SYSTEM PROMPT GUIDE
## Open-Source Geopolitical Intelligence Platform
### Version 2.0 | March 2026

---

## 📋 OVERVIEW

**Conflict Mapper** is a self-hostable, open-source geopolitical intelligence platform. It serves as a unified shell around standalone country dossiers (Series A) and theater/domain analysis reports (Series B). The site is designed for maximum information density with a dark military aesthetic.

**Live URL (planned):** www.conflictmapper.com
**License:** Open-source (community self-host)

---

## 🏗️ ARCHITECTURE

### Site Structure
```
conflict-mapper/
├── index.html                    ← Unified shell (nav, iframe host, admin, welcome)
├── server.js                     ← Express static server (optional, works with any file server)
├── package.json
│
├── countries/                    ← Series A: Country Strategic Dossiers
│   ├── china-dossier.html        (A-01) Accent: #c41e3a
│   ├── taiwan-dossier.html       (A-02) Accent: #003F87
│   ├── ukraine-dossier.html      (A-03) Accent: #005bbb
│   ├── nato-dossier.html         (A-04) Accent: #003399
│   ├── russia-dossier.html       (A-05) Accent: #cc0000
│   ├── north-korea-dossier.html  (A-06) Accent: #aa1111
│   ├── iran-dossier.html         (A-07) Accent: #009B77
│   ├── india-dossier.html        (A-08) Accent: #FF9933
│   ├── pakistan-dossier.html      (A-09) Accent: #01411C
│   ├── israel-dossier.html       (A-10) Accent: #003d91
│   └── usa-dossier.html          (A-11) Accent: #002868
│
├── theaters/                     ← Series B: Theater & Domain Dossiers
│   ├── eastern-europe-theater.html   (B-01) Accent: #6B7C3E  Dark olive/khaki
│   ├── asia-pacific-theater.html     (B-02) Accent: #1A3A5C  Deep navy blue
│   ├── middle-east-theater.html      (B-03) Accent: #C8962E  Desert gold
│   ├── arctic-theater.html           (B-04) Accent: #4A9EBF  Ice blue
│   ├── africa-theater.html           (B-05) Accent: #C27B30  Sahara amber
│   ├── space-domain.html             (B-06) Accent: #4B3A7C  Deep space violet
│   └── cyber-asymmetric.html         (B-07) Accent: #00A896  Cyber teal
│
├── assets/
│   ├── nav-config.json           ← Dynamic navigation configuration
│   └── style.css                 ← Shared design tokens
│
└── admin/
    └── admin.html                ← Redirect to integrated admin panel
```

### Embedding Model
- Each dossier/theater HTML file is **fully self-contained** (inline CSS, inline JS, all dependencies via CDN)
- The shell (`index.html`) loads dossiers into a **full-viewport iframe** below the fixed nav
- Dossiers do NOT require modification to work inside the shell — they retain their own nav, styling, and interactivity
- The shell's nav drives iframe content switching
- Navigation state is managed client-side via `nav-config.json` loaded from localStorage or fallback fetch

---

## 🎨 DESIGN SYSTEM

### Color Palette — Dark Military Theme (Default)

| Variable | Dark Mode | Light Mode | Use |
|---|---|---|---|
| `--color-bg` | `#0a0c10` | `#f0f2f5` | Page background |
| `--color-surface` | `#0f1117` | `#ffffff` | Cards, panels, nav |
| `--color-surface-2` | `#141820` | `#f5f6f8` | Elevated cards |
| `--color-surface-3` | `#1a2030` | `#e8eaed` | Deepest insets |
| `--color-border` | `rgba(accent,0.22)` | `rgba(0,0,0,0.12)` | Card borders |
| `--color-border-2` | `rgba(accent,0.10)` | `rgba(0,0,0,0.06)` | Section dividers |
| `--color-text` | `#dde2ec` | `#1a1e2a` | Primary text |
| `--color-text-muted` | `#8a94a8` | `#5a6070` | Secondary text |
| `--color-text-faint` | `#4a5168` | `#9aa0b0` | Tertiary / labels |
| `--color-accent` | Per-dossier | Per-dossier | Primary accent |
| `--color-accent-bright` | Per-dossier | Per-dossier | High-emphasis accent |
| `--color-teal` | `#2dd4bf` | `#2dd4bf` | Status/info |
| `--color-blue` | `#60a5fa` | `#3b82f6` | Links / data |
| `--color-red` | `#f87171` | `#ef4444` | Critical alerts |
| `--color-green` | `#4ade80` | `#22c55e` | Positive status |

### Shell Accent (index.html)
- Primary: `#c41e3a` (Conflict Mapper brand red)
- Used for: logo highlight, active nav items, LIVE badge, welcome page accents
- Each embedded dossier uses its own accent color independently

### Typography

| Font | Stack | Use | CDN |
|---|---|---|---|
| Rajdhani | `'Rajdhani', sans-serif` | Headers, nav items, stat values, labels | Google Fonts |
| Share Tech Mono | `'Share Tech Mono', monospace` | Intel labels, codes, badges, timestamps | Google Fonts |
| Inter | `'Inter', sans-serif` | Body text, descriptions, paragraphs | Google Fonts |

```html
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@300..700&display=swap" rel="stylesheet">
```

### Spacing Scale (4px base)
```css
--space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
--space-4: 1rem;     --space-5: 1.25rem;   --space-6: 1.5rem;
--space-8: 2rem;     --space-10: 2.5rem;   --space-12: 3rem;
--space-16: 4rem;
```

### Responsive Typography
```css
--text-xs:   clamp(.75rem, .7rem + .25vw, .875rem);
--text-sm:   clamp(.875rem, .8rem + .35vw, 1rem);
--text-base: clamp(1rem, .95rem + .25vw, 1.125rem);
--text-lg:   clamp(1.125rem, 1rem + .75vw, 1.5rem);
--text-xl:   clamp(1.5rem, 1.2rem + 1.25vw, 2.25rem);
--text-2xl:  clamp(2rem, 1.2rem + 2.5vw, 3.5rem);
--text-hero: clamp(2.5rem, 1rem + 5vw, 5.5rem);
```

### Border Radius
```css
--radius-sm: .375rem;  --radius-md: .5rem;  --radius-lg: .75rem;
```

---

## 🧩 COMPONENT LIBRARY

### Shell Components (index.html)

#### Fixed Nav Bar (52px height)
```
┌──────────────────────────────────────────────────────────────┐
│ [⊕] CONFLICT MAPPER  | MAP & FEED | GLOBAL | COUNTRIES ▾ | THEATERS ▾ | ⚙ SETTINGS | 🟢 LIVE | ◑ │
└──────────────────────────────────────────────────────────────┘
```
- `nav.cm-nav` — fixed top, full width, backdrop-filter blur
- `.cm-logo` — SVG crosshair + brand text
- `.cm-nav-link` — Rajdhani, 12px, uppercase, letter-spacing .06em
- `.cm-dropdown` — triggered on hover (desktop) / click (mobile)
- `.cm-dropdown-menu` — max-height 80vh, scrollable, 280px wide
- `.cm-dropdown-item` — emoji + label + subtitle layout

#### Dropdown Item Structure
```html
<a class="cm-dropdown-item" onclick="loadContent('path/to/file.html', this)">
  <span class="dropdown-item-emoji">🇨🇳</span>
  <span class="dropdown-item-text">
    <span class="dropdown-item-label">China</span>
    <span class="dropdown-item-sub">Strategic Dossier</span>
  </span>
</a>
```

#### Content Frame
```html
<iframe id="content-iframe" src="" frameborder="0"
  style="width:100%; height:calc(100vh - 52px); border:none;">
</iframe>
```

#### Welcome Hero (shown when no dossier loaded)
- Large "CONFLICT MAPPER" title with crosshair icon
- Stats bar: 11 Country Dossiers | 7 Theater Reports | 18 Intel Reports | Last Updated date
- Country cards grid (5 per row)
- Theater cards grid (responsive)
- Classification notice badge

### Dossier Components (inside each .html file)

All dossier components are documented in `COUNTRY_DOSSIER_TEMPLATE.md` and `THEATER_DOSSIER_TEMPLATE.md`. Key components:

| Component | Class | Use |
|---|---|---|
| Hero Section | `.hero` | Full-viewport hero with stats |
| Equipment Card | `.equip-card` | Weapons system with photo + specs |
| Data Table | `.data-table` | Structured military data |
| Intel Alert | `.intel-alert` | Critical intelligence callout |
| Policy Quote | `.policy-quote` | Official statement with attribution |
| Collapsible | `.collapsible` | Expandable analysis sections |
| Tabs | `.tabs-wrap` + `.tab-btn` + `.tab-pane` | Tabbed content (scenarios, APT groups) |
| Escalation Ladder | `.escalation-ladder` + `.esc-rung` | 6-level escalation pathway |
| Chokepoint Card | `.chokepoint-card` | Geographic chokepoint with photo |
| Capability Matrix | `.data-table` + `.rating-bar` | Multi-country comparison |
| Cross-Reference | `.xref-links` + `.xref-chip` | Links to related dossiers |
| Lightbox | `#lightbox` | Full-screen image viewer |
| Map Container | `.map-container` + `.map-overlay` | Geographic map with overlay caption |

---

## 🔐 ADMIN PANEL

### Access
- Settings button in nav bar → password gate
- Default password: `admin123` (stored in nav-config.json, changeable in admin)
- Session persists via sessionStorage

### Capabilities
1. **Navigation Editor** — Add/edit/remove/reorder nav items and sub-items
2. **Source Selector** — Each nav item targets either a local file path or external URL
3. **Config Export/Import** — Download/upload nav-config.json
4. **Reset to Defaults** — Restore factory navigation configuration
5. **Password Change** — Update admin access code

### Nav Config Schema
```json
{
  "siteName": "CONFLICT MAPPER",
  "siteTagline": "GEOPOLITICAL INTELLIGENCE PLATFORM",
  "password": "admin123",
  "theme": "dark",
  "nav": [
    {
      "label": "Section Name",
      "type": "link|dropdown",
      "target": "path/to/file.html or https://url",
      "icon": "lucide-icon-name",
      "items": [                              // Only for type: "dropdown"
        {
          "label": "🇺🇸 United States",
          "subtitle": "Strategic Dossier",
          "target": "countries/usa-dossier.html"
        }
      ]
    }
  ]
}
```

---

## 🌙 THEME SYSTEM

### Day/Night Mode
- Toggle button in nav bar (top-right, moon/sun icon)
- Preference stored in localStorage as `cm-theme`
- Default: `dark`
- The shell (nav, welcome, admin) responds to the toggle
- Embedded iframe dossiers maintain their own dark theme (self-contained)
- `data-theme="dark|light"` attribute on `<html>` element

### CSS Variables for Theme Switching
```css
[data-theme="dark"] {
  --cm-bg: #0a0c10;
  --cm-surface: #0f1117;
  --cm-text: #dde2ec;
  --cm-text-muted: #8a94a8;
  --cm-border: rgba(196,30,58,0.15);
}
[data-theme="light"] {
  --cm-bg: #f0f2f5;
  --cm-surface: #ffffff;
  --cm-text: #1a1e2a;
  --cm-text-muted: #5a6070;
  --cm-border: rgba(0,0,0,0.08);
}
```

---

## 📐 LAYOUT PRINCIPLES

1. **Full-width utilization** — Minimal margins (8px max on sides), content fills available screen
2. **Compact nav** — 52px fixed header, no wasted vertical space
3. **Seamless iframe** — No visible iframe border, dossier content appears integrated
4. **Mobile responsive** — Hamburger menu on mobile, touch-friendly dropdowns
5. **Print-friendly** — Dossiers can be printed directly from the iframe (each has its own complete styling)

---

## 📝 BUILDING NEW DOSSIERS

### Country Dossier (Series A)
1. Copy the CSS/JS structure from any existing country dossier (e.g., `china-dossier.html`)
2. Fill in `COUNTRY_DOSSIER_TEMPLATE.md` Phase 9 variables
3. Change only `--color-accent` and `--color-accent-bright` in the `:root` block
4. Build all 13 sections per the template
5. Save to `countries/[slug]-dossier.html`
6. Add entry to `nav-config.json` → Country Dossiers dropdown

### Theater Dossier (Series B — Standard)
1. Copy CSS/JS from `middle-east-theater.html` (reference build)
2. Change accent color throughout CSS `:root` block and all rgba() border values
3. Build all 12 standard sections per `THEATER_DOSSIER_TEMPLATE.md`
4. Save to `theaters/[slug]-theater.html`
5. Add entry to `nav-config.json` → Theater Analysis dropdown

### Domain Dossier (Series B — Special: Space, Cyber)
1. Same CSS/JS base as theater dossiers
2. Use modified section IDs per `THEATER_DOSSIER_TEMPLATE.md` special structures
3. Space Domain: `#space-overview` through `#space-sources` (12 sections)
4. Cyber Domain: `#cyber-overview` through `#cyber-sources` (12 sections)

---

## 🔗 CROSS-REFERENCE SYSTEM

Every dossier should include cross-reference chips linking to related dossiers:

```html
<div class="xref-links">
  <span class="xref-label">COUNTRY DOSSIERS:</span>
  <a href="../countries/russia-dossier.html" class="xref-chip" target="_blank">🇷🇺 Russia →</a>
  <a href="../countries/ukraine-dossier.html" class="xref-chip" target="_blank">🇺🇦 Ukraine →</a>
</div>
```

Theater dossiers link to relevant country dossiers. Country dossiers can link to relevant theaters.

---

## 📦 DEPENDENCIES (CDN-only)

| Library | Version | CDN URL | Use |
|---|---|---|---|
| Google Fonts | Latest | `fonts.googleapis.com` | Rajdhani, Share Tech Mono, Inter |
| Lucide Icons | Latest | `unpkg.com/lucide@latest` | UI icons (nav, buttons, equipment links) |

No build tools, no bundlers, no node_modules required for the dossier files. The `server.js` + `express` are optional — the site works from any static file server or even `file://` protocol.

---

## 🚀 DEPLOYMENT OPTIONS

### Option A: Static File Server (simplest)
```bash
cd conflict-mapper/
python3 -m http.server 8080
# or: npx serve .
```

### Option B: Node.js Express (included)
```bash
cd conflict-mapper/
npm install
node server.js
# Runs at http://localhost:5000
```

### Option C: Direct file:// access
Open `index.html` directly in a browser. Config falls back to embedded defaults.

### Option D: Docker (for production)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 5000
CMD ["node", "server.js"]
```

---

## 📋 QUALITY CHECKLIST

Before sharing any dossier file:

- [ ] `<!DOCTYPE html>` present
- [ ] `</html>` and `</body>` tags closed
- [ ] Accent color correctly set (no leftover colors from copied template)
- [ ] All 12/13 sections present with correct IDs
- [ ] Real image URLs (no placeholder images)
- [ ] Lightbox JS working (all images have `onclick="openLightbox()"`)
- [ ] Tab switching JS working
- [ ] Collapsible sections working
- [ ] Scroll-active nav highlighting working
- [ ] Cross-reference chips linking to correct dossier files
- [ ] Source citations with actual URLs (CSIS, RAND, IISS, etc.)
- [ ] File size: 80-170KB (comprehensive content range)
- [ ] Mobile responsive (test at 375px width)

---

## 🗺️ ROADMAP (Planned Features)

### v2.1 — Content Pages
- Map & Feed page (Leaflet map + RSS intelligence feed)
- Global Analysis page (world overview dashboard)
- China/Taiwan Watch page (topical focus page)

### v2.2 — Backend Integration
- RSS feed aggregation (bulk import from settings)
- AI inference configuration (Ollama/OpenAI/Anthropic/Google/Perplexity)
- Force analysis generation (automated dossier updates)

### v2.3 — Enhanced Interactivity
- Live threat level indicators per theater
- Interactive Leaflet maps per dossier
- Search across all dossiers
- Bookmarking and annotations

---

*Style Guide v2.0 | Created March 28, 2026*
*Platform: Conflict Mapper — Geopolitical Intelligence Platform*
*Author: JP Cooke*
