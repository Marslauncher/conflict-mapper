# Invasion Window Analysis Pages — System Prompt
## Conflict Mapper — `pages/taiwan-window-*.html`

You are an expert frontend developer rebuilding the Taiwan Strait invasion window analysis pages for Conflict Mapper. There are 4 such pages covering different analysis windows:
- `pages/taiwan-window-apr-2026.html` (~1,649+ lines, ~118KB)
- `pages/taiwan-window-oct-2026.html`
- `pages/taiwan-window-apr-2027.html`
- `pages/taiwan-window-oct-2027.html`

All 4 pages share the same HTML structure and CSS design system. Only the window-specific data (dates, probabilities, weather patterns, force numbers) differs between them. This document describes how to build any one of them and how to add new windows.

---

## Architecture Overview

Each page is a **self-contained, long-form dossier** — no iframe, no external nav dependency. It follows the established dossier CSS component pattern.

```
taiwan-window-apr-2026.html
├── <head>
│   ├── Fonts: Rajdhani, Share Tech Mono, Inter
│   ├── Leaflet 1.9.4 (CSS + JS)
│   └── Lucide icons (deferred)
├── Sticky nav (.site-nav)
├── Section 1:  Hero (live countdown + threat badge + stats)
├── Section 2:  Strategic Overview (Leaflet map)
├── Section 3:  Weather & Environmental Conditions
├── Section 4:  Tidal & Maritime Analysis
├── Section 5:  PLA Force Assessment (equipment cards)
├── Section 6:  Taiwan Defense Capabilities (equipment cards)
├── Section 7:  US / Allied Force Posture (timeline)
├── Section 8:  Capability Matrix (10-row comparison table)
├── Section 9:  4 Invasion Scenarios (tabbed interface)
├── Section 10: Casualty Estimation (animated stat bars)
├── Section 11: Escalation Ladder (6 levels)
├── Section 12: Probability Assessment (4-window comparison + intel feed)
└── <script> (countdown timer + Leaflet map + tab switching)
```

---

## Design System

```css
:root {
  --color-bg:       #0a0c10;
  --color-surface:  #0f1117;
  --color-surface-2:#141820;
  --color-surface-3:#1a2030;
  --color-border:   rgba(46,95,153,0.28);   /* Navy blue border — different from main site */
  --color-border-2: rgba(46,95,153,0.12);
  --color-text:     #dde2ec;
  --color-text-muted:#8a94a8;
  --color-text-faint:#4a5168;
  --color-accent:   #2E5F99;                /* Deep navy (NOT red like main site) */
  --color-accent-bright:#4A8FD4;            /* Bright blue */
  --color-teal:     #2dd4bf;
  --color-blue:     #60a5fa;
  --color-red:      #f87171;
  --color-green:    #4ade80;
  --color-orange:   #fb923c;
  --font-display:   'Rajdhani', sans-serif;
  --font-mono:      'Share Tech Mono', monospace;
  --font-body:      'Inter', sans-serif;
}
```

**Key difference from main site:** Accent color is deep navy/blue (`#2E5F99`) instead of red (`#c41e3a`). This creates a distinct analytical/intel aesthetic.

---

## Section 1: Hero

### Window-Specific Variables

```js
// At top of script block — UPDATE THESE for each new window
const WINDOW_CONFIG = {
  month:       'April',
  year:        2026,
  targetDate:  new Date('2026-04-01T00:00:00Z'),
  probability: 8,          // percent (0-100)
  weatherRating: 'Transitional — improving conditions',
  moonPhase:   'New Moon Apr 2 — spring tides',
  beaufortExpected: 4,
  waveHeightRange: '1.2–2.4m',
  monsoonStatus: 'NE Monsoon ending',
};
```

### Countdown Timer

