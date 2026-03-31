# PREFERRED RESOURCES — Build Spec
## `data/preferred-resources.json` + `data/think-tanks-guide.md`
### Conflict Mapper Research Infrastructure

---

## Overview

The preferred resources system is a curated library of trusted research sources used to guide AI analysis generation. When generating reports, the analysis engine checks preferred resources first before falling back to general web search. Sources are grouped by category and assigned priority levels.

**Files:**
- `data/preferred-resources.json` — machine-readable source registry
- `data/think-tanks-guide.md` — human-readable comprehensive reference

---

## `data/preferred-resources.json` — Schema

```json
{
  "version": "1.0",
  "last_updated": "YYYY-MM-DD",
  "categories": {
    "nuclear_nonproliferation": {
      "label": "Nuclear & Nonproliferation",
      "sources": [
        {
          "id": "isis-online",
          "name": "Institute for Science and International Security",
          "url": "https://isis-online.org",
          "rss": null,
          "priority": "critical",
          "tags": ["nuclear", "iran", "north-korea", "IAEA", "satellite-imagery"],
          "notes": "Primary source for Iranian nuclear facility analysis and satellite imagery interpretation"
        }
      ]
    }
  }
}
```

### Top-Level Fields

| Field | Type | Description |
|---|---|---|
| `version` | string | Schema version — increment when structure changes |
| `last_updated` | string | ISO date of last edit |
| `categories` | object | Keyed by category slug |

### Category Object

| Field | Type | Description |
|---|---|---|
| `label` | string | Human-readable category name |
| `sources` | array | Array of source objects |

### Source Object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique slug, e.g. `"isis-online"` |
| `name` | string | yes | Full institution name |
| `url` | string | yes | Homepage URL |
| `rss` | string\|null | no | RSS feed URL if available, else null |
| `priority` | string | yes | `"critical"` \| `"high"` \| `"medium"` \| `"reference"` |
| `tags` | array | yes | Topic tags for filtering — lowercase, hyphenated |
| `notes` | string | no | Usage guidance for the AI; what this source is best for |

---

## Priority Levels

| Level | Meaning | Usage |
|---|---|---|
| `critical` | Primary authoritative source — always check first | Cite in every relevant analysis; treat as ground truth for that domain |
| `high` | Major institution with strong domain expertise | Include when covering the relevant topic |
| `medium` | Useful secondary source | Reference for additional perspectives or regional focus |
| `reference` | Background / encyclopedic | Good for definitions, historical context, technical specs |

---

## Category Structure

The five core categories:

```json
{
  "categories": {
    "nuclear_nonproliferation": { ... },
    "conflict_tracking":        { ... },
    "geopolitical_think_tanks": { ... },
    "regional_specialist":      { ... },
    "intelligence_reference":   { ... }
  }
}
```

### Category: `nuclear_nonproliferation`
Sources for nuclear program analysis, IAEA reporting, enrichment data, facility intelligence.

Key sources:
- **ISIS (Institute for Science and International Security)** — isis-online.org — `priority: critical` — satellite imagery, facility reports, enrichment calculations
- **Arms Control Association** — armscontrol.org — `priority: critical` — treaty status, enrichment timelines, policy analysis
- **IAEA** — iaea.org — `priority: critical` — safeguards reports, inspection findings
- **Federation of American Scientists** — fas.org — `priority: high` — nuclear forces data, warhead estimates
- **Bulletin of the Atomic Scientists** — thebulletin.org — `priority: high` — Doomsday Clock, policy analysis
- **Nuclear Threat Initiative** — nti.org — `priority: high` — country profiles, security assessments

### Category: `conflict_tracking`
Sources for operational military analysis, daily battlefield assessments, equipment losses.

Key sources:
- **Institute for the Study of War** — understandingwar.org — `priority: critical` — daily operational maps and assessments
- **Oryx Blog** — oryxspioenkop.com — `priority: critical` — visually confirmed equipment losses (Ukraine model)
- **Bellingcat** — bellingcat.com — `priority: high` — OSINT investigations, geolocated imagery
- **The Warzone (The Drive)** — thedrive.com/the-war-zone — `priority: high` — military hardware and operations reporting
- **ACLED** — acleddata.com — `priority: high` — conflict event data and mapping

### Category: `geopolitical_think_tanks`
Policy analysis, scenario modeling, strategic assessments.

Key sources:
- **RAND Corporation** — rand.org — `priority: critical` — rigorous scenario analysis, force assessment
- **CSIS** (Center for Strategic and International Studies) — csis.org — `priority: critical` — Middle East, Pacific, technology
- **Brookings Institution** — brookings.edu — `priority: high` — policy research, Iran analysis
- **Council on Foreign Relations** — cfr.org — `priority: high` — conflict tracker, backgrounders
- **Foundation for Defense of Democracies** — fdd.org — `priority: high` — Iran, nuclear, sanctions
- **American Enterprise Institute** — aei.org — `priority: high` — defense spending, war costs
- **Stimson Center** — stimson.org — `priority: high` — conflict prevention, post-conflict scenarios
- **Chatham House** — chathamhouse.org — `priority: high` — UK-centric, Lebanon, Gulf
- **International Crisis Group** — crisisgroup.org — `priority: high` — active conflict monitoring
- **Responsible Statecraft** — responsiblestatecraft.org — `priority: medium` — restraint-oriented analysis, Persian Gulf

