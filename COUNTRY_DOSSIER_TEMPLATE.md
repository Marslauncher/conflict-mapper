# COUNTRY MILITARY DOSSIER — PRODUCTION WORKFLOW & TEMPLATE
## Reusable Intelligence Dossier Build System
### Based on: People's Republic of China Dossier (March 2026)

---

## ⚙️ OVERVIEW

This document captures the exact workflow, tool sequence, HTML structure, CSS design system, and content checklist used to produce the China dossier. Use it verbatim for every subsequent country.

---

## PHASE 1 — INTAKE & RESEARCH

### Step 1.1 — Read Source File
- Use `search_files_v2` with `retrieval_mode: READ` and `context_budget: LONG`
- Extract all existing sections, data tables, key statistics, and equipment names
- Note what is already present vs. what needs to be added (maps, imagery, links)

### Step 1.2 — Parallel Image Searches
Run `search_images` in parallel batches of 3 queries each. For each country collect:

**Batch A — Geography**
- `"[COUNTRY] map satellite view"`
- `"[COUNTRY] [REGION] military bases map"` (e.g., South China Sea, Arctic, Persian Gulf)
- `"[COUNTRY] [geopolitical initiative] map"` (e.g., Belt & Road, CSTO, NSR)

**Batch B — Leadership & Parades**
- `"[COUNTRY LEADER] military review"` (e.g., Putin military review, Kim Jong Un parade)
- `"[COUNTRY] military parade [capital city]"`
- `"[COUNTRY] armed forces [distinctive event]"`

**Batch C — Naval**
- `"[COUNTRY] aircraft carrier / flagship warship"`
- `"[COUNTRY] destroyer / frigate [class name]"`
- `"[COUNTRY] submarine nuclear [class name]"`

**Batch D — Air Force**
- `"[COUNTRY] stealth fighter [designation]"` (e.g., Su-57, F-35, Rafale, J-20)
- `"[COUNTRY] strategic bomber [designation]"` (e.g., Tu-160, B-21, H-6)
- `"[COUNTRY] air defense missile system"` (e.g., S-400, HQ-9, Iron Dome)

**Batch E — Army / Ground Forces**
- `"[COUNTRY] main battle tank [model]"` (e.g., T-14 Armata, Leopard 2, Merkava)
- `"[COUNTRY] artillery rocket system"` (e.g., HIMARS, Iskander, PHL-03)
- `"[COUNTRY] special forces / infantry exercise"`

**Batch F — Missiles / WMD**
- `"[COUNTRY] ICBM / ballistic missile [designation]"` (e.g., RS-28, Hwasong-17)
- `"[COUNTRY] hypersonic missile"` (if applicable)
- `"[COUNTRY] nuclear weapons / warheads"` (imagery of delivery systems, not warheads)

**Batch G — Geopolitical**
- `"[COUNTRY] [alliance/bloc] summit"` (e.g., SCO, NATO, CSTO, Arab League)
- `"[COUNTRY] [territorial dispute] map"` (e.g., Ukraine, Kashmir, Taiwan Strait)
- `"[COUNTRY] [economic initiative] map"` (e.g., Belt & Road, INSTC, NSR)

### Step 1.3 — Web Research (if no source file provided)
Run parallel `search_web` calls:
- `"[COUNTRY] military strength 2026 overview"`
- `"[COUNTRY] defense budget 2025 2026"`
- `"[COUNTRY] nuclear weapons arsenal estimate"`
- `"[COUNTRY] military doctrine strategy"`
- `"[COUNTRY] foreign policy goals [YEAR]"`

---

## PHASE 2 — HTML CONSTRUCTION

### Step 2.1 — File Setup
```bash
mkdir -p ~/[country]-dossier
# Output file: ~/[country]-dossier/[country]-dossier.html
```

### Step 2.2 — HTML Skeleton (13 Sections)
Use this exact section structure, updating IDs and content:

```
01  section#section-map          Geographic Overview
02  section#section-overview     Military Overview (stats, timeline)
03  section#section-ground       Ground Force
04  section#section-navy         Navy
05  section#section-airforce     Air Force
06  section#section-rocket       Missile / Rocket Force
07  section#section-nuclear      Nuclear Posture
08  section#section-special      Special/Asymmetric Capabilities
                                  (amphibious, cyber, SOF, etc. — varies by country)
09  section#section-cyber        Cyber, Space & Information Warfare
10  section#section-doctrine     Military Doctrine
11  section#section-foreign      Foreign Policy & Geopolitical Goals
12  section#section-risk         Risk Assessment & Destabilization Scenarios
13  section#section-sources      Primary Sources
```

