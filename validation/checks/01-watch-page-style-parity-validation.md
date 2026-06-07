# Watch Page Style Parity Validation

Use this as a validation gate before accepting changes to an existing watch page.

Do not make code changes during this validation pass. Produce findings only.

## Check

- Strategic Brief appears above Current Regional Assessment.
- Strategic Brief uses a 2x2 responsive card grid on desktop and single-column cards on mobile.
- Cards use the compact visual treatment: surface/dark background, bordered card, colored icon/title header, bullet/list body, and clear separators.
- Section titles match required naming exactly:
  - Current Assessment
  - Things To Note
  - Things To Watch
  - Escalation Likelihood
- No plain oversized H3-only cards in the Strategic Brief.
- No text spacing defects such as `evidence.Routine` or `operational.Alert`.
- No duplicated, clipped, or partially hidden `Recent Think Tank Coverage` / regional-analysis modules inside the source stack, sidebar, or intelligence-feed area.
- Current Regional Assessment and Strategic Brief text are visibly populated from current region-filtered feed data or explicitly show a feed-unavailable state; no static boilerplate should masquerade as current analysis.
- Weather & Sea State includes the current weather map/embed pattern used by the reference watch page.
- Referenced article and think-tank titles in assessment text are active links, not plain text only.
- Strategic Brief, Current Regional Assessment, Weather & Sea State, Force Comparison, Situational Status, and live-cache notes expose inline source/citation hover controls for generated current-event statements and category counts.
- Citation controls pass count equality: visible `N` text, citation chip count, `data-source-count`, and linked overlay rows match exactly.
- Citation overlays open inward toward the center of the screen, stay within the viewport, and use scrollable overflow so long source lists are not clipped.
- Rendered text does not show hidden overlay fragments or punctuation defects such as standalone comma lines, `, and`, duplicate commas, `and.`, `or.`, `Newest direct item: from`, raw HTML, or visible `source articles listed` text outside an opened overlay.
- No overlap, clipping, unreadable contrast, or mobile overflow.
- Theme, text size, and style settings remain visually coherent.

## Output

- Pass/fail per requirement.
- Screenshot paths for desktop and mobile.
- A mismatch ledger with exact visible defects.
- Do not suggest broad redesigns unless a requirement cannot be met.
