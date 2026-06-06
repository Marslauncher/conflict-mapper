# Report Generation Validation

Use this after generated report output changes or prompt changes.

Do not make code changes during this validation pass. Produce findings only.

## Check

For each report type:

- Run the report generation flow.
- Review the output against the requested report style.
- Confirm output is not text-only where visual cards, inline indicators, summaries, or matrices were requested.
- Confirm sources are relevant to the selected region/report type.
- Confirm generated sections preserve required titles and ordering.
- Confirm no raw prompt text, placeholder text, malformed HTML, or broken cards appear.

## Output

- Report type tested.
- Generated output location.
- Pass/fail against content, style, source relevance, and formatting.
- Specific defects with exact visible text or section names.
