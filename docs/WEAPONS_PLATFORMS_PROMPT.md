# WEAPONS PLATFORMS — Build Spec
## `§07 of pages/iran-war-analysis.html`
### Conflict Mapper Hub Page Section

---

## Overview

Section §07 of the Iran War Analysis page is a non-tabbed weapons reference containing **39 equipment cards** across four sequential sub-sections. Each card shows an image, description, and 4 spec rows (range, payload, guidance, targets).

**Section ID:** `section-07-weapons`
**data-section:** `07`
**data-title:** `Weapons Platforms`

---

## Sub-Section Architecture

The four sub-sections render sequentially in the DOM — no tab switching. Each sub-section has its own header and card grid.

```html
<section id="section-07-weapons" class="page-section alt-bg"
         data-section="07"
         data-title="Weapons Platforms"
         data-last-updated="YYYY-MM-DD">
  <div class="section-badge">
    <span class="sb-num">§ 07</span>
    <span class="sb-date">UPDATED YYYY-MM-DD</span>
  </div>
  <div class="section">
    <div class="section-header">
      <span class="section-num">07 // WEAPONS</span>
      <h2 class="section-title">WEAPONS <em>PLATFORMS</em></h2>
    </div>

    <!-- 07-A US/Coalition -->
    <div class="weapons-subsection" id="weapons-07a">
      <div class="ws-header">
        <span class="ws-num">07-A</span>
        <span class="ws-title">US / COALITION ARSENAL</span>
        <span class="ws-count">15 SYSTEMS</span>
      </div>
      <div class="equip-grid"><!-- 15 cards --></div>
    </div>

    <!-- 07-B Israeli -->
    <div class="weapons-subsection" id="weapons-07b">
      <div class="ws-header">
        <span class="ws-num">07-B</span>
        <span class="ws-title">ISRAELI SYSTEMS</span>
        <span class="ws-count">8 SYSTEMS</span>
      </div>
      <div class="equip-grid"><!-- 8 cards --></div>
    </div>

    <!-- 07-C Iranian -->
    <div class="weapons-subsection" id="weapons-07c">
      <div class="ws-header">
        <span class="ws-num">07-C</span>
        <span class="ws-title">IRANIAN ARSENAL</span>
        <span class="ws-count">13 SYSTEMS</span>
      </div>
      <div class="equip-grid"><!-- 13 cards --></div>
    </div>

    <!-- 07-D Proxy -->
    <div class="weapons-subsection" id="weapons-07d">
      <div class="ws-header">
        <span class="ws-num">07-D</span>
        <span class="ws-title">PROXY FORCES</span>
        <span class="ws-count">3 SYSTEMS</span>
      </div>
      <div class="equip-grid"><!-- 3 cards --></div>
    </div>

  </div>
</section>
```

---

## Equipment Card Structure

```html
<div class="equip-card" id="equip-[slug]">
  <div class="equip-img-wrap">
    <img src="[IMAGE_URL]" alt="[SYSTEM NAME]" loading="lazy">
  </div>
  <div class="equip-body">
    <div class="equip-name">[SYSTEM NAME]</div>
    <div class="equip-desc">[1–2 sentence description]</div>
    <div class="equip-specs">
      <div class="spec-row">
        <span class="spec-label">RANGE</span>
        <span class="spec-val">[value]</span>
      </div>
      <div class="spec-row">
        <span class="spec-label">PAYLOAD</span>
        <span class="spec-val">[value]</span>
      </div>
      <div class="spec-row">
        <span class="spec-label">GUIDANCE</span>
        <span class="spec-val">[value]</span>
      </div>
      <div class="spec-row">
        <span class="spec-label">TARGETS</span>
        <span class="spec-val">[value]</span>
      </div>
    </div>
  </div>
</div>
```

---

## CSS

```css
/* Sub-section header */
.weapons-subsection { margin-top: var(--space-10); }
.weapons-subsection:first-child { margin-top: 0; }
.ws-header {
  display: flex; align-items: center; gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-3); border-left: 3px solid var(--accent);
  border-radius: var(--radius); margin-bottom: var(--space-6);
}
.ws-num   { font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent); }
.ws-title { font-family: var(--font-display); font-size: 1rem; font-weight: 600; letter-spacing: 0.08em; }
.ws-count { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-faint); margin-left: auto; }

/* Grid */
.equip-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
@media (max-width: 1024px) { .equip-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .equip-grid { grid-template-columns: 1fr; } }

/* Card */
.equip-card {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
  display: flex; flex-direction: column;
}
.equip-img-wrap {
  width: 100%; aspect-ratio: 16/9;
  background: var(--surface-3); overflow: hidden;
}
.equip-img-wrap img {
  width: 100%; height: 100%;
  object-fit: contain; /* NEVER cover — aircraft shapes must be visible */
}
.equip-body { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
.equip-name { font-family: var(--font-display); font-weight: 700; font-size: 1rem; color: var(--accent); }
.equip-desc { font-size: 0.8rem; color: var(--text-dim); line-height: 1.5; }

/* Specs table */
.equip-specs { margin-top: var(--space-2); border-top: 1px solid var(--border); padding-top: var(--space-2); }
.spec-row { display: flex; justify-content: space-between; align-items: baseline; padding: 3px 0; }
.spec-label {
  font-family: var(--font-mono); font-size: 0.65rem;
  color: var(--text-faint); letter-spacing: 0.05em;
}
.spec-val { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text); text-align: right; }
```

