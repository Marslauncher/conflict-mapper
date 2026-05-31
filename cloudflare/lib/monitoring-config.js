import { readAssetJson } from './static-data.js';

const MONITORING_CONFIG_KEY = 'monitoring:config:v1';

export const DEFAULT_TOPICS = [
  { id: 'breaking', name: 'Breaking News', keywords: ['breaking', 'urgent', 'live updates'] },
  { id: 'geopolitics', name: 'Geopolitics', keywords: ['geopolitics', 'foreign policy', 'diplomacy', 'sanctions', 'treaty', 'summit'] },
  { id: 'military', name: 'Military', keywords: ['military', 'missile', 'drone', 'troops', 'marines', 'airstrike', 'warship', 'navy', 'army', 'air force', 'submarine', 'ammunition', 'munitions', 'defense', 'defence'] },
  { id: 'political', name: 'Political', keywords: ['election', 'parliament', 'president', 'minister', 'government', 'coup', 'protest'] },
  { id: 'economic', name: 'Economic Security', keywords: ['market', 'trade', 'tariff', 'supply chain', 'shipping', 'oil', 'gas', 'energy', 'sanctions'] },
  { id: 'cyber', name: 'Cybersecurity', keywords: ['cyber', 'ransomware', 'malware', 'hack', 'breach', 'espionage', 'zero-day'] },
  { id: 'infrastructure', name: 'Critical Infrastructure', keywords: ['power grid', 'telecom', 'subsea cable', 'pipeline', 'port', 'rail', 'airport', 'satellite'] },
  { id: 'maritime', name: 'Maritime Security', keywords: ['strait', 'sea lane', 'vessel', 'ship', 'naval', 'port', 'red sea', 'black sea', 'south china sea'] },
  { id: 'energy', name: 'Energy Security', keywords: ['oil', 'gas', 'lng', 'nuclear plant', 'pipeline', 'refinery', 'electricity'] },
  { id: 'nuclear', name: 'Nuclear / WMD', keywords: ['nuclear', 'uranium', 'enrichment', 'iaea', 'missile test', 'warhead', 'wmd'] },
  { id: 'terrorism', name: 'Terrorism / Insurgency', keywords: ['terror', 'insurgent', 'isis', 'al qaeda', 'hezbollah', 'houthi', 'hamas'] },
  { id: 'science', name: 'Science', keywords: ['researchers', 'scientists', 'laboratory', 'study'] },
  { id: 'technology', name: 'Technology', keywords: ['semiconductor', 'chip', 'telecom', 'quantum', 'satellite', 'space'] },
  { id: 'ai', name: 'Artificial Intelligence', keywords: ['artificial intelligence', ' ai ', 'machine learning', 'model', 'gpu', 'nvidia'] },
  { id: 'robotics', name: 'Robotics / Autonomy', keywords: ['robot', 'robotics', 'autonomous', 'unmanned', 'uas', 'uav'] },
  { id: 'engineering', name: 'Engineering', keywords: ['engineering', 'manufacturing', 'industrial base', 'shipbuilding'] },
  { id: 'spaceflight', name: 'Space / Satellite', keywords: ['space', 'satellite', 'rocket', 'launch', 'orbit', 'gps'] },
  { id: 'research', name: 'Think Tank / Research', keywords: ['report', 'analysis', 'think tank', 'research', 'briefing'] },
];

const DEFAULT_TOPIC_IDS = DEFAULT_TOPICS.map((topic) => topic.id);

export async function loadMonitoringConfig(context) {
  const fallback = await readAssetJson(context, '/data/countries-config.json', { countries: [], topics: [] });
  const base = normalizeConfig({
    countries: fallback.countries || [],
    topics: mergeTopics(fallback.topics || []),
  }, { expandCountryTopics: true });

  if (!context.env.CONFIG_KV) return base;

  const raw = await context.env.CONFIG_KV.get(MONITORING_CONFIG_KEY);
  if (!raw) return base;

  try {
    return normalizeConfig({ ...base, ...JSON.parse(raw) });
  } catch (_) {
    return base;
  }
}

export async function saveMonitoringConfig(context, config) {
  if (!context.env.CONFIG_KV) throw new Error('CONFIG_KV binding is required to persist monitoring configuration');
  const next = normalizeConfig(config);
  await context.env.CONFIG_KV.put(MONITORING_CONFIG_KEY, JSON.stringify({
    ...next,
    updatedAt: new Date().toISOString(),
  }));
  return next;
}

