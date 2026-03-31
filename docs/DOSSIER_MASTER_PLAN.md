# GEOPOLITICAL INTELLIGENCE PLATFORM v2 — MASTER PRODUCTION PLAN
## Country Dossiers + Theater/Domain Analysis
### Build System for: Geopolitical Report Analysis Webpage

---

## 📋 SCOPE OVERVIEW

### Series A — Country Dossiers (10 total)
Individual country military/political intelligence profiles.
One `.html` per country. China complete ✅

### Series B — Theater/Domain Dossiers (8 total)
Operational theater analysis including all-country capability matrices.
One `.html` per theater. Cross-references Series A dossiers.

**Total deliverables: 18 HTML files** (1 complete, 17 remaining)

---

## SERIES A — COUNTRY DOSSIERS

| # | Country | Flag | Accent Color | Accent Bright | Special Section (§08) | Status |
|---|---|---|---|---|---|---|
| A-01 | **China (PRC)** | 🇨🇳 | `#c41e3a` | `#ff4466` | Amphibious & Island Denial | ✅ COMPLETE |
| A-02 | **Taiwan (ROC)** | 🇹🇼 | `#003F87` | `#1a6fd9` | Fortress Taiwan / Porcupine Strategy | ⏳ Queue |
| A-03 | **Ukraine** | 🇺🇦 | `#005bbb` | `#1a7de8` | Drone Warfare & Adaptive Defense | ⏳ Queue |
| A-04 | **Europe/NATO** | 🇪🇺 | `#003399` | `#1a55cc` | Collective Defense & Article 5 | ⏳ Queue |
| A-05 | **Russia** | 🇷🇺 | `#cc0000` | `#ff3333` | Electronic Warfare & Hybrid Warfare | ⏳ Queue |
| A-06 | **North Korea (DPRK)** | 🇰🇵 | `#aa1111` | `#dd2222` | WMD Delivery & Unconventional Forces | ⏳ Queue |
| A-07 | **Iran** | 🇮🇷 | `#009B77` | `#00cc88` | Proxy Network & UAV Swarm | ⏳ Queue |
| A-08 | **India** | 🇮🇳 | `#FF9933` | `#ffb347` | Space & BMD / Two-Front Doctrine | ⏳ Queue |
| A-09 | **Pakistan** | 🇵🇰 | `#01411C` | `#016b2e` | Nuclear Deterrence & Asymmetric | ⏳ Queue |
| A-10 | **Israel** | 🇮🇱 | `#003d91` | `#1a5fd9` | Intelligence, Cyber & Precision Strike | ⏳ Queue |
| A-11 | **USA** | 🇺🇸 | `#002868` | `#1a4ba8` | Full-Spectrum Dominance & Power Projection | ⏳ Queue |

> Note: A-04 NATO treated as a collective dossier covering the 32-member alliance with spotlight on Germany, UK, France, Poland, and Baltic States as primary contributors.

---

## SERIES B — THEATER / DOMAIN DOSSIERS

Each theater dossier contains:
1. Strategic overview & geography (maps + terrain analysis)
2. Historical context & precedents
3. Current force disposition (all relevant countries)
4. Per-country capability matrix table
5. Key terrain / chokepoints / strategic nodes
6. Likely flashpoints & triggers (tabbed risk scenarios)
7. Logistics & sustainment considerations
8. Projected escalation pathways
9. Wild cards & X-factors
10. Cross-links to relevant country dossiers (Series A)

