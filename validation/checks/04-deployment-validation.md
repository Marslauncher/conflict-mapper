# Deployment Validation

Use this as the final validation gate after code is pushed.

Do not make code changes during this validation pass. Produce findings only.

## Steps

1. Confirm latest commit was pushed to GitHub.
2. Wait 120 seconds for Cloudflare propagation.
3. Open production URLs with a cache-busting query string.
4. Capture desktop and mobile screenshots.
5. Verify the rendered production site matches the local validated layout.

## Check

- Production page loads HTTP 200.
- No framework/runtime error overlays.
- No blank content sections.
- Required sections are present and ordered correctly.
- Visual layout matches the approved reference screenshots.
- No obvious visual artifacts, clipping, overlap, or stale content.

## Output

- Commit hash validated.
- URLs tested.
- Screenshot paths.
- Pass/fail findings.
- Any differences between local and production rendering.
