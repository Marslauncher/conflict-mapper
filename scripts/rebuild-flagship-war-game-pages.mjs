import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PAGES = path.join(ROOT, 'pages');

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
    .replace(/^-|-$/g, '');
}

const sources = {
  taiwan: [
    ['CSIS - The First Battle of the Next War', 'https://www.csis.org/analysis/first-battle-next-war-wargaming-chinese-invasion-taiwan'],
    ['CSIS - Lights Out blockade game', 'https://www.csis.org/analysis/lights-out-wargaming-chinese-blockade-taiwan'],
    ['MIT SSP - Lights Out blockade game', 'https://ssp.mit.edu/publications/2025/lights-out-wargaming-a-chinese-blockade-of-taiwan'],
    ['CNAS - Dangerous Straits', 'https://www.cnas.org/publications/reports/dangerous-straits-wargaming-a-future-conflict-over-taiwans'],
    ['War on the Rocks - PRC perspective game', 'https://warontherocks.com/a-wargame-to-take-taiwan-from-chinas-perspective/'],
    ['ISW - China-Taiwan special reports', 'https://www.understandingwar.org/research/china-taiwan'],
    ['CIA - Taiwan physiography map', 'https://www.cia.gov/resources/map/taiwan/'],
  ],
  korea: [
    ['Atlantic Council - Guardian Tiger I/II', 'https://www.atlanticcouncil.org/in-depth-research-reports/report/a-rising-nuclear-double-threat-in-east-asia-insights-from-our-guardian-tiger-i-and-ii-tabletop-exercises/'],
    ['ODNI/NIC - North Korea nuclear scenarios', 'https://www.dni.gov/files/ODNI/documents/assessments/NIC-Declassified-NIE-North-Korea-Scenarios-For-Leveraging-Nuclear-Weapons-June2023.pdf'],
    ['NPEC - Pyongyang Goes Nuclear in Space', 'https://npolicy.org/wp-content/uploads/2023/01/2301-Pyongyang-Goes-Nuclear-Occasional-Paper-copy-1.12.23.pdf'],
    ['Modern War Institute - Drone warfare and Korean armor', 'https://mwi.westpoint.edu/drone-warfare-and-the-future-of-korean-armor/'],
    ['38 North - Nuclear-cognitive warfare strategy', 'https://www.38north.org/2025/04/north-koreas-nuclear-cognitive-warfare-strategy/'],
    ['CIA - North Korea maps', 'https://www.cia.gov/resources/map/north-korea/'],
    ['CIA - South Korea maps', 'https://www.cia.gov/resources/map/south-korea/'],
  ],
};

const forceReports = [
  {
    title: 'Naval Forces',
    href: 'china-vs-allied-naval-forces-taiwan.html',
    image: '/assets/force-comparison/china-vs-allied-naval-forces-taiwan/images/image_1.jpg',
    text: 'Comprehensive overview of PLAN amphibious lift, surface combatants, undersea forces, and US/Taiwan/Japan/allied maritime counters in a Taiwan contingency.',
  },
  {
    title: 'Air Forces',
    href: 'air-power-china-vs-allies-taiwan.html',
    image: '/assets/force-comparison/air-power-china-vs-allies-taiwan/images/image_1.jpg',
    text: 'Branch-by-branch airpower comparison covering PLAAF/PLAN aviation, stealth aircraft, bombers, ISR, drones, tankers, and allied air-defense constraints.',
  },
  {
    title: 'Army Forces',
    href: 'army-forces-china-vs-allies-taiwan.html',
    image: '/assets/force-comparison/army-forces-china-vs-allies-taiwan/images/image_1.jpg',
    text: 'Ground force comparison focused on PLA landing follow-on forces, Taiwan territorial defense, long-range fires, armor, and allied land-domain support.',
  },
  {
    title: 'Marines',
    href: 'marines-china-vs-allies-taiwan.html',
    image: '/assets/force-comparison/marines-china-vs-allies-taiwan/images/image_1.jpg',
    text: 'Amphibious and littoral force comparison covering PLAN Marine Corps, USMC stand-in forces, expeditionary fires, and island-chain access dilemmas.',
  },
  {
    title: 'Special Forces',
    href: 'special-forces-china-vs-allies-taiwan.html',
    image: '/assets/force-comparison/special-forces-china-vs-allies-taiwan/images/image_1.jpg',
    text: 'SOF comparison covering reconnaissance, sabotage, maritime raids, cyber-enabled disruption, counter-SOF defense, and crisis-opening risk.',
  },
];