| # | Theater/Domain | Accent | Relevant Countries | Status |
|---|---|---|---|---|
| B-01 | **Arctic / Antarctica** | `#00b4d8` (ice blue) | Russia, USA, NATO (Norway, Canada, Denmark), China | ⏳ Queue |
| B-02 | **Eastern Europe** | `#f4a261` (amber) | Russia, Ukraine, NATO, Belarus | ⏳ Queue |
| B-03 | **Middle East** | `#e9c46a` (desert gold) | Iran, Israel, USA, Saudi Arabia/GCC context | ⏳ Queue |
| B-04 | **Asia-Pacific** | `#2ec4b6` (Pacific teal) | China, Taiwan, USA, India, North Korea, Japan context | ⏳ Queue |
| B-05 | **Africa** | `#e76f51` (savanna orange) | USA, China, Russia (Wagner/Africa Corps), France context | ⏳ Queue |
| B-06 | **Pacific** | `#0077b6` (deep ocean) | USA, China, Australia context, Japan context | ⏳ Queue |
| B-07 | **Space Domain** | `#7b2d8b` (deep space violet) | USA, China, Russia, India, + commercial actors | ⏳ Queue |
| B-08 | **Cyber & Asymmetric** | `#00f5d4` (cyber teal) | All 10 countries + non-state actors | ⏳ Queue |

---

## PER-THEATER COUNTRY CAPABILITY MATRIX

Each theater dossier includes a capability matrix comparing all relevant nations. Template:

```html
<!-- Per-theater country capability table -->
<table class="data-table">
  <thead>
    <tr>
      <th>Country</th>
      <th>Force Available</th>
      <th>Basing / Access</th>
      <th>Key Systems</th>
      <th>Logistic Range</th>
      <th>Nuclear Option</th>
      <th>Overall Rating</th>
      <th>Ref</th>
    </tr>
  </thead>
  <tbody>
    <!-- One row per country -->
    <!-- Rating: ██████░░░░ (filled bar via CSS) -->
  </tbody>
</table>
```

Column definitions:
- **Force Available**: Units/platforms that can realistically operate in this theater
- **Basing / Access**: Existing bases, agreements, port access, or transit rights
- **Key Systems**: 2-3 most impactful weapons for this specific theater
- **Logistic Range**: Sustainment distance from home territory (days of high-intensity ops)
- **Nuclear Option**: Tactical nuclear relevance to this theater (Yes/No/Limited)
- **Overall Rating**: 1-10 composite score (sourced from RAND, CSIS wargame assessments)

---

## THEATER-SPECIFIC SECTION STRUCTURE (Series B)

### Standard 12-Section Layout

```
01  section#theater-map         Geographic Overview & Strategic Map
02  section#theater-context     Strategic Context & Why This Theater Matters
03  section#theater-history     Historical Precedent & Lessons
04  section#theater-forces      Current Force Disposition (all countries)
05  section#theater-matrix      Country Capability Matrix
06  section#theater-chokepoints Key Terrain, Chokepoints & Strategic Nodes
07  section#theater-flashpoints Flashpoints & Trigger Events
08  section#theater-logistics   Logistics, Sustainment & Supply Lines
09  section#theater-escalation  Escalation Pathways (conventional → nuclear)
10  section#theater-wildcards   Wild Cards & X-Factors
11  section#theater-assessment  Assessment & Probability Analysis
12  section#theater-sources     Primary Sources
```

---

## PRODUCTION QUEUE — RECOMMENDED BUILD ORDER

### Tier 1 — Highest Urgency (Build First)

| Priority | Item | Rationale |
|---|---|---|
| 1 | **A-05 Russia** | Direct peer threat; most active conflict actor |
| 2 | **A-03 Ukraine** | Active war theater; daily relevance |
| 3 | **B-02 Eastern Europe** | Combines Russia/Ukraine/NATO into operational context |
| 4 | **A-11 USA** | Baseline for all "vs. peer" comparisons |
| 5 | **A-04 NATO/Europe** | Collective defense context for Eastern Europe theater |

### Tier 2 — Near-Term Flashpoints