export function normalizeConfig(config, { expandCountryTopics = false } = {}) {
  const topics = mergeTopics(config.topics || []);
  const knownTopics = new Set(topics.map((topic) => topic.id));
  const countries = (config.countries || []).map((country) => ({
    name: country.name || country.label || country.slug,
    slug: slugify(country.slug || country.name),
    flag: country.flag || '🌍',
    accent: country.accent || '#c41e3a',
    aliases: country.aliases || countryAliases(country.slug || country.name),
    topics: sanitizeTopicIds(
      expandCountryTopics ? [...DEFAULT_TOPIC_IDS, ...(country.topics || [])] : (country.topics?.length ? country.topics : DEFAULT_TOPIC_IDS),
      knownTopics,
    ),
  })).filter((country) => country.slug);

  return { countries, topics };
}

export function mergeTopics(topics) {
  const byId = new Map(DEFAULT_TOPICS.map((topic) => [topic.id, topic]));
  for (const topic of topics || []) {
    const id = slugify(topic.id || topic.name);
    if (!id) continue;
    byId.set(id, {
      ...(byId.get(id) || {}),
      id,
      name: topic.name || topic.label || id,
      keywords: Array.from(new Set([
        ...((byId.get(id) || {}).keywords || []),
        ...(topic.keywords || []),
      ])),
    });
  }
  return Array.from(byId.values());
}

export function getTopicKeywordMap(config) {
  const result = {};
  for (const topic of config.topics || DEFAULT_TOPICS) {
    result[topic.id] = [topic.id, topic.name, ...(topic.keywords || [])]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
  }
  return result;
}

export function articleMatchesMonitoringConfig(article, config) {
  const text = articleSearchText(article);
  const contentText = articleContentText(article);
  const category = String(article.category || '').toLowerCase();
  const tags = new Set((article.tags || [])
    .map((tag) => String(tag).toLowerCase())
    .filter((tag) => tag && tag !== category));
  if (isLowSignalNoise(contentText, category, tags)) return false;
  if (!hasOperationalSignal(contentText, category, tags)) return false;
  const topicMap = getTopicKeywordMap(config);
  const country = findMatchingCountry(text, config);
  const countryTopicIds = country?.topics?.length
    ? country.topics
    : Array.from(new Set((config.countries || []).flatMap((item) => item.topics || [])));

  for (const topicId of countryTopicIds) {
    if (topicId !== 'breaking' && signalTagMatches(topicId, tags)) return true;
    if (topicKeywordsMatch(topicId, topicMap[topicId] || [], contentText)) return true;
  }
  return false;
}

function isLowSignalNoise(text, category, tags) {
  const value = String(text || '').toLowerCase();
  if (/(\btop photos?\b|\bphoto gallery\b|\bgallery was curated\b|\bmessi\b|\bchampions league\b|\bformula one\b|\bf1\b|\bshoe pads?\b|\bhandcrafted\b|\binspired by son\b|\bhome loan\b|\bcash back\b|\bcredit card\b|\bhoroscope\b)/.test(value)) return true;
  if (hasOperationalSignal(value, category, tags)) return false;
  return /(\bcelebrity\b|\bentertainment\b|\bsports?\b|\broyal\b|\bfashion\b|\bhome loan\b|\bcash back\b|\bcredit card\b|\bhoroscope\b|\bnicola sturgeon\b|\bfirst minister\b|\bfederal judge\b|\bastronaut\b|\bmoon mission\b|\bworld health organization\b|\bebola\b|\bchampions league\b|\bfootball\b|\bsoccer\b|\bceos?\b.*\bresign|\bresign.*\bceos?\b|\bscandal\b|\bembezzlement\b)/.test(value);
}

