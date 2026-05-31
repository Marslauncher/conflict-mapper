import { errorResponse, jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { loadMonitoringConfig, saveMonitoringConfig } from '../../../cloudflare/lib/monitoring-config.js';

export async function onRequestPut(context) {
  try {
    const slug = context.params.slug;
    const body = await readJsonRequest(context.request);
    const config = await loadMonitoringConfig(context);
    const country = config.countries.find((item) => item.slug === slug);
    if (!country) return errorResponse(`Country not found: ${slug}`, 404);

    if (body.name !== undefined) country.name = body.name;
    if (body.flag !== undefined) country.flag = body.flag;
    if (body.accent !== undefined) country.accent = body.accent;
    if (body.aliases !== undefined) country.aliases = Array.isArray(body.aliases) ? body.aliases : [];
    if (body.topics !== undefined) country.topics = Array.isArray(body.topics) ? body.topics : [];

    const next = await saveMonitoringConfig(context, config);
    return jsonResponse({ success: true, data: next });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const slug = context.params.slug;
    const config = await loadMonitoringConfig(context);
    const nextCountries = config.countries.filter((country) => country.slug !== slug);
    if (nextCountries.length === config.countries.length) return errorResponse(`Country not found: ${slug}`, 404);
    const next = await saveMonitoringConfig(context, { ...config, countries: nextCountries });
    return jsonResponse({ success: true, data: next });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
