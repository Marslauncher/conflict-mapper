import fs from 'fs';
import path from 'path';
import './rebuild-flagship-war-game-pages.mjs';

process.exit(0);

const ROOT = process.cwd();

const FORCE_REPORTS = [
  {
    slug: 'china-vs-allied-naval-forces-taiwan',
    title: 'China vs. US/Allied Naval Forces: Taiwan Invasion Capability Comparison',
    subtitle: 'PLAN amphibious, surface, undersea, and dual-use maritime capability against US, Taiwan, Japan, and allied counters.',
    sourceDir: 'datasources/China vs. US Allied Naval Forces  Taiwan Invasion Capability Comparison (Updated) ',
    markdown: 'China-vs-Allied-Naval-Taiwan-v2.md',
    accent: '#22d3ee',
  },
  {
    slug: 'air-power-china-vs-allies-taiwan',
    title: 'Air Power Comparison: PLAAF/PLAN Aviation vs. US & Allied Air Forces',
    subtitle: 'Stealth aircraft, bombers, drones, missile ranges, ISR, and allied airpower in a Taiwan contingency.',
    sourceDir: 'datasources/Air Power Comparison  PLAAF PLAN Aviation vs. US & Allied Air Forces — Taiwan Scenario',
    markdown: 'Air-Forces-China-vs-Allies-Taiwan.md',
    accent: '#60a5fa',
  },
  {
    slug: 'army-forces-china-vs-allies-taiwan',
    title: 'Army Forces Comparison: PLA Ground Forces vs. US Army & Allied Armies',
    subtitle: 'Ground maneuver, long-range fires, armored forces, Taiwan defense, and allied land-domain counters.',
    sourceDir: 'datasources/Army Forces Comparison  PLA Ground Forces vs. US Army & Allied Armies — Taiwan Scenario',
    markdown: 'Army-Forces-China-vs-Allies-Taiwan.md',
    accent: '#f59e0b',
  },
  {
    slug: 'marines-china-vs-allies-taiwan',
    title: 'Marines Comparison: PLAN Marine Corps vs. USMC & Allied Amphibious Forces',
    subtitle: 'Marine force structure, amphibious assault vehicles, island-chain fires, aviation, and allied littoral forces.',
    sourceDir: 'datasources/Marines Comparison  PLAN Marine Corps vs. USMC & Allied Amphibious Forces — Taiwan Scenario',
    markdown: 'Marines-China-vs-Allies-Taiwan.md',
    accent: '#34d399',
  },
  {
    slug: 'special-forces-china-vs-allies-taiwan',
    title: 'Special Forces Comparison: China PLA/PAP SOF vs. US JSOC & Allied SOF',
    subtitle: 'SOF architecture, maritime raids, reconnaissance, sabotage, drones, and crisis-opening special operations risk.',
    sourceDir: 'datasources/Special Forces Comparison  China PLA PAP SOF vs. US JSOC & Allied Special Operations Forces — Taiwan Scenario',
    markdown: 'SpecialForces-China-vs-Allies-Taiwan.md',
    accent: '#c084fc',
  },
];

const SOURCE_LINKS = {
  taiwan: [
    ['CIA Taiwan Physiography', 'https://www.cia.gov/resources/map/taiwan/'],
    ['CSIS First Battle of the Next War', 'https://www.csis.org/analysis/first-battle-next-war-wargaming-chinese-invasion-taiwan'],
    ['CSIS Lights Out blockade game', 'https://www.csis.org/analysis/lights-out-wargaming-chinese-blockade-taiwan'],
    ['CNAS Dangerous Straits', 'https://www.cnas.org/publications/reports/dangerous-straits-wargaming-a-future-conflict-over-taiwans'],
    ['War on the Rocks PRC-perspective game', 'https://warontherocks.com/a-wargame-to-take-taiwan-from-chinas-perspective/'],
  ],
  korea: [
    ['CIA North Korea maps', 'https://www.cia.gov/resources/map/north-korea/'],
    ['CIA South Korea maps', 'https://www.cia.gov/resources/map/south-korea/'],
    ['Atlantic Council Guardian Tiger I/II', 'https://www.atlanticcouncil.org/in-depth-research-reports/report/a-rising-nuclear-double-threat-in-east-asia-insights-from-our-guardian-tiger-i-and-ii-tabletop-exercises/'],
    ['ODNI/NIC North Korea nuclear scenarios', 'https://www.dni.gov/files/ODNI/documents/assessments/NIC-Declassified-NIE-North-Korea-Scenarios-For-Leveraging-Nuclear-Weapons-June2023.pdf'],
    ['RAND Three Dangerous Scenarios', 'https://www.rand.org/content/dam/rand/pubs/perspectives/PE200/PE262/RAND_PE262.pdf'],
  ],
};

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function inlineMarkdown(value) {
  return esc(value)
    .replace(/\[\^(\d+)\]/g, '<sup><a href="#ref-$1">[$1]</a></sup>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function parseReferences(lines) {
  const refs = {};
  let inRefs = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^##\s+References/i.test(line)) {
      inRefs = true;
      continue;
    }
    if (!inRefs) continue;
    const match = line.match(/^(\d+)\.\s*(.+)$/);
    if (match) refs[match[1]] = match[2];
  }
  return refs;
}