### Category: `regional_specialist`
Sources with specific Iran/Middle East expertise.

Key sources:
- **Al-Monitor** — al-monitor.com — `priority: high` — Iran, Lebanon, Middle East politics
- **Iran International** — iranintl.com — `priority: high` — English-language Iran news
- **Jerusalem Post** — jpost.com — `priority: medium` — Israeli perspective
- **Haaretz** — haaretz.com — `priority: medium` — Israeli domestic + security
- **IISS** (International Institute for Strategic Studies) — iiss.org — `priority: critical` — Military Balance, strategic assessments
- **Soufan Center** — thesoufancenter.org — `priority: high` — Iran leadership, IRGC structure, terrorism
- **Alma Research and Education Center** — israel-alma.org — `priority: high` — Hezbollah infrastructure, missile systems

### Category: `intelligence_reference`
Technical reference materials, government open sources, declassified documents.

Key sources:
- **CIA World Factbook** — cia.gov/the-world-factbook — `priority: reference` — country profiles, demographics
- **DIA (Defense Intelligence Agency)** — dia.mil — `priority: high` — public threat assessments
- **SIPRI** (Stockholm International Peace Research Institute) — sipri.org — `priority: high` — arms transfers, military expenditure
- **GlobalSecurity.org** — globalsecurity.org — `priority: reference` — technical weapons specs, facility profiles
- **Jane's** — janes.com — `priority: critical` — weapons systems database (subscription; use public excerpts)
- **Stars & Stripes** — stripes.com — `priority: high` — US military operational reporting
- **USNI News** — news.usni.org — `priority: high` — US Navy, Marines, Coast Guard operations

---

## Full JSON Template

```json
{
  "version": "1.0",
  "last_updated": "2026-03-31",
  "categories": {
    "nuclear_nonproliferation": {
      "label": "Nuclear & Nonproliferation",
      "sources": [
        {
          "id": "isis-online",
          "name": "Institute for Science and International Security",
          "url": "https://isis-online.org",
          "rss": null,
          "priority": "critical",
          "tags": ["nuclear", "iran", "north-korea", "iaea", "satellite-imagery"],
          "notes": "Primary source for Iranian nuclear facility analysis and satellite imagery. Always cite ISIS for Natanz, Fordow, and enrichment data."
        },
        {
          "id": "arms-control-association",
          "name": "Arms Control Association",
          "url": "https://armscontrol.org",
          "rss": "https://www.armscontrol.org/taxonomy/term/7/feed",
          "priority": "critical",
          "tags": ["nuclear", "arms-control", "treaties", "iran", "north-korea"],
          "notes": "Best source for treaty compliance status and enrichment timeline tracking."
        },
        {
          "id": "iaea",
          "name": "International Atomic Energy Agency",
          "url": "https://iaea.org",
          "rss": null,
          "priority": "critical",
          "tags": ["nuclear", "safeguards", "iran", "inspection"],
          "notes": "Official safeguards reports. Use GOV/ document numbers for citations."
        }
      ]
    },
    "conflict_tracking": {
      "label": "Conflict Tracking & OSINT",
      "sources": [
        {
          "id": "isw",
          "name": "Institute for the Study of War",
          "url": "https://understandingwar.org",
          "rss": "https://www.understandingwar.org/rss.xml",
          "priority": "critical",
          "tags": ["operations", "iran", "ukraine", "russia", "daily-assessment"],
          "notes": "Daily operational assessment maps and written analysis. Best for battlefield situation."
        },
        {
          "id": "oryx",
          "name": "Oryx",
          "url": "https://www.oryxspioenkop.com",
          "rss": null,
          "priority": "critical",
          "tags": ["equipment-losses", "osint", "confirmed", "visual"],
          "notes": "Visually confirmed equipment loss tracking. Only count entries with photographic evidence."
        },
        {
          "id": "the-warzone",
          "name": "The Warzone (The Drive)",
          "url": "https://www.thedrive.com/the-war-zone",
          "rss": "https://www.thedrive.com/the-war-zone/feed",
          "priority": "high",
          "tags": ["military-hardware", "operations", "iran", "technology"],
          "notes": "Best for aircraft, weapons systems, and US military technology reporting."
        }
      ]
    },
    "geopolitical_think_tanks": {
      "label": "Geopolitical Think Tanks",
      "sources": [
        {
          "id": "rand",
          "name": "RAND Corporation",
          "url": "https://rand.org",
          "rss": "https://www.rand.org/pubs/rss.xml",
          "priority": "critical",
          "tags": ["scenarios", "iran", "china", "defense", "force-assessment"],
          "notes": "Most rigorous scenario analysis. Search rand.org for Iran, Taiwan, or nuclear topics."
        },
        {
          "id": "csis",
          "name": "Center for Strategic and International Studies",
          "url": "https://csis.org",
          "rss": "https://csis.org/analysis/feed",
          "priority": "critical",
          "tags": ["middle-east", "pacific", "china", "iran", "technology"],
          "notes": "Strong on Middle East and Pacific coverage. Check missile defense and nuclear programs sections."
        }
      ]
    },
    "regional_specialist": {
      "label": "Regional Specialists",
      "sources": [
        {
          "id": "iiss",
          "name": "International Institute for Strategic Studies",
          "url": "https://iiss.org",
          "rss": null,
          "priority": "critical",
          "tags": ["military-balance", "force-data", "iran", "israel", "china"],
          "notes": "Military Balance data is the gold standard for force comparison numbers."
        },
        {
          "id": "soufan-center",
          "name": "The Soufan Center",
          "url": "https://thesoufancenter.org",
          "rss": "https://thesoufancenter.org/feed",
          "priority": "high",
          "tags": ["iran", "irgc", "hezbollah", "leadership", "terrorism"],
          "notes": "Best for IRGC structure, leadership analysis, and Iranian proxy networks."
        }
      ]
    },
    "intelligence_reference": {
      "label": "Intelligence & Reference",
      "sources": [
        {
          "id": "usni-news",
          "name": "USNI News",
          "url": "https://news.usni.org",
          "rss": "https://news.usni.org/feed",
          "priority": "high",
          "tags": ["navy", "marines", "carrier-groups", "deployments", "iran"],
          "notes": "Best source for US naval movements, carrier strike group positions, and NAVCENT operations."
        },
        {
          "id": "stars-stripes",
          "name": "Stars & Stripes",
          "url": "https://www.stripes.com",
          "rss": "https://www.stripes.com/arc/outboundfeeds/rss/?outputType=xml",
          "priority": "high",
          "tags": ["us-military", "operations", "personnel", "centcom"],
          "notes": "Independent US military newspaper. Best for ground-level US force reporting."
        }
      ]
    }
  }
}
```

