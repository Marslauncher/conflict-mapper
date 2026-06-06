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
    title: 'Guardian Tiger II - Regional Crisis and Korea Opportunism',
    source: 'Atlantic Council',
    sourceUrl: sources.korea[0][1],
    image: '/assets/maps/south-korea-physiography-cia-2018.jpg',
    caption: 'CIA South Korea physiography map - Guardian Tiger II stresses Seoul-Incheon exposure, Japan access, interceptor inventory, ISR allocation, and alliance decision bandwidth.',
    family: 'Regional diversion and deterrence bandwidth',
    hook: 'Guardian Tiger II matters because it treats Korea as a theater that can be exploited during a wider regional crisis. Pyongyang does not need to win a long war; it needs to make allied leaders doubt whether they can manage Korea, Japan access, missile defense, cyber disruption, and nuclear messaging at the same time.',
    summary: [
      'The scenario injects North Korean escalation into a moment when allied attention, munitions, ISR, air and missile defense, public messaging, and political leadership bandwidth are already stressed. The result is not a clean second battlefield. It is a regional command problem in which Seoul, Washington, Tokyo, Guam, USFK, missile-defense forces, space assets, and cyber defenders are all competing for scarce decision time.',
      'The key insight is that deterrence can fail even if North Korea cannot win a full war. Limited strikes, missile salvos, cyber disruption, artillery alerts, nuclear rhetoric, or information operations can force allied leaders into visible consultation delays. Those delays are themselves a coercive effect because they can make the public doubt whether extended deterrence is executable under pressure.',
      'Monitoring should therefore connect DPRK launches, cyber pressure, DMZ artillery posture, Japan base permissions, USFK alert status, interceptor inventory, evacuation narratives, and allied political messaging. The strongest warning pattern is not one missile launch; it is a synchronized cluster that suggests Pyongyang is testing whether allied bandwidth is saturated.',
    ],
    outcome: 'Outcome assessment: regional-crisis failure is most likely when allies treat Korea as a self-contained dashboard rather than a demand signal on shared ISR, missile defense, munitions, cyber defense, public messaging, and Japan access. The outcome depends on whether South Korea, Japan, and the United States can coordinate under simultaneous missile, cyber, and nuclear pressure. If coordination lags, Pyongyang can exploit gaps in basing, interceptors, public messaging, and escalation ladders. If coordination is rehearsed, deterrence becomes more credible because North Korea sees fewer unclaimed decision gaps.',
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
    image: '/assets/weapons/prsm-missile.jpg',
    caption: 'Precision Strike Missile image - long-range fires, counter-C2 targeting, ISR, and counter-drone protection shape armored-force survivability around the DMZ.',
    family: 'Drone, ISR, EW, artillery, and armored-force survivability',
    hook: 'This scenario matters because Korea is no longer just artillery versus armor. Persistent drones, electronic warfare, cheap sensors, and rapid targeting loops change how armored forces survive near the DMZ.',
    summary: [
      'The Modern War Institute scenario connects Ukraine lessons to Korean terrain and alliance planning. Armor, artillery, logistics, counter-battery systems, and air defenses may all be visible to persistent ISR from the opening hours of conflict.',
      'The core analytical point is attrition speed. A force that looks strong on paper can lose operational value quickly if it cannot move, conceal, repair, refuel, communicate, and counter drones under continuous observation.',
      'For Korea, this matters because drone defense, ISR, precision fires, electronic warfare, counter-battery fires, and repair capacity are shared stress points across the alliance. A crisis that consumes interceptors, long-range fires, maintenance crews, or ISR sorties elsewhere can leave USFK and ROK forces with fewer options during the first hours of a peninsula emergency.',
    ],
    outcome: 'Outcome assessment: armored forces remain useful, but only if protected by EW, counter-drone defense, dispersion, camouflage, rapid repair, and fires integration. The scenario punishes dense, predictable formations and rewards resilient logistics. Korea warning should therefore track drone procurement, EW posture, ammunition, shelter hardening, and counter-UAS exercises. The result is a much faster attrition environment than legacy Korea models imply.',
  },
  {
    slug: 'korea-scenario-nuclear-cognitive-warfare',
    title: 'North Korea Nuclear-Cognitive Warfare',
    source: '38 North',
    sourceUrl: sources.korea[4][1],
    image: '/assets/maps/south-korea-physiography-cia-2018.jpg',
    caption: 'CIA South Korea physiography map - cognitive warfare targets the exposed Seoul-Incheon decision center as much as military formations.',
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

function actionBar(active, scope = 'all') {
  const linkSets = {
    all: [
      ['War Gaming Hub', 'war-gaming-hub.html'],
      ['China/Taiwan Watch', 'taiwan-strait.html'],
      ['China/Taiwan War Games', 'taiwan-war-games.html'],
      ['Korean Peninsula Watch', 'korean-peninsula.html'],
      ['Korean Peninsula War Games', 'korean-peninsula-war-games.html'],
    ],
    taiwan: [
      ['War Gaming Hub', 'war-gaming-hub.html'],
      ['China/Taiwan Watch', 'taiwan-strait.html'],
      ['China/Taiwan War Games', 'taiwan-war-games.html'],
    ],
    korea: [
      ['War Gaming Hub', 'war-gaming-hub.html'],
      ['Korean Peninsula Watch', 'korean-peninsula.html'],
      ['Korean Peninsula War Games', 'korean-peninsula-war-games.html'],
    ],
  };
  const links = linkSets[scope] || linkSets.all;
  return `<div class="action-strip">${links.map(([label, href]) => `<a class="${label === active ? 'active' : ''}" href="${href}">${esc(label)}</a>`).join('')}</div>`;
}

function sourceContext(label) {
  const text = String(label || '').toLowerCase();
  if (text.includes('guardian tiger')) return 'Atlantic Council tabletop exercises centered on limited strikes, chemical escalation, tactical nuclear coercion, China intervention, and alliance response gaps. The Korea pages use this source to frame proportional-response problems, Seoul-Washington consultation stress, Japan access, and the danger of Pyongyang exploiting visible delays in allied decision-making.';
  if (text.includes('odni') || text.includes('nic')) return 'Declassified intelligence assessment on North Korean nuclear leverage pathways. Use this for coercive nuclear signaling, regime-survival logic, and why nuclear possession can enable limited conventional risk-taking.';
  if (text.includes('pyongyang goes nuclear') || text.includes('npec')) return 'Scenario analysis on space nuclear use and strategic shock. Use this to connect satellite resilience, GPS degradation, legal framing, proportional response, and ground-crisis timing.';
  if (text.includes('drone warfare') || text.includes('modern war institute')) return 'Analysis connecting drone, ISR, electronic-warfare, and armor survivability lessons to Korean terrain. Use this for attrition-speed, counter-UAS, logistics, and repair-capacity assumptions.';
  if (text.includes('38 north') || text.includes('nuclear-cognitive')) return 'Analysis of North Korean nuclear-cognitive warfare. Use this for information operations, alliance fracture, public-warning resilience, and perception as an operational battlespace.';
  if (text.includes('north korea maps')) return 'CIA map reference for North Korean terrain, basing context, mountain corridors, coastal access, and dispersal geography. Use it as baseline geography, not as a live order-of-battle source.';
  if (text.includes('south korea maps')) return 'CIA map reference for South Korean terrain, population centers, Seoul-Incheon exposure, ports, and southern logistics depth. Use it to explain why distance and route structure compress decision timelines.';
  if (text.includes('first battle')) return 'CSIS invasion war game that tests whether China can convert early shock into sustained control under allied denial pressure. Use it for lift, runway repair, submarines, Japanese basing, and campaign termination assumptions.';
  if (text.includes('lights out')) return 'Blockade/quarantine war game focused on shipping, insurance, legal framing, commercial behavior, energy, and political endurance. Use it to keep blockade scenarios distinct from invasion scenarios.';
  if (text.includes('dangerous straits')) return 'CNAS escalation-management game. Use it for leader decision cycles, strike authorization, cyber/space risk, allied consultation, and how military actions can deter or widen a conflict.';
  if (text.includes('prc perspective') || text.includes('wargame to take taiwan')) return 'PRC-perspective scenario framing. Use it to analyze coercive sequencing, legal preparation, information operations, and how Beijing may try to fracture Taiwan and coalition decision-making.';
  if (text.includes('isw')) return 'Recurring China-Taiwan reporting and special reports. Use it as an update stream for political, military, and gray-zone indicators that should refresh watch-page assessments.';
  if (text.includes('taiwan physiography')) return 'CIA Taiwan map reference for mountains, western coastal density, ports, and airfield geography. Use it as baseline terrain context, not a live campaign plan.';
  return 'Primary source anchor for the scenario set. Use it to verify assumptions, read the original argument, and update this page when the source or current reporting changes.';
}

function sourceAsset(label) {
  const text = String(label || '').toLowerCase();
  if (text.includes('guardian tiger')) return '/assets/maps/north-korea-physiography-cia-2020.jpg';
  if (text.includes('odni') || text.includes('nic')) return '/assets/weapons/thaad-launcher.jpg';
  if (text.includes('pyongyang goes nuclear') || text.includes('npec')) return '/assets/maps/korea-pusan-perimeter-usacmh.jpg';
  if (text.includes('drone warfare') || text.includes('modern war institute')) return '/assets/weapons/prsm-missile.jpg';
  if (text.includes('38 north') || text.includes('nuclear-cognitive')) return '/assets/maps/south-korea-physiography-cia-2018.jpg';
  if (text.includes('north korea maps')) return '/assets/maps/north-korea-physiography-cia-2020.jpg';
  if (text.includes('south korea maps')) return '/assets/maps/south-korea-physiography-cia-2018.jpg';
  if (text.includes('first battle')) return '/assets/maps/taiwan-physiography-cia-2022.jpg';
  if (text.includes('lights out')) return '/screenshots/final-taiwan-strait.png';
  if (text.includes('dangerous straits')) return '/assets/maps/taiwan-operation-causeway-1944.jpg';
  if (text.includes('prc perspective') || text.includes('wargame to take taiwan')) return '/assets/force-comparison/china-vs-allied-naval-forces-taiwan/images/image_1.jpg';
  if (text.includes('isw')) return '/screenshots/fix-taiwan-map.png';
  if (text.includes('taiwan physiography')) return '/assets/maps/taiwan-physiography-cia-2022.jpg';
  return '/assets/maps/north-korea-physiography-cia-2020.jpg';
}

function sourceTags(label) {
  const text = String(label || '').toLowerCase();
  if (text.includes('guardian tiger')) return ['Tabletop exercise', 'Escalation ladder', 'Alliance decision cycle'];
  if (text.includes('odni') || text.includes('nic')) return ['Declassified assessment', 'Nuclear leverage', 'Regime logic'];
  if (text.includes('pyongyang goes nuclear') || text.includes('npec')) return ['Space nuclear shock', 'Satellite resilience', 'C2 continuity'];
  if (text.includes('drone warfare') || text.includes('modern war institute')) return ['Drone attrition', 'Armor survival', 'Counter-UAS'];
  if (text.includes('38 north') || text.includes('nuclear-cognitive')) return ['Information operations', 'Nuclear narrative', 'Alliance cohesion'];
  if (text.includes('north korea maps')) return ['Terrain baseline', 'Dispersal geography', 'Mountain corridors'];
  if (text.includes('south korea maps')) return ['Seoul exposure', 'Ports and logistics', 'Population terrain'];
  return ['Scenario source', 'Analytical anchor', 'Open source'];
}

function sourcesList(items, theater = 'all', scenarios = []) {
  const lede = theater === 'korea'
    ? 'The Korea source index is intentionally analytical rather than bibliographic. Each card shows why the source matters, what data or scenario logic it contributes, and which warning questions it should feed back into the live Korean Peninsula watch page.'
    : 'These are not generic bibliography links. Each card explains what analytical job the source performs in the page so readers can decide which original report to open first.';
  if (theater === 'korea' && scenarios.length) {
    const featured = scenarios.slice(-3).reverse();
    return `<section class="section sources" id="sources"><h2>Source Index</h2><p class="section-lede">${esc(lede)}</p><div class="source-carousel" aria-label="Featured Korean Peninsula scenario sources">${featured.map((s) => `<a class="source-feature-card" href="${s.slug}.html"><img src="${esc(s.image)}" alt="${esc(s.caption)}" loading="lazy"><div><div class="kicker">${esc(s.source)} // ${esc(s.family)}</div><h3>${esc(s.title)}</h3><p>${esc(s.hook)} ${esc(s.summary[0])}</p><p><strong>Scenario value:</strong> ${esc(s.outcome.split('. ').slice(0, 2).join('. '))}.</p></div></a>`).join('')}</div><h3 class="subsection-heading">Currently Relevant Scenario Summary Cards</h3><div class="source-summary-grid">${scenarios.map((s) => `<a class="source-summary-card" href="${s.slug}.html"><img src="${esc(s.image)}" alt="${esc(s.caption)}" loading="lazy"><div><div class="matrix-meta">${esc(s.source)}</div><h3>${esc(s.title)}</h3><p>${esc(s.hook)} ${esc(s.summary[0])}</p><div class="card-actions"><span class="kicker">Open deep review</span></div></div></a>`).join('')}</div><h3 class="subsection-heading">Reference Library</h3><div class="source-grid source-grid-readable">${items.map(([label, url]) => `<a class="source-card rich" href="${url}" target="_blank" rel="noopener noreferrer"><img src="${esc(sourceAsset(label))}" alt="${esc(label)} reference image" loading="lazy"><div><strong>${esc(label)}</strong><p>${esc(sourceContext(label))}</p><div class="source-tags">${sourceTags(label).map((tag) => `<span>${esc(tag)}</span>`).join('')}</div><em>${esc(url)}</em></div></a>`).join('')}</div></section>`;
  }
  return `<section class="section sources" id="sources"><h2>Source Index</h2><p class="section-lede">${esc(lede)}</p><div class="source-grid source-grid-readable">${items.map(([label, url]) => `<a class="source-card rich" href="${url}" target="_blank" rel="noopener noreferrer"><img src="${esc(sourceAsset(label))}" alt="${esc(label)} reference image" loading="lazy"><div><strong>${esc(label)}</strong><p>${esc(sourceContext(label))}</p><div class="source-tags">${sourceTags(label).map((tag) => `<span>${esc(tag)}</span>`).join('')}</div><em>${esc(url)}</em></div></a>`).join('')}</div></section>`;
}

function figure(src, caption) {
  return `<figure class="analysis-figure expandable" data-full-src="${esc(src)}"><img src="${esc(src)}" alt="${esc(caption)}" loading="lazy"><figcaption>${esc(caption)} Click to expand.</figcaption></figure>`;
}

function pageShell({ title, eyebrow, body, active, accent = '#c41e3a', scope }) {
  const navScope = scope || (String(active || '').startsWith('Korean') ? 'korea' : String(active || '').startsWith('China/Taiwan') ? 'taiwan' : 'all');
  const nav = actionBar(active, navScope);
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
html[data-theme="dark"]{--bg:var(--color-bg,#080b10);--surface:var(--color-surface,#10141c);--surface-2:var(--color-surface-2,#151b26);--surface-3:var(--color-surface-3,#1e2736);--text:var(--color-text,#e5e7eb);--muted:var(--color-text-muted,#a7b0c0);--faint:var(--color-text-faint,#667085);--border:var(--color-border-dim,rgba(255,255,255,.1))}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,color-mix(in srgb,var(--accent) 10%,transparent),transparent 34rem),var(--bg);color:var(--text);font-family:var(--font-body);line-height:1.68}.hero,.section{width:var(--cm-content-max-width,min(90vw,calc(100vw - 32px)));max-width:none;margin:0 auto}.hero{padding:48px var(--cm-page-gutter,32px) 26px}.eyebrow{font-family:var(--font-mono);font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}.hero h1{font-family:var(--font-display);font-size:clamp(2.7rem,6vw,5.8rem);line-height:.95;letter-spacing:.04em;text-transform:uppercase;margin:0 0 16px}.hero p{max-width:1280px;color:var(--muted);font-size:var(--cm-article-text-size,15pt);margin:0 0 12px}.action-strip{position:sticky;top:0;z-index:5;display:flex;gap:8px;flex-wrap:wrap;width:var(--cm-content-max-width,min(90vw,calc(100vw - 32px)));max-width:none;margin:0 auto 18px;padding:12px var(--cm-page-gutter,32px);background:color-mix(in srgb,var(--bg) 92%,transparent);border:1px solid var(--border);border-radius:0 0 var(--radius) var(--radius);backdrop-filter:blur(12px)}.action-strip a{font-family:var(--font-mono);font-size:var(--cm-navigation-text-size,16pt);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:7px 10px;background:var(--surface)}.action-strip a.active,.action-strip a:hover{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 55%,var(--border));background:color-mix(in srgb,var(--accent) 8%,var(--surface))}.section{padding:26px var(--cm-page-gutter,32px)}.section h2{font-family:var(--font-display);font-size:var(--cm-header-text-size,24pt);letter-spacing:.12em;text-transform:uppercase;margin:0 0 16px;border-bottom:1px solid var(--border);padding-bottom:9px}.section h3{font-family:var(--font-display);font-size:clamp(1.2rem,var(--cm-navigation-text-size,16pt),1.55rem);letter-spacing:.07em;text-transform:uppercase;margin:0 0 10px}.section p,.section li{font-size:var(--cm-article-text-size,15pt);color:var(--muted)}a{color:var(--accent)}.lead-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(420px,.75fr);gap:22px;align-items:start}.prose{max-width:1260px}.prose p{margin:0 0 15px}.metric-grid,.card-grid,.source-grid,.family-grid,.force-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.metric,.scenario-card,.source-card,.family-card,.analysis-card,.matrix-card,.force-card,.source-feature-card,.source-summary-card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);overflow:hidden}.metric{padding:16px}.metric strong{display:block;font-family:var(--font-display);font-size:2rem;color:var(--accent);line-height:1}.metric span{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);color:var(--faint);text-transform:uppercase;letter-spacing:.1em}.scenario-card{display:grid;grid-template-rows:auto 1fr}.scenario-card img,.force-card img{width:100%;height:230px;object-fit:contain;background:var(--surface-2);display:block}.theater-card img{height:440px}.theater-card.no-image{grid-template-rows:1fr;min-height:440px}.theater-card.no-image .scenario-body{display:flex;flex-direction:column;justify-content:center}.scenario-body,.force-body,.family-card,.analysis-card,.matrix-card,.source-feature-card>div,.source-summary-card>div{padding:16px}.kicker{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}.scenario-card p,.family-card p,.matrix-card p,.source-feature-card p,.source-summary-card p{margin:0 0 10px}.card-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.card-actions a{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);letter-spacing:.08em;text-transform:uppercase;text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:6px 9px;background:var(--surface-2)}.analysis-figure{margin:0;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);overflow:hidden}.analysis-figure img{width:100%;max-height:560px;object-fit:contain;background:var(--surface-2);display:block}.analysis-figure figcaption{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);color:var(--muted);border-top:1px solid var(--border);padding:10px 12px}.wide-table{overflow:auto;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)}table{width:100%;border-collapse:collapse;min-width:880px}th,td{border-bottom:1px solid var(--border);border-right:1px solid var(--border);padding:12px 14px;text-align:left;vertical-align:top}th{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);background:var(--surface-2)}td{font-size:var(--cm-article-text-size,15pt);color:var(--muted)}.source-card{display:block;text-decoration:none;padding:14px;overflow-wrap:anywhere}.source-card strong{display:block;color:var(--text);font-size:var(--cm-article-text-size,15pt);margin-bottom:6px}.source-card span{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);color:var(--faint)}.source-carousel{display:grid;grid-template-columns:repeat(3,minmax(380px,1fr));gap:18px;margin:18px 0 26px;overflow-x:auto;padding-bottom:6px}.source-feature-card,.source-summary-card{display:grid;text-decoration:none;color:inherit}.source-feature-card img{width:100%;height:340px;object-fit:contain;background:var(--surface-2);border-bottom:1px solid var(--border)}.source-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px;margin:16px 0 28px}.source-summary-card{grid-template-columns:200px minmax(0,1fr);align-items:stretch}.source-summary-card img{width:200px;height:100%;min-height:220px;object-fit:contain;background:var(--surface-2);border-right:1px solid var(--border)}.source-grid-readable{grid-template-columns:repeat(auto-fit,minmax(520px,1fr))}.subsection-heading{margin-top:24px!important}.outcome{border-left:4px solid var(--accent);padding:14px 16px;background:color-mix(in srgb,var(--accent) 8%,var(--surface));border-radius:0 var(--radius) var(--radius) 0;margin-top:16px}.toc{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.toc a{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);text-transform:uppercase;text-decoration:none;border:1px solid var(--border);border-radius:6px;padding:6px 8px;background:var(--surface)}@media(max-width:980px){.lead-grid{grid-template-columns:1fr}.action-strip{position:static}.scenario-card img,.force-card img,.theater-card img{height:260px}.theater-card.no-image{min-height:auto}.source-carousel{grid-template-columns:repeat(3,minmax(300px,80vw));}.source-summary-card{grid-template-columns:1fr}.source-summary-card img{width:100%;height:240px;border-right:0;border-bottom:1px solid var(--border)}.source-grid-readable{grid-template-columns:1fr}table{min-width:720px}}@media(max-width:620px){.hero{padding-top:28px}.action-strip a{width:100%;text-align:center}.section{padding-left:14px;padding-right:14px}.hero h1{font-size:2.35rem}}
.pros-cons{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.pros-cons div{border:1px solid var(--border);border-radius:var(--radius);padding:12px;background:var(--surface-2)}.pros-cons strong{display:block;font-family:var(--font-display);letter-spacing:.08em;text-transform:uppercase;color:var(--text);margin-bottom:6px}.pros-cons ul{margin:0;padding-left:18px}.pros-cons li{font-size:var(--cm-commentary-text-size,12pt);margin-bottom:5px}@media(max-width:980px){.pros-cons{grid-template-columns:1fr}}
	.action-strip{position:static!important;border-radius:var(--radius)!important;background:color-mix(in srgb,var(--surface) 94%,transparent)!important}
	.section-lede{max-width:1200px;margin:0 0 18px;color:var(--muted)}
	.source-card p{margin:0 0 10px;color:var(--muted)}
		.source-card.rich{display:grid;grid-template-columns:180px minmax(0,1fr);gap:14px;align-items:stretch}.source-card.rich img{width:180px;height:140px;object-fit:contain;background:var(--surface-2);border:1px solid var(--border);border-radius:6px}.source-card em{display:block;margin-top:10px;font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);font-style:normal;color:var(--faint);overflow-wrap:anywhere}.source-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.source-tags span{border:1px solid var(--border);border-radius:999px;padding:4px 8px;background:var(--surface-2);color:var(--muted)}@media(max-width:980px){.source-card.rich{grid-template-columns:1fr}.source-card.rich img{width:100%;height:190px}}
	@media(max-width:620px){.metric-grid,.card-grid,.source-grid,.family-grid,.force-grid,.comparison-grid,.source-summary-grid{grid-template-columns:minmax(0,1fr)}.source-carousel{display:flex;max-width:100%;gap:14px;overflow-x:auto;overscroll-behavior-x:contain}.source-feature-card{flex:0 0 min(280px,100%)}.source-summary-card{min-width:0;width:100%}}
		.analysis-figure.expandable{cursor:zoom-in}
.map-feature{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(340px,.65fr);gap:18px;align-items:stretch}
.map-feature .analysis-figure img{max-height:720px}
.family-grid-wide{grid-template-columns:repeat(5,minmax(220px,1fr))}
.family-card{display:flex;flex-direction:column;gap:12px}
.family-card img,.matrix-card img,.analysis-card img{width:100%;height:170px;object-fit:cover;border-radius:6px;border:1px solid var(--border);background:var(--surface-2)}
.comparison-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}
.matrix-card{display:grid;grid-template-rows:auto 1fr}
.matrix-card h3{margin-top:0}
	.matrix-meta{font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
	.bar-row{display:grid;grid-template-columns:150px minmax(0,1fr) 60px;gap:10px;align-items:center;margin:8px 0;color:var(--muted);font-size:var(--cm-commentary-text-size,12pt)}
	.bar-track{height:10px;border-radius:999px;background:var(--surface-3);overflow:hidden}.bar-track i{display:block;height:100%;background:var(--accent)}
	.warning-grid{display:grid;gap:10px;margin-top:12px}.warning-item{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);padding:12px}.warning-item strong{display:block;font-family:var(--font-display);font-size:clamp(1.05rem,var(--cm-navigation-text-size,16pt),1.4rem);letter-spacing:.08em;text-transform:uppercase;color:var(--text);margin-bottom:6px}.warning-item p{margin:0 0 8px}.warning-item p:last-child{margin-bottom:0}
	.insight-list{display:grid;gap:10px;margin:14px 0 0;padding:0;list-style:none}.insight-list li{position:relative;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-2);padding:12px 40px 12px 12px}.insight-list strong{display:block;color:var(--text);margin-bottom:6px}.insight-list p{margin:0}.info-dot{position:absolute;right:10px;top:10px;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--accent) 55%,var(--border));background:color-mix(in srgb,var(--accent) 12%,var(--surface));color:var(--accent);font-family:var(--font-mono);font-size:var(--cm-commentary-text-size,12pt);cursor:help}.info-popover{position:absolute;right:0;top:30px;z-index:20;width:min(360px,76vw);display:none;padding:12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);box-shadow:0 18px 40px rgba(0,0,0,.28);color:var(--muted);font-family:var(--font-body);font-size:var(--cm-commentary-text-size,12pt);line-height:1.5;text-transform:none;letter-spacing:0}.info-dot:hover .info-popover,.info-dot:focus .info-popover{display:block}
	.visual-pair{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1fr);gap:16px;align-items:stretch}