const taiwanScenarios = [
  {
    slug: 'taiwan-scenario-csis-invasion',
    title: 'The First Battle of the Next War',
    source: 'CSIS',
    sourceUrl: sources.taiwan[0][1],
    image: '/assets/maps/taiwan-physiography-cia-2022.jpg',
    caption: 'CIA Taiwan physiography map - terrain, ports, and western coastal density remain central to invasion-game assumptions.',
    family: 'Full invasion and denial campaign',
    hook: 'The CSIS invasion game is the anchor case because it forces the reader to confront the difference between a successful landing and a successful campaign. It shows why aircraft, missiles, submarines, ports, runways, and political endurance matter more than a dramatic first crossing.',
    summary: [
      'The scenario family models a large Chinese attempt to seize Taiwan and tests whether the United States, Taiwan, Japan, and partners can deny rapid success before PLA follow-on lift becomes sustainable. The headline lesson is not that any side wins cheaply; it is that geography, basing, runway repair, anti-ship fires, and allied political access determine whether a landing becomes a campaign.',
      'For a reader, this scenario matters because it reframes Taiwan from a single invasion event into a sequence of interlocking sustainment problems. The first hours may be dominated by missiles, air defense, cyber pressure, and command disruption, but the decisive period is whether Taiwan can keep command functions alive while allied submarines, aircraft, and long-range fires attack maritime lift.',
      'The game also highlights why Japan and US regional bases are not peripheral. If Japan allows US operations from its territory and the United States can bring submarines, bombers, and maritime strike aircraft to bear quickly, the PLA faces an attrition fight across exposed water. If allied access is delayed or politically fragmented, the invasion problem becomes much harder.',
    ],
    outcome: 'Outcome assessment: the invasion can fail even after painful early PLA gains if follow-on shipping, air cover, and port access are disrupted. Taiwan still suffers severe damage and cannot treat allied intervention as automatic or casualty-free. The scenario strongly favors early denial, runway repair, dispersed command, sea-denial fires, Japanese basing access, and rapid political alignment. The outcome is a warning against assuming either a clean Chinese fait accompli or a clean allied rescue.',
  },
  {
    slug: 'taiwan-scenario-blockade-lights-out',
    title: 'Lights Out? Blockade and Quarantine Games',
    source: 'CSIS / MIT SSP',
    sourceUrl: sources.taiwan[1][1],
    image: '/screenshots/final-taiwan-strait.png',
    caption: 'Conflict Mapper Taiwan Strait view - blockade games move the problem from beaches to shipping, insurance, ports, energy, cables, and political endurance.',
    family: 'Blockade, quarantine, and coercive isolation',
    hook: 'The blockade scenarios are essential because they model a slower, legally ambiguous path to strategic pressure. They ask whether Beijing can hurt Taiwan enough to force concessions while making allied escalation politically harder.',
    summary: [
      'Blockade games shift the analytical focus from a dramatic amphibious assault to a contest over commercial shipping, legal framing, stockpiles, energy, financial pressure, undersea cables, air routes, and allied convoy politics. This is a harder problem for dashboards because it may not produce a single clean invasion indicator.',
      'The strongest version of this scenario is not a total blockade from the first hour. It is a phased coercion campaign: inspection zones, customs claims, coast guard pressure, cyber disruption, insurance-rate shock, aviation advisories, and selective port disruption that raises Taiwan costs while testing allied unity.',
      'The most important analytic variable is whether the United States and partners define the move as an act of war quickly enough to organize a response. If legal ambiguity persists, commercial actors may self-restrict faster than governments can coordinate, creating de facto isolation without a clean military trigger.',
    ],
    outcome: 'Outcome assessment: blockade pressure is more plausible than an immediate full invasion because it can be scaled, paused, denied, and framed as law enforcement or quarantine. It can still fail if Taiwan stockpiles hold, commercial routes adapt, allied convoy policy is clear, and Beijing cannot maintain pressure without broadening the war. The outcome is likely to be protracted and economically damaging even without a beach landing. The key warning sign is shipping behavior changing before official statements catch up.',
  },
  {
    slug: 'taiwan-scenario-dangerous-straits',
    title: 'Dangerous Straits',
    source: 'CNAS',
    sourceUrl: sources.taiwan[3][1],
    image: '/assets/maps/taiwan-operation-causeway-1944.jpg',
    caption: 'Operation Causeway historical map - useful as historical context for recurring Taiwan geography, not as a current campaign plan.',
    family: 'Escalation management and allied decision stress',
    hook: 'Dangerous Straits matters because it makes escalation control the center of the game rather than a footnote. It asks how leaders make decisions when every move may deter, reassure, or widen the war.',
    summary: [
      'The scenario emphasizes the political and military problem of controlling escalation once a Taiwan crisis is underway. It treats strikes, basing, cyber operations, space assets, blockade actions, and nuclear signaling as connected decisions rather than isolated military tools.',
      'For Conflict Mapper, the important contribution is the decision-cycle lens. The question is not only what weapons exist; it is who authorizes their use, what political signal each move sends, and whether adversaries interpret restraint as weakness or escalation as resolve.',
      'The page should therefore track alliance consultation, public warning language, evacuation advisories, Japan and Philippines access decisions, cyber warnings, and naval movement as part of the same escalation picture. That is the analytical value of this scenario family.',
    ],
    outcome: 'Outcome assessment: the most likely failure mode is not one side misunderstanding a single event, but both sides acting under compressed timelines with incomplete information. Escalation management improves when political objectives are explicit and allied access decisions are rehearsed before the crisis. It worsens when cyber, space, and regional basing issues are treated as secondary. The scenario argues for monitoring decision architecture as closely as platform counts.',
  },
  {
    slug: 'taiwan-scenario-beijing-perspective',
    title: 'A Wargame to Take Taiwan, from China\'s Perspective',
    source: 'War on the Rocks',
    sourceUrl: sources.taiwan[4][1],
    image: '/assets/force-comparison/china-vs-allied-naval-forces-taiwan/images/image_1.jpg',
    caption: 'Type 076 amphibious carrier image from the local naval force-comparison datasource - relevant to future command, aviation, and unmanned-system assumptions.',
    family: 'PRC coercion, decision logic, and campaign framing',
    hook: 'This scenario is useful because it forces the reader to see Taiwan through Beijing\'s campaign logic. It is not enough to ask whether China can land forces; the better question is what Beijing thinks will cause Taiwan and the coalition to fracture.',
    summary: [
      'A PRC-perspective game reframes the campaign as political warfare, legal preparation, coercive signaling, and alliance-splitting before it becomes a purely kinetic operation. It asks what Beijing would try to make Taiwan, Washington, Tokyo, and regional capitals believe in the decisive days before and after the crisis opens.',
      'The core analytical value is understanding sequencing. Beijing may prefer options that preserve ambiguity, minimize visible mobilization, and make outside intervention look risky or illegitimate. That could include exercises, lawfare, cyber pressure, selective maritime controls, economic warnings, and information operations before any landing attempt.',
      'This matters for warning because the most important signs may look bureaucratic or political rather than tactical: emergency legal language, civil-military shipping controls, evacuation narratives, stock market pressure, censorship changes, elite messaging, and narratives about inevitability.',
    ],
    outcome: 'Outcome assessment: Beijing\'s best path is paralysis before mass combat, not a cinematic first wave. The scenario succeeds for China only if Taiwan political cohesion cracks and allied decision-making slows. It fails if Taiwan remains governable, allied access decisions are clear, and the coercive frame is rejected early. Analysts should therefore treat narrative and legal preparation as operationally meaningful warning indicators.',
  },
  {
    slug: 'taiwan-scenario-exercise-crisis',
    title: 'Exercise-to-Crisis Conversion',
    source: 'ISW / Han Kuang reporting',
    sourceUrl: sources.taiwan[5][1],
    image: '/screenshots/fix-taiwan-map.png',
    caption: 'Conflict Mapper Taiwan map snapshot - exercise-to-crisis analysis should separate baseline geography from live indicator changes.',
    family: 'Exercise cover, coercion, and warning ambiguity',
    hook: 'Exercise-to-crisis scenarios are where dashboards often fail. A familiar exercise can be routine, a coercive signal, or cover for preparation, and the difference is usually hidden in logistics and civilian behavior.',
    summary: [
      'The scenario family asks how analysts distinguish routine exercises from genuine crisis preparation. The answer is not a single sortie count or a single missile notice. It is whether exercise behavior starts changing civilian shipping, port access, reserve posture, fuel movement, medical preparation, cyber activity, air routes, and diplomatic language.',
      'Taiwan also runs major exercises, and those exercises matter for resilience. Han Kuang-style activity can improve civil defense, runway repair, distributed command, and public readiness, but it may also interact with PRC narratives about provocation.',
      'This is a strong candidate for dynamic page updates because live feeds can detect whether reporting is about ordinary drills, expanded rehearsal areas, legal restrictions, economic disruption, or allied readiness changes.',
    ],
    outcome: 'Outcome assessment: exercise conversion is dangerous because it can compress warning time while maintaining plausible deniability. It is less likely to surprise if analysts track logistics, civilian restrictions, and legal authorities instead of only visible aircraft and ships. Taiwan and allies benefit from making the threshold indicators public enough to shape deterrence. The scenario argues for indicator clusters, not single-event alerts.',
  },
  {
    slug: 'taiwan-scenario-dual-contingency',
    title: 'Taiwan-Korea Dual Contingency Stress',
    source: 'Atlantic Council / Global Taiwan Institute',
    sourceUrl: sources.korea[0][1],
    image: '/assets/maps/south-korea-physiography-cia-2018.jpg',
    caption: 'CIA South Korea physiography map - Korea is not separate from Taiwan in dual-contingency games because munitions, ISR, missile defense, and basing are shared constraints.',
    family: 'Two-theater deterrence and munitions stress',
    hook: 'Dual-contingency scenarios matter because Taiwan and Korea compete for the same allied attention, munitions, ISR, tankers, missile defense, cyber resources, and Japanese base politics.',
    summary: [
      'This scenario family connects the Taiwan fight to the Korean Peninsula. If a Taiwan crisis begins, North Korea may exploit allied distraction through missile launches, cyber pressure, limited attacks, nuclear coercion, or political intimidation aimed at splitting Seoul, Tokyo, and Washington.',
      'The most important analytic point is resource coupling. Air and missile defense interceptors, submarines, tankers, ISR platforms, precision munitions, and command attention are finite. A crisis in one theater can change deterrence in the other before any formal alliance decision is made.',
      'A serious Taiwan watch page should therefore include Korea indicators when they affect Japan, Guam, USFK, missile defense, ISR allocation, and escalation-management bandwidth. That is why this scenario links the two flagship pages rather than treating them as isolated reports.',
    ],
    outcome: 'Outcome assessment: a dual contingency is less a second war game than a stress test of alliance architecture. The risk rises when North Korea sees a chance to coerce under a nuclear shield while China pressures Taiwan. The best mitigation is preplanned trilateral coordination, clear base-access authorities, munitions depth, and rapid information sharing. The worst case is fragmented allied decision-making under simultaneous nuclear and maritime pressure.',
  },
];