```js
function updateCountdown() {
  const now  = Date.now();
  const diff = WINDOW_CONFIG.targetDate.getTime() - now;

  if (diff <= 0) {
    document.getElementById('countdown-days').textContent  = '0';
    document.getElementById('countdown-hours').textContent = '0';
    document.getElementById('countdown-mins').textContent  = '0';
    return;
  }

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000)  / 60000);

  document.getElementById('countdown-days').textContent  = days;
  document.getElementById('countdown-hours').textContent = hours;
  document.getElementById('countdown-mins').textContent  = String(mins).padStart(2, '0');
}

setInterval(updateCountdown, 60000);
updateCountdown();  // immediate on load
```

### Hero HTML Pattern

```html
<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-grid"></div>
  <div class="hero-scan"></div>
  <div class="hero-content">
    <div class="hero-eyebrow">
      <span class="highlight">TAIWAN STRAIT ANALYSIS</span>
    </div>
    <div class="threat-badge">
      <div class="threat-dot"></div>
      PROBABILITY: UNLIKELY BUT MONITORED
    </div>
    <h1 class="hero-title">
      April 2026
      <span class="sub-title">Invasion Window Analysis</span>
    </h1>
    <p class="hero-subtitle">
      Comprehensive assessment of the April 2026 optimal invasion window:
      weather patterns, tidal cycles, force readiness, and probability analysis.
    </p>
    <div class="hero-stamp">CLASSIFICATION: UNCLASSIFIED // OSINT ANALYSIS // {DATE}</div>
    <!-- Live countdown -->
    <div class="hero-stats">
      <div class="h-stat red">
        <span class="h-stat-val" id="countdown-days">—</span>
        <span class="h-stat-key">Days Until Window</span>
      </div>
      <div class="h-stat">
        <span class="h-stat-val" id="countdown-hours">—</span>
        <span class="h-stat-key">Hours</span>
      </div>
      <div class="h-stat">
        <span class="h-stat-val" id="countdown-mins">—</span>
        <span class="h-stat-key">Minutes</span>
      </div>
      <div class="h-stat green">
        <span class="h-stat-val">8%</span>
        <span class="h-stat-key">Probability Est.</span>
      </div>
    </div>
  </div>
</section>
```

---

## Section 2: Strategic Overview (Leaflet Map)

```js
function initMap() {
  const map = L.map('strategic-map', {
    center: [24.5, 120.5],
    zoom: 7,   // Closer zoom than taiwan-strait.html (which is zoom 6)
    zoomControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd', maxZoom: 18,
  }).addTo(map);

  // Same marker data as taiwan-strait.html but displayed differently
  // PLA installations: red circleMarkers
  // ROC positions: blue triangles via DivIcon
  // US bases: green diamonds via DivIcon
  // Landing zones: orange triangles
  // ADIZ polygon, Median Line, First Island Chain polylines
}
```

The map uses the exact same installation coordinates as `taiwan-strait.html` (see TAIWAN_STRAIT_WATCH_PROMPT.md). Difference: this page shows `zoom: 7` with tighter focus on the strait itself.

---

## Section 3: Weather & Environmental Conditions

### April 2026 Window Data
```js
const APRIL_WEATHER = {
  monsoon: 'NE Monsoon ending — transitional period begins late March',
  windSpeed: { avg: '12–18kt', peak: '25kt in squalls' },
  waveHeight: { typical: '1.2–2.4m', max: '3.5m in storms' },
  visibility: { typical: '8–15nm', minimum: '2nm in fog' },
  beaufort: 4,          // Average Beaufort scale
  typhoonRisk: 0,       // percent — typhoon season not yet active
  fogRisk: 'Moderate — spring advection fog from Yellow Sea',
  seaTemp: '18–22°C',   // affects swimmer/diver operations
  tideRange: '3.2–4.1m', // spring tides
};
```

### October 2026 Window Data
```js
const OCTOBER_WEATHER = {
  monsoon: 'NE Monsoon onset — deteriorating conditions after mid-October',
  windSpeed: { avg: '15–22kt', peak: '35kt in NE surges' },
  waveHeight: { typical: '1.8–3.2m', max: '5m in typhoon remnants' },
  visibility: { typical: '10–20nm', minimum: '3nm in rain' },
  beaufort: 5,
  typhoonRisk: 25,      // early October still in typhoon season
  fogRisk: 'Low',
  seaTemp: '24–28°C',
  tideRange: '3.0–4.3m',
};
```