.analysis-card.visual img{height:220px;object-fit:contain}
.map-lightbox{position:fixed;inset:0;z-index:4000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.82);padding:24px}
.map-lightbox.open{display:flex}.map-lightbox img{max-width:min(96vw,1600px);max-height:88vh;object-fit:contain;background:#020617;border:1px solid rgba(255,255,255,.22);border-radius:8px}.map-lightbox button{position:absolute;top:18px;right:18px;border:1px solid rgba(255,255,255,.28);background:#0f172a;color:#fff;border-radius:6px;padding:9px 12px;font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
@media(max-width:1300px){.family-grid-wide{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}.map-feature,.visual-pair{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="hero"><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1></header>
${nav}
${body}
<div class="map-lightbox" id="map-lightbox" aria-hidden="true"><button type="button">Close</button><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Expanded map placeholder"></div>
<script>
document.querySelectorAll('.analysis-figure.expandable').forEach((figure) => {
  figure.addEventListener('click', () => {
    const box = document.getElementById('map-lightbox');
    const img = box.querySelector('img');
    img.src = figure.dataset.fullSrc || figure.querySelector('img')?.src || '';
    img.alt = figure.querySelector('img')?.alt || 'Expanded map';
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
  });
});
document.getElementById('map-lightbox')?.addEventListener('click', (event) => {
  if (event.target.tagName === 'IMG') return;
  event.currentTarget.classList.remove('open');
  event.currentTarget.setAttribute('aria-hidden', 'true');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const box = document.getElementById('map-lightbox');
    box?.classList.remove('open');
    box?.setAttribute('aria-hidden', 'true');
  }
});
</script>
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
  const metrics = theater === 'taiwan'
    ? [
        ['Warning Ambiguity', 76],
        ['Logistics Stress', 88],
        ['Alliance Access', 82],
      ]
    : [
        ['Escalation Speed', 91],
        ['Alliance Stress', 84],
        ['C2 / Cyber Shock', 78],
      ];
  const warningText = theater === 'taiwan'
    ? 'Watch for indicator clusters across exercises, ports, civilian shipping, reserve activity, cyber pressure, diplomatic warnings, semiconductor disruption, and allied basing decisions. A single sortie spike is weak evidence; synchronization across logistics, politics, commerce, and military posture is strong evidence.'
    : 'Korea warning should be read as convergence across military movement, nuclear messaging, cyber or space disruption, public fear, and allied decision pressure. A single missile launch can be routine signaling; a missile launch plus launcher dispersal, artillery readiness, evacuation narratives, cyber disruption, and unusual allied consultation is a materially different warning pattern.';
  const koreaWarningRows = [
    ['Launcher and artillery readiness', 'Missile dispersal, 600mm MLRS activity, and forward artillery posture can compress allied response time and signal that Pyongyang wants crisis leverage before diplomacy can catch up.', 'Current indicators should include launch notices, unusual rail or road movement, hardened-site activity, ammunition movement, and rhetoric tying missile capability to specific political demands.'],
    ['Cyber, space, and public-warning disruption', 'Korea scenarios repeatedly show that command shock can matter before large ground movement. Cyber outages, GPS degradation, satellite concern, and public-warning failure can slow military response and erode civilian confidence.', 'Current indicators should include government network disruption, telecom or media outages, GPS interference reports, space-launch activity, and official continuity-of-service messaging.'],
    ['Alliance cohesion and Japan access', 'The Korea fight depends on more than the peninsula. Japan basing, interceptor allocation, USFK posture, trilateral messaging, and public confidence in extended deterrence can decide whether coercion succeeds.', 'Current indicators should include combined statements, exercise posture, missile-defense deployment, evacuation guidance, base-access politics, and visible disagreements between Seoul, Tokyo, and Washington.'],
  ];
  const warningHtml = theater === 'korea'
    ? `<p>${esc(warningText)}</p><div class="warning-grid">${koreaWarningRows.map(([watch, reason, current]) => `<div class="warning-item"><strong>${esc(watch)}</strong><p><b>Reasoning:</b> ${esc(reason)}</p><p><b>Current indicators:</b> ${esc(current)}</p></div>`).join('')}</div>`
    : `<p>${esc(warningText)}</p>`;
  const overview = theater === 'korea'
    ? [
        ['Limited Strike Pathway', 'Guardian Tiger I is the baseline coercion case: a small military action becomes strategic because the response ladder is crowded by nuclear threats, chemical escalation, Chinese signaling, and public fear. The key comparison point is whether allied leaders have proportional options ready before the first crisis meeting begins.'],
        ['Regional Diversion Pathway', 'Guardian Tiger II is the bandwidth case: a second crisis around Taiwan or the wider Indo-Pacific does not need to defeat the alliance directly; it only needs to compete for ISR, missile defense, Japan access, public messaging, and senior-leader attention. Korea risk rises when the region looks simultaneous rather than sequential.'],
        ['C2 Shock Pathway', 'Space, cyber, and public-warning disruption are the speed multipliers. These scenarios matter because the first decisive effect may be confusion, degraded navigation, delayed command confidence, or public panic rather than a visible armored thrust across the DMZ.'],
      ]
    : [
        ['Invasion Pathway', 'Full invasion games stress lift, port capture, airfield repair, maritime attrition, and campaign termination. The key comparison point is not whether China can start an attack, but whether it can sustain one while Taiwan, the United States, Japan, and partners deny usable logistics.'],
        ['Blockade Pathway', 'Blockade and quarantine games shift the fight into legal framing, shipping behavior, insurance, energy, cables, and political endurance. A blockade can be less visibly dramatic than invasion while still producing strategic pressure.'],
        ['Escalation Pathway', 'Escalation-control games ask whether strikes, cyber effects, space pressure, and public messaging can deter, terminate, or widen the conflict. The matrix should keep leader decision cycles visible, not just the weapons involved.'],
      ];
  return `<section class="section" id="comparison-matrix"><h2>Scenario Comparison Matrix</h2><p class="section-lede">${theater === 'korea' ? 'The Korea matrix compares coercion pathways, not just article titles. It separates limited strike pressure, regional diversion, nuclear leverage, space/cyber shock, drone-enabled attrition, and nuclear-cognitive warfare so the reader can see which assumptions and indicators would change the live watch assessment.' : 'The Taiwan matrix compares invasion, blockade, coercion, escalation, and PRC-perspective pathways. It keeps sustainment, legal framing, allied access, semiconductor exposure, and command pressure separate so readers do not collapse every Strait crisis into a generic invasion scenario.'}</p><h3 class="subsection-heading">Comparison Matrix Overview</h3><div class="comparison-grid" style="margin-bottom:18px">${overview.map(([title, text]) => `<div class="analysis-card"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('')}</div><div class="visual-pair"><div class="analysis-card"><h3>Cross-Scenario Stress Profile</h3>${metrics.map(([label, value]) => `<div class="bar-row"><span>${esc(label)}</span><div class="bar-track"><i style="width:${value}%"></i></div><strong>${value}%</strong></div>`).join('')}<p>These are qualitative stress scores for analytic triage, not statistical probabilities. They show which problem families deserve immediate attention when fresh reporting changes military posture, public messaging, cyber activity, logistics, or alliance coordination.</p></div><div class="analysis-card"><h3>Warning Logic</h3>${warningHtml}</div></div><div class="comparison-grid" style="margin-top:18px">${items.map((s) => `<a class="matrix-card" href="${s.slug}.html"><img src="${esc(s.image)}" alt="${esc(s.caption)}" loading="lazy"><div class="scenario-body"><div class="matrix-meta">${esc(s.source)} // ${esc(s.family)}</div><h3>${esc(s.title)}</h3><p><strong>What it tests:</strong> ${esc(s.summary[0])}</p><p><strong>Outcome logic:</strong> ${esc(s.outcome)}</p><div class="card-actions"><span class="kicker">Read scenario page</span></div></div></a>`).join('')}</div></section>`;
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
	  <h2>Current Update Model</h2>
	  <div class="analysis-card"><p>${theater === 'taiwan' ? 'Fresh reporting changes this scenario assessment when it alters capability, intent, logistics, political authorization, allied access, escalation risk, economic resilience, or commercial behavior. Routine military activity is not enough by itself; the stronger signal is a cluster that links movement, legal framing, cyber pressure, civilian preparation, and allied response.' : 'Fresh Korea reporting changes this scenario assessment when it alters missile posture, artillery readiness, nuclear signaling, cyber or space disruption, USFK posture, Japan access, public-warning continuity, or alliance messaging. Routine tests and familiar rhetoric remain background noise unless they synchronize with logistics movement, public fear, command activity, or allied decision stress.'}</p></div>
	</section>
${sourcesList([[`${s.source} - ${s.title}`, s.sourceUrl], ...otherSources.filter(([, url]) => url !== s.sourceUrl)], theater)}`;
  return pageShell({ title: s.title, eyebrow: `${theater === 'taiwan' ? 'China / Taiwan' : 'Korean Peninsula'} scenario deep review`, active: theater === 'taiwan' ? 'China/Taiwan War Games' : 'Korean Peninsula War Games', accent: theater === 'taiwan' ? '#c41e3a' : '#2563eb', body });
}

