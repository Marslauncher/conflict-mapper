export async function readAssetJson(context, assetPath, fallback = {}) {
  const assetUrl = new URL(assetPath, context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
  }));

  if (!response.ok) return fallback;

  try {
    return await response.json();
  } catch (_) {
    return fallback;
  }
}

export async function readRemoteJson(baseUrl, assetPath, fallback = {}) {
  const cleanBase = String(baseUrl || '').replace(/\/+$/, '');
  if (!cleanBase) return fallback;

  const response = await fetch(`${cleanBase}${assetPath}`, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) return fallback;

  try {
    return await response.json();
  } catch (_) {
    return fallback;
  }
}

export function filterArticles(articles, { country = '', limit = 200, geoOnly = false } = {}) {
  let result = Array.isArray(articles) ? [...articles] : [];
  const countryFilter = String(country || '').toLowerCase();

  if (countryFilter && countryFilter !== 'global') {
    const aliases = countryAliases(countryFilter);
    result = result.filter((article) => {
      const fields = [
        article.country,
        article.geo?.country,
        article.geo?.place,
        article.title,
        article.description,
        ...(Array.isArray(article.tags) ? article.tags : []),
      ].filter(Boolean).join(' ').toLowerCase();
      return aliases.some((alias) => fields.includes(alias));
    });
  }

  if (geoOnly) {
    result = result.filter((article) => {
      const lat = article.lat ?? article.geo?.lat;
      const lng = article.lng ?? article.geo?.lng;
      return lat !== null && lat !== undefined && lat !== ''
        && lng !== null && lng !== undefined && lng !== ''
        && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
    });
  }

  result.sort((a, b) => {
    return articleTimestamp(b) - articleTimestamp(a);
  });

  if (limit > 0) result = result.slice(0, limit);
  return result;
}

function articleTimestamp(article) {
  const value = article?.pubDate || article?.publishedAt || article?.date || article?.fetchedAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function countryAliases(slug) {
  const map = {
    usa: ['usa', 'united states', 'u.s.', 'america', 'washington'],
    china: ['china', 'chinese', 'beijing', 'pla'],
    russia: ['russia', 'russian', 'moscow'],
    ukraine: ['ukraine', 'kyiv'],
    taiwan: ['taiwan', 'taipei', 'taiwan strait'],
    iran: ['iran', 'tehran'],
    israel: ['israel', 'gaza', 'tel aviv', 'jerusalem'],
    india: ['india', 'new delhi'],
    pakistan: ['pakistan', 'islamabad'],
    'north-korea': ['north korea', 'dprk', 'pyongyang'],
    nato: ['nato', 'brussels'],
  };
  return map[slug] || [slug.replace(/-/g, ' '), slug];
}

export function normalizeArticlesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.articles)) return payload.articles;
  if (Array.isArray(payload?.data?.articles)) return payload.data.articles;
  return [];
}