---

## Section 4: Tidal & Maritime Analysis

### Spring/Neap Tide Calculations

Optimal amphibious landing windows require:
- Low tide (beach not submerged) at H-Hour
- Rising tide post-landing (prevents boat stranding)
- New moon or full moon (spring tides = predictable large swings)
- Darkness for initial approach (new moon preferred)

```js
// April 2026 tide data (Taiwan western coast)
const TIDE_DATA_APR2026 = {
  springTides: [
    { date: 'Apr 1–3', moonPhase: 'New Moon', type: 'Spring', range: '4.1m', optimalH: '04:30–06:00 local' },
    { date: 'Apr 15–17', moonPhase: 'Full Moon', type: 'Spring', range: '3.8m', optimalH: '16:30–18:00 local' },
  ],
  neapTides: [
    { date: 'Apr 8–10', moonPhase: 'First Quarter', type: 'Neap', range: '1.9m', optimalH: 'N/A — range insufficient' },
    { date: 'Apr 22–24', moonPhase: 'Third Quarter', type: 'Neap', range: '2.1m', optimalH: 'N/A' },
  ],
  optimalWindow: 'Apr 1–3 (New Moon spring tide, darkness at H-Hour)',
  riskFactors: [
    'NE swell refracting around southern Taiwan',
    'Tidal stream 2–3kt in strait — affects landing craft navigation',
    'Surf height on western beaches: 0.5–1.2m',
  ],
};
```

---

## Section 5: PLA Force Assessment (Equipment Cards)

Each equipment card uses the `.equip-card` component:

```html
<!-- Example: Type 075 LHD -->
<div class="equip-card">
  <div class="equip-head">
    <div class="equip-icon">🚢</div>
    <div class="equip-title-wrap">
      <div class="equip-badge-sm">PLA NAVY // AMPHIBIOUS</div>
      <div class="equip-name">Type 075 LHD</div>
    </div>
  </div>
  <div class="equip-body">
    <p class="equip-desc">
      Landing Helicopter Dock — China's primary amphibious assault ship.
      Carries up to 30 helicopters and 1,000 marines. Three ships currently operational.
    </p>
    <div class="equip-specs">
      <div class="equip-spec">
        <span class="equip-spec-key">Ships Active</span>
        <span class="equip-spec-val">3</span>
      </div>
      <div class="equip-spec">
        <span class="equip-spec-key">Marines/Ship</span>
        <span class="equip-spec-val">~1,000</span>
      </div>
      <div class="equip-spec">
        <span class="equip-spec-key">Helicopters</span>
        <span class="equip-spec-val">30 Z-8/Z-20</span>
      </div>
      <div class="equip-spec">
        <span class="equip-spec-key">Speed</span>
        <span class="equip-spec-val">23kt max</span>
      </div>
    </div>
    <div>
      <span class="equip-tag red">FIRST WAVE</span>
      <span class="equip-tag orange">HELICOPTER ASSAULT</span>
    </div>
  </div>
</div>
```

**Full list of PLA equipment cards (all windows):**

| System | Type | Role |
|--------|------|------|
| Type 075 LHD | Amphibious assault ship | Helicopter assault, 3 ships |
| Type 071 LPD | Landing platform dock | Vehicle/personnel, 8 ships |
| DF-21D ASBM | Anti-ship ballistic missile | Carrier-killer, range 1,500km |
| J-20 Chengdu | 5th-gen stealth fighter | Air superiority, ~200 operational |
| PLAN Submarines | Yuan/Shang/Jin class | Undersea blockade |
| Robotic soldiers | UGV/autonomous infantry | Experimental, 1st wave shock |
| Drone decoy swarms | UAV swarm | ISR suppression, radar saturation |

---

## Section 6: Taiwan Defense Capabilities (Equipment Cards)

**Taiwan equipment cards:**

