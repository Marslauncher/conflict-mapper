# Current Event Analysis Validation

Use this before accepting any watch-page content or prompt change that affects assessment, weather, force, map, strategic brief, status, source, or feed sections.

Do not make code changes during this validation pass. Produce findings only.

## Check

- Current Regional Assessment is generated from current region-filtered articles and current status inputs, not static theater background.
- Strategic Brief cards are generated from the same current region-filtered article set or clearly show a feed-unavailable state.
- Weather & Sea State, Operational Map, Force Comparison, Situational Status, and Intelligence Feed notes reference current feed counts, current article titles, current signal categories, or a feed-unavailable state.
- Static geography, baseline force balance, doctrine, or recurring watch concepts may be used only as context after current reporting has been loaded; they must not be presented as the current assessment by themselves.
- Assessment text includes verifiable current-feed anchors such as:
  - last 24-hour article count,
  - last 7-day article count,
  - latest source title and publication date,
  - current signal-category counts,
  - current think-tank item title/date when used.
- Article titles, think-tank titles, and source references mentioned in assessment text must be active links to the referenced material or a source-search fallback.
- Every generated count, status label, likelihood statement, and current-event analytical claim must include an inline source/citation hover or focus control that lists the specific region-filtered articles used for that claim.
- Category counts must cite the matching category article set, not only the general feed. Example: missile/launch counts cite missile/launch-matching articles; nuclear counts cite nuclear-matching articles.
- Weather & Sea State must include a current weather map/embed when the reference watch-page pattern includes one, and the map must be visible on desktop and mobile.
- If the article API or cache is unavailable, the page must say the current feed is unavailable instead of rendering boilerplate as current analysis.
- No known stale boilerplate phrases remain visible in rendered watch sections.
- Referenced Reporting and Intelligence Feed must be region-filtered and must match the same theater used by the assessment logic.

## Output

- Pass/fail matrix by section.
- The current article counts and latest titles used to generate the assessment.
- Screenshot paths for desktop and mobile.
- DOM evidence showing dynamic containers were populated after feed load.
- DOM evidence that source/citation hover controls exist for Strategic Brief, Current Regional Assessment, Weather & Sea State, Force Comparison, Situational Status, and live-cache notes.
- Any stale/static statement that appears to be presented as current analysis.
