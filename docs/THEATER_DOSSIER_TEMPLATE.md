# THEATER / DOMAIN DOSSIER — PRODUCTION WORKFLOW & TEMPLATE
## Series B: Operational Theater Analysis
### Companion to: COUNTRY_DOSSIER_TEMPLATE.md

---

## PHASE 1 — THEATER INTAKE & RESEARCH

### Step 1.1 — Define Theater Scope
Fill these variables before any research:
```
THEATER_NAME:         [e.g., Eastern Europe Theater]
THEATER_SLUG:         [e.g., eastern-europe] (for file names)
THEATER_ACCENT:       [e.g., #f4a261]
THEATER_FLAG_EMOJI:   [e.g., ⚔️ or regional symbol]
COUNTRIES_RELEVANT:   [comma-separated list]
PRIMARY_FLASHPOINT:   [one sentence: the most likely trigger event]
CLASSIFICATION_DATE:  [e.g., March 2026]
```

### Step 1.2 — Parallel Image Searches
Run these search batches for theater dossiers:

**Batch A — Geography**
- `"[THEATER REGION] satellite map military"`
- `"[KEY CHOKEPOINT] strategic geography"` (e.g., Taiwan Strait, GIUK Gap, Strait of Hormuz)
- `"[REGION] terrain map topography military"`

**Batch B — Force Disposition**
- `"[COUNTRY1] military [THEATER REGION] deployment"` (one per major power)
- `"[COUNTRY2] military [THEATER REGION] bases"`
- `"[REGION] military exercises [YEAR]"`

**Batch C — Key Systems per Theater**
- Search for 1-2 most distinctive weapons per theater (Iskander in Eastern Europe, DF-21D in Pacific, etc.)
- `"[SYSTEM NAME] deployment [REGION]"`

**Batch D — Flashpoints**
- `"[FLASHPOINT EVENT] [YEAR] latest"`
- `"[REGION] conflict analysis [YEAR]"`

### Step 1.3 — Country Data Collection
For each relevant country, pull from completed Series A dossiers OR search:
- Active forces deployable to this theater (not total force)
- Existing basing rights / forward presence
- 2-3 most relevant weapons systems for this specific geography
- Logistic sustainment range in days at high-intensity ops

---

## PHASE 2 — HTML STRUCTURE (Series B)

### Section IDs
```
section#theater-map          01 Geographic Overview
section#theater-context      02 Strategic Context
section#theater-history      03 Historical Precedent
section#theater-forces       04 Force Disposition
section#theater-matrix       05 Country Capability Matrix
section#theater-chokepoints  06 Key Terrain & Chokepoints
section#theater-flashpoints  07 Flashpoints & Triggers
section#theater-logistics    08 Logistics & Sustainment
section#theater-escalation   09 Escalation Pathways
section#theater-wildcards    10 Wild Cards
section#theater-assessment   11 Assessment
section#theater-sources      12 Sources
```

### Hero Design Variant (Series B)
Theater dossiers use a different hero than country dossiers:
- No flag emoji — use a compass/map icon or theater-specific SVG
- Title format: `[THEATER NAME] // OPERATIONAL THEATER ANALYSIS`
- Subtitle: `Multi-actor capability assessment & conflict scenario analysis`
- Hero stats (5): Area km², Countries with forces present, Nuclear actors, Active conflict Y/N, Threat level (1-10)

---

## PHASE 3 — UNIQUE COMPONENTS (Series B Only)

### 3A — Country Capability Matrix Row
```html
<tr class="matrix-row">
  <td class="matrix-country">
    <span class="flag-chip">
      <span class="flag-emoji">[FLAG]</span>
      <a href="../countries/[slug]-dossier.html" class="flag-name" target="_blank">[COUNTRY]</a>
    </span>
  </td>
  <td>[UNITS/PLATFORMS AVAILABLE]</td>
  <td>[BASES / ACCESS RIGHTS]</td>
  <td>[KEY SYSTEM 1], [KEY SYSTEM 2]</td>
  <td>[DAYS SUSTAINMENT]</td>
  <td class="[nuclear-yes|nuclear-limited|nuclear-no]">[YES/LIMITED/NO]</td>
  <td>
    <div class="rating-bar">
      <div class="rating-fill" style="width:[N*10]%"></div>
      <span class="rating-num">[N]/10</span>
    </div>
  </td>
  <td><a href="[SOURCE]" target="_blank" rel="noopener">→</a></td>
</tr>
```

### 3B — Chokepoint Card
```html
<div class="chokepoint-card">
  <div class="chokepoint-img-wrap">
    <img src="[MAP/SATELLITE URL]" alt="[ALT]" width="400" height="300" loading="lazy"
      onclick="openLightbox(this.src,'[CAPTION]')">
    <div class="chokepoint-badge">[CHOKEPOINT TYPE: STRAIT / PASS / CORRIDOR]</div>
  </div>
  <div class="chokepoint-body">
    <div class="chokepoint-name">[CHOKEPOINT NAME]</div>
    <div class="chokepoint-width">[WIDTH/LENGTH]</div>
    <div class="chokepoint-desc">[Strategic significance, 2-3 sentences]</div>
    <div class="chokepoint-controllers">
      <span class="ctrl-label">CONTROLLING POWER:</span>
      <span class="ctrl-val">[COUNTRY/COUNTRIES]</span>
    </div>
    <div class="chokepoint-risk">
      <span class="risk-label">INTERDICTION RISK:</span>
      <span class="risk-val risk-[high|med|low]">[HIGH/MEDIUM/LOW]</span>
    </div>
  </div>
</div>
```