> **Adapt Section 08** based on the country's most notable asymmetric/unique capability:
> - Russia: Electronic Warfare & Hybrid Warfare
> - Iran: Proxy Network & UAVs
> - North Korea: WMD Delivery & Unconventional Forces
> - Israel: Intelligence & Cyber (Unit 8200)
> - India: Space & Ballistic Missile Defense

---

## PHASE 3 — DESIGN SYSTEM (COPY VERBATIM)

### Color Palette — Dark Military Theme

| Variable | Value | Use |
|---|---|---|
| `--color-bg` | `#0a0c10` | Page background |
| `--color-surface` | `#0f1117` | Cards, panels |
| `--color-surface-2` | `#141820` | Elevated cards |
| `--color-surface-3` | `#1a2030` | Deepest insets |
| `--color-border` | `rgba(196,30,58,0.25)` | Card borders |
| `--color-border-2` | `rgba(255,200,50,0.18)` | Gold accent borders |
| `--color-text` | `#dde2ec` | Primary text |
| `--color-text-muted` | `#8a94a8` | Secondary text |
| `--color-text-faint` | `#4a5168` | Tertiary / labels |
| `--color-red` | `#c41e3a` | Primary accent |
| `--color-red-bright` | `#ff4466` | High-emphasis accent |
| `--color-gold` | `#ffc832` | Secondary accent |
| `--color-teal` | `#2dd4bf` | Status/info |
| `--color-blue` | `#60a5fa` | Links / data |

> ⚠️ **Per-Country Color Customization:** Only change `--color-red` / `--color-red-bright` to match the country's flag accent color. Keep all backgrounds and text values identical across all dossiers for brand consistency.

| Country | `--color-red` | `--color-red-bright` | Rationale |
|---|---|---|---|
| China | `#c41e3a` | `#ff4466` | PRC red flag |
| Russia | `#cc0000` | `#ff3333` | Russian red |
| North Korea | `#aa1111` | `#dd2222` | DPRK red |
| Iran | `#009B77` | `#00cc88` | Iranian green |
| India | `#FF9933` | `#ffb347` | Indian saffron |
| Israel | `#003d91` | `#1a5fd9` | Israeli blue |
| USA | `#002868` | `#1a4ba8` | US Navy blue |

### Typography

```css
--font-display: 'Rajdhani', sans-serif;   /* Headers, stats, labels */
--font-mono:    'Share Tech Mono', monospace; /* Intel labels, codes */
--font-body:    'Inter', sans-serif;      /* Body text */
```
**Google Fonts CDN (copy verbatim):**
```html
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@300..700&display=swap" rel="stylesheet">
```

### Spacing Scale (4px base, copy verbatim)
```css
--space-1:0.25rem; --space-2:0.5rem; --space-3:0.75rem; --space-4:1rem;
--space-5:1.25rem; --space-6:1.5rem; --space-8:2rem; --space-10:2.5rem;
--space-12:3rem; --space-16:4rem;
```

---

## PHASE 4 — COMPONENT LIBRARY (Reusable HTML Patterns)

### 4A — Hero Section
```html
<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-grid"></div>
  <div class="hero-content">
    <div class="hero-flag">[FLAG EMOJI]</div>
    <div class="hero-eyebrow">CLASSIFIED OPEN-SOURCE ANALYSIS // [MONTH YEAR]</div>
    <h1 class="hero-title"><span class="cn">[NATIVE LANGUAGE NAME]</span><br>[COUNTRY NAME IN CAPS]</h1>
    <p class="hero-subtitle">[SUBTITLE]</p>
    <p class="hero-stamp">[SERVICE BRANCHES LISTED]</p>
    <div class="hero-stats">
      <!-- 5 hero stats: personnel, budget, nukes, carriers, submarines -->
    </div>
    <div class="scroll-cue">...</div>
  </div>
</section>
```

### 4B — Equipment Card
```html
<div class="equip-card">
  <div class="equip-img-wrap">
    <span class="equip-badge">[CATEGORY e.g. ICBM / DESTROYER]</span>
    <img src="[REAL URL FROM search_images]" alt="[ALT TEXT]" width="400" height="250"
      loading="lazy" onclick="openLightbox(this.src,'[CAPTION]')">
  </div>
  <div class="equip-body">
    <div class="equip-name">[SYSTEM NAME]</div>
    <div class="equip-desc">[2-3 sentence description]</div>
    <div class="equip-specs">
      <div class="equip-spec"><span class="equip-spec-key">Range</span><span class="equip-spec-val">[VALUE]</span></div>
      <!-- 3-5 spec rows -->
    </div>
    <a href="[AUTHORITATIVE SOURCE URL]" target="_blank" rel="noopener" class="equip-link">
      [Source Name] <i data-lucide="external-link" style="width:12px;height:12px"></i>
    </a>
  </div>
</div>
```