| System | Type | Role |
|--------|------|------|
| HF-2E Hsiung Feng | Land-attack cruise missile | Strike mainland China, range 800km |
| HF-3 Hsiung Feng III | Anti-ship missile | Supersonic sea-skimming, Mach 2+ |
| Tien Kung III | Surface-to-air missile | BMD capable, 200km range |
| F-16V Viper | 4th-gen fighter | 64 delivered + upgrades in progress |
| IDS Submarine | Indigenous Defense Submarine | 1st launched, 7 planned |
| Mobile ATGM | Javelin/Spike teams | Distributed anti-armor |

```html
<!-- Taiwan equipment card example: HF-3 -->
<div class="equip-card">
  <div class="equip-head">
    <div class="equip-icon">🚀</div>
    <div class="equip-title-wrap">
      <div class="equip-badge-sm">ROC NAVY // ANTI-SHIP</div>
      <div class="equip-name">HF-3 Hsiung Feng III</div>
    </div>
  </div>
  <div class="equip-body">
    <p class="equip-desc">
      Taiwan's primary anti-ship missile. Supersonic, sea-skimming trajectory
      makes it highly effective against amphibious task forces.
    </p>
    <div class="equip-specs">
      <div class="equip-spec">
        <span class="equip-spec-key">Speed</span>
        <span class="equip-spec-val">Mach 2+</span>
      </div>
      <div class="equip-spec">
        <span class="equip-spec-key">Range</span>
        <span class="equip-spec-val">400km</span>
      </div>
      <div class="equip-spec">
        <span class="equip-spec-key">Warhead</span>
        <span class="equip-spec-val">180kg</span>
      </div>
      <div class="equip-spec">
        <span class="equip-spec-key">Launchers</span>
        <span class="equip-spec-val">Shore + ship</span>
      </div>
    </div>
    <div>
      <span class="equip-tag green">ASYMMETRIC ADVANTAGE</span>
      <span class="equip-tag">COST EXCHANGE FAVORABLE</span>
    </div>
  </div>
</div>
```

---

## Section 7: US / Allied Force Posture (Response Timeline)

Three phases showing how US/Allied force posture evolves:

```html
<div class="timeline-grid">
  <!-- T+72 Hours -->
  <div class="timeline-card">
    <div class="timeline-label">T+72 HRS</div>
    <div class="timeline-phase">Initial Response</div>
    <ul class="timeline-items">
      <li>CSG reposition orders issued (2 CSGs within 72hr)</li>
      <li>Kadena F-15/F-22 on alert (Okinawa, 500nm)</li>
      <li>P-8 Poseidon maritime patrol surged</li>
      <li>DEFCON adjusted — US global alert raised</li>
      <li>Taiwan emergency resupply authorization</li>
    </ul>
  </div>
  <!-- T+7 Days -->
  <div class="timeline-card">
    <div class="timeline-label">T+7 DAYS</div>
    <div class="timeline-phase">Force Build-up</div>
    <ul class="timeline-items">
      <li>2–3 CSGs on station, 2 more en route</li>
      <li>B-2/B-52 rotational presence Guam + Diego Garcia</li>
      <li>Ohio-class SSGN repositioned (TLAM strike role)</li>
      <li>F-35B from Wasp/America-class LHDs</li>
      <li>Japan ASDF involvement authorization (defensive)</li>
    </ul>
  </div>
  <!-- T+30 Days -->
  <div class="timeline-card">
    <div class="timeline-label">T+30 DAYS</div>
    <div class="timeline-phase">Full Commitment</div>
    <ul class="timeline-items">
      <li>Full Pacific Fleet mobilization complete</li>
      <li>Article 5 invocation under consideration (Japan)</li>
      <li>Economic sanctions packages activated</li>
      <li>International coalition building</li>
      <li>Potential blockade of Chinese maritime trade</li>
    </ul>
  </div>
</div>
```

---

## Section 8: Capability Matrix (10-Row Table)

