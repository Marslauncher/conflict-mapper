#!/usr/bin/env node

/**
 * Rendered watch-page citation validation.
 *
 * Usage:
 *   node scripts/validate-watch-citations.mjs http://127.0.0.1:5178/pages/korean-peninsula.html
 *
 * Requires Playwright to be resolvable in the runtime that invokes this script.
 * In environments without a project dependency, run it from a Playwright-enabled
 * validation shell or install Playwright in the validation environment.
 */

const targetUrl = process.argv[2];
if (!targetUrl) {
  console.error('Usage: node scripts/validate-watch-citations.mjs <url>');
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (error) {
  console.error('Playwright is required for rendered citation validation.');
  console.error(error?.message || error);
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const consoleMessages = [];
page.on('console', msg => {
  if (['warning', 'error'].includes(msg.type())) consoleMessages.push(`${msg.type()}: ${msg.text()}`);
});

try {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(9000);

  const staticChecks = await page.evaluate(() => {
    const visibleText = selector => [...document.querySelectorAll(selector)]
      .map(el => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll?.('.citation-popover').forEach(node => node.remove());
        return clone.innerText || clone.textContent || '';
      })
      .join('\n');
    const assessmentText = visibleText([
      '#current-summary',
      '#current-analysis',
      '#strategic-assessment-cards',
      '#map-assessment-note',
      '#section-02-weather',
      '#section-03-forces',
      '#section-05-sidebar-status',
      '#assessment-live-note'
    ].join(','));
    const punctuationDefects = [
      /(^|\n)\s*,\s*($|\n)/,
      /(^|\n)\s*,\s*and\b/,
      /,\s*,/,
      /\b(?:and|or)\s*\./,
      /Newest direct item:\s*(?:from|\.|,)/i
    ];
    const sourceLeak = /source article(?:s)? listed/i.test(assessmentText);
    const citations = [...document.querySelectorAll('.citation-ref')].map((ref, index) => {
      const chipText = ref.querySelector('.citation-chip')?.textContent || '';
      const chipMatch = chipText.match(/\d+/);
      const chipCount = chipMatch ? Number(chipMatch[0]) : null;
      const dataCount = Number(ref.dataset.sourceCount || NaN);
      const linkCount = ref.querySelectorAll('.citation-popover a[href]').length;
      return { index, chipText, chipCount, dataCount, linkCount };
    });
    const sourcedClaimMismatches = [...document.querySelectorAll('.sourced-claim')].map((claim, index) => {
      const statedCount = Number(claim.querySelector('strong')?.textContent?.match(/\d+/)?.[0] ?? NaN);
      const ref = claim.querySelector('.citation-ref');
      const linkCount = ref ? ref.querySelectorAll('.citation-popover a[href]').length : NaN;
      const dataCount = Number(ref?.dataset.sourceCount ?? NaN);
      return { index, statedCount, dataCount, linkCount };
    }).filter(claim => claim.statedCount !== claim.dataCount || claim.statedCount !== claim.linkCount);
    return {
      citationCount: citations.length,
      countMismatches: citations.filter(c => c.chipCount !== c.linkCount || c.dataCount !== c.linkCount),
      sourcedClaimMismatches,
      sourceLeak,
      punctuationHits: punctuationDefects.map(rx => rx.test(assessmentText)),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });

  const popoverFailures = [];
  const citationCount = await page.locator('.citation-ref').count();
  for (let index = 0; index < citationCount; index += 1) {
    const citation = page.locator('.citation-ref').nth(index);
    await citation.focus();
    await page.waitForTimeout(50);
    const result = await page.evaluate(i => {
      const ref = document.querySelectorAll('.citation-ref')[i];
      const pop = ref?.querySelector('.citation-popover');
      if (!ref || !pop) return { index: i, missing: true };
      const trigger = ref.getBoundingClientRect();
      const rect = pop.getBoundingClientRect();
      const style = getComputedStyle(pop);
      const viewport = { width: innerWidth, height: innerHeight };
      const offscreen = rect.left < 0 || rect.top < 0 || rect.right > viewport.width || rect.bottom > viewport.height;
      const scrollable = pop.scrollHeight > pop.clientHeight ? ['auto', 'scroll'].includes(style.overflowY) : true;
      const fullWidthMobile = viewport.width <= 480 && rect.left >= 0 && rect.right <= viewport.width;
      const opensInward = fullWidthMobile
        ? true
        : (trigger.left < viewport.width / 2
          ? rect.left >= trigger.left - 4
          : rect.right <= trigger.right + 4);
      return {
        index: i,
        display: style.display,
        position: style.position,
        offscreen,
        scrollable,
        opensInward,
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
        trigger: { left: trigger.left, right: trigger.right }
      };
    }, index);
    if (result.missing || result.display === 'none' || result.position !== 'fixed' || result.offscreen || !result.scrollable || !result.opensInward) {
      popoverFailures.push(result);
    }
    await page.evaluate(() => {
      document.activeElement?.blur?.();
      document.querySelectorAll('.citation-ref.is-active').forEach(ref => ref.classList.remove('is-active'));
    });
  }

  const failures = {
    countMismatches: staticChecks.countMismatches,
    sourcedClaimMismatches: staticChecks.sourcedClaimMismatches,
    punctuationHits: staticChecks.punctuationHits,
    sourceLeak: staticChecks.sourceLeak,
    overflowX: staticChecks.overflowX,
    popoverFailures,
    consoleMessages
  };
  const failed = failures.countMismatches.length
    || failures.sourcedClaimMismatches.length
    || staticChecks.citationCount === 0
    || failures.punctuationHits.some(Boolean)
    || failures.sourceLeak
    || failures.overflowX
    || failures.popoverFailures.length
    || failures.consoleMessages.length;

  console.log(JSON.stringify({ targetUrl, staticChecks, popoverFailures, consoleMessages }, null, 2));
  if (failed) process.exit(1);
} finally {
  await browser.close();
}
