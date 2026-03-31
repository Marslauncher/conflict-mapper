# CONFLICT MAPPER — CHANGELOG

## 2026-03-31 (Session 5)

### Iran War Analysis — Major Expansion
- **§05 Iran Political Structure**: Replaced emoji icons with real sourced photos (Mojtaba Khamenei, Ghalibaf, Jalili, Ali Khamenei, IRGC seal, Qom). Expanded post-conflict scenarios with Stimson Center, ESCP, and ICDI analysis links.
- **§06 Nuclear**: Renamed to "Nuclear Program". Added Deep Dive navigation link card.
- **§07 Weapons Platforms**: Complete rebuild — replaced 4-tab system with 4 visible sub-sections (07-A US/Coalition 15 cards, 07-B Israeli 8 cards, 07-C Iranian Arsenal 13 cards, 07-D Proxy 3 cards). 39 total equipment cards with range, payload, guidance, targets specs. Real sourced images from Wikipedia, manufacturer sites, defense.gov.
- **§08 Equipment Losses**: Added E-3 Sentry AWACS (destroyed Mar 27, Prince Sultan AB, CNN source). Updated KC-135 to 6+ damaged/3+ destroyed. Day counter to 31.
- **§10A Kharg Island Assessment** (NEW): Interactive Leaflet map, Trump Truth Social quote, island profile (22km², 90% oil exports, 20K civilians), force assessment (31st MEU, 82nd Airborne), analyst cards (Eisenstadt, FDD, Votel, Mann), Snake Island comparison. Sources: BBC, Al Jazeera, Responsible Statecraft, Stars & Stripes, CNBC.
- **§10B Ground Target Options** (NEW): 8 targets with mini Leaflet maps — Abu Musa, Greater Tunb, Bandar Abbas, Chabahar, Jask, Kish, Lavan, Qeshm. Feasibility ratings from HIGH to EXTREME RISK.

### Nuclear Deep Dive
- Removed B-2 placeholder images from §02 Weapons section, replaced with user-provided photos
- Fixed facility mini-maps: context maps now use CartoDB Dark Matter with labels at zoom 10 (was featureless Esri satellite at zoom 8)
- Added 3 new facility cards: Arak Heavy Water Reactor, Bushehr Nuclear Power Plant, Isfahan NTC — total now 14
- Hero stat updated to 14 facilities

### AI Provider / Analysis Engine
- `sonar-deep-research` model: no max_tokens, no temperature sent (model self-regulates)
- `sonar-pro`: max_tokens bumped from 8000 to 16000
- HTTP timeout removed entirely from httpPost
- JSON parser: strips Perplexity [1][2] citation markers, repairs truncated JSON, logs diagnostics
- Analysis generation now parallel: countries run in batches of 3 via Promise.allSettled; global + all countries run simultaneously via Promise.all

### Preferred Resources
- Created `data/preferred-resources.json` with 5 categories: nuclear/nonproliferation, conflict tracking, geopolitical think tanks, regional specialist, intelligence reference
- Saved comprehensive think tanks guide to `data/think-tanks-guide.md`

### System Prompts (docs/)
- Updated: IRAN_WAR_ANALYSIS_PROMPT, AI_PROVIDERS_PROMPT, HUB_CONTENT_SYSTEM_PROMPT, FILE_GUIDE
- Created: WEAPONS_PLATFORMS_PROMPT, GROUND_OPERATIONS_PROMPT, PREFERRED_RESOURCES_PROMPT, NUCLEAR_DEEP_DIVE_PROMPT
- All prompts now written as pure build specs (style, design, content, functionality) — no project history

### Local Assets
- `assets/weapons/` directory created for locally-hosted weapon system images
- User-provided: gbu57-b2-tarmac-mumaw.jpg, gbu57-b2-bombbay-usaf.jpg
- Downloaded: 12+ weapon images (b2-spirit, f35a-lightning, prsm, gbu57-mop, thaad, jassm-er, etc.)

---

## 2026-03-31 (Session 4)

### Modular Section Architecture
- Applied modular `data-section` / `data-title` / `data-last-updated` attributes to all three hub pages
- Iran War Analysis: 15 modular sections
- Taiwan Strait Watch: 6 modular sections  
- Nuclear Deep Dive: 8 modular sections (built with architecture from start)
- Created HUB_CONTENT_SYSTEM_PROMPT.md

### Nuclear Deep Dive — Full Rebuild
- 8 modular sections, 1,775 lines, 141KB
- §01 Theater map with clickable popup info cards for all facilities
- §02 GBU-57/MOP specs with penetration chart
- §03 Operation Midnight Hammer — massively expanded with flight profile infographic (@ianellisjones), force composition, strike timeline, deception operations
- §04 Per-site facility analysis — 11 cards with dual zoom maps (Esri satellite), GPS coordinates, Google Maps/Wikimapia links, damage assessment bars
- §05 Enrichment timeline + IAEA safeguards + stockpile disposition
- §06 Breakout scenarios (worst/DOD/admin)
- §07 Reconstitution assessment with capability bars
- §08 Fallout considerations

### GitHub
- Created public repo: github.com/Marslauncher/conflict-mapper
- API key stripped from committed config; added to .gitignore

---

## 2026-03-30 (Session 3)

### Iran War Analysis — Initial Build
- 188KB comprehensive analysis page with 17 sections
- Interactive Leaflet theater map with bases, strikes, fronts
- 17 think tank cards with real URLs
- Iran political structure with leadership cards
- Weapons platforms (4-tab: US/Iran/Israel/Proxy)
- Equipment loss tables (US + Iran)
- Ground assault planning, Strait of Hormuz analysis
- Lebanon front, Taiwan impact, economic fallout, endgame scenarios
- 40+ source citations with real URLs

### Navigation
- Consolidated Iran War + Nuclear Deep Dive into "Iran Conflict" dropdown in nav

---

## 2026-03-29 (Session 2)

### Backend (Node.js/Express)
- 5 AI provider integrations (Perplexity, OpenAI, Anthropic, Google, Ollama)
- RSS engine: 153 feeds, user-agent headers, error handling
- Geocoder with coordinate caching
- Analysis generator for global + country reports
- Logger with in-memory buffer + file persistence

### Admin Panel
- AI configuration (provider, model, API key, test connection)
- RSS feed management (fetch, diagnostics, audit log)
- Countries & Topics configuration
- Report generation (global, per-country, all-countries, all)
- File upload for reports
- 10 automated health checks

### Map & Feed Pages
- Global news map with geotagged articles
- Per-country news maps
- Historical reports viewer

### Bug Fixes
- API response nesting (`data.data.articles`)
- Geo coords path (`article.geo.lat`)
- Country filtering (word-boundary matching)
- Image cropping (object-fit: contain)

---

## 2026-03-28 (Session 1)

### Initial Build
- Site shell (index.html, 5150 lines) with iframe embedding
- 11 country dossiers (USA, China, Russia, Ukraine, Taiwan, Iran, Israel, India, Pakistan, North Korea, NATO)
- 7 theater dossiers (Eastern Europe, Asia-Pacific, Middle East, Arctic, Africa, Space Domain, Cyber/Asymmetric)
- Dark military aesthetic (#0a0c10), Rajdhani/Share Tech Mono/Inter fonts
- Day/night mode toggle
- Taiwan Strait Watch with weather, tides, force comparison
- 4 invasion window analysis pages (Apr 2026, Oct 2026, Apr 2027, Oct 2027)

### Documentation
- README.md, Dockerfile, .dockerignore, LICENSE (MIT)
- 23 system prompt files