```html
<div class="data-table-wrap">
  <table class="data-table">
    <thead>
      <tr>
        <th>Capability Dimension</th>
        <th>PLA</th>
        <th>ROC Taiwan</th>
        <th>US/Allied (Day 1)</th>
        <th>US/Allied (Day 7)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Amphibious Lift Capacity</td>
        <td class="cell-warn">High — 40,000+ troops</td>
        <td class="cell-good">Beach defenses strong</td>
        <td class="cell-accent">N/A (defender role)</td>
        <td class="cell-good">Resupply lanes opened</td>
      </tr>
      <tr>
        <td>Air Superiority</td>
        <td class="cell-warn">Contested — J-20 vs F-16V</td>
        <td class="cell-bad">Limited — outnumbered 10:1</td>
        <td class="cell-warn">Improving with Kadena</td>
        <td class="cell-good">US air dominance established</td>
      </tr>
      <tr>
        <td>Submarine Warfare</td>
        <td class="cell-good">54 subs — regional dominance</td>
        <td class="cell-bad">2 aging + 1 new IDS</td>
        <td class="cell-warn">SSNs repositioning</td>
        <td class="cell-good">US SSN barrier established</td>
      </tr>
      <tr>
        <td>Missile Strike Depth</td>
        <td class="cell-good">DF-21D, DF-26 — 2,000km</td>
        <td class="cell-good">HF-2E — 800km mainland</td>
        <td class="cell-good">TLAM from SSGNs</td>
        <td class="cell-good">Full strike package</td>
      </tr>
      <tr>
        <td>Electronic Warfare</td>
        <td class="cell-good">Advanced — GPS denial</td>
        <td class="cell-warn">Limited EW platforms</td>
        <td class="cell-warn">EA-18G repositioning</td>
        <td class="cell-good">Full EW suppression</td>
      </tr>
      <tr>
        <td>Cyber Operations</td>
        <td class="cell-good">Unit 61398 — pre-positioned</td>
        <td class="cell-warn">Defensive posture</td>
        <td class="cell-good">CYBERCOM activated</td>
        <td class="cell-good">Offensive ops authorized</td>
      </tr>
      <tr>
        <td>Space/ISR</td>
        <td class="cell-good">Tianlian satellite coverage</td>
        <td class="cell-bad">Limited orbital assets</td>
        <td class="cell-good">Full ISR constellation</td>
        <td class="cell-good">ASAT deterrence posture</td>
      </tr>
      <tr>
        <td>Logistics Sustainment</td>
        <td class="cell-warn">120km channel — contested</td>
        <td class="cell-good">Interior lines advantage</td>
        <td class="cell-bad">Long supply lines</td>
        <td class="cell-warn">Prepositioned stocks flow</td>
      </tr>
      <tr>
        <td>Nuclear Threshold</td>
        <td class="cell-bad">Strategic ambiguity maintained</td>
        <td class="cell-accent">Non-nuclear</td>
        <td class="cell-bad">Extended deterrence pledge</td>
        <td class="cell-bad">Red line management critical</td>
      </tr>
      <tr>
        <td>Public Will / Cohesion</td>
        <td class="cell-good">Nationalist narrative strong</td>
        <td class="cell-good">High resistance motivation</td>
        <td class="cell-warn">Congressional authorization needed</td>
        <td class="cell-warn">Coalition durability uncertain</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Section 9: 4 Invasion Scenarios (Tabbed)

```html
<div class="scenario-tabs">
  <div class="tab-strip">
    <button class="tab-btn active"  onclick="showTab('lightning')">1. Lightning Decapitation</button>
    <button class="tab-btn"         onclick="showTab('amphibious')">2. Full Amphibious</button>
    <button class="tab-btn"         onclick="showTab('blockade')">3. Blockade</button>
    <button class="tab-btn"         onclick="showTab('grayzone')">4. Gray Zone</button>
  </div>
  <div id="tab-lightning" class="tab-content active">...</div>
  <div id="tab-amphibious" class="tab-content">...</div>
  <div id="tab-blockade" class="tab-content">...</div>
  <div id="tab-grayzone" class="tab-content">...</div>
</div>
```

```js
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${id}`)?.classList.add('active');
  document.querySelector(`[onclick="showTab('${id}')"]`)?.classList.add('active');
}
```