| Priority | Item | Rationale |
|---|---|---|
| 6 | **A-02 Taiwan** | Highest probability near-term peer conflict |
| 7 | **B-04 Asia-Pacific** | Taiwan Strait, Korean Peninsula, SCS combined |
| 8 | **A-06 North Korea** | Nuclear escalation risk; DPRK troops in Ukraine |
| 9 | **A-07 Iran** | Proxy network active across 3 theaters |
| 10 | **B-03 Middle East** | Iran/Israel + US force presence theater |

### Tier 3 — Strategic Context

| Priority | Item | Rationale |
|---|---|---|
| 11 | **A-10 Israel** | Active conflict + nuclear ambiguity |
| 12 | **A-08 India** | Two-front nuclear state; SCO member |
| 13 | **A-09 Pakistan** | Nuclear peer of India; China client state |
| 14 | **B-06 Pacific** | US-China oceanic competition |
| 15 | **B-01 Arctic** | Russia's "new frontier"; climate-unlocked |

### Tier 4 — Emerging Domains

| Priority | Item | Rationale |
|---|---|---|
| 16 | **B-07 Space** | Rapidly militarizing; ASAT; GPS dependency |
| 17 | **B-08 Cyber & Asymmetric** | All-country cross-domain; underpins every other theater |
| 18 | **B-05 Africa** | Proxy competition; China/Russia resource access |

---

## DESIGN SYSTEM EXTENSIONS FOR SERIES B

### Theater Color Coding
Each theater has a distinct accent to visually differentiate from country dossiers:

```css
/* Series B — Theater Accent Colors */
--theater-arctic:       #00b4d8;  /* ice blue */
--theater-eastern-eu:   #f4a261;  /* amber */
--theater-mideast:      #e9c46a;  /* desert gold */
--theater-asia:         #2ec4b6;  /* Pacific teal */
--theater-africa:       #e76f51;  /* savanna orange */
--theater-pacific:      #0077b6;  /* deep ocean */
--theater-space:        #7b2d8b;  /* deep space violet */
--theater-cyber:        #00f5d4;  /* cyber teal */
```

### Cross-Reference Link Component
Each theater dossier links back to relevant country dossiers:
```html
<div class="xref-links">
  <span class="xref-label">SEE ALSO:</span>
  <a href="../china-dossier/china-dossier.html" class="xref-chip">
    🇨🇳 China Dossier →
  </a>
  <!-- one chip per relevant country -->
</div>
```

### Country Flag Chips (for matrix rows)
```html
<span class="flag-chip">
  <span class="flag-emoji">🇷🇺</span>
  <span class="flag-name">Russia</span>
</span>
```

---

## FOLDER STRUCTURE FOR v2 PLATFORM

```
geopolitical-platform/
├── index.html                    ← v2 homepage / navigation hub
│
├── countries/
│   ├── china-dossier.html        ✅ COMPLETE
│   ├── taiwan-dossier.html
│   ├── ukraine-dossier.html
│   ├── nato-dossier.html
│   ├── russia-dossier.html
│   ├── north-korea-dossier.html
│   ├── iran-dossier.html
│   ├── india-dossier.html
│   ├── pakistan-dossier.html
│   ├── israel-dossier.html
│   └── usa-dossier.html
│
├── theaters/
│   ├── arctic-theater.html
│   ├── eastern-europe-theater.html
│   ├── middle-east-theater.html
│   ├── asia-pacific-theater.html
│   ├── africa-theater.html
│   ├── pacific-theater.html
│   ├── space-domain.html
│   └── cyber-asymmetric.html
│
└── assets/
    ├── shared-styles.css         ← Common tokens (optional if self-contained)
    └── logo.svg
```

---

## SERIES B — THEATER SECTION CONTENT REQUIREMENTS

### B-01 Arctic / Antarctica
- **Countries to compare:** Russia, USA, Canada, Norway, Denmark/Greenland, China (observer)
- **Key systems per country:**
  - Russia: Northern Fleet, Borei SSBN, Arctic Brigade, MiG-31 Foxhound, Poseidon drone torpedo, Bastion P coastal defense
  - USA: Alaska Command JBER, F-35A, Virginia-class SSN, THAAD at Fort Greely, Icebreaker gap
  - NATO: Norwegian F-35, HiMARS forward deployment, GIUK Gap ASW
  - China: Polar Silk Road initiative, Xuelong 2 research vessel, Snow Eagle Station
