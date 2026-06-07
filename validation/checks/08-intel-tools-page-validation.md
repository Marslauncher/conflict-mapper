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
- Hub cards that are not navigable to the correct destination: source-family/domain cards open a resource preview overlay, country/region cards open the country page or filtered section, and source cards open source URLs.
- Source-family/domain cards that scroll directly to the resource library instead of opening the preview overlay.
- Preview overlays missing website screenshot thumbnail markup and direct source links.
- Source cards missing inline website/resource previews.
- Modal resource cards that do not open the provider website when clicked.
- Modal resource card external-link previews using generic source-family copy instead of the specific provider title, URL, and summary.
- Modal resource action buttons using generic `Open Source` text instead of provider-specific labels.
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
- Clicking a domain card opens a resource preview overlay with provider cards, direct source links, and screenshot thumbnails where the source allows capture.
- Inside the resource preview overlay, clicking a provider card or its website screenshot opens that provider/tool website in a new tab.
- Hovering/focusing each provider card link shows a provider-specific preview. The title, summary, and URL must change per card; repeated generic source-family text is a failure.
- Clicking `Open Filtered Section` on a domain card filters the resource library to that source family.
- Clicking a country/region card opens its Intel Tools page when one exists; otherwise it scrolls to the filtered resource section.
- Clicking a source card opens the external tool URL; the explicit `Open` link still works.
- Text in chips, overlays, and cards follows the established uppercase mono-label style and remains readable in light/dark themes.

## Mitigation Rules

- Use explicit source-family matchers for resource counts. Do not infer counts from the first word of a category heading; the guide uses emoji and long headings.
- Source-family matchers must prefer category, provider name, and URL fields. Do not use broad notes text in a way that pulls unrelated news sources into technical domains such as Vessel Tracking.
- Keep count generation and overlay generation coupled. A count chip must be created from the same resource array used to render its overlay.
- Keep domain-card click behavior separate from filter navigation. Card click opens the preview overlay; only the explicit filtered-section control scrolls to the resource library.
- Modal resource cards must carry their own provider title/summary metadata for hover previews. Do not let external-source previews fall back to the modal header summary.
- Use provider-specific action text such as `Open marinetraffic.com`; avoid generic repeated labels like `Open Source` when a direct URL exists.
- Parse markdown links, explicit `https://` URLs, and bare domains such as `docs.planet.com`; do not silently convert these to `Reference only`.
- Do not create text-only link directories. Each page needs resource cards, overlays, website previews, code/output examples, and use-case commentary.
- Do not ship placeholder/template language. Replace page-contract wording with target-specific operational guidance before publishing.
- New generated country pages must be produced through `scripts/generate-intel-tool-pages.mjs`, then validated with `npm run validate:intel-tools`.
- After push, wait 120 seconds for Cloudflare, validate the production URL with a cache-busting query string, and record findings.