function familiesSection(theater) {
  const taiwanFamilies = [
    ['Full Invasion And Denial Campaign', '/assets/maps/taiwan-physiography-cia-2022.jpg', 'taiwan-scenario-csis-invasion.html', 'This family tests whether China can convert initial shock into sustained control. It is about ports, runways, lift, submarines, anti-ship fires, Taiwanese command continuity, and Japanese basing access. The reader should watch for logistics and political-warning indicators more than dramatic exercise headlines. A successful landing is not the same as a successful campaign. The family is useful because it makes sustainment the decisive question.'],
    ['Blockade, Quarantine, And Coercive Isolation', '/screenshots/final-taiwan-strait.png', 'taiwan-scenario-blockade-lights-out.html', 'This family tests whether Beijing can apply enough pressure to force political concessions without crossing a threshold that unifies allies immediately. It turns shipping, insurance, energy, food, air routes, cyber pressure, and legal language into strategic variables. It may produce fewer obvious military indicators than invasion, but it can be strategically severe. The strongest warning signs are commercial behavior changes and government restrictions moving faster than public war rhetoric.'],
    ['Escalation Management', '/assets/maps/taiwan-operation-causeway-1944.jpg', 'taiwan-scenario-dangerous-straits.html', 'This family tests how leaders control a conflict once deterrence begins failing. It asks whether strikes, cyber operations, space effects, nuclear signaling, and regional basing decisions deter or widen the war. It is important because miscalculation may arise from political timing rather than platform capability. The best page analysis should connect military movement to authorization, public messaging, allied consultation, and crisis communication.'],
    ['Exercise-To-Crisis Conversion', '/screenshots/fix-taiwan-map.png', 'taiwan-scenario-exercise-crisis.html', 'This family tests the ambiguity between normal drills, coercive signaling, and concealed preparation. Exercises become more dangerous when they change logistics, civilian shipping, reserves, medical preparation, cyber activity, or legal authorities. The value of this family is that it warns against overreacting to routine activity while still watching for hidden mobilization. It should be updated dynamically as new RSS reporting appears.'],
    ['Dual-Contingency Stress', '/assets/maps/south-korea-physiography-cia-2018.jpg', 'taiwan-scenario-dual-contingency.html', 'This family tests Taiwan and Korea as one resource problem. Munitions, missile defense, ISR, tankers, submarines, cyber support, and Japanese base politics are finite. If one theater heats up, deterrence in the other can degrade even without a formal alliance decision. This family belongs on both flagship pages because the warning picture is shared.'],
  ];
  const koreaFamilies = [
    ['Limited Strike And Nuclear Coercion', '/assets/weapons/thaad-launcher.jpg', 'korea-scenario-guardian-tiger-limited-strike.html', 'This family tests how fast a limited conventional incident can move toward tactical nuclear threats. The Seoul-Incheon corridor sits close enough to forward artillery, rockets, and missiles that allied leaders may face public pressure before a conventional campaign has time to organize. The central problem is the gap between symbolic retaliation and nuclear escalation: if the alliance lacks credible intermediate choices, Pyongyang may believe it can bargain from a nuclear shadow. Watch for missile dispersal, chemical rhetoric, forward artillery posture, SOF probes, cyber disruption, and demands framed as escalation control. The family matters because it turns proportional response, public messaging, C2 discipline, missile defense, and continuity planning into the center of the Korea problem.'],
    ['Regional Diversion And Alliance Bandwidth', '/assets/maps/north-korea-physiography-cia-2020.jpg', 'korea-scenario-guardian-tiger-dual-contingency.html', 'This family tests whether North Korea can exploit a wider regional crisis by forcing allied leaders to divide attention, interceptors, ISR, tankers, cyber teams, and political focus. The Korean Peninsula is not isolated from Japan access, Guam sustainment, Pacific missile-defense inventory, or US strategic messaging. Pyongyang can create stress without attempting a decisive invasion: a launch cluster, cyber outage, artillery alert, nuclear statement, or evacuation rumor can consume decision bandwidth at exactly the wrong moment. The warning problem is synchronization, not a single dramatic act. Watch USFK posture, Japan base politics, interceptor allocation, allied messaging, and DPRK launch tempo together.'],
    ['Space, Cyber, And C2 Shock', '/assets/maps/korea-pusan-perimeter-usacmh.jpg', 'korea-scenario-nuclear-space.html', 'This family tests the information systems that allow modern forces and governments to operate. Satellite disruption, GPS degradation, cyber outages, undersea-cable concern, public-warning failure, and command-channel uncertainty can shape the first hours of a crisis before ground maneuver reaches decisive scale. Korea is especially sensitive because distances are short, artillery and missile timelines are compressed, and civilian confidence in Seoul can become a military variable. The Pusan Perimeter map is used as logistics context: once command shock begins, ports, rail, roads, and southern depth decide whether the alliance can recover. Watch space-launch behavior, cyber preparation, communications backups, public-warning continuity, and whether civil agencies can keep functioning under disruption.'],
    ['Drone And Armor Attrition', '/assets/weapons/prsm-missile.jpg', 'korea-scenario-drone-armor-attrition.html', 'This family tests whether armored, artillery, and logistics forces can survive persistent observation and cheap precision attack. Korean terrain gives both sides concealment in mountains and valleys, but it also funnels road movement, repair activity, and artillery displacement into observable corridors. Drones, electronic warfare, counter-battery radars, long-range fires, and repair capacity can decide whether a unit remains operational after the first contact. The warning indicators are practical rather than rhetorical: new shelters, drone units, EW exercises, ammunition movements, counter-UAS procurement, camouflage discipline, and hardening around logistics nodes. The family explains why force strength on paper can collapse quickly if movement, refuel, repair, and command networks are continuously visible.'],
    ['Nuclear-Cognitive Warfare', '/assets/maps/south-korea-physiography-cia-2018.jpg', 'korea-scenario-nuclear-cognitive-warfare.html', 'This family treats perception as a battlespace. North Korea can use nuclear narratives, cyber disruption, rumors, selective leaks, evacuation panic, elite messaging, and public fear to slow allied decisions without immediately firing a nuclear weapon. Seoul and Washington may perceive risk differently because South Korea faces immediate artillery and missile danger while the United States also weighs homeland ICBM risk. Pyongyang can try to widen that gap and make visible consultation look like paralysis. Watch synchronized public fear, cyber outages, evacuation rumors, nuclear rhetoric, market stress, false reporting, and wedge messaging aimed at Seoul, Washington, and Tokyo. The family matters because alliance confidence is not only diplomatic; it is an operational variable.'],
  ];
  const data = theater === 'taiwan' ? taiwanFamilies : koreaFamilies;
  const image = theater === 'taiwan' ? '/assets/maps/taiwan-physiography-cia-2022.jpg' : '/assets/maps/south-korea-physiography-cia-2018.jpg';
  const analysis = theater === 'taiwan'
    ? 'The map is not testing imaginary arrows. It is testing whether scenario logic respects Taiwan geography: western coastal density, the mountain spine, port dependence, runway repair, sea-denial geometry, and the political consequences of operations radiating through Japan, the Philippines, Okinawa, Guam, and commercial shipping routes.'
    : 'The map tests how distance, terrain, and logistics compress the Korean decision cycle. The DMZ runs roughly 250 kilometers across the peninsula and sits close to the Seoul-Incheon political, economic, and command center. Seoul is near enough to the armistice line that artillery, rockets, missiles, cyber disruption, public-warning failures, and evacuation rumors can become strategic effects before a large ground campaign begins. Mountain corridors and river lines constrain movement, channel repair and resupply, and make bridges, tunnels, rail links, ports, and airfields operationally important. Southern ports and bases provide logistics depth, but that depth only matters if C2, missile defense, public messaging, and transportation networks survive the first shock.';
  return `<section class="section" id="scenario-families"><h2>Scenario Families</h2><div class="map-feature">${figure(image, theater === 'taiwan' ? 'Taiwan terrain context for scenario families.' : 'Korean Peninsula terrain context for scenario families.')}<div class="analysis-card"><h3>What This Map Is Testing</h3><p>${esc(analysis)}</p><p>${theater === 'taiwan' ? 'Each scenario family stresses the same geography in a different way: invasion stresses ports and lift, blockade stresses shipping and endurance, escalation management stresses decision cycles, and exercise conversion stresses logistics indicators hidden inside routine activity.' : 'Each scenario family inherits the same terrain problem but stresses a different decision cycle: nuclear coercion compresses political time, C2 shock disrupts coordination, drone attrition punishes visible movement, and nuclear-cognitive warfare attacks public confidence and alliance cohesion.'}</p></div></div><div class="family-grid family-grid-wide" style="margin-top:18px">${data.map(([title, img, href, text]) => `<a class="family-card" href="${href}"><img src="${esc(img)}" alt="${esc(title)}" loading="lazy"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="card-actions"><span class="kicker">Open deep review</span></div></a>`).join('')}</div></section>`;
}