const koreaScenarios = [
  {
    slug: 'korea-scenario-guardian-tiger-limited-strike',
    title: 'Guardian Tiger I - Limited Strike to Tactical Nuclear Use',
    source: 'Atlantic Council',
    sourceUrl: sources.korea[0][1],
    image: '/assets/maps/north-korea-physiography-cia-2020.jpg',
    caption: 'CIA North Korea physiography map - terrain and dispersal complicate counterforce assumptions.',
    family: 'Limited conventional strike, chemical escalation, and tactical nuclear coercion',
    hook: 'Guardian Tiger I is the core Korea scenario because it shows how fast a limited strike can climb the escalation ladder when Pyongyang believes nuclear threats can freeze allied response.',
    summary: [
      'The scenario begins with a limited North Korean strike and tests how quickly escalation pressure overwhelms alliance coordination. Chemical weapons, tactical nuclear threats, Chinese positioning, and divergent Seoul-Washington risk tolerance all create decision stress before a conventional campaign can mature.',
      'The analytical value is the gap between conventional response and nuclear retaliation. If the alliance has only ineffective conventional options or excessive nuclear options, Pyongyang may believe limited nuclear use can shape outcomes.',
      'For the page, this scenario should drive monitoring of missile dispersal, chemical rhetoric, SOF activity, nuclear delegation hints, cyber pressure, and allied public language. The question is not whether North Korea can win a long war; it is whether it can force negotiation by creating fear faster than the alliance can coordinate.',
    ],
    outcome: 'Outcome assessment: the scenario outcome is alliance stress under compressed nuclear timelines. The strongest allied position is a credible, rehearsed set of proportional response options and clear C2 authorities. The weakest position is public unity without usable escalation choices. The game warns that limited nuclear use is no longer a remote edge case in Korea planning.',
  },
  {
    slug: 'korea-scenario-guardian-tiger-dual-contingency',
    title: 'Guardian Tiger II - China/Taiwan and Korea Combined Crisis',
    source: 'Atlantic Council',
    sourceUrl: sources.korea[0][1],
    image: '/screenshots/final-taiwan-strait.png',
    caption: 'Taiwan Strait map snapshot - Guardian Tiger II ties Korea to a Taiwan crisis through Japan, ISR, missile defense, and political bandwidth.',
    family: 'Dual-adversary deterrence failure',
    hook: 'Guardian Tiger II matters because it makes the Korea page inseparable from Taiwan. A China-Taiwan war can create the very conditions in which Pyongyang tests the alliance.',
    summary: [
      'The scenario opens with a Taiwan crisis and then injects North Korean escalation designed to split allied focus. The result is not two clean theaters; it is a single regional decision problem involving Japan, Guam, USFK, missile defense, ISR, and nuclear signaling.',
      'The key insight is that the United States may be unable to deter opportunistic escalation by the second adversary while already fighting or deterring the first. North Korea does not need to win outright to create strategic disruption.',
      'Monitoring should therefore connect DPRK launches, cyber pressure, and DMZ activity to Taiwan crisis intensity, Japanese base permissions, US carrier/submarine posture, interceptor inventory, and allied political messaging.',
    ],
    outcome: 'Outcome assessment: dual-contingency failure is most likely when allies treat Korea and Taiwan as separate dashboards. The outcome depends on whether Japan, South Korea, Taiwan, and the United States can coordinate under simultaneous missile, cyber, and nuclear pressure. If coordination lags, adversaries can exploit seams in basing, munitions, and public messaging. If coordination is preplanned, deterrence becomes more credible even under crisis stacking.',
  },
  {
    slug: 'korea-scenario-nuclear-space',
    title: 'Pyongyang Goes Nuclear in Space',
    source: 'NPEC',
    sourceUrl: sources.korea[2][1],
    image: '/assets/maps/korea-pusan-perimeter-usacmh.jpg',
    caption: 'Pusan Perimeter historical map - logistics depth remains relevant even when the opening shock is space, cyber, or nuclear signaling.',
    family: 'Space nuclear use, satellite loss, and ground invasion shock',
    hook: 'This scenario is important because it shows that a nuclear act does not have to start as a city strike. A space detonation can attack the information environment that modern command, logistics, finance, and public warning depend on.',
    summary: [
      'The scenario tests a nuclear detonation in space paired with conventional aggression on the peninsula. Its strategic value is that it stresses attribution, legal interpretation, proportional response, satellite resilience, and public confidence simultaneously.',
      'A Korea page that ignores space dependence misses the point. GPS, communications, weather, intelligence, internet services, and commercial satellite networks all feed military and civilian resilience. Disrupting them can delay allied decisions before ground operations reach decisive scale.',
      'The best analysis is therefore not just about missiles. It is about backup communications, terrestrial navigation, undersea cables, allied space reconstitution, public warning channels, and whether response options are preplanned before the crisis.',
    ],
    outcome: 'Outcome assessment: the scenario creates strategic shock without requiring immediate mass-casualty nuclear use. The alliance risk is paralysis and disagreement over what counts as proportionate response. The defensive lesson is redundancy, resilient communications, satellite reconstitution, and pre-agreed response thresholds. The warning lesson is to watch space-launch behavior, cyber activity, and ground-force readiness together.',
  },
  {
    slug: 'korea-scenario-nuclear-leverage',
    title: 'North Korea Nuclear Leverage Pathways',
    source: 'ODNI/NIC',
    sourceUrl: sources.korea[1][1],
    image: '/assets/weapons/thaad-launcher.jpg',
    caption: 'THAAD launcher image - missile defense is central to coercion management, but interceptor inventory and political signaling are just as important.',
    family: 'Coercive nuclear shadow over conventional risk-taking',
    hook: 'The declassified NIE matters because it frames nuclear weapons as tools of coercion, not only last-resort battlefield weapons. Pyongyang can take conventional risks because it believes nuclear possession deters punishment.',
    summary: [
      'The key scenario path is coercive risk-taking under a nuclear shield. North Korea can probe, threaten, demonstrate, or launch limited attacks while trying to convince Seoul and Washington that escalation costs are too high.',
      'This family should influence how the page interprets missile tests and rhetoric. Not every launch is a prelude to war, but launches paired with limited conventional action, cyber pressure, artillery readiness, or political demands can change the coercive environment.',
      'The analysis must separate regime-survival signaling from bargaining intimidation. That distinction matters because response options differ when Pyongyang is trying to preserve the regime versus trying to extract concessions.',
    ],
    outcome: 'Outcome assessment: coercive nuclear leverage is the most likely pathway because it gives Pyongyang usable pressure without requiring immediate suicidal escalation. The alliance can reduce leverage through credible response ladders, missile defense, continuity planning, and public messaging that denies easy wedge strategies. The danger rises when conventional provocations are paired with nuclear rhetoric and launcher dispersal. The outcome is a persistent gray-zone nuclear crisis, not a binary peace-or-war state.',
  },
  {
    slug: 'korea-scenario-drone-armor-attrition',
    title: 'Drone Warfare and Korean Armor',
    source: 'Modern War Institute',
    sourceUrl: sources.korea[3][1],
    image: '/assets/force-comparison/army-forces-china-vs-allies-taiwan/images/image_12.jpg',
    caption: 'Local force-comparison armor image - used as a visual proxy for the armored-force survivability questions raised by drone and ISR-strike loops.',
    family: 'Drone, ISR, EW, artillery, and armored-force survivability',
    hook: 'This scenario matters because Korea is no longer just artillery versus armor. Persistent drones, electronic warfare, cheap sensors, and rapid targeting loops change how armored forces survive near the DMZ.',
    summary: [
      'The Modern War Institute scenario connects Ukraine lessons to Korean terrain and alliance planning. Armor, artillery, logistics, counter-battery systems, and air defenses may all be visible to persistent ISR from the opening hours of conflict.',
      'The core analytical point is attrition speed. A force that looks strong on paper can lose operational value quickly if it cannot move, conceal, repair, refuel, communicate, and counter drones under continuous observation.',
      'For Taiwan-Korea linkage, this also matters because drone defense, ISR, precision fires, and munitions inventory are shared stress points. A Taiwan crisis can drain the very systems USFK would need in a Korea crisis.',
    ],
    outcome: 'Outcome assessment: armored forces remain useful, but only if protected by EW, counter-drone defense, dispersion, camouflage, rapid repair, and fires integration. The scenario punishes dense, predictable formations and rewards resilient logistics. Korea warning should therefore track drone procurement, EW posture, ammunition, shelter hardening, and counter-UAS exercises. The result is a much faster attrition environment than legacy Korea models imply.',
  },
  {
    slug: 'korea-scenario-nuclear-cognitive-warfare',
    title: 'North Korea Nuclear-Cognitive Warfare',
    source: '38 North',
    sourceUrl: sources.korea[4][1],
    image: '/screenshots/fix3-russia-map.png',
    caption: 'Conflict Mapper map screenshot used as information-environment context - cognitive warfare is about perception, decision speed, and alliance cohesion.',
    family: 'Information operations, nuclear narratives, and alliance fracture',
    hook: 'This scenario is essential because North Korea does not have to use a nuclear weapon to produce nuclear effects. It can weaponize fear, uncertainty, cyber disruption, and public narratives to slow allied decisions.',
    summary: [
      'Nuclear-cognitive warfare treats nuclear capability as a psychological and political tool embedded in information operations. The target is not just a military base; it is the alliance decision cycle and public confidence in extended deterrence.',
      'The scenario exploits different threat perceptions. Seoul may fear tactical nuclear use and artillery devastation, while Washington may prioritize homeland ICBM risk. Pyongyang can try to widen that gap through selective threats, cyber disruption, rumors, evacuation narratives, and elite messaging.',
      'For dashboard design, this means information operations belong in the threat picture. They are not just noise. Coordinated rumors, cyber disruption, and nuclear messaging can become operational indicators when synchronized with missile or military movement.',
    ],
    outcome: 'Outcome assessment: the scenario can succeed without a shot if it slows alliance decisions or splits public support. The counter is resilient public communication, rehearsed crisis messaging, cyber continuity, and visible allied unity. The risk rises when nuclear narratives coincide with cyber outages, evacuation rumors, or limited military provocations. The outcome is a contest over decision speed and confidence.',
  },
];