---

## Image Sourcing Guidelines

**Preferred sources (in order):**
1. **Wikimedia Commons** — use `commons.wikimedia.org` direct file URLs; check license (public domain or CC)
2. **defense.gov** — official USAF/USN/USMC imagery; always public domain
3. **Manufacturer press kits** — Lockheed, Boeing, Raytheon, Rafael, etc.
4. **Israeli Air Force / IDF** — idf.il official media

**Rules:**
- Use `loading="lazy"` on all images
- `object-fit: contain` so silhouettes/profiles are visible — never crop with `cover`
- Prefer side-profile or 3/4 shots — they read better at card scale
- If no suitable image exists, use a dark placeholder with the system designation as text — do not use unrelated stock photos

---

## Complete Card Inventory

### §07-A — US/Coalition Arsenal (15 cards)

| id | System | Range | Payload | Guidance | Targets |
|---|---|---|---|---|---|
| equip-b2 | B-2 Spirit | Intercontinental | 18,000 kg (80× Mk 82 or 16× GBU-57) | Inertial + GPS | Hardened bunkers, airfields |
| equip-b52h | B-52H Stratofortress | 14,080 km | 31,500 kg (ALCM, JASSM, gravity bombs) | Mixed | Strategic targets, area suppression |
| equip-f15e | F-15E Strike Eagle | 3,900 km (ferry) | 11,100 kg | INS/GPS/laser | Precision strike, SEAD |
| equip-f35a | F-35A Lightning II | 2,220 km combat | 8,160 kg (internal + external) | Sensor-fused, stealth ingress | Hardened targets, contested airspace |
| equip-fa18ef | F/A-18E/F Super Hornet | 722 km combat | 8,050 kg | GPS/laser/IR | Naval strike, CAS |
| equip-ea18g | EA-18G Growler | 722 km combat | Electronic warfare payload | ALQ-99 jamming pods | SEAD, radar suppression |
| equip-mq9 | MQ-9 Reaper | 1,852 km | 1,700 kg (4× Hellfire + 2× GBU-12) | SAR + EO/IR + laser | ISR + precision strike |
| equip-kc135 | KC-135 Stratotanker | 2,419 km (ferry) | 90,700 kg fuel offload | N/A (tanker) | Aerial refueling |
| equip-e3 | E-3 AWACS | ~8 hrs endurance | None (C2 platform) | AN/APY-2 radar | Airspace management, C2 |
| equip-jdam | JDAM (GBU-31/32/38) | 28 km glide | 900 kg / 450 kg / 225 kg | INS+GPS | Fixed surface targets |
| equip-gbu57 | GBU-57 MOP | Ballistic (gravity) | 2,722 kg penetrating warhead | GPS | Deeply buried hardened facilities |
| equip-jassmer | JASSM-ER (AGM-158B) | 925 km | 450 kg | INS+GPS+IIR terminal | High-value fixed targets |
| equip-tlam | Tomahawk TLAM (BGM-109) | 1,600 km | 450 kg | INS+GPS+TERCOM+DSMAC | Fixed infrastructure, C2 nodes |
| equip-thaad | THAAD | 200 km (terminal) | Hit-to-kill interceptor | X-band radar + IR seeker | Ballistic missiles (terminal phase) |
| equip-patriot | Patriot PAC-3 | 70 km | MSE hit-to-kill + frag | AN/MPQ-65 radar + active RF | TBMs, cruise missiles, aircraft |

**Image URLs:**
```
B-2:         https://upload.wikimedia.org/wikipedia/commons/8/8b/B-2_Spirit_original.jpg
B-52H:       https://upload.wikimedia.org/wikipedia/commons/7/78/B52_exhausts.jpg
F-15E:       https://www.af.mil/[current official image path]
F-35A:       https://upload.wikimedia.org/wikipedia/commons/4/47/F-35A_flight_%282%29.jpg
F/A-18E/F:   https://upload.wikimedia.org/wikipedia/commons/d/d2/FA-18F_VFA-102.jpg
EA-18G:      https://upload.wikimedia.org/wikipedia/commons/e/e5/EA-18G_Growler.jpg
MQ-9:        https://upload.wikimedia.org/wikipedia/commons/f/f1/MQ-9_Reaper_UAV.jpg
KC-135:      https://upload.wikimedia.org/wikipedia/commons/5/5e/KC-135_Stratotanker.jpg
E-3 AWACS:   https://upload.wikimedia.org/wikipedia/commons/2/2f/E-3_Sentry_AWACS.jpg
GBU-57 MOP:  assets/gbu57-b2-tarmac-mumaw.jpg  (local asset)
GBU-57 bay:  assets/gbu57-b2-bombbay-usaf.jpg  (local asset)
JASSM-ER:    https://upload.wikimedia.org/wikipedia/commons/9/96/AGM-158_JASSM.jpg
Tomahawk:    https://upload.wikimedia.org/wikipedia/commons/7/7a/Tomahawk_Block_IV_cruise_missile.jpg
THAAD:       https://upload.wikimedia.org/wikipedia/commons/f/f7/THAAD_battery.jpg
Patriot:     https://upload.wikimedia.org/wikipedia/commons/1/18/Patriot_missile_system_2.jpg
```

