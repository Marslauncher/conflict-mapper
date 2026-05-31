import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';
import { loadMonitoringConfig, saveMonitoringConfig, slugify } from '../../../cloudflare/lib/monitoring-config.js';

export async function onRequestPut(context) {
  try {
    const id = slugify(context.params.id);
    const updates = await context.request.json();
    const config = await loadMonitoringConfig(context);
    const index = config.topics.findIndex((topic) => topic.id === id);
    if (index === -1) return errorResponse(`Topic not found: ${id}`, 404);

    const topics = [...config.topics];
    topics[index] = {
      ...topics[index],
      name: updates.name || topics[index].name,
      keywords: Array.isArray(updates.keywords) ? updates.keywords : topics[index].keywords,
    };

    const next = await saveMonitoringConfig(context, { ...config, topics });
    return jsonResponse({ success: true, data: next.topics });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}

export async function onRequestDelete(context) {
  try {
    const id = slugify(context.params.id);
    const config = await loadMonitoringConfig(context);
    const topics = config.topics.filter((topic) => topic.id !== id);
    if (topics.length === config.topics.length) return errorResponse(`Topic not found: ${id}`, 404);

    const countries = config.countries.map((country) => ({
      ...country,
      topics: (country.topics || []).filter((topicId) => topicId !== id),
    }));
    const next = await saveMonitoringConfig(context, { ...config, topics, countries });
    return jsonResponse({ success: true, data: next.topics });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
