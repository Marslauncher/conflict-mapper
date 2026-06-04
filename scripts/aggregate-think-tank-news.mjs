import { readFile, writeFile } from 'node:fs/promises';

const INPUT_PATH = new URL('../data/think-tanks.json', import.meta.url);
const OUTPUT_PATH = new URL('../data/think-tank-latest-news.json', import.meta.url);
const MAX_ORGS = Number(process.env.THINK_TANK_LIMIT || 0);
const MAX_ITEMS_PER_ORG = Number(process.env.THINK_TANK_ITEMS || 5);
const CONCURRENCY = Number(process.env.THINK_TANK_CONCURRENCY || 6);
const TIMEOUT_MS = Number(process.env.THINK_TANK_TIMEOUT_MS || 10000);

const payload = JSON.parse(await readFile(INPUT_PATH, 'utf8'));
const orgs = (payload.thinkTanks || []).slice(0, MAX_ORGS > 0 ? MAX_ORGS : undefined);
const results = [];

for (let index = 0; index < orgs.length; index += CONCURRENCY) {
  const batch = orgs.slice(index, index + CONCURRENCY);
  const settled = await Promise.all(batch.map((org) => aggregateOrg(org)));
  results.push(...settled);
  console.log(`Processed ${Math.min(index + batch.length, orgs.length)}/${orgs.length}`);
}

const articles = dedupeArticles(results.flatMap((result) => result.articles))
  .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

await writeFile(OUTPUT_PATH, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'datasources/ThinkTanksP.csv',
  totalOrganizations: orgs.length,
  totalArticles: articles.length,
  organizations: results,
  articles,
}, null, 2) + '\n');

console.log(`Wrote ${articles.length} articles to data/think-tank-latest-news.json`);

async function aggregateOrg(org) {
  const directErrors = [];
  const googleSource = buildGoogleNewsSource(org);
  if (googleSource) {
    try {
      const xml = await fetchText(googleSource.url);
      const articles = parseFeed(xml, org, googleSource).slice(0, MAX_ITEMS_PER_ORG);
      if (articles.length) {
        return {
          id: org.id,
          name: org.name,
          url: org.url,
          feedUrl: googleSource.url,
          feedSource: googleSource.type,
          articles,
          errors: [],
        };
      }
      directErrors.push(`${googleSource.type}: no parsed items`);
    } catch (err) {
      directErrors.push(`${googleSource.type}: ${err.message}`);
      // Continue into site-specific discovery below.
    }
  }

  const sources = buildCandidateSources(org);
  const errors = [...directErrors];
  for (const source of sources) {
    try {
      const xml = await fetchText(source.url);
      const articles = parseFeed(xml, org, source)
        .slice(0, MAX_ITEMS_PER_ORG);
      if (articles.length) {
        return {
          id: org.id,
          name: org.name,
          url: org.url,
          feedUrl: source.url,
          feedSource: source.type,
          articles,
          errors,
        };
      }
      errors.push(`${source.type}: no parsed items`);
    } catch (err) {
      errors.push(`${source.type}: ${err.message}`);
    }
  }
  return {
    id: org.id,
    name: org.name,
    url: org.url,
    feedUrl: '',
    feedSource: '',
    articles: [],
    errors: errors.slice(0, 20),
  };
}

function buildCandidateSources(org) {
  const urls = new Set();
  const result = [];
  const base = safeUrl(org.url);
  const latest = safeUrl(org.latestAnalysisUrl);
  const domain = base?.hostname?.replace(/^www\./, '') || '';

  for (const url of [org.latestAnalysisUrl, org.url]) {
    if (!url) continue;
    result.push({ type: 'configured-page', url });
  }

  for (const root of [latest, base].filter(Boolean)) {
    const origin = root.origin;
    const path = root.pathname.replace(/\/+$/, '');
    for (const candidate of [
      `${origin}/feed`,
      `${origin}/feed/`,
      `${origin}/rss`,
      `${origin}/rss.xml`,
      `${origin}/feed.xml`,
      `${origin}/atom.xml`,
      `${origin}${path}.xml`,
      `${origin}${path}.rss`,
      `${origin}${path}?format=rss`,
    ]) {
      result.push({ type: 'rss-candidate', url: candidate });
    }
  }

  return result.filter((source) => {
    if (!source.url || urls.has(source.url)) return false;
    urls.add(source.url);
    return /^https?:\/\//i.test(source.url);
  });
}

function buildGoogleNewsSource(org) {
  const base = safeUrl(org.url);
  const domain = base?.hostname?.replace(/^www\./, '') || '';
  if (!domain) return null;
  const query = `when:7d "${org.name}" OR site:${domain}`;
  return {
    type: 'google-news-rss',
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(query).replace(/%20/g, '+')}&hl=en-US&gl=US&ceid=US:en`,
  };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5',
        'user-agent': 'ConflictMapperThinkTankAggregator/1.0 (+https://conflictmapper.com)',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const discovered = discoverFeedLinks(text, url);
    if (discovered.length) {
      const feedResponse = await fetch(discovered[0], {
        headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
        signal: controller.signal,
      });
      if (feedResponse.ok) return await feedResponse.text();
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function discoverFeedLinks(html, baseUrl) {
  const links = [];
  const regex = /<link[^>]+(?:type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*type=["']application\/(?:rss|atom)\+xml["'])/gi;
  let match;
  while ((match = regex.exec(html))) {
    try {
      links.push(new URL(match[1] || match[2], baseUrl).toString());
    } catch (_) {}
  }
  return links;
}

function parseFeed(text, org, source) {
  const itemSegments = extractSegments(text, 'item');
  const entrySegments = itemSegments.length ? [] : extractSegments(text, 'entry');
  const segments = itemSegments.length ? itemSegments : entrySegments;
  return segments.map((segment) => {
    const title = clean(readTag(segment, 'title'));
    const description = clean(readTag(segment, 'description') || readTag(segment, 'summary') || readTag(segment, 'content:encoded') || readTag(segment, 'content'));
    const link = clean(readTag(segment, 'link')) || readAtomLink(segment) || org.latestAnalysisUrl || org.url;
    const pubDate = normalizeDate(readTag(segment, 'pubDate') || readTag(segment, 'published') || readTag(segment, 'updated') || readTag(segment, 'dc:date'));
    if (!title || !link) return null;
    return {
      id: slugify(`${org.id}-${title}-${link}`),
      thinkTankId: org.id,
      thinkTank: org.name,
      title,
      description,
      link,
      pubDate,
      source: org.name,
      sourceUrl: org.url,
      feedUrl: source.url,
      feedSource: source.type,
      country: org.country,
      regionFocus: org.regionFocus,
      expertise: org.expertise || [],
    };
  }).filter(Boolean);
}

function extractSegments(xml, tag) {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const segments = [];
  let match;
  while ((match = regex.exec(xml))) segments.push(match[1]);
  return segments;
}

function readTag(segment, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(segment);
  return match ? match[1] : '';
}

function readAtomLink(segment) {
  const match = /<link[^>]+href=["']([^"']+)["'][^>]*>/i.exec(segment);
  return match ? match[1] : '';
}

function clean(value) {
  return decodeEntities(String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeDate(value) {
  const time = value ? new Date(clean(value)).getTime() : 0;
  return Number.isFinite(time) && time ? new Date(time).toISOString() : new Date().toISOString();
}

function dedupeArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = String(article.link || article.title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeUrl(value) {
  try {
    return value ? new URL(value) : null;
  } catch (_) {
    return null;
  }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