- **Chokepoints:** GIUK Gap, Bering Strait, Northwest Passage, Svalbard, Greenland-Iceland-UK Gap
- **Flashpoints:** Russian Arctic militarization, NATO Article 5 in the Arctic, Svalbard sovereignty, Canadian Northwest Passage dispute

### B-02 Eastern Europe
- **Countries:** Russia, Ukraine, Belarus, NATO (Poland, Baltics, Romania, Germany, UK)
- **Key systems:** Ukrainian drone corps, Russian Iskander-M, HIMARS, Patriot PAC-3, F-16 in Ukraine, Polish Abrams/K2, Suwalki Gap vulnerability
- **Chokepoints:** Suwalki Corridor (65km NATO land link to Baltics), Kaliningrad, Dnieper River line, Zaporizhzhia
- **Flashpoints:** Escalation in Ukraine → Article 5, Russian attack on Baltic states, Kaliningrad blockade

### B-03 Middle East
- **Countries:** Iran, Israel, USA (CENTCOM), Saudi Arabia/UAE (context), Hezbollah/Houthis (non-state)
- **Key systems:** Iranian Shahed drones, Fateh-110 SRBM, Israeli Iron Dome/Arrow 3/David's Sling, F-35I Adir, US carrier in 5th Fleet AOR, B-52 deterrence patrols
- **Chokepoints:** Strait of Hormuz, Bab al-Mandeb, Suez Canal
- **Flashpoints:** Iran nuclear program, Israeli strike on Iran, Houthi Red Sea interdiction, Hezbollah northern front

### B-04 Asia-Pacific
- **Countries:** China, Taiwan, USA (INDOPACOM), North Korea, India, Japan (context), South Korea (context), Australia (context)
- **Key systems:** DF-21D/DF-26 ASBM, Taiwan Patriot/HF-2 anti-ship, US carrier strike groups, F-35B USMC, HIMARS on islands, SM-6 naval intercept
- **Chokepoints:** Taiwan Strait (180km), Luzon Strait, Miyako Strait, Malacca Strait, Tsushima Strait
- **Flashpoints:** PLA Taiwan invasion timeline, DPRK ICBM test response, SCS island clash

### B-05 Africa
- **Countries (external actors):** USA (AFRICOM), China, Russia (Africa Corps/Wagner successor), France
- **Key systems:** US drone bases (Djibouti, Niger), Chinese PLA Navy base Djibouti, Russian Air Force in Mali/CAR/Libya, French Operation Barkhane remnants
- **Chokepoints:** Strait of Bab al-Mandeb, Cape of Good Hope, Suez approach
- **Flashpoints:** Wagner successor expansion, Chinese basing expansion, US AFRICOM drawdown

### B-06 Pacific (Oceanic)
- **Countries:** USA (INDOPACOM/7th Fleet), China (PLA Navy), Australia, Japan (context)
- **Key systems:** Ford-class carrier, Virginia-class SSN, AUKUS nuclear submarines (2030+), PLA Navy Type 055, DF-26 Guam killer range
- **Chokepoints:** Guam (second island chain anchor), Pearl Harbor, SLOC to Australia, Philippine Sea
- **Flashpoints:** Guam strike threat, Australian AUKUS submarine delivery timeline, second island chain A2/AD