---

## `data/think-tanks-guide.md` — Structure

The companion markdown file is a human-readable reference organized by the same 5 categories. Each entry expands on:
- Full institution description and founding
- Key research focus areas
- Notable recent publications
- How to search / navigate their website
- Subscription vs. free access notes
- Best contact for press inquiries (where public)

Format each institution as a second-level heading:
```markdown
## Institute for Science and International Security (ISIS)
**URL:** https://isis-online.org
**Priority:** CRITICAL — Nuclear program analysis
**Focus:** ...
**How to use:** ...
**Key reports:** ...
```

---

## Workflow: How to Use Preferred Resources

### In AI Analysis Prompts

The analysis generator (`lib/analysis-generator.js`) prepends a source guidance block to every system prompt when generating Iran or nuclear-related reports:

```javascript
function buildSourceGuidance(topic) {
  const resources = loadPreferredResources(); // reads data/preferred-resources.json
  const critical  = getByPriority(resources, topic, 'critical');
  const high      = getByPriority(resources, topic, 'high');

  return `
PREFERRED SOURCES — check these first before general web search:
CRITICAL (always cite if relevant): ${critical.map(s => s.url).join(', ')}
HIGH PRIORITY: ${high.map(s => s.url).join(', ')}
`;
}
```

### Adding a New Resource

1. Open `data/preferred-resources.json`
2. Find the appropriate category (or create a new one following the category schema)
3. Add the new source object with all required fields: `id`, `name`, `url`, `priority`, `tags`
4. Set `last_updated` to today's date
5. Add the corresponding entry to `data/think-tanks-guide.md` with full description

**Trigger phrase:** If a user says "save to preferred resources", add the mentioned source to `data/preferred-resources.json` with appropriate category, priority, and tags based on the context of the conversation.

### Priority Assignment Guide

- `critical` — Sole or near-sole authoritative source for a specific data type (e.g., ISIS for nuclear facility satellite analysis, Oryx for visually confirmed losses)
- `high` — Major institution whose analysis is frequently cited in policy and media; covers the relevant topic as a primary focus
- `medium` — Useful but not the go-to; regional focus, secondary perspective, or occasional relevant coverage
- `reference` — Background material; rarely needs to be cited in dynamic analysis but useful for definitions and historical context

---

## Tag Taxonomy

Standard tags to use consistently (all lowercase, hyphenated):

```
nuclear           iran              israel            china
russia            ukraine           north-korea       taiwan
middle-east       persian-gulf      pacific           nato
military-balance  force-assessment  equipment-losses  osint
satellite-imagery iaea              safeguards        enrichment
irgc              hezbollah         hamas             houthi
operations        daily-assessment  scenarios         policy
arms-control      sanctions         treaties          us-military
navy              air-force         ground-forces     carrier-groups
deployments       centcom           technology        cyber
confirmed         visual            verified
```
