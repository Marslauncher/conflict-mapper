# Task 1 Prompt - Scenario Deep Review Expansion

## Objective

For the "Scenario Deep Review" sections on both `pages/taiwan-war-games.html` and `pages/korean-peninsula-war-games.html`, turn each scenario card into a comprehensive analysis and summarized reference section.

## Requirements

- Each scenario card should include:
  - Direct links to source reports/articles where available.
  - A concise summary.
  - An expanded analysis.
  - Tables or structured factor breakdowns where they improve readability.
  - Relevant sourced imagery or maps where licensing permits.
  - A 3-5 sentence outcome footer explaining the result/outcome of the referenced war-game report or scenario.
  - Citation list for every external source, image, map, or dataset.
- Avoid wall-of-text cards. Use sectioned content, compact tables, timelines, expandable details, or summary chips.
- Do not use arbitrary made-up images.
- Preserve global style variables from `assets/user-style.js`.
- Keep mobile layout readable.

## Source Inputs

- `datasources/ChinaTaiwanWarGaming.csv`
- `datasources/KoreanPeninsula.csv`
- `datasources/Recent Korean Peninsula published war gaming scena.md`
- Existing page content in:
  - `pages/taiwan-war-games.html`
  - `pages/korean-peninsula-war-games.html`

## Validation

- Source links open to the specific report/article where possible, not merely the main organization home page.
- Each scenario has an outcome footer.
- No HTML syntax errors.
- Desktop and mobile browser screenshots show readable content without overflow.
