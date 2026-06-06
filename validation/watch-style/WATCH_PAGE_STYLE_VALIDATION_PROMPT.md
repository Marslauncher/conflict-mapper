# Watch Page Style Validation Prompt

Use this prompt before accepting changes to any existing or newly created Conflict Mapper watch page.

This prompt is part of the reusable validation gate set indexed in `validation/VALIDATION_CHECKS.md`. Use it with:

- `validation/checks/01-watch-page-style-parity-validation.md`
- `validation/checks/05-blank-watch-template-validation.md`
- `pages/watch-page-template.html`

## Goal

Validate that every watch page uses the same visual language, page composition, and responsive behavior as the China/Taiwan Strait Watch reference page unless a page-specific requirement explicitly overrides it.

## Required Layout Structure

1. Sticky topbar with Conflict Mapper branding, current watch breadcrumb, and links to related watch/analysis pages.
2. Compact theater hero using:
   - theater/watch eyebrow,
   - uppercase watch title,
   - status badges with visual dots,
   - right-aligned metadata block,
   - four-cell metrics bar.
3. Full-width strategic/assessment band immediately below the hero:
   - if the reference watch page has `Strategic Brief` above `Current Regional Assessment`, preserve that order for parity,
   - otherwise place `Current Regional Assessment` directly below the hero,
   - numbered section badge,
   - 2x2 strategic card grid on desktop and single-column cards on mobile,
   - compact surface/dark card treatment with colored icon/title headers,
   - bullet/list body rows with visual separators,
   - no oversized H3-only cards, raw paragraph slabs, or text-only strategic panels.
4. Main content grid below the assessment:
   - primary left column for map, weather/sea state, force comparison, and strategic brief/assessment,
   - sticky right sidebar for situational status, live intelligence feed, think tank feed, and cross-reference or war-game linkage.
5. Section headers must use the same watch-page pattern: section badge, compact uppercase title, divider line, and optional assessment note.
6. Cards must be visually informative and not text-only where a metric, status badge, bar, image, source stack, map, or indicator grid would communicate faster.
7. Watch-page sections must inherit global style settings from `/assets/user-style.js`; do not hard-code local font sizes, colors, or widths in a way that prevents style settings from propagating.

## Required Watch Sections

Every theater watch page should include, either as full sections or sidebar modules:

- Current Regional Assessment
- Referenced Reporting
- Recent Think Tank Coverage
- Operational Map
- Situational Status
- Weather & Sea State
- Intelligence Feed
- Force Comparison
- Strategic Brief or Strategic Assessment
- Current Assessment
- Things To Note
- Things To Watch
- Escalation Likelihood

## Visual Validation Steps

1. Capture versioned desktop and mobile screenshots for the reference China/Taiwan watch page and the changed watch page.
2. Store screenshots under `validation/watch-style/screenshots/` with version numbers and page names.
3. Compare the screenshots visually for:
   - hero density and metrics alignment,
   - full-width assessment placement,
   - Strategic Brief card parity with the reference screenshot,
   - colored icon/title treatment for `Current Assessment`, `Things To Note`, `Things To Watch`, and `Escalation Likelihood`,
   - main-column/sidebar layout,
   - card rhythm, borders, spacing, and section title treatment,
   - duplicated or clipped `Recent Think Tank Coverage` / regional-analysis modules,
   - text overflow, clipping, horizontal scrolling, blank panels, raw HTML, broken images, or map failures,
   - text-spacing defects such as `evidence.Routine` or `operational.Alert`.
4. Confirm sidebar content remains readable and sticky on desktop, and collapses below the main column on mobile.
5. Confirm live feeds are scoped to the page theater and do not include unrelated regional articles.
6. Confirm Current Regional Assessment, Strategic Brief, map/weather/force notes, and sidebar status are populated from current region-filtered articles or show an explicit feed-unavailable state.
7. Confirm no static boilerplate is presented as current analysis; current sections should include article counts, latest titles, publication dates, signal counts, or current feed-unavailable language.
8. Confirm theme and text-size settings propagate to the watch page by checking CSS variables from `/assets/user-style.js` or by visual comparison after applying a non-default style profile.
9. After pushing to GitHub, wait the configured Cloudflare propagation interval, open the production page, repeat the screenshot validation, and summarize the findings in the final response.

## Acceptance Standard

The changed page should look like it belongs to the same watch-page family as the China/Taiwan Strait Watch page at first glance: same hero structure, same full-width assessment pattern, same content/sidebar rhythm, same compact intelligence-dashboard tone, and no theater-specific feed leakage.
