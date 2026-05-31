import { errorResponse, jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { loadMonitoringConfig, saveMonitoringConfig, slugify } from '../../../cloudflare/lib/monitoring-config.js';

export async function onRequestGet(context) {
  const config = await loadMonitoringConfig(context);
  return jsonResponse({
    success: true,
    data: config,
  });
}

export async function onRequestPost(context) {
  try {
    const body = await readJsonRequest(context.request);
    const config = await loadMonitoringConfig(context);
    const slug = slugify(body.slug || body.name);
    if (!body.name || !slug) return errorResponse('Country name and slug are required', 400);
    if (config.countries.some((country) => country.slug === slug)) {
      return errorResponse(`Country already exists: ${slug}`, 409);
    }

    config.countries.push({
      name: body.name,
      slug,
      flag: body.flag || '🌍',
      accent: body.accent || '#c41e3a',
      aliases: body.aliases || [],
      topics: Array.isArray(body.topics) ? body.topics : [],
    });
    const next = await saveMonitoringConfig(context, config);
    return jsonResponse({ success: true, data: next });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