function escalationSection(theater) {
  const rows = theater === 'taiwan' ? [
    ['Coercive Exercises', 'China gains pressure and normalization of military presence, but risks habituating Taiwan and allies to the pattern. Taiwan gains warning practice and civil-defense reinforcement, but public fatigue can grow. The scenario remains below war until it changes civilian logistics, legal authorities, commercial behavior, or allied readiness. The analytical challenge is separating routine signaling from rehearsal that materially improves crisis position.', ['Ambiguous and repeatable pressure tool', 'Lower cost than blockade or invasion', 'Collects intelligence and rehearses command-and-control', 'Can normalize PLA presence near Taiwan'], ['Can expose PLA patterns', 'Can harden Taiwan public resilience', 'Risk of accident or overreaction', 'May fail if allies predefine warning thresholds']],
    ['Blockade Or Quarantine', 'China can pressure Taiwan without immediately committing to an invasion, but it must manage commercial blowback and allied response. Taiwan can frame the move as coercion and rally partners, but stockpiles and public confidence become stressed. The decisive contest becomes legal framing, shipping behavior, insurance, energy, communications, and coalition unity. This is often the most plausible high-pressure path because it can be scaled or paused.', ['Scalable pressure without immediate beach landing', 'Creates economic and psychological stress', 'Can exploit legal ambiguity', 'May split commercial actors before governments respond'], ['Global economic shock can unify opposition', 'Maritime incidents can widen the war', 'Sustainment is politically costly', 'Taiwan stockpiles and allied convoy policy can blunt pressure']],
    ['Invasion Attempt', 'China seeks decisive political control but accepts enormous military, economic, and regime-risk exposure. Taiwan and allies can exploit sea-denial geography, but only if command continuity and allied access survive the opening phase. The issue is not only whether forces land; it is whether follow-on lift, air cover, port access, and political termination survive contact. This rung is the highest cost option and should require the strongest warning cluster.', ['Directly pursues the unification objective', 'Can create shock if Taiwan political cohesion breaks', 'Uses proximity and missile mass', 'May attempt to outrun allied mobilization'], ['High casualties and uncertain termination', 'Semiconductor shutdown is likely even without deliberate destruction', 'Follow-on lift is exposed', 'Regional war and sanctions risk become severe']],
  ] : [
    ['Limited Strike', 'North Korea gains initiative and tests alliance resolve, but risks triggering a broader response. South Korea and the United States can respond proportionally if options are rehearsed, but political pressure will be intense. The scenario is dangerous because early decisions occur under artillery, missile, cyber, and public-fear pressure. It is the rung where escalation-control preparation matters most.', ['Speed and surprise', 'Creates bargaining pressure', 'Tests alliance response thresholds', 'May stay below immediate full-war threshold'], ['Attribution can unify the alliance', 'Civilian risk creates pressure for retaliation', 'Escalation can outrun Pyongyang control', 'Chemical or nuclear hints can trigger broader response']],
    ['Tactical Nuclear Demonstration', 'Pyongyang may try to shock the alliance into negotiation, but nuclear use can unify opposition and invite regime-threatening response. The alliance gains moral and legal clarity but faces terrifying escalation choices. The core problem is whether response options exist between ineffective conventional action and excessive nuclear retaliation. This rung should be evaluated through command-and-control, public messaging, and proportional-response readiness.', ['Maximum coercive fear', 'May pause allied maneuver', 'Signals regime resolve', 'Can exploit response-option gaps'], ['Breaks the nuclear taboo', 'Could trigger regime-threatening response', 'May unify Japan, ROK, US, and wider partners', 'Escalation control becomes extremely uncertain']],
    ['Regional Diversion', 'North Korea can exploit a wider regional crisis, US domestic distraction, or allied munitions stress, but it may also pull China, Japan, South Korea, and the United States into a less controllable confrontation. The allies can strengthen trilateral coordination, but only if procedures and public messaging were rehearsed before the emergency. This rung couples Japan access, Guam logistics, USFK readiness, missile defense, ISR, cyber defense, and munitions depth. It is a resource and political-coordination test as much as a military one.', ['Divides allied attention', 'Stresses munitions and ISR inventory', 'Creates political confusion', 'Can exploit hesitation around Japan access'], ['Evidence of coordination may broaden coalition support', 'Japan base decisions become clearer under pressure', 'Adversaries risk uncontrolled regional war', 'Preplanned trilateral procedures can reduce the wedge effect']],
  ];
  const images = theater === 'taiwan'
    ? ['/screenshots/fix-taiwan-map.png', '/screenshots/final-taiwan-strait.png', '/assets/maps/taiwan-physiography-cia-2022.jpg']
    : ['/assets/maps/north-korea-physiography-cia-2020.jpg', '/assets/weapons/thaad-launcher.jpg', '/assets/maps/south-korea-physiography-cia-2018.jpg'];
  return `<section class="section" id="escalation-model"><h2>Escalation Model</h2><p class="section-lede">This section translates scenario narratives into decision rungs. It is meant to show what each side gains, what each side risks, and which assumptions break when the crisis moves from signaling into action.</p><div class="card-grid">${rows.map(([title, text, pros, cons], index) => `<div class="analysis-card visual"><img src="${images[index % images.length]}" alt="${esc(title)}" loading="lazy"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="pros-cons"><div><strong>Pros / Advantages</strong><ul>${pros.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div><div><strong>Cons / Risks</strong><ul>${cons.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div></div></div>`).join('')}</div></section>`;
}

function assumptionsSection(theater) {
  if (theater === 'korea') {
    const bars = [['Public-source confidence', 61], ['Nuclear uncertainty', 90], ['Alliance consultation stress', 84], ['Cyber/info sensitivity', 78]];
    const assumptions = [
      ['Compressed Geography', 'The working assumption is that Korea crisis timelines are short because Seoul, Incheon, major command functions, air bases, ports, and critical infrastructure sit within a narrow and heavily observed theater. That favors early coercion, quick public pressure, and rapid escalation signaling. The counterargument is that allied forces train for this geography and have hardened many procedures around exactly this problem. The assessment changes if reporting shows unusual civilian evacuation preparation, forward artillery posture, logistics movement, or public-warning system strain.'],
      ['Nuclear Coercion', 'The page assumes North Korea treats nuclear capability as a coercive tool, not only a last-resort battlefield option. Missile launches, tactical nuclear rhetoric, delegation hints, and demonstrative alerts can be used to make Seoul and Washington fear that a proportional response is unavailable. The counterargument is regime survival: Pyongyang still faces catastrophic risk if it escalates beyond controlled signaling. The assessment changes when nuclear rhetoric is paired with launcher dispersal, command delegation language, unusual site activity, or limited conventional attacks.'],
      ['Alliance Decision Stress', 'The alliance has superior conventional capacity, legitimacy, logistics depth, and missile-defense architecture, but those advantages require rapid consultation and public confidence. Seoul, Washington, and Tokyo may not have identical thresholds for retaliation, evacuation guidance, economic disruption, or nuclear signaling. North Korea can exploit those seams through cyber disruption, information operations, selective threats, and timed missile activity. The assessment changes if allied statements diverge, exercises are altered, base access becomes politically contested, or evacuation messaging becomes inconsistent.'],
      ['Cyber And Information Effects', 'The page assumes cyber and information operations are operational indicators when they coincide with military movement. Outages, forged alerts, market rumors, evacuation panic, and nuclear narratives can slow decisions even without large kinetic effects. The counterargument is resilience: public-warning systems, redundant communications, and rehearsed messaging can reduce the value of these operations. The assessment changes when cyber incidents, media narratives, missile activity, and public fear appear synchronized rather than random.'],
    ];
    return `<section class="section" id="assumptions-limits"><h2>Assumptions And Limits</h2><div class="lead-grid"><div class="prose"><p>The Korea model starts from four linked assumptions: geography compresses time, nuclear possession gives Pyongyang coercive leverage, alliance consultation is a target, and cyber or information effects can produce military value before a ground campaign matures. These assumptions do not mean war is likely or that every launch is a crisis. They mean that a Korea warning model must judge combinations of behavior, not isolated headlines.</p><p>The strongest argument for caution is that full war remains catastrophic for North Korea and could threaten regime survival. The strongest argument against complacency is that Pyongyang may not need full war to gain leverage; a limited strike, nuclear demonstration, cyber shock, or public-fear campaign can force allied leaders into difficult choices under compressed timelines. Confidence should rise when multiple independent indicators move together across missile posture, artillery readiness, cyber disruption, public messaging, alliance statements, and logistics movement.</p></div><div class="analysis-card"><h3>Confidence / Uncertainty Profile</h3>${bars.map(([label, value]) => `<div class="bar-row"><span>${esc(label)}</span><div class="bar-track"><i style="width:${value}%"></i></div><strong>${value}%</strong></div>`).join('')}<p>These are qualitative uncertainty scores. High nuclear and cyber uncertainty means the section should expose assumptions and counterarguments clearly instead of pretending public data can show classified readiness or leadership intent with precision.</p></div></div><div class="comparison-grid" style="margin-top:18px">${assumptions.map(([title, text]) => `<div class="matrix-card"><div class="scenario-body"><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`).join('')}</div></section>`;
  }
  const text = theater === 'taiwan'
    ? 'The Taiwan page assumes public-source uncertainty, incomplete warning, contested cyber and space information, and political constraints on allied basing. A useful analysis must show both argument and counterargument: China has mass, proximity, missiles, and political initiative; Taiwan has geography, prepared defense, legitimacy, and potential allied support. The counterargument to alarmism is that invasion remains hard to hide and hard to sustain. The counterargument to complacency is that blockade, quarantine, cyber pressure, and exercise-to-crisis conversion may not look like a classic invasion until the crisis is already underway.'
    : 'The Korea page assumes compressed geography, nuclear coercion, alliance consultation stress, and possible China/Taiwan linkage. North Korea has proximity, artillery, missiles, cyber tools, and nuclear leverage; the alliance has superior conventional capacity, legitimacy, missile defense, and logistics depth. The counterargument to alarmism is that Pyongyang still faces catastrophic regime risk in full war. The counterargument to complacency is that limited nuclear or cognitive warfare can produce strategic effects below total war.';
  const bars = theater === 'taiwan'
    ? [['Public-source confidence', 64], ['Classified uncertainty', 82], ['Commercial sensitivity', 88], ['Allied politics sensitivity', 79]]
    : [['Public-source confidence', 61], ['Nuclear uncertainty', 90], ['Alliance consultation stress', 84], ['Cyber/info sensitivity', 78]];
  return `<section class="section" id="assumptions-limits"><h2>Assumptions And Limits</h2><div class="lead-grid"><div class="prose"><p>${esc(text)}</p><ul><li>Public war games simplify classified capabilities, readiness, intelligence warning, cyber access, and political decision-making, so the page uses them as structured baselines rather than deterministic forecasts.</li><li>Outcome confidence should rise only when multiple independent indicators converge across military, political, economic, cyber, information, and logistics domains.</li><li>Static pages should be treated as the durable analytic model; live dashboard components should update the current assessment when fresh reporting changes a capability, intent, logistics, access, or escalation assumption.</li><li>The most useful use case is argument discipline: every alarming claim should identify which assumption changed, which source supports it, and what counterargument remains plausible.</li></ul></div><div class="analysis-card"><h3>Confidence / Uncertainty Profile</h3>${bars.map(([label, value]) => `<div class="bar-row"><span>${esc(label)}</span><div class="bar-track"><i style="width:${value}%"></i></div><strong>${value}%</strong></div>`).join('')}<p>High uncertainty does not mean low value. It means the page should show readers which assumptions depend on public evidence and which remain judgment calls.</p></div></div><div class="comparison-grid" style="margin-top:18px"><div class="matrix-card"><div class="scenario-body"><h3>Argument</h3><p>Published war games are valuable because they reveal bottlenecks, decision points, logistics constraints, and political failure modes that a simple weapons list cannot show.</p><p>They also expose what analysts should monitor when new reporting arrives: convergence across movement, messaging, cyber pressure, logistics, and commercial behavior.</p></div></div><div class="matrix-card"><div class="scenario-body"><h3>Counterargument</h3><p>They can be outdated, adversaries can adapt, classified assumptions are missing, and public games may overweight available data while underweighting covert readiness or leadership intent.</p><p>That is why the page emphasizes assumptions, source links, confidence profiles, and dynamic update prompts instead of claiming precision it cannot support.</p></div></div><div class="matrix-card"><div class="scenario-body"><h3>Practical Reader Use</h3><p>Use this section to separate compelling analysis from overconfident prediction. A useful update should say what changed, why it matters, what evidence supports it, and which alternative interpretation remains possible.</p></div></div></div></section>`;
}

function warningAndPlanning(theater) {
  if (theater === 'korea') {
    const warningRows = [
      ['Missile and launcher posture', 'Watch item: SRBM/MRBM launches, launcher dispersal, camouflage, rail or road movement, hardened-site activity, and launch-unit rhetoric. Reasoning: missiles are both battlefield weapons and political signals, so the risk changes when launches appear tied to demands, force protection, or command delegation. Current indicators: count launches, note whether state media links them to operational scenarios, and compare activity with artillery posture, cyber events, and allied exercises.'],
      ['Forward artillery and 600mm MLRS activity', 'Watch item: forward fires posture near Seoul approaches, ammunition movement, command delegation, counter-battery preparation, and unusual sheltering or civil-defense reporting. Reasoning: artillery and large rocket systems can create immediate civilian and political pressure even before a major ground maneuver. Current indicators: look for training notices, movement reports, unusual readiness language, and whether ROK/US responses shift from routine exercise framing to crisis messaging.'],
      ['Cyber, space, and public warning', 'Watch item: government network disruption, telecom or media outages, GPS interference, space-launch behavior, false alerts, financial disruption, and public-warning continuity. Reasoning: a cyber or space shock can delay response options and make civilians doubt official information. Current indicators: treat cyber incidents as significant only when they coincide with missile activity, nuclear rhetoric, evacuation rumors, or command-post posture changes.'],
      ['Alliance cohesion and external access', 'Watch item: USFK alert posture, ROK political messaging, Japan base-access signals, trilateral statements, interceptor deployment, evacuation guidance, and visible allied disagreements. Reasoning: North Korea benefits if Seoul, Washington, and Tokyo appear to deliberate slowly or disagree publicly. Current indicators: compare official statements, exercise adjustments, military movements, and whether allied language defines response thresholds clearly.'],
      ['Information and nuclear narrative pressure', 'Watch item: nuclear-use threats, tactical nuclear framing, evacuation rumors, forged warnings, elite messaging, market stress, and wedge narratives aimed at Seoul or Washington. Reasoning: nuclear-cognitive warfare seeks paralysis without necessarily requiring nuclear employment. Current indicators: elevate concern when information operations appear synchronized with military movement, cyber disruption, or unusual diplomatic behavior.'],
    ];
    const planning = [
      {
        title: 'Response Ladders',
        image: '/assets/weapons/thaad-launcher.jpg',
        intro: 'Deterrence is strongest when Seoul and Washington have credible choices between symbolic protest and uncontrolled escalation.',
        bullets: [
          ['Pre-clear proportional strike options', 'Pre-cleared options reduce decision paralysis during the first hours, especially when North Korea tries to present allied leaders with only bad choices.'],
          ['Define missile-defense allocation rules', 'Interceptor prioritization becomes political under stress; rules should be rehearsed before simultaneous missile, drone, and public-warning pressure begins.'],
          ['Tie cyber and space effects to response thresholds', 'A cyber outage or GPS disruption can be operationally decisive even without casualties, so the alliance needs clear criteria for when those effects count as part of the attack.'],
          ['Prepare public-warning scripts', 'Civilian confidence near Seoul affects military freedom of action, evacuation behavior, and whether Pyongyang can exploit panic.'],
        ],
      },
      {
        title: 'C2 And Public Resilience',
        image: '/assets/maps/south-korea-physiography-cia-2018.jpg',
        intro: 'Command resilience and public communication are operational capabilities in a theater where cyber, nuclear messaging, and false alerts can slow decisions.',
        bullets: [
          ['Harden backup command channels', 'Redundant communications reduce the value of cyber or space shock and make it harder for North Korea to create decision isolation.'],
          ['Rehearse false-alert correction', 'Fast correction prevents adversary narratives from filling the information gap and reduces panic in exposed metropolitan areas.'],
          ['Coordinate local-government messaging', 'Mayors, police, transportation authorities, and civil-defense officials need consistent language before evacuation rumors appear.'],
          ['Protect financial and telecom continuity', 'Markets, payment systems, mobile networks, and broadcasters can become confidence targets even when military damage is limited.'],
        ],
      },
      {
        title: 'Counter-Drone And Fires Integration',
        image: '/assets/weapons/prsm-missile.jpg',
        intro: 'Korean terrain channels movement, so drone defense, electronic warfare, counter-battery fires, repair, concealment, and logistics must function as one system.',
        bullets: [
          ['Connect counter-UAS with artillery displacement', 'Units that can shoot down drones but cannot move, hide, repair, or refuel remain exposed to follow-on fires.'],
          ['Disperse ammunition and repair capacity', 'Persistent ISR punishes large depots, visible motor pools, and predictable maintenance nodes.'],
          ['Prioritize hardened shelters and camouflage', 'The goal is to make targeting cycles slower and less reliable rather than relying on a single defensive layer.'],
          ['Practice rapid runway and bridge repair', 'Airpower, evacuation, and reinforcement depend on restoring infrastructure quickly after missile or sabotage attacks.'],
        ],
      },
      {
        title: 'Regional Coordination',
        image: '/assets/maps/korea-pusan-perimeter-usacmh.jpg',
        intro: 'Korea is a peninsula fight with regional dependencies: Japan access, USFK posture, Guam logistics, ISR, missile defense, and public unity all matter.',
        bullets: [
          ['Institutionalize Korea-Japan-US crisis procedures', 'Trilateral habits reduce the time Pyongyang can exploit between a provocation and a coordinated public response.'],
          ['Pre-plan base access and interceptor sharing', 'Japan access and missile-defense inventory can become political bottlenecks if not addressed before escalation.'],
          ['Synchronize evacuation and continuity messaging', 'Mixed instructions from Seoul, Tokyo, and Washington create the exact public uncertainty nuclear-cognitive warfare seeks.'],
          ['Map logistics depth beyond the opening strike', 'Busan, Jinhae, Daegu, air bases, rail corridors, ports, and Japan sea/air links determine whether the alliance can sustain the response.'],
        ],
      },
    ];
    return `<section class="section" id="warning-indicators"><h2>Warning Indicators</h2><p class="section-lede">The Korea warning model is built around watchable clusters. Concern rises when military posture, cyber or space disruption, nuclear messaging, public fear, and allied decision pressure move together; concern falls when events remain isolated, routine, or contradicted by calm logistics behavior.</p><div class="map-feature"><div class="analysis-card"><h3>Warning Cluster Dashboard</h3><div class="warning-grid">${warningRows.map(([title, text]) => `<div class="warning-item"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`).join('')}</div></div>${figure('/assets/maps/korea-pusan-perimeter-usacmh.jpg', 'Historical Korean War logistics map: ports, road corridors, and southern depth remain relevant if initial shock turns into sustained reinforcement.')}</div></section><section class="section" id="planning-implications"><h2>Planning Implications</h2><p class="section-lede">The practical implication of the Korea scenario set is that deterrence depends on response ladders, resilient command, counter-drone and fires integration, and regional coordination. These cards convert the scenario logic into planning choices a reader can audit, rehearse, and map back to live indicators.</p><div class="card-grid">${planning.map((item) => `<div class="analysis-card visual"><img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy"><h3>${esc(item.title)}</h3><p>${esc(item.intro)}</p><ul class="insight-list">${item.bullets.map(([label, why]) => `<li><strong>${esc(label)}</strong><span class="info-dot" tabindex="0" aria-label="Why this matters">i<span class="info-popover">${esc(why)}</span></span><p>${esc(why)}</p></li>`).join('')}</ul></div>`).join('')}</div></section>`;
  }
  const warning = theater === 'taiwan'
    ? ['Civilian ferry, port, rail, fuel, medical, and blood-supply indicators changing alongside exercises.', 'Maritime exclusion or inspection zones that alter commercial shipping or insurance behavior.', 'Cyber pressure against Taiwan government, media, telecom, port, energy, semiconductor, or financial systems.', 'Legal language framing Taiwan as an emergency law-enforcement or quarantine problem.', 'Japan, Philippines, Guam, or US base posture shifts tied to Taiwan reporting.']
    : ['Missile dispersal, launcher camouflage, chemical rhetoric, tactical nuclear signaling, or unusual command delegation.', 'SOF, drone, cyber, and artillery activity rising together rather than as isolated incidents.', 'China diplomatic, logistics, air-defense, or border behavior suggesting support to North Korea.', 'Taiwan crisis intensity pulling allied ISR, munitions, missile defense, or command attention away from Korea.', 'Public information operations designed to split Seoul and Washington risk perceptions.'];
  const planning = theater === 'taiwan'
    ? ['Prioritize denial resilience: runway repair, port denial, distributed command, mobile coastal fires, cyber continuity, and civil-defense messaging.', 'Make allied access decisions politically rehearsed before crisis onset, especially Japan and Philippines basing questions.', 'Treat blockade and quarantine as first-class scenarios, not lesser versions of invasion.', 'Link semiconductor, shipping, insurance, cable, and energy indicators to the military threat picture.']
    : ['Build response options between symbolic conventional strikes and excessive nuclear retaliation.', 'Institutionalize Korea-Taiwan-Japan dual-contingency tabletop exercises and munitions planning.', 'Harden C2, public warning, cyber continuity, counter-drone defense, and missile-defense inventory assumptions.', 'Treat information operations as operational indicators when they coincide with missile, cyber, or military movement.'];
  const warningImage = theater === 'taiwan' ? '/screenshots/fix-taiwan-map.png' : '/assets/maps/korea-pusan-perimeter-usacmh.jpg';
  const planningImages = theater === 'taiwan'
    ? ['/assets/maps/taiwan-physiography-cia-2022.jpg', '/assets/weapons/bgm109-tomahawk.jpg', '/assets/weapons/f35a-lightning.jpg', '/screenshots/final-taiwan-strait.png']
    : ['/assets/maps/north-korea-physiography-cia-2020.jpg', '/assets/weapons/thaad-launcher.jpg', '/assets/weapons/prsm-missile.jpg', '/assets/maps/south-korea-physiography-cia-2018.jpg'];
  return `<section class="section" id="warning-indicators"><h2>Warning Indicators</h2><p class="section-lede">Warnings are useful only when they tell the reader what would actually change the assessment. This section turns the scenario set into watchable clusters and keeps the map as expandable context rather than a tiny decorative image.</p><div class="map-feature"><div class="analysis-card"><h3>Indicators To Track</h3><ul>${warning.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><p>Single indicators should rarely drive a high-confidence alert. The practical threshold is convergence: movement plus messaging, cyber plus logistics, commercial behavior plus legal framing, or military action plus alliance decision pressure.</p></div>${figure(warningImage, theater === 'taiwan' ? 'Taiwan warning indicators should be interpreted as changes to baseline geography, not arbitrary arrows.' : 'Korea warning indicators should include historical logistics depth and modern compressed escalation timelines.')}</div></section><section class="section" id="planning-implications"><h2>Planning Implications</h2><p class="section-lede">These are the actions and analytical habits the war games imply. The point is not to admire the scenarios; it is to convert them into readiness, resilience, and monitoring choices.</p><div class="card-grid">${planning.map((item, index) => `<div class="analysis-card visual"><img src="${planningImages[index % planningImages.length]}" alt="Planning implication" loading="lazy"><p>${esc(item)}</p><p>${theater === 'taiwan' ? 'For Taiwan, the reader should connect every implication back to denial, endurance, coalition access, and economic resilience.' : 'For Korea, the reader should connect every implication back to compressed timelines, nuclear coercion, alliance cohesion, and dual-contingency stress.'}</p></div>`).join('')}</div></section>`;
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
        'This page treats the Korean Peninsula as a modern nuclear-coercion theater built on compressed geography, alliance decision pressure, and rapid information effects. Public scenario work converges on a clear warning: Korea can escalate quickly because Seoul, USFK nodes, air bases, ports, missile-defense assets, and civil-warning systems all sit inside a narrow theater where missiles, artillery, cyber disruption, and public fear can interact in the first hours.',
        'The key themes are limited strikes under a nuclear shadow, tactical nuclear coercion, regional diversion, space and cyber shock, drone-enabled attrition, and information operations aimed at splitting Seoul, Washington, and Tokyo. The scenarios do not argue that North Korea can easily win a long war. They argue that Pyongyang may seek usable leverage by making allied leaders choose between underreaction, overreaction, and visibly delayed consultation.',
        'The page is organized as a set of decision models. Guardian Tiger frames limited strike and nuclear coercion. The ODNI/NIC assessment frames nuclear leverage as a tool for conventional risk-taking. NPEC adds space nuclear shock and command disruption. Modern War Institute adds drone, ISR, EW, and armor survivability. 38 North adds nuclear-cognitive warfare, where public confidence and alliance trust become operational targets.',
        'Each scenario leads to a deep-review page and each card states what the scenario tests, why it changes the threat picture, what indicators matter, and what outcome logic should feed the live watch page. A reader should leave the section with a clearer sense of what would actually change the assessment: synchronized missile posture, artillery readiness, cyber disruption, nuclear messaging, Japan access friction, USFK readiness changes, or public-warning failure.',
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
<div class="prose">${isTaiwan ? '<p>Taiwan geography is not a decorative backdrop. The western coastal plain contains the decisive ports, airfields, urban density, and road/rail networks, while the central mountain spine limits rapid east-west maneuver. Serious scenarios therefore test whether China can sustain lift and whether Taiwan can deny ports, repair runways, preserve command continuity, and keep society functioning under missile, cyber, maritime, and information pressure. Blockade scenarios shift the map outward to the Bashi Channel, Okinawa approaches, Luzon Strait, East China Sea, South China Sea, and commercial shipping routes.</p>' : '<p>Korean geography compresses warning and escalation. The DMZ is roughly 250 kilometers long and about 4 kilometers wide, while the Seoul-Incheon metropolitan center sits close enough to the armistice line that rockets, missiles, cyber disruption, and public-warning failures can become strategic events before a major ground campaign develops. The peninsula is heavily mountainous, which channels mechanized movement through valleys, roads, bridges, tunnels, and river crossings. That terrain gives defenders concealment and prepared positions, but it also makes logistics, repair, evacuation, and counter-battery movement more predictable once persistent drones and ISR enter the fight.</p><p>The historical Pusan Perimeter map is relevant because Korea scenarios are never only about the first strike. If the opening shock widens, southern ports, air bases, rail routes, road corridors, and Japan access determine whether the alliance can reinforce, repair, evacuate, and sustain operations. Busan, Daegu, Jinhae, Osan, Kunsan, Camp Humphreys, Seoul, Incheon, Pyongyang, Wonsan, Sinpo, Yongbyon, and Punggye-ri matter for different reasons: logistics depth, political command, airpower, naval access, nuclear signaling, submarine activity, and regime survival. Modern scenarios add cyber, space, drones, long-range fires, and nuclear coercion to the same terrain logic. The result is a theater where geography does not merely shape maneuver; it shapes decision speed, public fear, alliance consultation, and escalation control.</p><div class="metric-grid"><div class="metric"><strong>~250 km</strong><span>DMZ length</span></div><div class="metric"><strong>~4 km</strong><span>DMZ width</span></div><div class="metric"><strong>Seoul</strong><span>Near armistice line</span></div><div class="metric"><strong>Ports</strong><span>Busan / Incheon / Jinhae</span></div></div>'}</div>
</div></section>
${familiesSection(theater)}
${comparisonMatrix(items, theater)}
${isTaiwan ? forceReportsSection() : ''}
${escalationSection(theater)}
${assumptionsSection(theater)}
${warningAndPlanning(theater)}
${sourcesList(isTaiwan ? sources.taiwan : sources.korea, theater, items)}`;
  return pageShell({ title, eyebrow: isTaiwan ? 'Published scenario deep dive // Taiwan Strait' : 'Published scenario deep dive // Korean Peninsula', active, accent: isTaiwan ? '#c41e3a' : '#2563eb', body });
}

function hubPage() {
  const body = `
<section class="section">
  <div class="prose"><h2>War Gaming Hub</h2><p>This hub collects the flagship scenario analysis pages and dedicated scenario deep reviews for the China/Taiwan and Korean Peninsula watch areas. It is designed as the return point from every war-gaming page so readers can move between theater watch pages, scenario families, source reports, and deep-review analysis without getting trapped in a one-off static document.</p><p>The hub is intentionally theater-neutral. Taiwan force-comparison reports remain inside the China/Taiwan war-games section where they belong, while the Korean Peninsula path focuses on escalation, nuclear coercion, terrain, alliance decision pressure, and dual-contingency stress.</p></div>
</section>
<section class="section"><h2>Scenario Theater Overview</h2><div class="card-grid">
  <a class="scenario-card theater-card no-image" href="taiwan-war-games.html"><div class="scenario-body"><div class="kicker">China / Taiwan</div><h3>China / Taiwan War Games</h3><p>Published invasion, blockade, escalation, exercise-conversion, PRC-perspective, and dual-contingency scenario analysis. The section also links branch-level force comparison reports for naval, air, army, marine, and special operations capabilities.</p><p>Use this path when the question is how Taiwan geography, allied basing, shipping, semiconductor risk, coercion, and sustainment affect the Strait crisis.</p></div></a>
  <a class="scenario-card theater-card" href="korean-peninsula-war-games.html"><img src="/assets/maps/north-korea-physiography-cia-2020.jpg" alt="Korea map" loading="lazy"><div class="scenario-body"><div class="kicker">Korean Peninsula</div><h3>Korean Peninsula War Games</h3><p>Guardian Tiger, ODNI/NIC, NPEC, drone/armor, and nuclear-cognitive scenario analysis with dedicated deep-review pages. The section is built around compressed escalation, nuclear leverage, C2 shock, information operations, and alliance cohesion.</p><p>Use this path when the question is how limited strikes, missile signaling, cyber disruption, terrain, Japan/USFK basing, and dual-contingency pressure shape Korea risk.</p></div></a>
</div></section>
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