### 3C — Escalation Ladder
```html
<div class="escalation-ladder">
  <div class="esc-rung esc-level-[1-6]">
    <div class="esc-level-num">LEVEL [N]</div>
    <div class="esc-level-name">[LEVEL NAME: e.g., CONVENTIONAL THRESHOLD]</div>
    <div class="esc-level-desc">[Description of escalation step]</div>
    <div class="esc-level-actors">[Which countries involved at this level]</div>
    <div class="esc-level-trigger">[What triggers ascent to next level]</div>
  </div>
</div>
```
Levels: 1=Proxy/Gray Zone → 2=Conventional Limited → 3=Conventional Major → 4=Theater Nuclear → 5=Strategic Nuclear → 6=Civilization-Ending

### 3D — Cross-Reference Links (to country dossiers)
```html
<div class="xref-links">
  <span class="xref-label">COUNTRY DOSSIERS:</span>
  <a href="../countries/[slug]-dossier.html" class="xref-chip" target="_blank">
    [FLAG] [COUNTRY] →
  </a>
</div>
```

### 3E — Scenario / Flashpoint Tab
Same as country dossier `.tab-btn` / `.tab-pane` system.
Each tab = one specific conflict scenario with:
- Trigger event
- Opening moves (hours 0-72)
- Expected force employment
- International response
- Escalation risk assessment
- RAND/CSIS wargame citation

---

## PHASE 4 — CONTENT STANDARDS (Series B)

### What "Force Available" Means
Only count forces that can realistically be projected to the theater within 30 days:
- **Russia in Eastern Europe**: Full Ground Forces, Air Forces, Baltic/Northern Fleet — nearly 100% applicable
- **USA in Middle East**: 5th Fleet + CENTCOM-assigned forces + rapid reinforcement from CONUS (~7-14 days)
- **China in Pacific**: First Island Chain forces + PLAAF within range — NOT total global force

### Sourcing Requirements for Theater Dossiers
Every theater dossier must cite:
- **RAND wargame study** for the specific theater (search "RAND [theater] wargame [year]")
- **CSIS AsiaPower or equivalent** regional assessment
- **IISS Strategic Survey** regional chapter
- **CRS report** on US force posture in the region
- **Official DoD theater strategy** document (INDOPACOM, EUCOM, CENTCOM, etc.)
- **At least one foreign-language source** (official statements from non-US actors)

### Nuclear Section (Mandatory for All Theaters)
Every theater dossier must include a nuclear weapons section addressing:
- Which countries have nuclear weapons relevant to this theater
- Estimated tactical vs. strategic weapons available
- Declared doctrine (first use, NFU, ambiguous)
- Escalation threshold assessment
- "Broken Arrow" / accident risk factors

---

## SERIES B ACCENT CSS SNIPPET (add to each theater file)

```css
/* Theater-specific accent — replace [HEX] with theater color */
:root {
  --color-accent: [HEX];
  --color-accent-bright: [HEX-BRIGHT];
  --color-border: color-mix(in oklch, var(--color-accent) 25%, transparent);
}
.highlight { color: var(--color-accent); }
.stat-fill, .rating-fill { background: var(--color-accent); }
.nav-link.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }
.section-num { color: var(--color-accent); }
.equip-badge, .chokepoint-badge { background: color-mix(in oklch, var(--color-accent) 15%, transparent); color: var(--color-accent); }
```

---

## CYBER / ASYMMETRIC DOSSIER SPECIAL STRUCTURE (B-08)

This theater has a fundamentally different structure since it has no geographic boundary.

```
01  section#cyber-overview      Domain Overview (no geographic map — use network diagram)
02  section#cyber-actors        Key State Actors
03  section#cyber-matrix        All-Country Capability Matrix
04  section#cyber-apt           Known APT Groups & Operations
05  section#cyber-infrastructure Critical Infrastructure Targets
06  section#cyber-financial     Financial System Vulnerabilities
07  section#cyber-information   Information Warfare & Influence Ops
08  section#cyber-uav           Drone / Autonomous Systems (asymmetric)
09  section#cyber-proxy         Proxy Forces & Non-State Actors
10  section#cyber-law           Legal/Attribution & Rules of Engagement
11  section#cyber-scenarios     Crisis Scenarios
12  section#cyber-sources       Sources
```

Country color chips in the capability matrix use the same accent colors as Series A dossiers.

---

## SPACE DOMAIN SPECIAL STRUCTURE (B-07)

```
01  section#space-overview      Domain Overview + orbital map concept
02  section#space-actors        Key State & Commercial Actors
03  section#space-matrix        Capability Matrix (all countries)
04  section#space-assets        Critical Space Assets (GPS, comms, ISR, early warning)
05  section#space-asat          ASAT Capabilities (DA, co-orbital, EW, laser)
06  section#space-commercial    Commercial Sector (SpaceX, OneWeb, Amazon Kuiper)
07  section#space-law           Space Law & Norms (Outer Space Treaty, COPUOS)
08  section#space-scenarios     Conflict Scenarios (Pearl Harbor in space, debris cascade)
09  section#space-dependencies  Terrestrial Dependencies on Space Systems
10  section#space-resilience    Resilience & Alternatives
11  section#space-assessment    Assessment
12  section#space-sources       Sources
```

---

*Theater Template v1.0 | March 2026*
*Part of Geopolitical Intelligence Platform v2 Build System*
