# Regional Feed Scope Validation

Use this as a validation gate before accepting feed or source-stack changes.

Do not make code changes during this validation pass. Produce findings only.

## Pages

- China/Taiwan Watch
- Korean Peninsula Watch

## Check

- Intelligence Feed contains only theater-relevant articles.
- Referenced Reporting contains only theater-relevant articles.
- Recent Think Tank Coverage is region-relevant.
- Watch pages do not render duplicate think-tank modules in both the assessment source stack and sidebar/feed column unless explicitly requested.
- If a think-tank module is removed to avoid clipping, verify the visible heading count and screenshot evidence rather than only checking old element IDs.
- Current Regional Assessment, Strategic Brief, and section notes use the same region-filtered article set as Referenced Reporting and Intelligence Feed.
- No unrelated global, Middle East, Europe, Africa, or generic non-regional articles appear unless directly tied to the theater.
- Feed filtering logic uses region, country, title, summary, and tag relevance, not the raw global cache.

## Output

- List article titles reviewed.
- Mark each article as `PASS regional` or `FAIL unrelated`.
- Identify the selector or data source used.
- Include suspected filtering function/file if failures are found.
