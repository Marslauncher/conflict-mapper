import { readAssetJson } from './static-data.js';

const MONITORING_CONFIG_KEY = 'monitoring:config:v1';

export const DEFAULT_TOPICS = [
  { id: 'breaking', name: 'Breaking News', keywords: ['breaking', 'urgent', 'live updates'] },
  { id: 'geopolitics', name: 'Geopolitics', keywords: ['geopolitics', 'foreign policy', 'diplomacy', 'sanctions', 'treaty', 'summit'] },
  { id: 'military', name: 'Military', keywords: ['military', 'missile', 'drone', 'troops', 'airstrike', 'warship', 'navy', 'army', 'air force', 'defense', 'defence'] },
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
  const topicMap = getTopicKeywordMap(config);
  const country = findMatchingCountry(text, config);
  const countryTopicIds = country?.topics?.length
    ? country.topics
    : Array.from(new Set((config.countries || []).flatMap((item) => item.topics || [])));

  for (const topicId of countryTopicIds) {
    if (topicId !== 'breaking' && tags.has(topicId)) return true;
    if ((topicMap[topicId] || []).some((term) => topicTermMatches(contentText, term))) return true;
  }
  return false;
}

function isLowSignalNoise(text, category, tags) {
  const value = String(text || '').toLowerCase();
  const hasSecuritySignal = /(\bwar\b|\bmilitary\b|\bmissile\b|\bweapon\b|\bairstrike\b|\bnuclear\b|\bterror\b|\bsanction\b|\bcyberattack\b|\bcritical infrastructure\b|\btaiwan strait\b|\biran\b|\bukraine\b|\brussia\b|\bgaza\b|\bnato\b|\bdrone\b|\bnaval\b|\bsubmarine\b|\bmunitions?\b|\bfrontline\b|\bescalat|\bgeopolitic|\bdefen[cs]e\b|\barmy\b|\bnavy\b|\bair force\b)/.test(value);
  if (hasSecuritySignal) return false;
  if (tags.has('military') || tags.has('conflict') || tags.has('cyber') || tags.has('infrastructure') || tags.has('nuclear')) return false;
  if (category === 'military' || category === 'conflict' || category === 'cyber' || category === 'infrastructure' || category === 'nuclear') return false;
  return /(\bcelebrity\b|\bentertainment\b|\bsports?\b|\broyal\b|\bfashion\b|\bhome loan\b|\bcash back\b|\bcredit card\b|\bhoroscope\b|\bnicola sturgeon\b|\bfirst minister\b|\bfederal judge\b|\bastronaut\b|\bmoon mission\b|\bceos?\b.*\bresign|\bresign.*\bceos?\b|\bscandal\b|\bembezzlement\b)/.test(value);
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
    article.source,
    article.geo?.place,
    article.geo?.country,
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
