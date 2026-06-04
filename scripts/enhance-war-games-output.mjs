import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readPage(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function writePage(file, html) {
  fs.writeFileSync(path.join(ROOT, file), html);
}

const scenarioPanelCss = `
.scenario-data{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0;border:1px solid var(--border);border-radius:var(--radius);background:rgba(255,255,255,.025);padding:10px}
.scenario-data div{border-right:1px solid var(--border);padding-right:8px}
.scenario-data div:last-child{border-right:0}
.scenario-data b{display:block;font-family:var(--font-mono);font-size:.58rem;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:3px}
.scenario-data span{display:block;color:var(--muted);font-size:.78rem;line-height:1.35}
.source-table{width:100%;border-collapse:collapse;margin:14px 0;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)}
.source-table th,.source-table td{padding:10px 12px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);vertical-align:top;text-align:left}
.source-table th{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.11em;text-transform:uppercase;color:var(--accent);background:var(--surface-2)}
.source-table td{color:var(--muted);font-size:.86rem}
.image-led-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:16px;align-items:stretch}
.analysis-map{margin:0;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)}
.analysis-map img{width:100%;height:100%;min-height:320px;max-height:520px;object-fit:cover;display:block}
.analysis-map figcaption{font-family:var(--font-mono);font-size:.7rem;letter-spacing:.04em;color:var(--muted);border-top:1px solid var(--border);padding:10px 12px}
.phase-grid.compact{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.phase-card.warn{border-color:rgba(245,158,11,.38);background:linear-gradient(180deg,rgba(245,158,11,.08),var(--surface))}
.phase-card.danger{border-color:rgba(248,113,113,.38);background:linear-gradient(180deg,rgba(248,113,113,.08),var(--surface))}
details.phase-card summary{cursor:pointer;font-family:var(--font-display);font-size:1.18rem;font-weight:700;letter-spacing:.06em;color:#fff}
details.phase-card p{margin:10px 0 0}
@media(max-width:820px){.scenario-data,.image-led-grid{grid-template-columns:1fr}.scenario-data div{border-right:0;border-bottom:1px solid var(--border);padding:0 0 8px}.scenario-data div:last-child{border-bottom:0;padding-bottom:0}.analysis-map img{min-height:240px}}
`;

const taiwanScenarioPanels = [
  ['Full Amphibious Invasion', ['Core variable', 'Follow-on lift survival under submarine, mine, air, and missile attrition'], ['Decision stress', 'Whether Taiwan remains coherent until US/Japan-enabled combat power arrives'], ['Best watch markers', 'RO/RO requisition, ferry conversion, port loading, medical logistics, runway repair posture']],
  ['Blockade Or Quarantine', ['Core variable', 'Commercial shipping and insurance behavior under ambiguous coercion'], ['Decision stress', 'Whether allies escort cargoes or accept slow economic strangulation'], ['Best watch markers', 'Exclusion notices, cable incidents, customs language, insurer advisories, coast guard density']],
  ['Escalation And Preemption', ['Core variable', 'Whether tactical success expands faster than leaders can manage'], ['Decision stress', 'Japanese authorization, Guam hardening, nuclear messaging, and base-defense choices'], ['Best watch markers', 'Bomber/tanker movement, hardening activity, cyber effects, PRC nuclear rhetoric']],
  ["Taking Taiwan From Beijing's Perspective", ['Core variable', 'Political paralysis before outside support becomes credible'], ['Decision stress', 'How much force Beijing can use while preserving off-ramps'], ['Best watch markers', 'Synchronized propaganda, lawfare, selective mobilization, elite-pressure messaging']],
  ['Exercise-To-Crisis Conversion', ['Core variable', 'Distinguishing exercise cover from rehearsal or attack preparation'], ['Decision stress', 'Mobilizing early without accelerating crisis or exhausting readiness'], ['Best watch markers', 'Emergency legislation, reserve activation, port orders, distributed C2, civil-defense movement']],
  ['Dual-Contingency Stress', ['Core variable', 'Shared ISR, missile defense, munitions, tankers, submarines, and Japanese basing'], ['Decision stress', 'Prioritizing Taiwan, Korea, Japan, Guam, and homeland defense simultaneously'], ['Best watch markers', 'DPRK launch tempo, Japanese base politics, PLA exercise coupling, US carrier movement']],
];

const koreaScenarioPanels = [
  ['Limited Strike To Tactical Nuclear Use', ['Core variable', 'Credible response options between symbolic strikes and runaway escalation'], ['Decision stress', 'Seoul and Washington risk perception after chemical or limited nuclear use'], ['Best watch markers', 'Launcher dispersal, chemical rhetoric, SOF/drone activity, C2 delegation']],
  ['Dual-Adversary Escalation', ['Core variable', 'Whether Taiwan crisis demand depletes Korea deterrence capacity'], ['Decision stress', 'Allocating ISR, tankers, missile defense, and strike assets across two theaters'], ['Best watch markers', 'Taiwan crisis markers, DPRK launch tempo, China border logistics, Japanese base politics']],
  ['Nuclear Use In Space', ['Core variable', 'Satellite resilience, legal framing, attribution, and proportional response'], ['Decision stress', 'Responding to strategic nuclear effect without immediate mass casualties'], ['Best watch markers', 'Satellite launch behavior, GPS anomalies, cyber preparation, SOF movement']],
  ['Nuclear Leverage Pathways', ['Core variable', 'Coercive risk-taking under a nuclear shield'], ['Decision stress', 'Separating regime-survival signals from bargaining intimidation'], ['Best watch markers', 'Limited provocations paired with nuclear rhetoric and launcher dispersal']],
  ['Drone Warfare And Armor Attrition', ['Core variable', 'Survivability of armor, artillery, logistics, and counteroffensive formations'], ['Decision stress', 'Counter-drone and EW capacity as campaign-level constraints'], ['Best watch markers', 'Drone-unit movement, EW posture, artillery ammunition, force-protection changes']],
  ['Nuclear-Cognitive Warfare', ['Core variable', 'Alliance unity under nuclear narratives, cyber disruption, and public fear'], ['Decision stress', 'Preventing information pressure from slowing response cycles'], ['Best watch markers', 'Cyber disruptions, evacuation rumors, selective leaks, nuclear command rhetoric']],
];

function panelHtml(items) {
  return `<div class="scenario-data">${items.map(([label, text]) => `<div><b>${esc(label)}</b><span>${esc(text)}</span></div>`).join('')}</div>`;
}

function addScenarioPanels(file, panels) {
  let html = readPage(file);
  if (!html.includes('.scenario-data')) {
    html = html.replace('</style>', `${scenarioPanelCss}\n</style>`);
  }
  for (const [heading, ...items] of panels) {
    const h3 = `<h3>${heading}</h3>`;
    const start = html.indexOf(h3);
    if (start === -1) continue;
    const articleEnd = html.indexOf('</article>', start);
    const chunk = html.slice(start, articleEnd);
    if (chunk.includes('scenario-data')) continue;
    const links = html.indexOf('<div class="scenario-links"', start);
    if (links === -1 || links > articleEnd) continue;
    html = `${html.slice(0, links)}${panelHtml(items)}\n      ${html.slice(links)}`;
  }
  writePage(file, html);
}

function finalScenarioPage() {
  const sourceRows = [
    ['CSIS invasion iterations', 'Tests whether Taiwan, the United States, and Japan can deny a rapid seizure. The recurring result is high attrition and a decisive role for early access, dispersal, and logistics denial.', 'The scenario below treats surprise as useful but not decisive because lift sustainment remains the hard constraint.'],
    ['CSIS/MIT blockade games', 'Tests quarantine, shipping, legal, stockpile, and escalation dilemmas short of immediate invasion.', 'The scenario includes blockade pressure as an enabling phase and as a fallback if beachhead objectives stall.'],
    ['CNAS Dangerous Straits', 'Focuses on escalation, preemption, Japanese authorization, Guam, and nuclear signaling.', 'The scenario treats allied response as a political-military escalation problem rather than a simple order-of-battle comparison.'],
    ['Guardian Tiger I/II and ODNI/NIC Korea scenarios', 'Stress dual-contingency scarcity, DPRK opportunism, nuclear coercion, and alliance decision fracture.', 'The scenario includes Korea as a pressure amplifier but not as a guaranteed strategic win for Beijing.'],
    ['Local force-comparison reports', 'Naval, air, ground, marine, and SOF comparisons identify relative strengths and capability gaps.', 'The scenario uses those pages as background and keeps the conflict narrative high-level and non-operational.'],
  ];

  const phases = [
    ['Planning And Preparation', 'The relevant warning pattern is indirect and administrative: legal authorities, shipping controls, cyber preparation, blood and medical movement, reserve timing, ammunition and fuel logistics, sanctions hardening, ferry and rail behavior, and semiconductor stockpiling. A single indicator is weak; cross-domain clustering is the signal.'],
    ['Obfuscation', 'Beijing would benefit from normalizing exercises, coast guard activity, cyber pressure, political intimidation, and information operations. An Iran or Korea crisis can distract attention, but synchronized pressure across Taiwan, Korea, Japan, and maritime logistics would itself be a warning signature.'],
    ['Chaos Unleashed', 'The opening strategic goal would be decision paralysis: information shock, cyber disruption, selective kinetic effects, blockade or exclusion messaging, unmanned system activity, and diplomatic threats. The defender goal is continuity of government, communications, port and runway repair, distributed fires, and fast coalition framing.'],
    ['T-Day', 'A decisive move would expose intent quickly. Even uncrewed platforms require launch paths, command links, targeting, sustainment, and recovery or replacement. Surprise can improve the first hours, but it does not remove the cross-strait lift, weather, port, and inland terrain constraints.'],
    ['Beachhead', 'The central question is whether a lodgment becomes sustainable. Taiwan and allied forces would focus on isolating landing areas, denying port use, preserving distributed fires, and attacking lift. Beijing would need political shock and logistics success faster than attrition and sanctions can compound.'],
    ['Allied Counterstrike', 'Likely allied response options include cyber defense and offense, sanctions, maritime exclusion challenges, air and missile defense reinforcement, submarine operations, long-range conventional strike debates, diplomatic coalition building, and emergency industrial mobilization. Nuclear signaling risk rises if leaders believe conventional parity is collapsing.'],
    ['Days 1-7', 'The first week decides whether the crisis becomes a fait accompli attempt, blockade endurance contest, or regional war. Key questions are Taiwan government continuity, Japanese base authorization, US submarine and airbase posture, PLA lift losses, DPRK launch tempo, and global shipping or insurance behavior.'],
    ['Weeks 1-2', 'If Taiwan has not politically collapsed, Beijing faces a widening attrition problem: sustained logistics, casualty visibility, semiconductor shutdown, sanctions, alliance mobilization, and regime-risk narratives. If Taiwan command fractures, allied decisions become harder and escalation pressure rises.'],
    ['Escalation', 'Escalation pathways include cyber effects on critical infrastructure, space interference, blockade expansion, strikes against regional military infrastructure, and nuclear signaling. This assessment intentionally does not model target packages or attack sequencing.'],
    ['Outcome', 'My baseline judgment is a damaging stalemate or failed fait accompli followed by regional escalation, global recession, semiconductor emergency, and long-term militarized decoupling. A rapid Chinese surrender-forcing victory is possible only under severe Taiwan political collapse and delayed allied access.'],
  ];

  const warningRows = [
    ['Administrative/legal', 'Emergency legal language, customs framing, civil-defense messaging, restrictions on ports, data flows, shipping, or aviation.'],
    ['Logistics and medical', 'Ferry or RO/RO requisition, rail and port loading anomalies, hospital and blood-movement indicators, fuel and ammunition dispersal.'],
    ['Maritime pressure', 'Exclusion zones, coast guard and militia density, insurer advisories, cable incidents, routing changes near Bashi/Luzon/Okinawa approaches.'],
    ['Cyber/space', 'Telecom, port, finance, satellite, GPS, and logistics-system disruption that appears synchronized with military or legal pressure.'],
    ['Dual-contingency', 'DPRK launch tempo, Korea cyber pressure, Iran anti-ship escalation, and Japanese base politics moving in the same window.'],
    ['Semiconductor/finance', 'PRC stockpiling, export-control hedging, currency controls, emergency industrial messaging, and disruptions to fab inputs.'],
  ];

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Taiwan Contingency Strategic Risk Game - Conflict Mapper</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<script src="/assets/user-style.js"></script>
<style>
:root{--bg:#080b10;--surface:#10141c;--surface-2:#151b26;--surface-3:#1e2736;--border:rgba(255,255,255,.1);--accent:#f43f5e;--text:#e5e7eb;--muted:#a7b0c0;--faint:#667085;--amber:#f59e0b;--blue:#60a5fa;--font-display:'Rajdhani',sans-serif;--font-mono:'Share Tech Mono',monospace;--font-body:'Inter',sans-serif;--radius:8px}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,color-mix(in srgb,var(--accent) 12%,transparent),transparent 34rem),var(--bg);color:var(--text);font-family:var(--font-body);line-height:1.65}.top-nav{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:18px;min-height:56px;padding:10px 24px;background:rgba(8,11,16,.94);border-bottom:1px solid color-mix(in srgb,var(--accent) 32%,transparent);backdrop-filter:blur(12px)}.brand{font-family:var(--font-display);font-weight:700;letter-spacing:.14em;color:#fff;text-decoration:none}.brand span{color:var(--accent)}.nav-links{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap}.nav-links a{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.08em;color:var(--muted);padding:6px 9px;border-radius:5px;text-decoration:none}.hero{padding:54px 24px 34px;border-bottom:1px solid var(--border);background:linear-gradient(155deg,rgba(15,23,42,.9),rgba(8,11,16,.94))}.hero-inner,.section{width:var(--cm-content-max-width,min(90vw,calc(100vw - 32px)));max-width:none;margin:0 auto}.eyebrow,.source-note{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}.hero h1{font-family:var(--font-display);font-size:clamp(2.1rem,5vw,4.4rem);line-height:.98;margin:10px 0 14px;letter-spacing:.05em;text-transform:uppercase}.hero p{max-width:1180px;color:var(--muted);font-size:var(--cm-article-text-size,15pt)}.report-content{padding:42px 24px}.report-content h2{font-family:var(--font-display);font-size:var(--cm-header-text-size,24pt);letter-spacing:.09em;text-transform:uppercase;margin:42px 0 14px;color:#fff;border-bottom:1px solid var(--border);padding-bottom:8px}.report-content h3{font-family:var(--font-display);font-size:1.35rem;letter-spacing:.06em;margin:18px 0 10px;color:#fff}.report-content p,.report-content li{color:var(--muted);font-size:var(--cm-article-text-size,15pt)}a{color:var(--accent)}.risk-grid,.phase-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.phase-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:16px}.phase-card h3{margin-top:0}.phase-card.warn{border-color:rgba(245,158,11,.38);background:linear-gradient(180deg,rgba(245,158,11,.08),var(--surface))}.image-led-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:16px}.analysis-map{margin:0;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)}.analysis-map img{width:100%;height:100%;min-height:330px;max-height:520px;object-fit:cover;display:block}.analysis-map figcaption{font-family:var(--font-mono);font-size:.7rem;color:var(--muted);border-top:1px solid var(--border);padding:10px 12px}.source-table{width:100%;border-collapse:collapse;margin:14px 0;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)}.source-table th,.source-table td{padding:10px 12px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);vertical-align:top;text-align:left}.source-table th{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.11em;text-transform:uppercase;color:var(--accent);background:var(--surface-2)}.source-table td{color:var(--muted);font-size:.9rem}.references{margin-top:42px;padding:22px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)}.references h2{margin-top:0}.references li{overflow-wrap:anywhere}@media(max-width:820px){.top-nav{align-items:flex-start;flex-wrap:wrap}.brand{width:100%}.nav-links{width:100%;margin-left:0}.report-content{padding:30px 12px}.image-led-grid{grid-template-columns:1fr}.analysis-map img{min-height:240px}.source-table{display:block;overflow:auto}}
</style>
</head>
<body>
<nav class="top-nav"><a class="brand" href="../index.html">CONFLICT <span>MAPPER</span></a><div class="nav-links"><a href="taiwan-war-games.html">Taiwan War Games</a><a href="korean-peninsula-war-games.html">Korea War Games</a><a href="../index.html">Hub</a></div></nav>
<header class="hero"><div class="hero-inner"><div class="eyebrow">Strategic Risk Game // Non-operational assessment</div><h1>Taiwan Contingency Strategic Risk Game</h1><p>A high-level, source-backed assessment of a crisis-stacked Taiwan contingency involving uncrewed systems, semiconductor stakes, Iran/Korea distraction scenarios, escalation risk, and likely geopolitical aftermath. This page is intentionally strategic and non-operational: it does not provide targeting instructions, optimized attack sequencing, or weapon-employment guidance.</p></div></header>
<main class="section report-content">
<h2>Executive Judgment</h2>
<div class="image-led-grid"><figure class="analysis-map"><img src="/assets/maps/taiwan-physiography-cia-2022.jpg" alt="CIA physiographic map of Taiwan" loading="lazy"><figcaption>CIA Taiwan physiography map, saved locally. Terrain and port geography make rapid cross-strait sustainment harder than the political theory of a short war suggests.</figcaption></figure><div><p><strong>Bottom line:</strong> the proposed scenario is analytically useful as a maximum-stress test, but a short, clean one-to-two week fait accompli remains unlikely. Surprise, uncrewed systems, and distraction crises can improve Beijing's opening position; they do not remove Taiwan's geography, lift requirements, allied intelligence, submarine and airpower risk, sanctions, semiconductor fragility, or escalation uncertainty.</p><p><strong>Likely result:</strong> not rapid global dominance, but a catastrophic regional war with global economic shock, severe PLA losses, contested escalation, semiconductor production disruption, and long-term technology decoupling. A rapid Chinese victory requires early Taiwan political collapse and delayed allied access; absent that, the conflict trends toward attrition, blockade, and wider regional escalation.</p></div></div>
<h2>Cross-Wargame Source Synthesis</h2>
<table class="source-table"><thead><tr><th>Source family</th><th>What it contributes</th><th>How it changes this scenario</th></tr></thead><tbody>${sourceRows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
<h2>Strategic Assumptions Assessed</h2>
<div class="risk-grid"><div class="phase-card"><h3>Uncrewed sprint</h3><p>Uncrewed air, sea, and land systems can saturate sensors and reduce early personnel exposure, but they still require command links, launch paths, replacement capacity, target-quality intelligence, and logistics. They complicate defense; they do not eliminate the need to sustain control ashore.</p></div><div class="phase-card"><h3>Political deniability</h3><p>Deniability is weakest at the moment effects become synchronized across cyber, maritime, air, legal, and logistics domains. Even if conventional staging is minimized, coalition intelligence can infer intent from cross-domain preparation.</p></div><div class="phase-card"><h3>Semiconductor prize</h3><p>Avoiding deliberate fab destruction does not preserve chip output. Power, water, labor, chemicals, tools, shipping, insurance, export controls, and workforce continuity would likely halt production quickly.</p></div><div class="phase-card"><h3>Iran and Korea distractions</h3><p>Concurrent crises can stress munitions depth and command attention, but they also create a warning pattern if Beijing, Pyongyang, and Iran-linked anti-ship pressure move together.</p></div></div>
<h2>Campaign Phase Model</h2>
<div class="phase-grid">${phases.map(([title, text], idx) => `<div class="phase-card ${idx > 4 ? 'warn' : ''}"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('')}</div>
<h2>Warning Marker Matrix</h2>
<table class="source-table"><thead><tr><th>Indicator lane</th><th>Hindsight marker to monitor</th></tr></thead><tbody>${warningRows.map((row) => `<tr><td>${esc(row[0])}</td><td>${esc(row[1])}</td></tr>`).join('')}</tbody></table>
<h2>Expected Losses And Cost</h2>
<div class="image-led-grid"><div><p>Losses would depend on warning, basing, missile-defense inventory, political thresholds, and whether nuclear signaling escalates. Even a limited two-week conflict could produce severe military losses, civilian casualties, maritime and aviation disruption, cyber damage, and trillions of dollars in market and supply-chain shock. The semiconductor cost would begin immediately through outage, workforce, consumables, insurance, shipping, and export-control disruption.</p><p>The United States and allies would face a hard tradeoff: rapid conventional denial versus escalation control. Beijing would face a different tradeoff: accepting attrition and sanctions versus escalating to widen the conflict. Neither side has a low-cost path once the conflict starts.</p></div><figure class="analysis-map"><img src="/assets/maps/taiwan-operation-causeway-1944.jpg" alt="Operation Causeway historical Taiwan map" loading="lazy"><figcaption>Operation Causeway historical planning map, saved locally. It is included for terrain context, not as a current plan: ports, beaches, weather, and mountain barriers have shaped Taiwan campaign planning for decades.</figcaption></figure></div>
<h2>A New World</h2>
<p>Any such conflict would likely accelerate bloc formation, technology export controls, defense-industrial expansion, maritime insurance restructuring, emergency chip-supply programs, energy rerouting, food-security planning, and hardening of Japan, Korea, Australia, the Philippines, and Guam. Even if fighting ended quickly, the pre-war globalization model would not return quickly. A Chinese failure would weaken Beijing's regional coercive credibility but could leave a militarized, sanctioned, and economically damaged Indo-Pacific. A Chinese success would produce coercive regional realignment, severe alliance credibility damage, and a permanently altered technology order, but probably not the stable chip windfall imagined by the scenario.</p>
<h2>What Happens Next?</h2>
<div class="risk-grid"><div class="phase-card"><h3>If China stalls</h3><p>The conflict becomes an attrition, blockade, sanctions, and escalation-management contest. Taiwan's political continuity and allied munitions depth become decisive.</p></div><div class="phase-card"><h3>If Taiwan fractures</h3><p>Allied choices become harder: reversing control risks escalation, accepting the outcome damages alliance credibility, and semiconductor recovery remains uncertain.</p></div><div class="phase-card"><h3>If Korea ignites</h3><p>US and Japanese assets become shared-theater constraints. DPRK opportunism can magnify risk, but it can also strengthen coalition recognition that the crises are linked.</p></div></div>
<section class="references"><h2>Sources</h2><ol><li><a href="https://www.csis.org/analysis/first-battle-next-war-wargaming-chinese-invasion-taiwan" target="_blank" rel="noopener noreferrer">CSIS, The First Battle of the Next War</a></li><li><a href="https://www.csis.org/analysis/lights-out-wargaming-chinese-blockade-taiwan" target="_blank" rel="noopener noreferrer">CSIS, Lights Out blockade game</a></li><li><a href="https://www.cnas.org/publications/reports/dangerous-straits-wargaming-a-future-conflict-over-taiwans" target="_blank" rel="noopener noreferrer">CNAS, Dangerous Straits</a></li><li><a href="https://warontherocks.com/a-wargame-to-take-taiwan-from-chinas-perspective/" target="_blank" rel="noopener noreferrer">War on the Rocks, PRC-perspective Taiwan game</a></li><li><a href="https://www.atlanticcouncil.org/in-depth-research-reports/report/a-rising-nuclear-double-threat-in-east-asia-insights-from-our-guardian-tiger-i-and-ii-tabletop-exercises/" target="_blank" rel="noopener noreferrer">Atlantic Council, Guardian Tiger I/II</a></li><li><a href="https://www.dni.gov/files/ODNI/documents/assessments/NIC-Declassified-NIE-North-Korea-Scenarios-For-Leveraging-Nuclear-Weapons-June2023.pdf" target="_blank" rel="noopener noreferrer">ODNI/NIC North Korea nuclear scenarios</a></li><li><a href="https://www.cia.gov/resources/map/taiwan/" target="_blank" rel="noopener noreferrer">CIA Taiwan maps</a></li></ol></section>
</main>
</body>
</html>`;
}

addScenarioPanels('pages/taiwan-war-games.html', taiwanScenarioPanels);
addScenarioPanels('pages/korean-peninsula-war-games.html', koreaScenarioPanels);
writePage('pages/taiwan-contingency-ai-chip-war.html', finalScenarioPage());