### 4C — Data Table
```html
<div class="data-table-wrap">
  <table class="data-table">
    <thead><tr><th>System</th><th>Quantity</th><th>Role</th><th>Notes</th><th>Ref</th></tr></thead>
    <tbody>
      <tr><td>[Name]</td><td>[Qty]</td><td>[Role]</td><td>[Notes]</td>
        <td><a href="[URL]" target="_blank" rel="noopener">→</a></td></tr>
    </tbody>
  </table>
</div>
```

### 4D — Policy Quote Block
```html
<div class="policy-quote">
  "[VERBATIM QUOTE]"
  <span class="policy-quote-attr">— [SPEAKER], [OCCASION, DATE] | 
    <a href="[SOURCE URL]" target="_blank" rel="noopener">Source →</a>
  </span>
</div>
```

### 4E — Intel Alert Box
```html
<div class="intel-alert">
  <div class="intel-alert-head">⚠ [ALERT CATEGORY]</div>
  <p>[Alert text. Bold key terms with <strong class="critical">]</strong></p>
</div>
```

### 4F — Timeline Item
```html
<div class="tl-item">
  <div class="tl-dot"></div>
  <div class="tl-year">[YEAR — EVENT LABEL]</div>
  <div class="tl-title">[Event Headline]</div>
  <div class="tl-desc">[2-3 sentence description. Include link.]
    <a href="[URL]" target="_blank" rel="noopener">Source →</a>
  </div>
</div>
```

### 4G — Collapsible Section
```html
<div class="collapsible">
  <div class="collapsible-head" onclick="toggleCollapsible(this)">
    <span>[Section Title]</span>
    <i data-lucide="chevron-down" class="chev" style="width:20px;height:20px"></i>
  </div>
  <div class="collapsible-body">
    [content]
  </div>
</div>
```

### 4H — Inline Image with Caption
```html
<figure class="inline-img">
  <img src="[URL]" alt="[ALT]" width="1200" height="600" loading="lazy"
    onclick="openLightbox(this.src,'[LIGHTBOX CAPTION]')">
  <figcaption>[CAPTION TEXT]</figcaption>
</figure>
```

### 4I — Map Container
```html
<div class="map-container">
  <img class="map-img" src="[URL]" alt="[ALT]" width="800" height="600" loading="lazy"
    onclick="openLightbox(this.src,'[CAPTION]')">
  <div class="map-overlay">
    <div class="map-caption">SATELLITE OVERVIEW // [COUNTRY]</div>
  </div>
</div>
<div class="map-stats-row">
  <div class="map-stat"><span class="map-stat-val">[VALUE]</span><span class="map-stat-key">[LABEL]</span></div>
</div>
```

---

## PHASE 5 — JAVASCRIPT (Copy Verbatim Every Build)

```javascript
document.addEventListener('DOMContentLoaded',()=>{ if(window.lucide) lucide.createIcons(); });

function openLightbox(src,cap){
  document.getElementById('lightbox-img').src=src;
  document.getElementById('lightbox-cap').textContent=cap||'';
  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow='';
}
document.getElementById('lightbox').addEventListener('click',function(e){
  if(e.target===this) closeLightbox();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeLightbox()});

function switchTab(e,id){
  const container=e.target.closest('.section-wrap')||e.target.closest('.container')||document;
  container.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  container.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  e.target.classList.add('active');
  const pane=document.getElementById(id);
  if(pane) pane.classList.add('active');
}

function toggleCollapsible(head){
  head.classList.toggle('open');
  head.nextElementSibling.classList.toggle('open');
}

// Scroll-active nav
const sections=document.querySelectorAll('section[id]');
const navLinks=document.querySelectorAll('.nav-link');
const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const id=e.target.id;
      navLinks.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+id));
    }
  });
},{threshold:0.3,rootMargin:'-60px 0px -40% 0px'});
sections.forEach(s=>observer.observe(s));

// Animate stat bars
const bars=document.querySelectorAll('.stat-fill');
const barObserver=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.style.transition='width 1.2s cubic-bezier(0.16,1,0.3,1)';
      barObserver.unobserve(e.target);
    }
  });
},{threshold:0.5});
bars.forEach(b=>{
  const w=b.style.width; b.style.width='0%';
  barObserver.observe(b);
  setTimeout(()=>{b.style.width=w;},100);
});
```

