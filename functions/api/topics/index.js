import { errorResponse, jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { loadMonitoringConfig, saveMonitoringConfig, slugify } from '../../../cloudflare/lib/monitoring-config.js';

export async function onRequestGet(context) {
  const config = await loadMonitoringConfig(context);
  return jsonResponse({
    success: true,
    data: config.topics,
  });
}

export async function onRequestPost(context) {
  try {
    const body = await readJsonRequest(context.request);
    const config = await loadMonitoringConfig(context);
    const id = slugify(body.id || body.name);
    if (!body.name || !id) return errorResponse('Topic name and ID are required', 400);
    if (config.topics.some((topic) => topic.id === id)) return errorResponse(`Topic already exists: ${id}`, 409);
    config.topics.push({
      id,
      name: body.name,
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
    });
    const next = await saveMonitoringConfig(context, config);
    return jsonResponse({ success: true, data: next.topics });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
