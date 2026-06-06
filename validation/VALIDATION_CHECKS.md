# Conflict Mapper Validation Checks

Run validation gates before implementation rework when a defect may be visual, regional-scope, deployment, settings, template, or report-generation related. Each gate is intentionally findings-only; code changes should be made in a separate implementation pass after the mismatch ledger is clear.

## Gates

1. [Watch Page Style Parity Validation](checks/01-watch-page-style-parity-validation.md)
2. [Regional Feed Scope Validation](checks/02-regional-feed-scope-validation.md)
3. [Settings Propagation Validation](checks/03-settings-propagation-validation.md)
4. [Deployment Validation](checks/04-deployment-validation.md)
5. [Blank Watch Template Validation](checks/05-blank-watch-template-validation.md)
6. [Report Generation Validation](checks/06-report-generation-validation.md)

## Required Final Sequence

For change-modification requests that touch rendered pages, feeds, settings, prompts, or generated reports:

1. Run the relevant local validation gate and record findings.
2. Commit and push the implementation changes to GitHub.
3. Wait 120 seconds for Cloudflare propagation.
4. Open and validate the changed production pages on `https://conflictmapper.com`.
5. Capture screenshots and record any mistakes, visual artifacts, stale content, feed leakage, or settings propagation issues.
6. Report the validation findings in the final response.
