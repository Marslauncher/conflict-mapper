# Korean Peninsula Content Audit

Updated: 2026-06-05

This audit tracks the Korean Peninsula section against the current requested quality bar: visually useful, data/map/chart aware, 5-15 sentence analytical depth where appropriate, Korea-specific sourcing, and no accidental Taiwan cross-posting inside Korean pages.

| Section / Topic | Visually Appealing | Data / Charts / Maps | Depth Requested | Information Correct | Taiwan Cross-Posting | Fix Applied |
| --- | --- | --- | --- | --- | --- | --- |
| Korean Watch hero | Pass | Basic status signals | Pass | Pass | Removed | Replaced `Dual-Contingency Risk: Taiwan Linked` with `Regional Spillover Risk: Monitored`. |
| Current Regional Assessment / Assessment Summary | Pass after fix | Live cache metrics and signal tags | Pass after fix | Pass, uses live cache counts plus stable Korea risk framing | Removed | Expanded static summary and added dynamic live assessment note from Korea-filtered RSS and think tank cache. |
| Priority Indicators | Pass after fix | Indicator categories | Pass after fix | Pass, watch logic is framed as indicator clusters | Removed | Expanded each card with watch logic for launches, artillery, nuclear sites, SOF/drone events, USFK exercises, and regional access. |
| Operational Map | Pass | Interactive Leaflet map and expandable node index | Partial | Pass with approximate coordinates caveat | None found | Existing map retained; node index remains collapsed by default and map can expand. |
| Latest Korean Peninsula Reporting | Pass | Live RSS cards with photos | Partial | Dynamic cache-dependent | None found | Existing article-photo cards retained; no Taiwan framing in filter logic. |
| Think Tank Coverage | Pass | Think tank article cards with photos | Partial | Dynamic cache-dependent | None found | Existing card rendering retained; Korea relevance filter remains active. |
| War-Gaming Linkage | Pass after fix | Korea maps and THAAD imagery | Pass after fix | Pass | Removed | Removed dual Taiwan-Korea wording and reframed Guardian Tiger as regional diversion, Japan access, and allied command stress. |
| Korean War Games Executive Assessment | Pass after fix | Map plus scenario metrics | Pass after fix | Pass, based on named public source families | Removed | Expanded from three short paragraphs to a fuller Korea-specific overview of nuclear coercion, regional diversion, C2 shock, drone attrition, and nuclear-cognitive warfare. |
| Scenario Deep Review cards | Pass after fix | Korea-specific map/weapons images | Pass after fix | Pass, source-linked | Removed | Replaced Taiwan screenshot and Taiwan armor proxy with Korea maps and PrSM/THAAD imagery; expanded Guardian Tiger II and drone/armor framing. |
| Geography And Terrain Context | Pass after fix | Pusan Perimeter map plus DMZ / port metric cards | Pass after fix | Pass with approximate public geography stats | None found | Expanded with DMZ dimensions, Seoul-Incheon proximity, mountainous terrain, ports, air bases, logistics depth, and modern ISR/drone implications. |
| Scenario Families / What This Map Is Testing | Pass after fix | South Korea terrain map plus five family cards | Pass after fix | Pass | Removed | Replaced "not decorative" lead with substantive terrain/decision-cycle explanation and Korea-specific family text. |
| Scenario Comparison Matrix / Warning Logic | Pass after fix | Stress bars plus watch/reason/current indicator cards | Pass after fix | Pass | Removed | Added watch item, reasoning, and current indicators for launcher/artillery readiness, cyber/space shock, and alliance access. |
| Escalation Model | Pass after fix | Korea map, THAAD, South Korea physiography | Pass after fix | Pass | Removed | Replaced Taiwan screenshot and Taiwan crisis wording with regional diversion and alliance bandwidth analysis. |
| Assumptions And Limits | Pass after fix | Confidence bars plus assumption cards | Pass after fix | Pass | Removed | Removed meta/system-prompt language and replaced with Korea assumptions, counterarguments, and what would change the assessment. |
| Warning Indicators | Pass after fix | Warning cluster dashboard and expandable historical map | Pass after fix | Pass | Removed | Replaced meta/system-prompt wording with watch item, reasoning, and current indicators across five warning clusters. |
| Planning Implications | Pass after fix | Korea maps and weapons imagery | Pass after fix | Pass | Removed | Expanded into response ladders, C2/public resilience, counter-drone/fires integration, and regional coordination. |
| Source Index | Pass after fix | Rich source cards with source imagery and tags | Pass after fix | Pass, direct original source URLs retained | None in Korean pages | Added image-backed source cards with analytical role, tags, and direct URLs. |
| Korean Scenario Detail Pages | Pass after fix | Source-linked image, notes, tables, source index | Partial/Pass after fix | Pass | Removed | Scenario pages inherit scoped Korea nav, Korea source index, and Korea-specific current update model. |
| War Gaming Hub | Pass | Neutral hub includes both theaters | N/A | Pass | Intended neutral cross-theater page | No change to neutral hub; Korean pages now scope their local action strip and content to Korea. |

## Residual Follow-Up

- The watch page remains dynamic and depends on `/api/articles` plus `/data/think-tank-latest-news.json`; if those sources are empty or stale, the live note will truthfully report low coverage.
- The current map layer is useful for context but not a fully sourced GIS intelligence layer. A future improvement should add source metadata per marker and optional layers for rail, ports, air bases, and historical battle lines.
- The Korean scenario pages are stronger after this pass, but a true flagship research product would still benefit from additional original source extraction, more current-source citations, and hand-curated imagery from each linked report where licensing allows.