function resolveImage(src, report, caption) {
  if (/^https?:\/\//i.test(src)) return { src, local: false, caption };
  const sourcePath = path.join(ROOT, report.sourceDir, src);
  const relTarget = path.join('assets', 'force-comparison', report.slug, src);
  const targetPath = path.join(ROOT, relTarget);
  if (fs.existsSync(sourcePath)) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    return { src: `/${relTarget.replaceAll(path.sep, '/')}`, local: true, caption };
  }
  return { src, local: false, caption };
}

function markdownToHtml(markdown, report) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const refs = parseReferences(lines);
  const parts = [];
  let i = 0;
  let imageCounter = 0;
  while (i < lines.length) {
    let line = lines[i].trim();
    if (!line || line === '***' || line === '---') {
      i += 1;
      continue;
    }
    if (/^##\s+References/i.test(line)) break;
    if (/^!\[.*?\]\((.+?)\)/.test(line)) {
      const match = line.match(/^!\[(.*?)\]\((.+?)\)/);
      const src = match?.[2] || '';
      const next = (lines[i + 1] || '').trim();
      const caption = next && !next.startsWith('#') && !next.startsWith('|') && !next.startsWith('![') ? next : (match?.[1] || `Report image ${imageCounter + 1}`);
      const image = resolveImage(src, report, caption);
      imageCounter += 1;
      parts.push(`<figure class="report-figure"><img src="${esc(image.src)}" alt="${esc(caption)}" loading="lazy"><figcaption>${inlineMarkdown(caption)}${image.local ? ' · local source copy' : ''}</figcaption></figure>`);
      i += caption === next ? 2 : 1;
      continue;
    }
    if (/^!\[.*?\]$/.test(line)) {
      const caption = line.replace(/^!\[/, '').replace(/\]$/, '').trim();
      if (caption) parts.push(`<p class="image-note">${inlineMarkdown(caption)}</p>`);
      i += 1;
      continue;
    }
    if (line.startsWith('|') && lines[i + 1]?.trim().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      parts.push(tableToHtml(tableLines));
      continue;
    }
    if (/^#{1,4}\s+/.test(line)) {
      const level = Math.min(4, line.match(/^#+/)?.[0].length || 2);
      const text = line.replace(/^#+\s+/, '');
      const id = slugify(text);
      parts.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineMarkdown(lines[i].trim().replace(/^[-*]\s+/, ''))}</li>`);
        i += 1;
      }
      parts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    const para = [];
    while (i < lines.length) {
      const current = lines[i].trim();
      if (!current || current.startsWith('#') || current.startsWith('|') || current.startsWith('![') || current === '***' || current === '---') break;
      para.push(current);
      i += 1;
    }
    parts.push(`<p>${inlineMarkdown(para.join(' '))}</p>`);
  }
  const refHtml = Object.entries(refs).map(([num, text]) => {
    const html = inlineMarkdown(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return `<li id="ref-${num}">${html}</li>`;
  }).join('');
  return `${parts.join('\n')}\n<section class="references"><h2>References</h2><ol>${refHtml}</ol></section>`;
}

function tableToHtml(lines) {
  const rows = lines
    .filter((line, idx) => idx !== 1 || !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
    .map((line) => line.replace(/^\||\|$/g, '').split('|').map((cell) => inlineMarkdown(cell.trim())));
  if (!rows.length) return '';
  const [head, ...body] = rows;
  return `<div class="table-wrap"><table><thead><tr>${head.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function forcePage(report) {
  const sourcePath = path.join(ROOT, report.sourceDir, report.markdown);
  const markdown = fs.readFileSync(sourcePath, 'utf8');
  const body = markdownToHtml(markdown, report);
  const sourceRel = `${report.sourceDir}/${report.markdown}`;
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(report.title)} - Conflict Mapper</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<script src="/assets/user-style.js"></script>
<style>${reportCss(report.accent)}</style>
</head>
<body>
<nav class="top-nav"><a class="brand" href="../index.html">CONFLICT <span>MAPPER</span></a><div class="nav-links"><a href="taiwan-war-games.html">Taiwan War Games</a><a href="taiwan-contingency-ai-chip-war.html">Final Scenario</a><a href="../index.html">Hub</a></div></nav>
<header class="hero"><div class="hero-inner"><div class="eyebrow">Taiwan Force Comparison // Source Report</div><h1>${esc(report.title)}</h1><p>${esc(report.subtitle)}</p><div class="source-note">Generated from local datasource: <code>${esc(sourceRel)}</code></div></div></header>
<main class="section report-content">${body}</main>
</body>
</html>`;
}

function reportCss(accent) {
  return `:root{--bg:#080b10;--surface:#10141c;--surface-2:#151b26;--surface-3:#1e2736;--border:rgba(255,255,255,.1);--accent:${accent};--text:#e5e7eb;--muted:#a7b0c0;--faint:#667085;--font-display:'Rajdhani',sans-serif;--font-mono:'Share Tech Mono',monospace;--font-body:'Inter',sans-serif;--radius:8px}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,color-mix(in srgb,var(--accent) 12%,transparent),transparent 34rem),var(--bg);color:var(--text);font-family:var(--font-body);line-height:1.65}.top-nav{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:18px;min-height:56px;padding:10px 24px;background:rgba(8,11,16,.94);border-bottom:1px solid color-mix(in srgb,var(--accent) 32%,transparent);backdrop-filter:blur(12px)}.brand{font-family:var(--font-display);font-weight:700;letter-spacing:.14em;color:#fff;text-decoration:none}.brand span{color:var(--accent)}.nav-links{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap}.nav-links a{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.08em;color:var(--muted);padding:6px 9px;border-radius:5px;text-decoration:none}.nav-links a:hover{background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--accent)}.hero{padding:54px 24px 34px;border-bottom:1px solid var(--border);background:linear-gradient(155deg,rgba(15,23,42,.9),rgba(8,11,16,.94))}.hero-inner,.section{width:var(--cm-content-max-width,min(90vw,calc(100vw - 32px)));max-width:none;margin:0 auto}.eyebrow,.source-note{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}.hero h1{font-family:var(--font-display);font-size:clamp(2.1rem,5vw,4.4rem);line-height:.98;margin:10px 0 14px;letter-spacing:.05em;text-transform:uppercase}.hero p{max-width:1120px;color:var(--muted);font-size:1.05rem}.source-note{margin-top:18px;color:var(--faint);text-transform:none;letter-spacing:.05em}.report-content{padding:42px 24px}.report-content h1{display:none}.report-content h2{font-family:var(--font-display);font-size:1.8rem;letter-spacing:.09em;text-transform:uppercase;margin:42px 0 14px;color:#fff;border-bottom:1px solid var(--border);padding-bottom:8px}.report-content h3{font-family:var(--font-display);font-size:1.35rem;letter-spacing:.06em;margin:28px 0 10px;color:#fff}.report-content h4{font-family:var(--font-display);font-size:1.05rem;letter-spacing:.05em;color:var(--accent)}p,li{color:var(--muted);font-size:var(--cm-article-text-size,15pt)}a{color:var(--accent)}code{font-family:var(--font-mono);color:#fff}.report-figure{margin:22px 0;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)}.report-figure img{width:100%;max-height:520px;object-fit:cover;display:block;background:#0f172a}.report-figure figcaption{font-family:var(--font-mono);font-size:.74rem;color:var(--muted);padding:10px 12px;border-top:1px solid var(--border)}.table-wrap{overflow:auto;border:1px solid var(--border);border-radius:var(--radius);margin:18px 0;background:var(--surface)}table{width:100%;border-collapse:collapse;min-width:720px}th,td{padding:10px 12px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);vertical-align:top}th{font-family:var(--font-mono);font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);background:var(--surface-2);text-align:left}td{color:var(--muted)}.references{margin-top:42px;padding:22px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)}.references h2{margin-top:0}.references li{font-size:.88rem;overflow-wrap:anywhere}@media(max-width:820px){.top-nav{align-items:flex-start;flex-wrap:wrap}.brand{width:100%}.nav-links{width:100%;margin-left:0}.report-content{padding:30px 12px}.report-figure img{max-height:340px}table{min-width:640px}}`;
}

function replaceSection(html, sectionId, replacement) {
  const start = html.indexOf(`<section class="section" id="${sectionId}"`);
  if (start === -1) throw new Error(`Missing section ${sectionId}`);
  const next = html.indexOf('\n<section class="section"', start + 10);
  const end = next === -1 ? html.indexOf('\n</body>', start) : next;
  if (end === -1) throw new Error(`Cannot find end for section ${sectionId}`);
  return `${html.slice(0, start)}${replacement.trim()}\n${html.slice(end)}`;
}

function forceComparisonIndex() {
  return `<section class="section" id="force-comparison">
  <h2 class="section-title"><span class="sec-num">07</span>Taiwan Force Comparison Reports</h2>
  <div class="callout" style="margin-bottom:18px"><strong>Section replacement:</strong> The former munitions card grid has been replaced with full comparison reports. Each page preserves the local report structure, source imagery, side-by-side tables, and references.</div>
  <div class="source-grid">
    ${FORCE_REPORTS.map((report) => `<a class="source-card" href="${report.slug}.html"><div class="source-title">${esc(report.title)}</div><div class="source-meta">Dedicated comparison report</div><div class="source-summary">${esc(report.subtitle)}</div></a>`).join('\n    ')}
    <a class="source-card" href="taiwan-contingency-ai-chip-war.html"><div class="source-title">Taiwan Contingency Strategic Risk Game</div><div class="source-meta">Final analysis page</div><div class="source-summary">A non-operational strategic risk assessment of a crisis-stacked Taiwan contingency, escalation pathways, warning markers, and geopolitical outcomes.</div></a>
  </div>
</section>`;
}

function taiwanGeometry() {
  return `<section class="section" id="geometry">
  <h2 class="section-title"><span class="sec-num">04</span>Operational Geometry</h2>
  <div class="terrain-grid">
    <figure class="terrain-figure"><img src="/assets/maps/taiwan-physiography-cia-2022.jpg" alt="CIA physiographic map of Taiwan" loading="lazy"><figcaption>CIA Taiwan physiography map. The western coastal plain carries the decisive ports, airfields, cities, and road/rail density; the central and eastern mountain spine limits large-scale maneuver.</figcaption></figure>
    <div class="card terrain-card"><h3>What The Map Is Testing</h3><p>Taiwan's geometry is not a generic island diagram. Invasion games should focus on cross-strait lift, west-coast lodgment sustainment, Penghu/Kinmen/Matsu forward geography, runway repair, port denial, and anti-ship fires. Blockade games shift outward to the Taiwan Strait, Luzon/Bashi access, East China Sea/Okinawa approaches, and commercial energy/shipping routes.</p><ul><li><strong>Western coastal plain:</strong> the decisive urban, port, airfield, and logistics belt.</li><li><strong>Central Mountain Range:</strong> a maneuver barrier that complicates rapid interior expansion.</li><li><strong>Bashi/Luzon and Okinawa approaches:</strong> routes that determine blockade endurance and allied access.</li></ul></div>
    <figure class="terrain-figure"><img src="/assets/maps/taiwan-operation-causeway-1944.jpg" alt="Operation Causeway historical Taiwan map" loading="lazy"><figcaption>Operation Causeway historical planning map. Its continued relevance is not as a current invasion plan, but as a reminder that Taiwan's beaches, ports, weather, and mountain barrier have shaped campaign planning for decades.</figcaption></figure>
    <div class="card terrain-card"><h3>Current Relevance</h3><p>CSIS invasion and blockade games converge on the same terrain logic: ports and airfields must be denied, repaired, or opened; lift must be sustained across contested water; and political endurance depends on whether Taiwan can keep essential supply, communications, and command functions alive. The map layer should therefore support indicator tracking, not decorative arrows.</p><div class="citation-list">${SOURCE_LINKS.taiwan.map(([label, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`).join('')}</div></div>
  </div>
</section>`;
}

function koreaGeometry() {
  return `<section class="section" id="geometry">
  <h2 class="section-title"><span class="sec-num">03</span>Operational Geometry</h2>
  <div class="terrain-grid">
    <figure class="terrain-figure"><img src="/assets/maps/north-korea-physiography-cia-2020.jpg" alt="CIA physiographic map of North Korea" loading="lazy"><figcaption>CIA North Korea physiography map. Mountain corridors, river lines, and constrained road networks shape force movement, missile dispersal, logistics, and regime-survival planning.</figcaption></figure>
    <figure class="terrain-figure"><img src="/assets/maps/south-korea-physiography-cia-2018.jpg" alt="CIA physiographic map of South Korea" loading="lazy"><figcaption>CIA South Korea physiography map. The Seoul-Incheon-Han River corridor concentrates political, military, logistics, and population risk close to the DMZ.</figcaption></figure>
    <div class="card terrain-card"><h3>What The Map Is Testing</h3><p>Korea's geometry is compressed by distance, terrain, and escalation timelines. The DMZ/Kaesong-Heights-to-Seoul corridor places political, C2, airbase, and logistics nodes under immediate artillery, missile, SOF, drone, cyber, and nuclear-coercion pressure. Mountain chains and river corridors constrain maneuver, while the Yellow Sea/Incheon approach, Busan/Korea Strait logistics path, and Japan base network determine whether the fight stays local or becomes regional.</p></div>
    <figure class="terrain-figure"><img src="/assets/maps/korea-pusan-perimeter-usacmh.jpg" alt="Pusan Perimeter historical map" loading="lazy"><figcaption>Pusan Perimeter historical context map. Its modern relevance is logistics and depth: Korea's ports, interior routes, and southern sustainment nodes still matter if a crisis expands beyond the opening DMZ/Seoul shock.</figcaption></figure>
    <div class="card terrain-card"><h3>Historical Challenge, Current Relevance</h3><p>The Korean War showed how terrain, road density, ports, mountain corridors, and outside intervention could change campaign tempo faster than initial battle lines suggested. Today, precision fires, nuclear coercion, drones, cyber disruption, and space dependence compress the same geography into shorter decision windows. Guardian Tiger and the ODNI/NIC nuclear-scenario work support treating Korea as a nuclear-coercion and dual-contingency theater, not just a conventional ground campaign.</p><div class="citation-list">${SOURCE_LINKS.korea.map(([label, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`).join('')}</div></div>
  </div>
</section>`;
}

function scenarioOutcomeCss() {
  return `.outcome-footer{margin-top:14px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);border-radius:var(--radius);background:color-mix(in srgb,var(--accent) 8%,transparent)}.outcome-footer strong{display:block;font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;color:#fff;margin-bottom:4px}.outcome-footer p{margin:0;color:var(--muted)}.terrain-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.terrain-figure{margin:0;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)}.terrain-figure img{width:100%;height:420px;object-fit:cover;display:block}.terrain-figure figcaption{font-family:var(--font-mono);font-size:.72rem;color:var(--muted);padding:10px 12px;border-top:1px solid var(--border)}.terrain-card ul{margin:10px 0 0;padding-left:18px;color:var(--muted)}.citation-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.citation-list a{font-family:var(--font-mono);font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--border);border-radius:5px;padding:5px 8px;color:var(--accent);text-decoration:none}@media(max-width:820px){.terrain-grid{grid-template-columns:1fr}.terrain-figure img{height:300px}}`;
}

function addCss(html) {
  if (html.includes('.outcome-footer')) return html;
  return html.replace('</style>', `${scenarioOutcomeCss()}\n</style>`);
}

function appendOutcomeFooters(html, page) {
  const outcomes = page === 'taiwan' ? [
    ['Full Amphibious Invasion', 'Outcome hinges less on first-salvo damage than on whether PLA follow-on lift survives. Taiwan coherence, runway repair, submarine attrition, and Japanese base access decide whether a lodgment becomes sustainable. Logistics mobilization and port controls are stronger indicators than routine air incursions.'],
    ['Blockade Or Quarantine', 'Outcome is driven by legal unity, commercial shipping behavior, and Taiwan stockpile endurance. A blockade can remain below clear invasion thresholds while still creating strategic collapse pressure. Insurer advisories, exclusion zones, cable incidents, customs actions, and convoy debates are leading markers.'],
    ['Escalation And Preemption', 'Outcome depends on whether both sides can fight without expanding the war faster than leaders can control. Japan, Guam, cyber effects, and nuclear signaling are part of the Taiwan battlespace. Political authorization and escalation-management signals should be tracked beside force movement.'],
    ["Taking Taiwan From Beijing's Perspective", 'Outcome favors Beijing if coercion creates paralysis before outside support looks credible. The military campaign is only one lane in a broader information, diplomatic, legal, and intimidation sequence. Synchronized propaganda, lawfare, selective mobilization, and elite-pressure messaging matter.'],
    ['Exercise-To-Crisis Conversion', 'Outcome depends on correctly distinguishing rehearsal, coercive signaling, and operational cover. Exercises become dangerous when they alter logistics, civilian behavior, command posture, or legal authorities. Reserve activation, port restrictions, emergency legislation, civil-defense activity, and distributed C2 are high-signal indicators.'],
    ['Dual-Contingency Stress', 'Outcome is coupled through shared ISR, munitions, missile defense, tankers, submarines, and Japanese basing. A Korean crisis can degrade Taiwan options even without direct PRC-Taiwan escalation. Korea launch tempo and Japanese political constraints should feed the Taiwan assessment.'],
  ] : [
    ['Limited Strike To Tactical Nuclear Use', 'Outcome turns on whether the alliance has credible response options between symbolic conventional strikes and runaway nuclear escalation. Guardian Tiger shows Seoul and Washington can diverge under chemical or limited nuclear pressure. Missile dispersal, chemical rhetoric, SOF/drone activity, and C2-delegation hints are critical warnings.'],
    ['Dual-Adversary Escalation', 'Outcome is shaped by simultaneous Korea/Taiwan demand on finite US and allied assets. DPRK opportunism can convert a Taiwan crisis into a two-theater deterrence failure. Taiwan crisis markers, DPRK launch tempo, Chinese support to North Korea, and Japanese base politics must be tracked together.'],
    ['Nuclear Use In Space', 'Outcome depends on satellite resilience, legal framing, attribution, and preplanned proportional responses. A space nuclear event can impose strategic effects without immediate mass casualties, complicating escalation control. Satellite launches, GPS disruption, cyber preparation, SOF movement, and airbase attack indicators become linked.'],
    ['Nuclear Leverage Pathways', 'Outcome is most likely to follow coercive risk-taking under a nuclear shield, not immediate all-out nuclear war. The alliance must separate existential regime-defense signals from bargaining intimidation. Limited provocations become more dangerous when paired with nuclear rhetoric and launcher dispersal.'],
    ['Drone Warfare And Armor Attrition', 'Outcome depends on whether armor, artillery, logistics, and counteroffensive forces can survive persistent ISR-strike loops. Taiwan can drain the same ISR and precision-munition stocks Korea needs. Drone-unit movement, EW posture, counter-drone procurement, artillery ammunition, and force-protection changes are key markers.'],
    ['Nuclear-Cognitive Warfare', 'Outcome can shift before nuclear use if Pyongyang fractures Seoul-Washington risk perception. Nuclear narratives, cyber disruption, evacuation rumors, and selective leaks can slow alliance decision cycles. Information operations should be treated as operational indicators, not background noise.'],
  ];
  for (const [heading, outcome] of outcomes) {
    const headingIdx = html.indexOf(`<h3>${heading}</h3>`);
    if (headingIdx === -1 || html.slice(headingIdx, headingIdx + 1500).includes('outcome-footer')) continue;
    const closeIdx = html.indexOf('</article>', headingIdx);
    if (closeIdx !== -1) {
      html = `${html.slice(0, closeIdx)}<div class="outcome-footer"><strong>Outcome</strong><p>${esc(outcome)}</p></div>\n      ${html.slice(closeIdx)}`;
    }
  }
  return html;
}

function finalScenarioPage() {
  return `<!DOCTYPE html><html lang="en" data-theme="light"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Taiwan Contingency Strategic Risk Game - Conflict Mapper</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"><script src="/assets/user-style.js"></script><style>${reportCss('#f43f5e')}.phase-grid{display:grid;gap:14px}.phase-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:16px}.phase-card h3{margin-top:0}.risk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.warning-list li{margin-bottom:8px}</style></head><body><nav class="top-nav"><a class="brand" href="../index.html">CONFLICT <span>MAPPER</span></a><div class="nav-links"><a href="taiwan-war-games.html">Taiwan War Games</a><a href="korean-peninsula-war-games.html">Korea War Games</a><a href="../index.html">Hub</a></div></nav><header class="hero"><div class="hero-inner"><div class="eyebrow">Strategic Risk Game // Non-operational assessment</div><h1>Taiwan Contingency Strategic Risk Game</h1><p>A high-level, source-backed assessment of a crisis-stacked Taiwan contingency involving uncrewed systems, semiconductor stakes, Iran/Korea distraction scenarios, escalation risk, and likely geopolitical aftermath. This page is intentionally strategic and non-operational: it does not provide targeting instructions or attack sequencing.</p></div></header><main class="section report-content">
<h2>Executive Judgment</h2><p>The proposed scenario is strategically plausible as a stress test but extremely high-risk for Beijing. A short, clean one-to-two week fait accompli remains unlikely because Taiwan's geography, urban density, sea-lift requirements, allied intelligence, submarine and airpower risks, sanctions, and semiconductor fragility make campaign termination hard to control. The most likely outcome is not rapid global dominance but a catastrophic regional war with global economic shock, severe PLA losses, contested escalation, and long-term technological decoupling.</p>
<div class="risk-grid"><div class="phase-card"><h3>Most Likely Outcome</h3><p>China may create a temporary lodgment or blockade shock, but full surrender in 1-2 weeks is unlikely unless Taiwan's political system collapses early. Allied intervention would probably convert the campaign into a broader denial and attrition fight.</p></div><div class="phase-card"><h3>Escalation Risk</h3><p>Simultaneous Iran and Korea crises increase miscalculation, reduce munitions depth, and stress command attention, but they also make Chinese intent easier to infer if indicators cluster across theaters.</p></div><div class="phase-card"><h3>Semiconductor Result</h3><p>Even if major fabs are not intentionally destroyed, production would likely halt from power, water, labor, chemical supply, export-control, insurance, shipping, and tool-maintenance disruption.</p></div></div>
<h2>Source Basis</h2><p>This assessment synthesizes public war games and analyses including CSIS invasion and blockade games, CNAS Dangerous Straits, War on the Rocks PRC-perspective game, Atlantic Council Guardian Tiger I/II, ODNI/NIC North Korea nuclear scenarios, and local Conflict Mapper force-comparison reports.</p>
<h2>Phase Model</h2><div class="phase-grid">${[
['Planning And Preparation','Strategic warning would likely be indirect: legal authorities, civilian shipping/aviation controls, cyber preparation, blood/medical movement, reserve patterns, ammunition logistics, sanctions-hardening, and port/rail behavior. The most meaningful signs would be cross-domain clustering rather than a single dramatic mobilization event.'],
['Obfuscation','Beijing would benefit from normalizing exercises, coast guard activity, cyber pressure, and information operations. A simultaneous Iran/Korea crisis could mask attention and inventory stress, but a synchronized pressure pattern across Taiwan, Korea, Japan, and Middle East logistics would itself be a warning marker.'],
['Chaos Unleashed','The opening strategic goal would be paralysis: saturating decision cycles with cyber disruption, information shock, limited kinetic effects, blockade/exclusion notices, drone activity, and diplomatic threats. The defender goal would be continuity of government, communications, runway/port repair, and rapid coalition framing.'],
['T-Day','A decisive attack would almost certainly expose intent immediately. Even uncrewed platforms require command links, maritime launch paths, logistics, munitions, targeting, and recovery/sustainment patterns. Surprise may improve the first hours but does not remove the cross-strait sustainment problem.'],
['Beachhead Contest','The central question is whether a lodgment becomes logistically sustainable. Taiwan and allied forces would focus on denying ports, isolating landing areas, preserving distributed fires, and attacking lift. Beijing would need political shock to outrun military attrition.'],
['Allied Counterresponse','Likely responses include cyber defense/offense, sanctions, maritime exclusion challenges, air and missile defense reinforcement, submarine operations, long-range conventional strike debates, diplomatic coalition building, and emergency industrial mobilization. Nuclear signaling risk rises if either side believes conventional parity is collapsing.'],
['Days 1-7','The first week decides whether the crisis becomes a fait accompli attempt, blockade endurance contest, or regional war. Watch for Taiwan government continuity, Japanese base authorization, US submarine/airbase posture, PLA lift losses, DPRK launch tempo, and global shipping/insurance reactions.'],
['Weeks 1-2','If Taiwan has not politically collapsed, Beijing faces a widening attrition problem: sustained logistics, sanctions, casualty visibility, semiconductor shutdown, alliance mobilization, and regime-risk narratives. If Taiwan command fractures, allied choices become harder and escalation risks spike.'],
['Escalation','High-end escalation could include strikes against regional bases, cyber effects on critical infrastructure, space interference, blockade expansion, and nuclear signaling. This page does not model target packages; it treats escalation as a political-military decision problem with severe uncertainty.'],
['Outcome','My assessment: a rapid Chinese surrender-forcing victory is possible only under severe Taiwan political collapse and delayed allied access. The baseline outcome is a damaging stalemate or failed fait accompli followed by regional escalation, global recession, semiconductor emergency, and long-term militarized decoupling.']
].map(([title,text])=>`<div class="phase-card"><h3>${title}</h3><p>${text}</p></div>`).join('')}</div>
<h2>Expected Losses And Costs</h2><p>Losses would depend on political timing, warning, basing, missile defense, and whether nuclear thresholds are approached. Even a limited two-week fight could produce severe military losses, civilian casualties, maritime and aviation disruption, cyber damage, and trillions of dollars in market and supply-chain shock. Semiconductor disruption would likely be immediate even without deliberate fab destruction.</p>
<h2>Hindsight Warning Markers</h2><ul class="warning-list"><li>Cross-strait exercises paired with logistics, hospital, blood, ferry, rail, and port-control indicators.</li><li>Legal and information preparation framing Taiwan governance as an emergency police/customs/security matter.</li><li>Insurance, shipping, cable, or aviation disruptions near Taiwan, Bashi Channel, Okinawa approaches, or the South China Sea.</li><li>DPRK missile tempo and cyber activity rising in parallel with Taiwan coercion.</li><li>Iran-related anti-ship escalation that absorbs US naval attention and missile-defense inventory.</li><li>PRC semiconductor stockpiling, export-control hedging, financial controls, and emergency industrial messaging.</li></ul>
<h2>A New World</h2><p>Any such conflict would likely accelerate bloc formation, technology export controls, defense-industrial expansion, maritime insurance restructuring, energy rerouting, food and chip-supply emergency programs, and hardening of Japan, Korea, Australia, Philippines, and Guam defense posture. Even if the war ended quickly, the pre-war globalization model would not return quickly.</p>
<section class="references"><h2>Sources</h2><ol><li><a href="https://www.csis.org/analysis/first-battle-next-war-wargaming-chinese-invasion-taiwan" target="_blank" rel="noopener noreferrer">CSIS, The First Battle of the Next War</a></li><li><a href="https://www.csis.org/analysis/lights-out-wargaming-chinese-blockade-taiwan" target="_blank" rel="noopener noreferrer">CSIS, Lights Out blockade game</a></li><li><a href="https://www.cnas.org/publications/reports/dangerous-straits-wargaming-a-future-conflict-over-taiwans" target="_blank" rel="noopener noreferrer">CNAS, Dangerous Straits</a></li><li><a href="https://warontherocks.com/a-wargame-to-take-taiwan-from-chinas-perspective/" target="_blank" rel="noopener noreferrer">War on the Rocks, PRC-perspective Taiwan game</a></li><li><a href="https://www.atlanticcouncil.org/in-depth-research-reports/report/a-rising-nuclear-double-threat-in-east-asia-insights-from-our-guardian-tiger-i-and-ii-tabletop-exercises/" target="_blank" rel="noopener noreferrer">Atlantic Council, Guardian Tiger I/II</a></li><li><a href="https://www.dni.gov/files/ODNI/documents/assessments/NIC-Declassified-NIE-North-Korea-Scenarios-For-Leveraging-Nuclear-Weapons-June2023.pdf" target="_blank" rel="noopener noreferrer">ODNI/NIC North Korea nuclear scenarios</a></li></ol></section>
</main></body></html>`;
}

function main() {
  for (const report of FORCE_REPORTS) {
    const html = forcePage(report);
    fs.writeFileSync(path.join(ROOT, 'pages', `${report.slug}.html`), html);
  }

  let taiwan = fs.readFileSync(path.join(ROOT, 'pages/taiwan-war-games.html'), 'utf8');
  taiwan = addCss(taiwan);
  taiwan = appendOutcomeFooters(taiwan, 'taiwan');
  taiwan = replaceSection(taiwan, 'geometry', taiwanGeometry());
  taiwan = replaceSection(taiwan, 'munitions', forceComparisonIndex());
  taiwan = taiwan.replace('<a href="#munitions">Munitions</a>', '<a href="#force-comparison">Force Reports</a>');
  taiwan = taiwan.replace('<span class="sec-num">08</span>Escalation Model', '<span class="sec-num">08</span>Escalation Model');
  fs.writeFileSync(path.join(ROOT, 'pages/taiwan-war-games.html'), taiwan);

  let korea = fs.readFileSync(path.join(ROOT, 'pages/korean-peninsula-war-games.html'), 'utf8');
  korea = addCss(korea);
  korea = appendOutcomeFooters(korea, 'korea');
  korea = replaceSection(korea, 'geometry', koreaGeometry());
  fs.writeFileSync(path.join(ROOT, 'pages/korean-peninsula-war-games.html'), korea);

  fs.writeFileSync(path.join(ROOT, 'pages/taiwan-contingency-ai-chip-war.html'), finalScenarioPage());
}

main();