---

### §07-B — Israeli Systems (8 cards)

| id | System | Range | Payload | Guidance | Targets |
|---|---|---|---|---|---|
| equip-f35i | F-35I Adir | 2,200 km combat | 8,160 kg (Israeli-modified EW + weapons suite) | Stealth + sensor fusion | Hardened + defended targets |
| equip-f15i | F-15I Ra'am | 4,450 km (ferry) | 11,000 kg | INS/GPS/laser | Deep strike, hardened bunkers |
| equip-f16i | F-16I Sufa | 3,200 km (ferry) | 7,700 kg | INS/GPS/laser/IIR | Precision strike, CAS |
| equip-jericho3 | Jericho III | 4,800–6,500 km | ~750 kg (MRV capable) | INS+radar terminal | Strategic / nuclear-capable |
| equip-popeye | Popeye Turbo SLCM | 1,500 km | 340 kg | INS+GPS+IIR terminal | Hardened bunkers, C2 |
| equip-delilah | Delilah | 250 km | 30 kg | INS+GPS+IIR, loitering | Mobile SAM, radar, C2 |
| equip-irondome | Iron Dome | 70 km | Hit-to-kill + frag (Tamir) | Active radar seeker | Short-range rockets, mortar, UAV |
| equip-arrow3 | Arrow-3 (Hetz-3) | >2,400 km intercept range | Kinetic kill vehicle | Two-stage, exo-atmospheric IR | TBMs in boost/midcourse phase |

---

### §07-C — Iranian Arsenal (13 cards)

| id | System | Range | Payload | Guidance | Targets |
|---|---|---|---|---|---|
| equip-fattah1 | Fattah-1 | 1,400 km | ~500 kg | Hypersonic maneuvering glide vehicle (Mach 13–15) | Moving + hardened targets |
| equip-khorramshahr4 | Khorramshahr-4 | 2,000 km | ~1,500 kg | MIRV-capable, INS+radar terminal | Area targets, CBGs |
| equip-shahab3 | Shahab-3 | 1,300 km | 760–1,200 kg | INS (limited accuracy) | Area / strategic targets |
| equip-emad | Emad | 1,700 km | 750 kg | INS + terminal maneuvering | Improved accuracy over Shahab-3 |
| equip-qadrh | Qadr-H | 1,950 km | 750 kg | INS + terminal maneuvering | Strategic targets |
| equip-sejjil2 | Sejjil-2 | 2,000 km | 750 kg | Solid-fuel, INS | Rapid-launch strategic targets |
| equip-zolfaghar | Zolfaghar | 700 km | 450–600 kg | INS+GPS | Precision strike, bases |
| equip-fateh110 | Fateh-110 | 300 km | 450 kg | INS+GPS terminal | Regional bases, ports |
| equip-hoveizeh | Hoveizeh LACM | 1,350 km | ~450 kg | INS+GPS+terrain matching | Fixed infrastructure |
| equip-shahed136 | Shahed-136 | 2,500 km | 40 kg shaped charge | GPS+INS loitering munition | Vehicles, radar, soft targets |
| equip-shahed131 | Shahed-131 | 900 km | 15 kg | GPS+INS loitering munition | Light vehicles, personnel |
| equip-toufan | Toufan ATM | 3.75 km | HEAT warhead | SACLOS wire | Armor, fortifications |
| equip-bavar373 | Bavar-373 | 200 km | Hit-to-kill + frag | Phased-array radar + active RF seeker | Aircraft, cruise missiles, TBMs |

---

### §07-D — Proxy Forces (3 cards)

| id | System | Range | Payload | Guidance | Targets |
|---|---|---|---|---|---|
| equip-raad3 | Hezbollah Raad-3 | 100 km | 100 kg | INS | Airfields, infrastructure, northern Israel |
| equip-samad3 | Houthi Samad-3 UAV | 1,500 km | 30 kg | GPS | Ships, bases, infrastructure |
| equip-quds1 | Houthi Quds-1 LACM | 900 km | 30 kg | GPS+INS terrain matching | Fixed infrastructure, ports |

---

## Adding a New Weapon System

1. Choose the correct sub-section (07-A, B, C, or D) based on operator
2. Create a new `<div class="equip-card" id="equip-[slug]">` at the end of that sub-section's `.equip-grid`
3. Source an image: check Wikimedia Commons first, then defense.gov, then manufacturer press kits
4. Fill all four spec rows: RANGE, PAYLOAD, GUIDANCE, TARGETS
5. Update the `.ws-count` badge on the sub-section header to reflect the new count
6. Update `data-last-updated` on the parent `<section>` tag and the `.sb-date` badge

**Slug convention:** lowercase, hyphenated, no spaces — e.g., `equip-f22`, `equip-fateh313`
