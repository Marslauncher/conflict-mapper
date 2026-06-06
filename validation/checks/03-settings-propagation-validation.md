# Settings Propagation Validation

Use this as a validation gate after style, theme, or page-template changes.

Do not make code changes during this validation pass. Produce findings only.

## Check

Using the configured API token/password where required:

- Open settings menu.
- Change Style Settings.
- Change Text Size values.
- Change Theme values.
- Validate that settings propagate to:
  - Home page
  - China/Taiwan Watch
  - Korean Peninsula Watch
  - War Gaming Hub
  - Report/output pages
- No page ignores the selected theme.
- Text size variables affect headers, body text, commentary, navigation, and cards consistently.
- No card text overflows after large text size selection.
- Settings persist after reload and navigation.

## Output

- Pass/fail matrix by page and setting.
- Screenshots for at least one desktop and one mobile viewport.
- Any pages where CSS variables or local storage values do not propagate.