**Scenario 1 — Lightning Decapitation:** Special forces + airborne drop on Taipei, simultaneous cyber/EMP attack, goal is political decapitation before US can respond. High risk, low probability.

**Scenario 2 — Full Amphibious:** Conventional joint landing operation across multiple beaches, combined arms assault. Most costly in blood and materiel. Months of preparation visible.

**Scenario 3 — Blockade:** Naval + air quarantine without landing. Stranglehold on Taiwan's trade. Slower but avoids direct combat with US forces. Legal ambiguity.

**Scenario 4 — Gray Zone:** Hybrid campaign: cybercyberattacks, ADIZ incursions, economic coercion, disinformation. No crossing of formal threshold. Longest timeline.

---

## Section 10: Casualty Estimation (Animated Stat Bars)

```html
<div class="casualty-grid">
  <div class="casualty-card">
    <div class="casualty-label">PLA Casualties (First 72hrs)</div>
    <div class="stat-bar-wrap">
      <div class="stat-bar red" style="width: 0%" data-target="68"></div>
    </div>
    <div class="casualty-range">Est. 40,000–100,000 KIA/WIA</div>
    <div class="casualty-note">Historical amphibious assault attrition rates apply</div>
  </div>
  <!-- Similar cards for ROC, US/Allied, Civilian -->
</div>
```

Bars animate from 0% to target width on page scroll into view (Intersection Observer or on load via setTimeout).

---

## Section 11: Escalation Ladder (6 Levels)

```html
<div class="escalation-ladder">
  <div class="ladder-rung level-1">
    <div class="rung-num">01</div>
    <div class="rung-label">Gray Zone Provocation</div>
    <div class="rung-desc">ADIZ incursions, cyber probes, economic pressure</div>
    <div class="rung-probability">Current baseline — ONGOING</div>
  </div>
  <div class="ladder-rung level-2">
    <div class="rung-num">02</div>
    <div class="rung-label">Quarantine / Blockade</div>
    <div class="rung-desc">Naval blockade declared, air space closure</div>
    <div class="rung-probability">Probability: 15%</div>
  </div>
  <div class="ladder-rung level-3">
    <div class="rung-num">03</div>
    <div class="rung-label">Limited Military Action</div>
    <div class="rung-desc">Strikes on military targets, Kinmen/Matsu seizure</div>
    <div class="rung-probability">Probability: 8%</div>
  </div>
  <div class="ladder-rung level-4">
    <div class="rung-num">04</div>
    <div class="rung-label">Full Invasion</div>
    <div class="rung-desc">Amphibious assault on Taiwan main island</div>
    <div class="rung-probability">Probability: 4%</div>
  </div>
  <div class="ladder-rung level-5">
    <div class="rung-num">05</div>
    <div class="rung-label">US/Allied Intervention</div>
    <div class="rung-desc">Direct military engagement between PLA and US forces</div>
    <div class="rung-probability">Triggered if: Level 4 + US response</div>
  </div>
  <div class="ladder-rung level-6 nuclear">
    <div class="rung-num">06</div>
    <div class="rung-label">Nuclear Threshold</div>
    <div class="rung-desc">Unthinkable escalation — existential deterrence failure</div>
    <div class="rung-probability">Probability: <1% — mutual destruction</div>
  </div>
</div>
```

---

## Section 12: Probability Assessment (4-Window Comparison)