function actionBar(active) {
  const links = [
    ['War Gaming Hub', 'war-gaming-hub.html'],
    ['China/Taiwan Watch', 'taiwan-strait.html'],
    ['China/Taiwan War Games', 'taiwan-war-games.html'],
    ['Korean Peninsula Watch', 'korean-peninsula.html'],
    ['Korean Peninsula War Games', 'korean-peninsula-war-games.html'],
  ];
  return `<div class="action-strip">${links.map(([label, href]) => `<a class="${label === active ? 'active' : ''}" href="${href}">${esc(label)}</a>`).join('')}</div>`;
}

function sourcesList(items) {
  return `<section class="section sources" id="sources"><h2>Source Index</h2><div class="source-grid">${items.map(([label, url]) => `<a class="source-card" href="${url}" target="_blank" rel="noopener noreferrer"><strong>${esc(label)}</strong><span>${esc(url)}</span></a>`).join('')}</div></section>`;
}

function figure(src, caption) {
  return `<figure class="analysis-figure"><img src="${esc(src)}" alt="${esc(caption)}" loading="lazy"><figcaption>${esc(caption)}</figcaption></figure>`;
}

function pageShell({ title, eyebrow, body, active, accent = '#c41e3a' }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} - Conflict Mapper</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<script src="/assets/user-style.js"></script>
<style>
:root{--accent:${accent};--bg:var(--color-bg,#f3f5f8);--surface:var(--color-surface,#fff);--surface-2:var(--color-surface-2,#eef1f5);--surface-3:var(--color-surface-3,#e2e7ef);--text:var(--color-text,#111827);--muted:var(--color-text-muted,#475569);--faint:var(--color-text-faint,#8a94a6);--border:var(--color-border-dim,rgba(0,0,0,.12));--font-display:'Rajdhani',sans-serif;--font-mono:'Share Tech Mono',monospace;--font-body:'Inter',sans-serif;--radius:8px}
html[data-theme="light"]{--bg:var(--color-bg,#080b10);--surface:var(--color-surface,#10141c);--surface-2:var(--color-surface-2,#151b26);--surface-3:var(--color-surface-3,#1e2736);--text:var(--color-text,#e5e7eb);--muted:var(--color-text-muted,#a7b0c0);--faint:var(--color-text-faint,#667085);--border:var(--color-border-dim,rgba(255,255,255,.1))}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,color-mix(in srgb,var(--accent) 10%,transparent),transparent 34rem),var(--bg);color:var(--text);font-family:var(--font-body);line-height:1.68}.hero,.section{width:var(--cm-content-max-width,min(90vw,calc(100vw - 32px)));max-width:none;margin:0 auto}.hero{padding:48px var(--cm-page-gutter,32px) 26px}.eyebrow{font-family:var(--font-mono);font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}.hero h1{font-family:var(--font-display);font-size:clamp(2.7rem,6vw,5.8rem);line-height:.95;letter-spacing:.04em;text-transform:uppercase;margin:0 0 16px}.hero p{max-width:1280px;color:var(--muted);font-size:var(--cm-article-text-size,15pt);margin:0 0 12px}.action-strip{position:sticky;top:0;z-index:5;display:flex;gap:8px;flex-wrap:wrap;width:var(--cm-content-max-width,min(90vw,calc(100vw - 32px)));max-width:none;margin:0 auto 18px;padding:12px var(--cm-page-gutter,32px);background:color-mix(in srgb,var(--bg) 92%,transparent);border:1px solid var(--border);border-radius:0 0 var(--radius) var(--radius);backdrop-filter:blur(12px)}.action-strip a{font-family:var(--font-mono);font-size:var(--cm-navigation-text-size,16pt);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:7px 10px;background:var(--surface)}.action-strip a.active,.action-strip a:hover{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 55%,var(--border));background:color-mix(in srgb,var(--accent) 8%,var(--surface))}.section{padding:26px var(--cm-page-gutter,32px)}.section h2{font-family:var(--font-display);font-size:var(--cm-header-text-size,24pt);letter-spacing:.12em;text-transform:uppercase;margin:0 0 16px;border-bottom:1px solid var(--border);padding-bottom:9px}.section h3{font-family:var(--font-display);font-size:clamp(1.2rem,var(--cm-navigation-text-size,16pt),1.55rem);letter-spacing:.07em;text-transform:uppercase;margin:0 0 10px}.section p,.section li{font-size:var(--cm-article-text-size,15pt);color:var(--muted)}a{color:var(--accent)}.lead-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(420px,.75fr);gap:22px;align-items:start}.prose{max-width:1260px}.prose p{margin:0 0 15px}.metric-grid,.card-grid,.source-grid,.family-grid,.force-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.metric,.scenario-card,.source-card,.family-card,.analysis-card,.matrix-card,.force-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);overflow:hidden}.metric{padding:16px}.metric strong{display:block;font-family:var(--font-display);font-size:2rem;color:var(--accent);line-height:1}.metric span{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);color:var(--faint);text-transform:uppercase;letter-spacing:.1em}.scenario-card{display:grid;grid-template-rows:auto 1fr}.scenario-card img,.force-card img{width:100%;height:230px;object-fit:contain;background:var(--surface-2);display:block}.scenario-body,.force-body,.family-card,.analysis-card,.matrix-card{padding:16px}.kicker{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}.scenario-card p,.family-card p,.matrix-card p{margin:0 0 10px}.card-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.card-actions a{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);letter-spacing:.08em;text-transform:uppercase;text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:6px 9px;background:var(--surface-2)}.analysis-figure{margin:0;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);overflow:hidden}.analysis-figure img{width:100%;max-height:560px;object-fit:contain;background:var(--surface-2);display:block}.analysis-figure figcaption{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);color:var(--muted);border-top:1px solid var(--border);padding:10px 12px}.wide-table{overflow:auto;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)}table{width:100%;border-collapse:collapse;min-width:880px}th,td{border-bottom:1px solid var(--border);border-right:1px solid var(--border);padding:12px 14px;text-align:left;vertical-align:top}th{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);background:var(--surface-2)}td{font-size:var(--cm-article-text-size,15pt);color:var(--muted)}.source-card{display:block;text-decoration:none;padding:14px;overflow-wrap:anywhere}.source-card strong{display:block;color:var(--text);font-size:var(--cm-article-text-size,15pt);margin-bottom:6px}.source-card span{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);color:var(--faint)}.outcome{border-left:4px solid var(--accent);padding:14px 16px;background:color-mix(in srgb,var(--accent) 8%,var(--surface));border-radius:0 var(--radius) var(--radius) 0;margin-top:16px}.toc{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.toc a{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);text-transform:uppercase;text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:6px 8px;background:var(--surface)}@media(max-width:980px){.lead-grid{grid-template-columns:1fr}.action-strip{position:static}.scenario-card img,.force-card img{height:200px}table{min-width:720px}}@media(max-width:620px){.hero{padding-top:28px}.action-strip a{width:100%;text-align:center}.section{padding-left:14px;padding-right:14px}.hero h1{font-size:2.35rem}}
.pros-cons{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.pros-cons div{border:1px solid var(--border);border-radius:var(--radius);padding:12px;background:var(--surface-2)}.pros-cons strong{display:block;font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;color:var(--text);margin-bottom:6px}.pros-cons ul{margin:0;padding-left:18px}.pros-cons li{font-size:var(--cm-commentary-text-size,12pt);margin-bottom:5px}@media(max-width:980px){.pros-cons{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="hero"><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1></header>
${actionBar(active)}
${body}
</body>
</html>`;
}

function scenarioCard(s) {
  return `<article class="scenario-card">
    <img src="${esc(s.image)}" alt="${esc(s.caption)}" loading="lazy">
    <div class="scenario-body">
      <div class="kicker">${esc(s.source)} // ${esc(s.family)}</div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.hook)}</p>
      <p>${esc(s.summary[0])}</p>
      <p><strong>Outcome logic:</strong> ${esc(s.outcome.split('. ').slice(0, 2).join('. '))}.</p>
      <div class="card-actions">
        <a href="${s.slug}.html">Deep Review</a>
        <a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener noreferrer">Original Source</a>
      </div>
    </div>
  </article>`;
}

function comparisonMatrix(items, theater) {
  return `<section class="section" id="comparison-matrix"><h2>Scenario Comparison Matrix</h2><div class="wide-table"><table><thead><tr><th>Scenario</th><th>What It Tests</th><th>Most Important Warning Indicators</th><th>Outcome Logic</th></tr></thead><tbody>${items.map((s) => `<tr><td><a href="${s.slug}.html">${esc(s.title)}</a><br><span class="kicker">${esc(s.source)}</span></td><td>${esc(s.summary[0])}</td><td>${theater === 'taiwan' ? 'Watch for indicator clusters across exercises, ports, civilian shipping, reserve activity, cyber pressure, diplomatic warnings, semiconductor disruption, and allied basing decisions. A single sortie spike is weak; cross-domain synchronization is strong.' : 'Watch missile dispersal, artillery readiness, SOF/drone activity, chemical or nuclear rhetoric, cyber disruption, Chinese positioning, Japan basing politics, and whether Taiwan crisis stress is pulling US assets away from Korea.'}</td><td>${esc(s.outcome)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function scenarioDetailPage(s, theater) {
  const otherSources = theater === 'taiwan' ? sources.taiwan : sources.korea;
  const body = `
<section class="section">
  <div class="lead-grid">
    <div class="prose">
      <h2>Scenario Deep Review</h2>
      ${s.summary.map((p) => `<p>${esc(p)}</p>`).join('')}
      <div class="outcome"><strong>Outcome Footer:</strong> ${esc(s.outcome)}</div>
    </div>
    ${figure(s.image, s.caption)}
  </div>
</section>
<section class="section">
  <h2>What This Scenario Adds</h2>
  <div class="card-grid">
    <div class="analysis-card"><h3>Campaign Question</h3><p>${esc(s.hook)} The value is that it turns the scenario from a title into a decision model: what must be true for the scenario to work, what could break it, and which indicators would prove the case wrong.</p></div>
    <div class="analysis-card"><h3>Variables To Track</h3><p>${theater === 'taiwan' ? 'Track shipping behavior, airspace notices, cyber pressure, port and rail activity, reserve movement, allied basing permissions, missile-defense posture, runway repair, public-warning language, and commercial insurance changes.' : 'Track missile launches, artillery posture, cyber outages, SOF/drone reports, evacuation narratives, chemical or nuclear rhetoric, Chinese diplomatic or military support, USFK posture, and Japan base decisions.'}</p></div>
    <div class="analysis-card"><h3>Reader Takeaway</h3><p>The report should change how a reader interprets the theater. It is not a prediction engine; it is a structured warning model that shows which signals matter, why they matter, and how they interact under crisis pressure.</p></div>
  </div>
</section>
<section class="section">
  <h2>Analysis Notes</h2>
  <div class="family-grid">
    <div class="family-card"><h3>Strength Of The Scenario</h3><p>The strength is that it clarifies the strategic bottleneck instead of simply listing weapons. It shows which decisions have to occur under uncertainty and which physical or political constraints cannot be wished away by optimistic assumptions.</p><p>It is especially useful when paired with current news because it converts headlines into indicators. The page should ask whether the current article cache confirms, weakens, or fails to touch the variables that made the scenario decisive.</p></div>
    <div class="family-card"><h3>Limits And Counterarguments</h3><p>No public war game can fully model classified capabilities, leadership intent, intelligence warning, cyber access, logistics readiness, nuclear command-and-control, or real-time coalition politics. Public games are therefore best used as structured thinking tools, not as deterministic forecasts.</p><p>A counterargument is that adversaries adapt once they know the published lessons. That is exactly why the page emphasizes warning indicators and assumptions: if assumptions change, the assessment should change with them.</p></div>
  </div>
</section>
<section class="section">
  <h2>Cross-Scenario Interpretation</h2>
  <div class="wide-table"><table><thead><tr><th>Analytical Lens</th><th>How This Scenario Should Be Read</th><th>What Would Change The Assessment</th></tr></thead><tbody>
    <tr><td>Military feasibility</td><td>The scenario should be read as a feasibility test, not a prediction. It identifies the physical and organizational conditions required for the scenario to work and exposes where optimistic assumptions break down.</td><td>The assessment changes if new reporting shows durable movement in logistics, readiness, munitions, basing, reserves, command continuity, cyber access, or commercial behavior rather than isolated rhetoric.</td></tr>
    <tr><td>Political decision cycle</td><td>The most important player may be the decision process itself. Alliance consultation, public warning language, legal framing, escalation thresholds, and leadership narratives can make the same military event stabilizing or escalatory.</td><td>The assessment changes if governments issue evacuation guidance, clarify or deny base access, change rules of engagement, harden sanctions language, or make unusual continuity-of-government moves.</td></tr>
    <tr><td>Economic and social resilience</td><td>War games often understate commercial and public-confidence effects. Shipping, insurance, market behavior, energy, food, communications, and semiconductor supply chains can determine coercive success before territorial control changes.</td><td>The assessment changes if private actors start rerouting ships, raising insurance, suspending services, restricting travel, moving capital, or reporting infrastructure disruption before official crisis language appears.</td></tr>
  </tbody></table></div>
</section>
<section class="section">
  <h2>Dynamic Update Prompt</h2>
  <div class="analysis-card"><p>Update this scenario page by reviewing the original source, the latest relevant RSS cache, recent think tank articles, and current theater-watch metrics. Separate confirmed reporting from inference. For every changed assessment, cite the source article or report and explain which assumption changed: capability, intent, logistics, political authorization, allied access, escalation risk, or economic resilience.</p></div>
</section>
${sourcesList([[`${s.source} - ${s.title}`, s.sourceUrl], ...otherSources.filter(([, url]) => url !== s.sourceUrl)])}`;
  return pageShell({ title: s.title, eyebrow: `${theater === 'taiwan' ? 'China / Taiwan' : 'Korean Peninsula'} scenario deep review`, active: theater === 'taiwan' ? 'China/Taiwan War Games' : 'Korean Peninsula War Games', accent: theater === 'taiwan' ? '#c41e3a' : '#2563eb', body });
}

function familiesSection(theater) {
  const taiwanFamilies = [
    ['Full Invasion And Denial Campaign', 'This family tests whether China can convert initial shock into sustained control. It is about ports, runways, lift, submarines, anti-ship fires, Taiwanese command continuity, and Japanese basing access. The reader should watch for logistics and political-warning indicators more than dramatic exercise headlines. A successful landing is not the same as a successful campaign. The family is useful because it makes sustainment the decisive question.'],
    ['Blockade, Quarantine, And Coercive Isolation', 'This family tests whether Beijing can apply enough pressure to force political concessions without crossing a threshold that unifies allies immediately. It turns shipping, insurance, energy, food, air routes, cyber pressure, and legal language into strategic variables. It may produce fewer obvious military indicators than invasion, but it can be strategically severe. The strongest warning signs are commercial behavior changes and government restrictions moving faster than public war rhetoric.'],
    ['Escalation Management', 'This family tests how leaders control a conflict once deterrence begins failing. It asks whether strikes, cyber operations, space effects, nuclear signaling, and regional basing decisions deter or widen the war. It is important because miscalculation may arise from political timing rather than platform capability. The best page analysis should connect military movement to authorization, public messaging, allied consultation, and crisis communication.'],
    ['Exercise-To-Crisis Conversion', 'This family tests the ambiguity between normal drills, coercive signaling, and concealed preparation. Exercises become more dangerous when they change logistics, civilian shipping, reserves, medical preparation, cyber activity, or legal authorities. The value of this family is that it warns against overreacting to routine activity while still watching for hidden mobilization. It should be updated dynamically as new RSS reporting appears.'],
    ['Dual-Contingency Stress', 'This family tests Taiwan and Korea as one resource problem. Munitions, missile defense, ISR, tankers, submarines, cyber support, and Japanese base politics are finite. If one theater heats up, deterrence in the other can degrade even without a formal alliance decision. This family belongs on both flagship pages because the warning picture is shared.'],
  ];
  const koreaFamilies = [
    ['Limited Strike And Nuclear Coercion', 'This family tests how fast a limited conventional incident can move toward tactical nuclear threats. It is about the gap between conventional response and nuclear retaliation, and whether Pyongyang believes the alliance lacks proportional choices. The scenario is not primarily about North Korea winning a long war. It is about forcing negotiation under fear and uncertainty.'],
    ['Dual-Adversary Escalation', 'This family links Korea to a Taiwan crisis. The key risk is that the United States and allies cannot deter opportunistic escalation by the second adversary while already managing the first. The page should therefore track Taiwan crisis intensity, Japan basing politics, missile-defense inventory, and DPRK launch tempo together. Treating Korea as isolated would hide the real risk.'],
    ['Space, Cyber, And C2 Shock', 'This family tests the information systems that allow modern forces and governments to operate. Satellite disruption, cyber outages, GPS degradation, public warning failure, and command-channel uncertainty can shape the first hours of a crisis. Korea is especially sensitive because distances are short and decisions must be made quickly. Resilience matters as much as firepower.'],
    ['Drone And Armor Attrition', 'This family tests whether armored and artillery forces can survive persistent observation and cheap precision attack. It converts lessons from Ukraine into Korean terrain, where concealment, movement, EW, counter-drone defense, and repair capacity matter. The warning indicators are practical: shelters, drone units, EW exercises, ammunition, and counter-UAS procurement.'],
    ['Nuclear-Cognitive Warfare', 'This family treats perception as a battlespace. North Korea can use nuclear narratives, cyber disruption, rumors, selective leaks, and public fear to slow allied decisions. It does not require immediate nuclear use to produce strategic effect. The page should therefore treat information operations as part of the threat model rather than background noise.'],
  ];
  const data = theater === 'taiwan' ? taiwanFamilies : koreaFamilies;
  const image = theater === 'taiwan' ? '/assets/maps/taiwan-physiography-cia-2022.jpg' : '/assets/maps/south-korea-physiography-cia-2018.jpg';
  return `<section class="section" id="scenario-families"><h2>Scenario Families</h2><div class="lead-grid">${figure(image, theater === 'taiwan' ? 'Taiwan terrain context for scenario families.' : 'Korean Peninsula terrain context for scenario families.')}<div class="family-grid">${data.map(([title, text]) => `<div class="family-card"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('')}</div></div></section>`;
}

function escalationSection(theater) {
  const rows = theater === 'taiwan' ? [
    ['Coercive Exercises', 'China gains pressure and normalization of military presence, but risks habituating Taiwan and allies to the pattern. Taiwan gains warning practice and civil-defense reinforcement, but public fatigue can grow. The scenario remains below war until it changes civilian logistics, legal authorities, commercial behavior, or allied readiness. The analytical challenge is separating routine signaling from rehearsal that materially improves crisis position.', ['Ambiguous and repeatable pressure tool', 'Lower cost than blockade or invasion', 'Collects intelligence and rehearses command-and-control', 'Can normalize PLA presence near Taiwan'], ['Can expose PLA patterns', 'Can harden Taiwan public resilience', 'Risk of accident or overreaction', 'May fail if allies predefine warning thresholds']],
    ['Blockade Or Quarantine', 'China can pressure Taiwan without immediately committing to an invasion, but it must manage commercial blowback and allied response. Taiwan can frame the move as coercion and rally partners, but stockpiles and public confidence become stressed. The decisive contest becomes legal framing, shipping behavior, insurance, energy, communications, and coalition unity. This is often the most plausible high-pressure path because it can be scaled or paused.', ['Scalable pressure without immediate beach landing', 'Creates economic and psychological stress', 'Can exploit legal ambiguity', 'May split commercial actors before governments respond'], ['Global economic shock can unify opposition', 'Maritime incidents can widen the war', 'Sustainment is politically costly', 'Taiwan stockpiles and allied convoy policy can blunt pressure']],
    ['Invasion Attempt', 'China seeks decisive political control but accepts enormous military, economic, and regime-risk exposure. Taiwan and allies can exploit sea-denial geography, but only if command continuity and allied access survive the opening phase. The issue is not only whether forces land; it is whether follow-on lift, air cover, port access, and political termination survive contact. This rung is the highest cost option and should require the strongest warning cluster.', ['Directly pursues the unification objective', 'Can create shock if Taiwan political cohesion breaks', 'Uses proximity and missile mass', 'May attempt to outrun allied mobilization'], ['High casualties and uncertain termination', 'Semiconductor shutdown is likely even without deliberate destruction', 'Follow-on lift is exposed', 'Regional war and sanctions risk become severe']],
  ] : [
    ['Limited Strike', 'North Korea gains initiative and tests alliance resolve, but risks triggering a broader response. South Korea and the United States can respond proportionally if options are rehearsed, but political pressure will be intense. The scenario is dangerous because early decisions occur under artillery, missile, cyber, and public-fear pressure. It is the rung where escalation-control preparation matters most.', ['Speed and surprise', 'Creates bargaining pressure', 'Tests alliance response thresholds', 'May stay below immediate full-war threshold'], ['Attribution can unify the alliance', 'Civilian risk creates pressure for retaliation', 'Escalation can outrun Pyongyang control', 'Chemical or nuclear hints can trigger broader response']],
    ['Tactical Nuclear Demonstration', 'Pyongyang may try to shock the alliance into negotiation, but nuclear use can unify opposition and invite regime-threatening response. The alliance gains moral and legal clarity but faces terrifying escalation choices. The core problem is whether response options exist between ineffective conventional action and excessive nuclear retaliation. This rung should be evaluated through command-and-control, public messaging, and proportional-response readiness.', ['Maximum coercive fear', 'May pause allied maneuver', 'Signals regime resolve', 'Can exploit response-option gaps'], ['Breaks the nuclear taboo', 'Could trigger regime-threatening response', 'May unify Japan, ROK, US, and wider partners', 'Escalation control becomes extremely uncertain']],
    ['Dual Contingency', 'North Korea can exploit a Taiwan crisis, but it may also draw China and the United States into a less controllable regional conflict. The allies can strengthen trilateral coordination, but only if decisions were preplanned. This is the most important cross-page scenario because it couples Japan, Guam, USFK, missile defense, ISR, and munitions depth. It is a resource and political-coordination test as much as a military one.', ['Divides allied attention', 'Stresses munitions and ISR inventory', 'Creates political confusion', 'Uses Taiwan crisis timing as leverage'], ['Evidence of coordination may broaden coalition support', 'Japan base decisions become clearer under pressure', 'Adversaries risk uncontrolled regional war', 'Preplanned trilateral procedures can reduce the wedge effect']],
  ];
  return `<section class="section" id="escalation-model"><h2>Escalation Model</h2><div class="card-grid">${rows.map(([title, text, pros, cons]) => `<div class="analysis-card"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="pros-cons"><div><strong>Pros / Advantages</strong><ul>${pros.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div><div><strong>Cons / Risks</strong><ul>${cons.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div></div></div>`).join('')}</div></section>`;
}

function assumptionsSection(theater) {
  const text = theater === 'taiwan'
    ? 'The Taiwan page assumes public-source uncertainty, incomplete warning, contested cyber and space information, and political constraints on allied basing. A useful analysis must show both argument and counterargument: China has mass, proximity, missiles, and political initiative; Taiwan has geography, prepared defense, legitimacy, and potential allied support. The counterargument to alarmism is that invasion remains hard to hide and hard to sustain. The counterargument to complacency is that blockade, quarantine, cyber pressure, and exercise-to-crisis conversion may not look like a classic invasion until the crisis is already underway.'
    : 'The Korea page assumes compressed geography, nuclear coercion, alliance consultation stress, and possible China/Taiwan linkage. North Korea has proximity, artillery, missiles, cyber tools, and nuclear leverage; the alliance has superior conventional capacity, legitimacy, missile defense, and logistics depth. The counterargument to alarmism is that Pyongyang still faces catastrophic regime risk in full war. The counterargument to complacency is that limited nuclear or cognitive warfare can produce strategic effects below total war.';
  return `<section class="section" id="assumptions-limits"><h2>Assumptions And Limits</h2><div class="lead-grid"><div class="prose"><p>${esc(text)}</p><ul><li>Public war games simplify classified capabilities, readiness, intelligence warning, cyber access, and political decision-making.</li><li>Outcome confidence should rise only when multiple independent indicators converge across military, political, economic, cyber, and logistics domains.</li><li>Static pages should be treated as structured analysis baselines; live dashboard components should update the current assessment as fresh reporting arrives.</li></ul></div><div class="wide-table"><table><thead><tr><th>Argument</th><th>Counterargument</th></tr></thead><tbody><tr><td>Published war games are valuable because they reveal bottlenecks and decision points.</td><td>They can be outdated, adversaries can adapt, and classified assumptions are missing.</td></tr><tr><td>Military balance matters.</td><td>Political cohesion, logistics, geography, cyber resilience, and commercial behavior can be equally decisive.</td></tr><tr><td>Warning indicators can reduce surprise.</td><td>Ambiguity, deception, and normal exercise patterns can still compress warning time.</td></tr></tbody></table></div></div></section>`;
}

function warningAndPlanning(theater) {
  const warning = theater === 'taiwan'
    ? ['Civilian ferry, port, rail, fuel, medical, and blood-supply indicators changing alongside exercises.', 'Maritime exclusion or inspection zones that alter commercial shipping or insurance behavior.', 'Cyber pressure against Taiwan government, media, telecom, port, energy, semiconductor, or financial systems.', 'Legal language framing Taiwan as an emergency law-enforcement or quarantine problem.', 'Japan, Philippines, Guam, or US base posture shifts tied to Taiwan reporting.']
    : ['Missile dispersal, launcher camouflage, chemical rhetoric, tactical nuclear signaling, or unusual command delegation.', 'SOF, drone, cyber, and artillery activity rising together rather than as isolated incidents.', 'China diplomatic, logistics, air-defense, or border behavior suggesting support to North Korea.', 'Taiwan crisis intensity pulling allied ISR, munitions, missile defense, or command attention away from Korea.', 'Public information operations designed to split Seoul and Washington risk perceptions.'];
  const planning = theater === 'taiwan'
    ? ['Prioritize denial resilience: runway repair, port denial, distributed command, mobile coastal fires, cyber continuity, and civil-defense messaging.', 'Make allied access decisions politically rehearsed before crisis onset, especially Japan and Philippines basing questions.', 'Treat blockade and quarantine as first-class scenarios, not lesser versions of invasion.', 'Link semiconductor, shipping, insurance, cable, and energy indicators to the military threat picture.']
    : ['Build response options between symbolic conventional strikes and excessive nuclear retaliation.', 'Institutionalize Korea-Taiwan-Japan dual-contingency tabletop exercises and munitions planning.', 'Harden C2, public warning, cyber continuity, counter-drone defense, and missile-defense inventory assumptions.', 'Treat information operations as operational indicators when they coincide with missile, cyber, or military movement.'];
  return `<section class="section" id="warning-indicators"><h2>Warning Indicators</h2><div class="lead-grid"><div class="analysis-card"><h3>Indicators To Track</h3><ul>${warning.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>${figure(theater === 'taiwan' ? '/screenshots/fix-taiwan-map.png' : '/assets/maps/korea-pusan-perimeter-usacmh.jpg', theater === 'taiwan' ? 'Taiwan warning indicators should be interpreted as changes to baseline geography, not arbitrary arrows.' : 'Korea warning indicators should include historical logistics depth and modern compressed escalation timelines.')}</div></section><section class="section" id="planning-implications"><h2>Planning Implications</h2><div class="card-grid">${planning.map((item) => `<div class="analysis-card"><p>${esc(item)}</p></div>`).join('')}</div></section>`;
}

function forceReportsSection() {
  return `<section class="section" id="force-reports"><h2>Taiwan Force Comparison Reports</h2><p>Each report is a comprehensive overview of current likely combatants' firepower, broken down by branch of the military. The reports preserve the local datasource imagery and tables, but images are resized to fit their panels instead of being crop-zoomed into unusable fragments.</p><div class="force-grid">${forceReports.map((r) => `<a class="force-card" href="${r.href}"><img src="${r.image}" alt="${esc(r.title)}" loading="lazy"><div class="force-body"><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div></a>`).join('')}</div></section>`;
}

function warPage(theater) {
  const isTaiwan = theater === 'taiwan';
  const items = isTaiwan ? taiwanScenarios : koreaScenarios;
  const title = isTaiwan ? 'China / Taiwan War Games' : 'Korean Peninsula War Games';
  const active = isTaiwan ? 'China/Taiwan War Games' : 'Korean Peninsula War Games';
  const intro = isTaiwan
    ? [
        'This page is rebuilt as a flagship analysis surface rather than a list of report titles. The core question is not whether a single weapon system is impressive; it is how published war games explain the interaction between geography, shipping, political timing, command continuity, cyber pressure, allied access, semiconductor disruption, and escalation control.',
        'The most important conclusion across the Taiwan scenario set is that Beijing has many coercive pathways but few low-cost decisive pathways. A full invasion is a sustainment and political-termination problem, a blockade is a commercial and legal endurance problem, and escalation-control games are decision-cycle problems. These are different scenarios and should not be collapsed into one generic China risk card.',
        'The page uses the source reports as structured decision models. Each scenario card now tells the reader what the report tests, why it matters, and what outcome logic it implies. Dedicated deep-review pages provide the longer analysis, images, source links, limitations, and outcome footer that were missing from the previous version.',
      ]
    : [
        'This page treats the Korean Peninsula as a modern nuclear-coercion and dual-contingency theater, not as a generic conventional land-war model. The most recent public scenario work converges on a clear warning: Korea can escalate quickly, and a Taiwan crisis can degrade Korea deterrence before a single ground maneuver occurs.',
        'The key themes are limited strikes under a nuclear shadow, tactical nuclear coercion, China/Taiwan linkage, space and cyber shock, drone-enabled attrition, and information operations aimed at splitting Seoul and Washington. The page is designed to show how those themes interact rather than listing article titles with no interpretation.',
        'Each scenario now leads to its own deep-review page. The cards are meant to make the reader want to click through: they state what the game tests, why it changes the threat picture, and which indicators should feed the live watch pages.',
      ];
  const body = `
<section class="section" id="executive-assessment">
  <div class="lead-grid">
    <div class="prose"><h2>Executive Assessment</h2>${intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    ${figure(isTaiwan ? '/assets/maps/taiwan-physiography-cia-2022.jpg' : '/assets/maps/north-korea-physiography-cia-2020.jpg', isTaiwan ? 'Taiwan topography and coastal geography are central to every serious scenario family.' : 'Korean terrain and compressed distance to Seoul shape every serious escalation model.')}
  </div>
  <div class="metric-grid" style="margin-top:18px">
    <div class="metric"><strong>${items.length}</strong><span>Scenario Deep Reviews</span></div>
    <div class="metric"><strong>${isTaiwan ? forceReports.length : 5}</strong><span>${isTaiwan ? 'Force Reports Linked' : 'Escalation Families'}</span></div>
    <div class="metric"><strong>${(isTaiwan ? sources.taiwan : sources.korea).length}</strong><span>Primary Source Anchors</span></div>
  </div>
</section>
<section class="section" id="scenario-deep-review"><h2>Scenario Deep Review</h2><div class="card-grid">${items.map(scenarioCard).join('')}</div></section>
<section class="section" id="geography-context"><h2>Geography And Terrain Context</h2><div class="lead-grid">
${figure(isTaiwan ? '/assets/maps/taiwan-operation-causeway-1944.jpg' : '/assets/maps/korea-pusan-perimeter-usacmh.jpg', isTaiwan ? 'Historical Taiwan campaign-planning map used for context: beaches, ports, weather, and mountains remain recurring constraints.' : 'Historical Korean War logistics map used for context: southern ports and interior routes still matter if the conflict expands.')}
<div class="prose"><p>${isTaiwan ? 'Taiwan geography is not a decorative backdrop. The western coastal plain contains the decisive ports, airfields, urban density, and road/rail networks, while the central mountain spine limits rapid east-west maneuver. Serious scenarios therefore test whether China can sustain lift and whether Taiwan can deny ports, repair runways, preserve command continuity, and keep society functioning under missile, cyber, maritime, and information pressure. Blockade scenarios shift the map outward to the Bashi Channel, Okinawa approaches, Luzon Strait, East China Sea, South China Sea, and commercial shipping routes.' : 'Korean geography compresses warning and escalation. Seoul and critical US/ROK nodes sit close to the DMZ, while mountain corridors, river lines, ports, tunnels, and constrained road networks shape movement and sustainment. Modern scenarios add missiles, drones, cyber, nuclear coercion, and space dependence to the same terrain logic. Historical maps remain relevant because they show why ports, depth, and coalition logistics matter after the first shock.'}</p></div>
</div></section>
${familiesSection(theater)}
${comparisonMatrix(items, theater)}
${isTaiwan ? forceReportsSection() : ''}
${escalationSection(theater)}
${assumptionsSection(theater)}
${warningAndPlanning(theater)}
${sourcesList(isTaiwan ? sources.taiwan : sources.korea)}`;
  return pageShell({ title, eyebrow: isTaiwan ? 'Published scenario deep dive // Taiwan Strait' : 'Published scenario deep dive // Korean Peninsula', active, accent: isTaiwan ? '#c41e3a' : '#2563eb', body });
}

function hubPage() {
  const body = `
<section class="section">
  <div class="lead-grid">
    <div class="prose"><h2>War Gaming Hub</h2><p>This hub collects the flagship scenario analysis pages, dedicated scenario deep reviews, and Taiwan force-comparison reports. It is designed as the return point from every war-gaming page so readers can move between theater watch pages, scenario families, source reports, and branch-level capability comparisons without getting trapped in a one-off static document.</p></div>
    ${figure('/screenshots/final-taiwan-strait.png', 'Conflict Mapper theater dashboard snapshot.')}
  </div>
</section>
<section class="section"><h2>Theater Pages</h2><div class="card-grid">
  <a class="scenario-card" href="taiwan-war-games.html"><img src="/assets/maps/taiwan-physiography-cia-2022.jpg" alt="Taiwan map" loading="lazy"><div class="scenario-body"><div class="kicker">China / Taiwan</div><h3>China / Taiwan War Games</h3><p>Published invasion, blockade, escalation, exercise-conversion, and dual-contingency scenario analysis with dedicated deep-review pages.</p></div></a>
  <a class="scenario-card" href="korean-peninsula-war-games.html"><img src="/assets/maps/north-korea-physiography-cia-2020.jpg" alt="Korea map" loading="lazy"><div class="scenario-body"><div class="kicker">Korean Peninsula</div><h3>Korean Peninsula War Games</h3><p>Guardian Tiger, ODNI/NIC, NPEC, drone/armor, and nuclear-cognitive scenario analysis with dedicated deep-review pages.</p></div></a>
</div></section>
${forceReportsSection()}
${sourcesList([...sources.taiwan.slice(0, 5), ...sources.korea.slice(0, 5)])}`;
  return pageShell({ title: 'War Gaming Hub', eyebrow: 'Conflict Mapper scenario analysis index', active: 'War Gaming Hub', accent: '#c41e3a', body });
}

function patchForceReport(file) {
  const filePath = path.join(PAGES, file);
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace('<html lang="en" data-theme="light">', '<html lang="en" data-theme="light">');
  html = html.replace(/<nav class="top-nav">[\s\S]*?<\/nav>/, '');
  html = html.replace(/object-fit:cover/g, 'object-fit:contain');
  html = html.replace(/max-height:520px;/g, 'max-height:none;height:auto;');
  html = html.replace(/max-height:340px/g, 'max-height:none');
  if (!html.includes('class="action-strip"')) {
    html = html.replace(/<body>/, `<body>\n${actionBar('China/Taiwan War Games')}`);
  }
  if (!html.includes('class="force-report-intro"')) {
    html = html.replace('<main class="section report-content">', `<main class="section report-content"><section class="force-report-intro"><h2>Report Contents</h2><p>This report is a comprehensive overview of current likely combatants' firepower, broken down by military branch and platform type for a Taiwan contingency. Use the contents links to jump directly to the platform family you need.</p><div class="toc">__TOC__</div></section>`);
  }
  const headings = [...html.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)]
    .slice(0, 36)
    .map((match) => {
      const label = match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      return `<a href="#${match[2]}">${esc(label)}</a>`;
    })
    .join('');
  html = html.replace('__TOC__', headings || '<span>No report headings found.</span>');
  if (!html.includes('.action-strip{')) {
    html = html.replace('</style>', `.action-strip{display:flex;flex-wrap:wrap;gap:8px;width:var(--cm-content-max-width,min(90vw,calc(100vw - 32px)));max-width:none;margin:0 auto 18px;padding:12px 24px;background:var(--surface);border:1px solid var(--border);border-radius:0 0 var(--radius) var(--radius)}.action-strip a{font-family:var(--font-mono);font-size:var(--cm-navigation-text-size,16pt);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:7px 10px;background:var(--surface-2)}.toc{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 22px}.toc a{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);text-transform:uppercase;text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:6px 8px;background:var(--surface-2)}.force-report-intro{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:18px;margin-bottom:22px}.report-figure img{object-fit:contain!important;max-height:none!important;height:auto!important}</style>`);
  }
  fs.writeFileSync(filePath, html);
}

function patchFinalScenarioPage() {
  const filePath = path.join(PAGES, 'taiwan-contingency-ai-chip-war.html');
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace('<html lang="en" data-theme="light">', '<html lang="en" data-theme="light">');
  html = html.replace(/<nav class="top-nav">[\s\S]*?<\/nav>/, '');
  html = html.replace(/object-fit:cover/g, 'object-fit:contain');
  html = html.replace(/max-height:520px;/g, 'max-height:none;height:auto;');
  if (!html.includes('class="action-strip"')) {
    html = html.replace(/<body>/, `<body>\n${actionBar('China/Taiwan War Games')}`);
  }
  if (!html.includes('.action-strip{')) {
    html = html.replace('</style>', `.action-strip{display:flex;flex-wrap:wrap;gap:8px;width:var(--cm-content-max-width,min(90vw,calc(100vw - 32px)));max-width:none;margin:0 auto 18px;padding:12px 24px;background:var(--surface);border:1px solid var(--border);border-radius:0 0 var(--radius) var(--radius)}.action-strip a{font-family:var(--font-mono);font-size:var(--cm-navigation-text-size,16pt);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:7px 10px;background:var(--surface-2)}.analysis-map img{object-fit:contain!important;max-height:none!important;height:auto!important}</style>`);
  }
  fs.writeFileSync(filePath, html);
}

function main() {
  fs.writeFileSync(path.join(PAGES, 'war-gaming-hub.html'), hubPage());
  fs.writeFileSync(path.join(PAGES, 'taiwan-war-games.html'), warPage('taiwan'));
  fs.writeFileSync(path.join(PAGES, 'korean-peninsula-war-games.html'), warPage('korea'));
  for (const scenario of taiwanScenarios) fs.writeFileSync(path.join(PAGES, `${scenario.slug}.html`), scenarioDetailPage(scenario, 'taiwan'));
  for (const scenario of koreaScenarios) fs.writeFileSync(path.join(PAGES, `${scenario.slug}.html`), scenarioDetailPage(scenario, 'korea'));
  for (const report of forceReports) patchForceReport(report.href);
  patchFinalScenarioPage();
}

main();
