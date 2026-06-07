# Intel Tools Page Validation

Use this gate before creating or publishing any new Intel Tools hub, country, region, or deep-dive resource page.

## Automated Check

Run:

```bash
npm run validate:intel-tools
```

The check must pass before commit. It fails on the specific regressions that previously reached review:

- Global resource-domain cards resolving to `0 resources`, especially Flight & Aircraft Tracking and Vessel Tracking.
- Resource/count chips without hover overlays listing the exact resources behind the count.
- Hub cards that are not navigable to a subpage, filtered section, or source URL.
- Source cards missing inline website/resource previews.
- Info/resource bubbles missing the established overlay assets or style hooks.
- Prompt/template copy leaking into rendered pages.
- Broken internal links, invalid external URLs, or missing link-preview assets.
- Generated country pages missing website preview modules, code/output examples, or per-card info overlays.

## Manual Browser Check

Open the changed page locally and then in production after push.

Check desktop and mobile widths:

- No horizontal overflow.
- No clipped overlays; overlay content scrolls when long.
- Hovering/focusing a resource count opens a resource list whose item count matches the visible number.
- Hovering/focusing a non-local website link opens an external-source preview.
- Clicking a domain card filters the resource library to that source family.
- Clicking a country/region card opens its Intel Tools page when one exists; otherwise it scrolls to the filtered resource section.
- Clicking a source card opens the external tool URL; the explicit `Open` link still works.
- Text in chips, overlays, and cards follows the established uppercase mono-label style and remains readable in light/dark themes.

## Mitigation Rules

- Use explicit source-family matchers for resource counts. Do not infer counts from the first word of a category heading; the guide uses emoji and long headings.
- Keep count generation and overlay generation coupled. A count chip must be created from the same resource array used to render its overlay.
- Do not create text-only link directories. Each page needs resource cards, overlays, website previews, code/output examples, and use-case commentary.
- Do not ship placeholder/template language. Replace page-contract wording with target-specific operational guidance before publishing.
- New generated country pages must be produced through `scripts/generate-intel-tool-pages.mjs`, then validated with `npm run validate:intel-tools`.
- After push, wait 120 seconds for Cloudflare, validate the production URL with a cache-busting query string, and record findings.