---

## PHASE 6 — CONTENT REQUIREMENTS PER SECTION

### Section 01 — Geographic Overview
- [ ] Satellite map image (search_images: "[COUNTRY] map satellite view")
- [ ] Regional strategic map (SCS, Arctic, Middle East, etc.)
- [ ] Area, population, land borders, coastline stats
- [ ] Strategic geography analysis paragraph
- [ ] Intel alert box: key strategic constraint or advantage
- [ ] Table: territorial disputes / claims
- [ ] Geopolitical initiative map (BRI, CSTO, NSR, etc.)

### Section 02 — Military Overview
- [ ] Full-width parade/military image
- [ ] Executive summary intel alert box
- [ ] 5 stat bars (service branch breakdown by personnel)
- [ ] Modernization timeline (7-10 milestone events with links)
- [ ] Hero stats: personnel, budget, nuclear warheads, capital ships, submarines

### Section 03 — Ground Force
- [ ] 3+ equipment cards with real photos (MBT, IFV, artillery, helicopter)
- [ ] Full capability table with quantities, roles, references
- [ ] All equipment linked to IISS, GlobalFirepower, Janes, or manufacturer

### Section 04 — Navy
- [ ] Capital ship card (carrier, cruiser, or flagship if no carrier)
- [ ] Primary destroyer/frigate card
- [ ] SSBN/submarine card
- [ ] Amphibious ship card (if applicable)
- [ ] Full fleet order of battle table (VLS cells, quantities, roles)

### Section 05 — Air Force
- [ ] Primary fighter (stealth or 4++ gen) card
- [ ] Strategic bomber card
- [ ] AWACS/ISR card
- [ ] Full aircraft inventory table (qty, role, primary weapon, info link)

### Section 06 — Missile/Rocket Force
- [ ] ICBM card with real photo
- [ ] Most distinctive missile (ASBM, HGV, cruise) card
- [ ] Full missile inventory table (NATO desig, type, range, role, warhead, ref)

### Section 07 — Nuclear Posture
- [ ] Triad breakdown (land/sea/air legs as doctrine cards)
- [ ] Official NFU or nuclear doctrine quote with source link
- [ ] Warhead estimate from DoD/FAS/SIPRI with link
- [ ] SSBN card photo

### Section 08 — Special/Asymmetric Capability
- [ ] Country's most distinctive military innovation (varies — see table above)
- [ ] Equipment photos inline
- [ ] Tactical doctrine explanation
- [ ] Integration with conventional forces

### Section 09 — Cyber, Space & Information
- [ ] Table: domain, capability, assessment, peer equivalent
- [ ] Confirmed cyber incidents with CISA/NCSC links
- [ ] ASAT capability status
- [ ] Electronic warfare systems

### Section 10 — Military Doctrine
- [ ] 6 doctrine cards (core strategy, warfighting concept, A2/AD or equivalent, information warfare, political warfare, space doctrine)
- [ ] Strategic Goals timeline (3 milestone years)
- [ ] Xi/Putin/Kim/etc. military policy quotes with official source links

### Section 11 — Foreign Policy
- [ ] Full-width leadership photo
- [ ] Primary policy quote (verbatim + source link)
- [ ] 6 doctrine cards (primary objective, economic initiative, multilateral leadership, key alliance, regional dominance, technology strategy)
- [ ] 2+ collapsible panels (official statements, key policy frameworks)

### Section 12 — Risk Assessment
- [ ] Intel alert with overall assessment
- [ ] 4 tabbed risk scenarios (primary, secondary, cyber/space, projection)
- [ ] Probability stat bars for primary scenario
- [ ] Force projection trajectory table (current / 2030 / 2035)
- [ ] Links to RAND, CSIS wargame studies

### Section 13 — Sources
- [ ] 3-column grid: US Government / Think Tanks / Official Country Sources
- [ ] Classification notice footer card
- [ ] At minimum: DoD/ODNI report, IISS Military Balance, CSIS missile database, RAND, official government white paper

---

## PHASE 7 — AUTHORITATIVE SOURCE LIBRARY

Use these sources consistently across all dossiers:

