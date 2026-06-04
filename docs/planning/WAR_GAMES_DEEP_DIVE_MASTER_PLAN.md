# War Games Deep Dive Master Plan

Generated: 2026-06-04

## Scope

This plan tracks the four requested workstreams for the China/Taiwan and Korean Peninsula war-gaming pages:

1. Expand every Scenario Deep Review card into a sourced, comprehensive mini-analysis page/card with direct source links, citations, relevant images/maps/tables, and an outcome footer.
2. Replace low-value Operational Geometry sections with sourced geography, terrain, choke-point, historical-context, and current-relevance analysis. Avoid arbitrary map lines. Use sourced geolocated data, saved local images where possible, and citation blocks.
3. Remove the China/Taiwan Conflict Munitions cards and create five dedicated force-comparison pages from local datasource reports: Naval, Air, Army, Marines, and Special Forces.
4. Create a dedicated final Taiwan contingency deep-dive page as a non-operational strategic risk assessment based on public war games, current reporting, and think-tank analysis.

## Safety Boundary For Scenario Content

The final Taiwan contingency page should remain an analytic, defensive, policy-oriented risk assessment. It may discuss broad strategic phases, warning indicators, escalation dynamics, humanitarian/economic consequences, and alliance decision points. It must not provide actionable targeting instructions, optimized attack sequencing, weapon employment guidance, or operational steps that would enable real-world harm.

## Work Products

- `pages/taiwan-war-games.html`
- `pages/korean-peninsula-war-games.html`
- New Taiwan force-comparison pages under `pages/`
- New Taiwan final contingency page under `pages/`
- Local copied page images under `assets/generated/` or `assets/reports/`
- Updated navigation/config links where appropriate
- Updated `NEXT_STEPS.md`
- Updated `docs/planning/AGENT_PROGRESS.md`
- Deployment validation checklist in `docs/planning/DEPLOYED_TEST_PLAN.md`

## Implementation Order

1. Source audit:
   - Parse local CSVs and markdown comparison reports.
   - Inventory existing source links, titles, dates, image paths, and broken/missing URLs.
   - Identify externally sourced maps/images that need local copies.
2. Page structure:
   - Add reusable CSS/components for source cards, citation blocks, outcome footers, terrain panels, map references, and force comparison index cards.
   - Keep existing site style and global style variables.
3. Task 1 and Task 2:
   - Upgrade both war-game pages first because they share the same content model.
   - Replace arbitrary operational geometry map art with sourced topography/historical-context panels and citations.
4. Task 3:
   - Generate five force-comparison pages from local markdown reports.
   - Replace China/Taiwan munitions section with a force-comparison index.
5. Task 4:
   - Build final strategic contingency deep-dive page.
   - Include scenario assumptions, phase timeline, warning indicators, consequences, decision points, and outcome assessment at a high level.
6. Validation:
   - Static syntax checks.
   - Local server smoke tests.
   - Browser/Playwright screenshots at desktop and mobile widths.
   - Git status audit to preserve unrelated local files.
7. Push and deploy validation:
   - Commit and push to GitHub.
   - Verify `https://conflictmapper.com` after Cloudflare deploy completes.

## Usage Window Handoff

If work must pause before completion:

1. Update `docs/planning/AGENT_PROGRESS.md`.
2. Update `NEXT_STEPS.md` with exact completed files and pending checks.
3. Leave local server stopped.
4. Ensure a thread heartbeat is scheduled to resume from this plan.