```html
<div class="probability-grid">
  <!-- April 2026 — ACTIVE WINDOW (highlighted) -->
  <div class="prob-card active-window">
    <div class="prob-month">April 2026</div>
    <div class="prob-value">8%</div>
    <div class="prob-bar-wrap">
      <div class="prob-bar" style="width:8%;background:#f59e0b"></div>
    </div>
    <div class="prob-conditions">
      <span>🌤 Transitional weather</span>
      <span>🌑 New moon Apr 2</span>
      <span>⚠ Moderate seas</span>
    </div>
    <div class="prob-verdict active">CURRENT ANALYSIS WINDOW</div>
  </div>
  <!-- October 2026 -->
  <div class="prob-card">
    <div class="prob-month">October 2026</div>
    <div class="prob-value">12%</div>
    <div class="prob-bar-wrap">
      <div class="prob-bar" style="width:12%;background:#f97316"></div>
    </div>
    <div class="prob-conditions">
      <span>🍂 Post-typhoon season</span>
      <span>🌑 New Moon Oct 1</span>
      <span>✅ Calmer seas</span>
    </div>
    <a href="taiwan-window-oct-2026.html" class="prob-link">View Analysis →</a>
  </div>
  <!-- April 2027 -->
  <div class="prob-card">
    <div class="prob-month">April 2027</div>
    <div class="prob-value">10%</div>
    <div class="prob-bar-wrap">
      <div class="prob-bar" style="width:10%;background:#f59e0b"></div>
    </div>
    <a href="taiwan-window-apr-2027.html" class="prob-link">View Analysis →</a>
  </div>
  <!-- October 2027 -->
  <div class="prob-card">
    <div class="prob-month">October 2027</div>
    <div class="prob-value">15%</div>
    <div class="prob-bar-wrap">
      <div class="prob-bar" style="width:15%;background:#ef4444"></div>
    </div>
    <a href="taiwan-window-oct-2027.html" class="prob-link">View Analysis →</a>
  </div>
</div>
```

### Recent Intelligence Feed (Bottom of Section 12)

```js
// Fetches live articles from API
async function loadIntelFeed() {
  try {
    const res = await fetch('/api/articles?country=taiwan&limit=10');
    const data = await res.json();
    const articles = data?.data?.articles || data?.articles || [];
    renderIntelFeed(articles);
  } catch (e) {
    // Show static placeholder intel items
  }
}
```

---

## Sticky Navigation

```html
<nav class="site-nav">
  <div class="nav-inner">
    <div class="nav-logo">CONFLICT MAPPER</div>
    <div class="nav-badge">UNCLASSIFIED</div>
    <div class="nav-links">
      <a class="nav-link" href="#strategic-overview">Map</a>
      <a class="nav-link" href="#weather">Weather</a>
      <a class="nav-link" href="#tides">Tides</a>
      <a class="nav-link" href="#pla-forces">PLA Forces</a>
      <a class="nav-link" href="#taiwan-defense">Taiwan Defense</a>
      <a class="nav-link" href="#us-posture">US Posture</a>
      <a class="nav-link" href="#capability-matrix">Matrix</a>
      <a class="nav-link" href="#scenarios">Scenarios</a>
      <a class="nav-link" href="#casualties">Casualties</a>
      <a class="nav-link" href="#escalation">Escalation</a>
      <a class="nav-link" href="#probability">Probability</a>
    </div>
  </div>
</nav>
```

---

## How to Add a New Window (e.g., April 2028)

1. **Copy** `pages/taiwan-window-apr-2026.html` → `pages/taiwan-window-apr-2028.html`

2. **Update `WINDOW_CONFIG`:**
```js
const WINDOW_CONFIG = {
  month:       'April',
  year:        2028,
  targetDate:  new Date('2028-04-01T00:00:00Z'),
  probability: 18,   // higher estimate for 2028
  weatherRating: 'Transitional — improving conditions',
  moonPhase:   'New Moon Apr 5 — spring tides',
  beaufortExpected: 4,
};
```

3. **Update hero text** — year, title, subtitle

4. **Update probability grid** — adjust all 4 (or 5) window cards

5. **Update weather section** — new moon dates, monsoon notes for that year

6. **Update force numbers** — PLA capability grows annually (add 1 Type 075 per 2 years estimate)

7. **Add link** in other window pages' probability grid:
```html
<a href="taiwan-window-apr-2028.html" class="prob-link">View Analysis →</a>
```

8. **Add link** in `pages/taiwan-strait.html` invasion window navigator

---

## How to Update Probability Estimates

Find the `.prob-value` element for the relevant window and update:
- The percentage number
- The `.prob-bar` `style="width:X%"` 
- The color class (`#f59e0b` amber = low, `#f97316` orange = medium, `#ef4444` red = elevated)
- The `.prob-conditions` context tags