| Source | URL | Best For |
|---|---|---|
| DoD China (or country) Military Power Report | defense.gov | Annual assessment |
| IISS Military Balance | iiss.org/publications/the-military-balance/ | Force structure data |
| CSIS Missile Threat Database | missilethreat.csis.org | Every missile system |
| RAND Research | rand.org | Strategic analysis |
| Congressional Research Service | crsreports.congress.gov | Policy/capability summaries |
| SIPRI Military Expenditure | sipri.org | Budget data |
| GlobalFirepower | globalfirepower.com | Equipment quantities |
| Janes Defence | janes.com | Technical specs |
| The War Zone | thedrive.com/the-war-zone | Breaking capability news |
| CISA | cisa.gov | Cyber threat advisories |
| Arms Control Association | armscontrol.org | Nuclear data |
| FAS Nuclear Notebook | fas.org/issues/nuclear-weapons | Warhead counts |
| CSIS AsiaPower / ChinaPower | csis.org/programs/chinapower | Regional assessments |
| ODNI Annual Threat Assessment | odni.gov | Intelligence assessments |
| Naval Technology | naval-technology.com | Ship specifications |
| Air Force Technology | airforce-technology.com | Aircraft specifications |
| Airpower Australia | ausairpower.net | Detailed technical analysis |

---

## PHASE 8 — VALIDATION CHECKLIST

Before `share_files`, verify with bash:

```python
with open('/home/user/[country]-dossier/[country]-dossier.html','r') as f:
    content = f.read()

checks = [
    ('<!DOCTYPE html>', 'DOCTYPE'),
    ('</html>', 'HTML closed'),
    ('</body>', 'Body closed'),
    ('</footer>', 'Footer closed'),
    ('openLightbox', 'Lightbox JS'),
    ('switchTab', 'Tab JS'),
    ('section-map', 'Map section'),
    ('section-nuclear', 'Nuclear section'),
    ('section-doctrine', 'Doctrine section'),
    ('section-risk', 'Risk section'),
    ('pplx-res.cloudinary', 'Real image URLs'),
    ('missilethreat.csis.org', 'CSIS links'),
    ('defense.gov', 'DoD links'),
]
for c,l in checks:
    print(('✅' if c in content else '❌'),l)
print(f'Size: {len(content):,} bytes')
```

**Size target:** 80KB – 150KB for a complete dossier.

---

## PHASE 9 — QUICK-START VARIABLES (Fill These First)

When given a new country, fill in these variables before writing any code:

```
COUNTRY_NAME_EN:        [e.g., Russian Federation]
COUNTRY_NAME_NATIVE:    [e.g., Российская Федерация]
COUNTRY_FLAG_EMOJI:     [e.g., 🇷🇺]
COUNTRY_SLUG:           [e.g., russia] (used for file/folder names)
ACCENT_COLOR:           [e.g., #cc0000]
ACCENT_BRIGHT:          [e.g., #ff3333]
ACTIVE_PERSONNEL:       [e.g., 1.15M]
DEFENSE_BUDGET:         [e.g., $67B official / $86B estimated]
NUCLEAR_WARHEADS:       [e.g., ~5,580 total / 1,588 deployed]
CAPITAL_SHIPS:          [e.g., 1 carrier, 3 battlecruisers]
SUBMARINES:             [e.g., 64 (12 SSBN)]
MILITARY_BRANCHES:      [list all 5-7 service branches]
PRIMARY_DOCTRINE:       [e.g., New Generation Warfare / Gerasimov Doctrine]
PRIMARY_CONCERN:        [e.g., NATO Eastern Flank / Taiwan / Korean Peninsula]
STRATEGIC_GOALS_YEAR1:  [nearest milestone year + goal]
STRATEGIC_GOALS_YEAR2:  [mid-term milestone]
STRATEGIC_GOALS_YEAR3:  [long-term milestone]
LEADER_NAME:            [e.g., Vladimir Putin]
LEADER_TITLE:           [e.g., President / Supreme Leader / General Secretary]
OFFICIAL_SOURCE_URL:    [official defense white paper URL]
```

---

## DELIVERABLE SPEC

- **Format:** Single self-contained `.html` file
- **Output path:** `~/[country-slug]-dossier/[country-slug]-dossier.html`
- **Size:** 80–150KB
- **Dependencies:** Google Fonts CDN (Rajdhani, Share Tech Mono, Inter) + Lucide Icons CDN — no other external libraries required
- **Images:** All `<img>` src values must be real URLs returned by `search_images` tool (pplx-res.cloudinary.com URLs or approved CDN). No placeholder URLs.
- **Links:** All equipment cards, data table rows, and policy quotes must have `target="_blank" rel="noopener"` links to authoritative sources.

---

*Workflow version: 1.0 | Created from China PRC Dossier, March 2026*
*Next country: [TBD — awaiting JP input]*