### B-07 Space Domain
- **Countries:** USA (USSF), China (PLA SSF Space Systems Dept), Russia (VKS), India (DSA), + commercial (SpaceX, OneWeb)
- **Key systems:** USA — GPS III, X-37B, GBI interceptor, SBIRS; China — Shijian-17 co-orbital ASAT, DN-3 DA-ASAT, BeiDou; Russia — Nudol DA-ASAT, Kosmos co-orbital, Peresvet laser; India — A-SAT (Mission Shakti)
- **Chokepoints:** GEO belt congestion, LEO Starshield dependency, GPS signal denial, SBIRS missile warning
- **Flashpoints:** Chinese ASAT on GPS constellation, Russian EW against Starlink, space debris cascade (Kessler syndrome)

### B-08 Cyber & Asymmetric
- **Countries:** All 10 + non-state actors (Hezbollah, Houthis, Wagner, private ransomware groups)
- **Key systems:**
  - USA: NSA TAO / Cyber Command, Stuxnet legacy, Volt Typhoon attribution
  - China: APT41, APT40, PLA Unit 61398/61486, Typhoon series (Volt, Salt, Flax)
  - Russia: GRU Sandworm, SVR Cozy Bear, FSB Fancy Bear, NotPetya, election interference
  - North Korea: Lazarus Group, AppleJeus, $3B+ crypto theft
  - Iran: APT33/35, Shamoon, attacks on Saudi Aramco
  - Israel: Unit 8200, Stuxnet co-development, NSO Group Pegasus
- **Chokepoints:** Undersea cable nodes, power grid SCADA, financial SWIFT network, GPS/PNT infrastructure
- **Asymmetric vectors:** Drone swarms, proxy forces, lawfare, economic coercion, information warfare, social media manipulation

---

## V2 HOMEPAGE REQUIREMENTS

The `index.html` serves as the command center for the full platform:

### Required Sections
1. **Hero** — "GEOPOLITICAL INTELLIGENCE PLATFORM" with world map visual, current date, threat level indicator
2. **Country Dossiers Grid** — 10 country cards with flag, name, status badge, threat level pill, and link
3. **Theater Analysis Grid** — 8 theater cards with geographic scope, status badge, and link
4. **Threat Dashboard** (optional v2.1) — live conflict intensity tracker per theater
5. **Intelligence Feed** — links to latest RAND/CSIS/DoD publications
6. **Classification Notice** — open-source methodology disclaimer

### Navigation System
- Sticky top nav with two dropdowns: "Country Dossiers" and "Theater Analysis"
- Active page highlight based on URL hash
- Mobile: hamburger → full-screen overlay nav with same two categories

---

## SESSION-TO-SESSION MEMORY AIDS

When starting a new country or theater dossier, provide this context block:

```
BUILDING: [COUNTRY/THEATER NAME] Dossier
SERIES: [A or B]
ITEM NUMBER: [e.g., A-05]
ACCENT_COLOR: [hex]
ACCENT_BRIGHT: [hex]
PLATFORM: Geopolitical Intelligence Platform v2
CHINA DOSSIER REFERENCE: ~/china-dossier/china-dossier.html (complete ✅)
TEMPLATE: ~/china-dossier/COUNTRY_DOSSIER_TEMPLATE.md
THIS PLAN: ~/china-dossier/DOSSIER_MASTER_PLAN.md
```

---

## ESTIMATED BUILD TIME PER ITEM

| Type | Complexity | Approx. Session Time |
|---|---|---|
| Country dossier (standard, with source file) | High | 1 session |
| Country dossier (no source file, full research) | Very High | 1-2 sessions |
| NATO collective dossier | Very High | 2 sessions |
| Theater dossier (standard) | High | 1 session |
| Theater dossier with full capability matrix | Very High | 1-2 sessions |
| B-08 Cyber/Asymmetric (unique structure) | Very High | 2 sessions |
| v2 Homepage | Medium | 1 session |

**Total estimated sessions:** ~20-25 (can be parallelized with Perplexity Computer)

---

*Master Plan v1.0 | Created March 28, 2026*
*Platform: Geopolitical Intelligence Platform v2*
*Status: 1/18 dossiers complete (China ✅)*