function hasOperationalSignal(text, category, tags) {
  const value = String(text || '').toLowerCase();
  return /(\bwar\b|\bwars\b|\banti-war\b|\barmed conflict\b|\bfrontline\b|\bbattlefield\b|\bcombat\b|\bfighting\b|\bceasefire\b|\binvasion\b|\bincursion\b|\bescalat|\bmilitary\b|\bmissiles?\b|\bweapons?\b|\bmunitions?\b|\bairstrike\b|\bstrikes?\b|\bdrone\b|\bwarship\b|\bnaval\b|\bsubmarine\b|\btroops?\b|\bmarine corps\b|\bu\.?s\.?\s+marines?\b|\bmarines?\s+(arrive|deploy|deployed|forces?|troops?)\b|\barmy\b|\bnavy\b|\bair force\b|\bdefen[cs]e minister\b|\bdefen[cs]e ministry\b|\bdefen[cs]e department\b|\bdefen[cs]e procurement\b|\bdefen[cs]e spending\b|\bdefen[cs]e budget\b|\bnato\b|\balliance\b|\bnuclear\b|\buranium\b|\benrichment\b|\biaea\b|\bwarhead\b|\bterror\b|\binsurgent\b|\bisis\b|\bal qaeda\b|\bhezbollah\b|\bhouthi\b|\bhamas\b|\bsanctions?\b|\bembargo\b|\bexport controls?\b|\bcyberattack\b|\bransomware\b|\bmalware\b|\bespionage\b|\bintelligence\b|\bnational security\b|\bsecurity council\b|\bsecurity talks\b|\bcritical infrastructure\b|\bpower grid\b|\bpipeline\b|\bsubsea cable\b|\bshipping lane\b|\bsea lane\b|\bshadow fleet\b|\bstrait\b|\bred sea\b|\bblack sea\b|\bsouth china sea\b|\btaiwan strait\b|\bgaza\b|\bcrimea\b|\btehran\b|\bpyongyang\b|\bindo-pacific\b|\bgeopolitic|\bforeign policy\b|\bdiplomac|\bnegotiations?\b|\bpeace talks\b|\bthink tank\b|\bsecurity brief\b|\bweapons? procurement\b|\bindustrial base\b|\bshipbuilding\b|\bammunition\b|\bmunitions\b)/.test(value);
}

function signalTagMatches(topicId, tags) {
  if (['breaking', 'political', 'economic', 'science', 'technology', 'ai', 'research'].includes(topicId)) return false;
  return tags.has(topicId);
}

function topicKeywordsMatch(topicId, keywords, text) {
  if (['breaking', 'political', 'economic', 'science', 'technology', 'ai', 'research'].includes(topicId)) {
    return keywords
      .filter((term) => !['breaking', 'urgent', 'live updates', 'election', 'parliament', 'president', 'minister', 'government', 'market', 'trade', 'research', 'report', 'analysis', 'study', 'model'].includes(String(term).toLowerCase()))
      .some((term) => topicTermMatches(text, term));
  }
  return keywords.some((term) => topicTermMatches(text, term));
}

export function findMatchingCountry(text, config) {
  const value = String(text || '').toLowerCase();
  for (const country of config.countries || []) {
    const aliases = [country.slug, country.name, ...(country.aliases || [])]
      .filter(Boolean)
      .map((alias) => String(alias).toLowerCase());
    if (aliases.some((alias) => value.includes(alias))) return country;
  }
  return null;
}

export function articleSearchText(article) {
  return [
    article.title,
    article.description,
    article.source,
    article.category,
    article.country,
    article.geo?.place,
    article.geo?.country,
    ...(article.tags || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function articleContentText(article) {
  return [
    article.title,
    article.description,
  ].filter(Boolean).join(' ').toLowerCase();
}

function topicTermMatches(text, term) {
  const needle = String(term || '').trim().toLowerCase();
  if (!needle) return false;
  if (needle.length <= 3 || /^[a-z0-9]+$/i.test(needle)) {
    return new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'i').test(text);
  }
  return text.includes(needle);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeTopicIds(topicIds, knownTopics) {
  const result = topicIds.map(slugify).filter((id) => knownTopics.has(id));
  return result.length ? Array.from(new Set(result)) : DEFAULT_TOPIC_IDS;
}

export function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function countryAliases(value) {
  const slug = slugify(value);
  const aliases = {
    usa: ['united states', 'u.s.', 'us ', 'america', 'washington'],
    china: ['prc', 'chinese', 'beijing', 'pla'],
    russia: ['russian', 'moscow'],
    ukraine: ['kyiv', 'odesa', 'odessa'],
    taiwan: ['taipei', 'taiwan strait', 'roc'],
    iran: ['tehran'],
    israel: ['jerusalem', 'tel aviv', 'gaza'],
    india: ['new delhi'],
    pakistan: ['islamabad'],
    'north-korea': ['dprk', 'pyongyang'],
    nato: ['brussels', 'alliance'],
  };
  return aliases[slug] || [];
}
