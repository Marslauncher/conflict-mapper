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
- No unrelated global, Middle East, Europe, Africa, or generic non-regional articles appear unless directly tied to the theater.
- Feed filtering logic uses region, country, title, summary, and tag relevance, not the raw global cache.

## Output

- List article titles reviewed.
- Mark each article as `PASS regional` or `FAIL unrelated`.
- Identify the selector or data source used.
- Include suspected filtering function/file if failures are found.
