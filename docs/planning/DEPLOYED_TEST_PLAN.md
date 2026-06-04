# Deployed Test Plan - conflictmapper.com

After changes are committed, pushed, and deployed, validate the production site at `https://conflictmapper.com`.

## Core Routes

- `https://conflictmapper.com/`
- `https://conflictmapper.com/pages/taiwan-war-games.html`
- `https://conflictmapper.com/pages/korean-peninsula-war-games.html`
- `https://conflictmapper.com/pages/taiwan-contingency-ai-chip-war.html`
- `https://conflictmapper.com/pages/china-vs-allied-naval-forces-taiwan.html`
- `https://conflictmapper.com/pages/air-power-china-vs-allies-taiwan.html`
- `https://conflictmapper.com/pages/army-forces-china-vs-allies-taiwan.html`
- `https://conflictmapper.com/pages/marines-china-vs-allies-taiwan.html`
- `https://conflictmapper.com/pages/special-forces-china-vs-allies-taiwan.html`

## Browser Matrix

- Desktop wide viewport: 1920x1080 or wider.
- Laptop viewport: 1366x768.
- Tablet portrait: about 768x1024.
- Mobile portrait: about 390x844.

## Functional Checks

- Top navigation and page links work.
- Scenario Deep Review sections show expanded cards and outcome footers.
- Scenario Deep Review cards show compact core-variable, decision-stress, and watch-marker panels.
- Operational Geometry sections use sourced maps/images and citations.
- Taiwan force-comparison index links to all five report pages.
- Each force-comparison page loads its copied local report images, tables, and references.
- Old China/Taiwan Conflict Munitions cards are removed from the war-game page.
- Final Taiwan contingency page loads with map-led analysis, source synthesis, phase model, warning matrix, expected losses/cost, and non-operational strategic framing.
- Theme/style settings propagate to the new pages through `assets/user-style.js`.
- Main content width settings work on new pages.
- No horizontal overflow on mobile.
- Images load from local static paths.
- External source links open in a new tab or route correctly.

## Visual Checks

- No broken image placeholders.
- No arbitrary, unexplained overlay lines.
- Tables/cards do not collapse into unreadable columns.
- Citation blocks are visible but not visually dominant.
- Outcome footers are easy to scan.
- Mobile nav remains usable.

## Technical Checks

- Browser console has no relevant page errors.
- Cloudflare deployment has completed successfully.
- New pages return HTTP 200.
- Static image assets return HTTP 200.
- GitHub commit hash matches deployed version if deploy metadata is available.
