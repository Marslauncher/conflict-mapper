import { errorResponse, jsonResponse, readJsonRequest } from '../../cloudflare/lib/http.js';
import { loadAppSettings, saveAppSettings } from '../../cloudflare/lib/app-settings.js';

export async function onRequestGet(context) {
  const settings = await loadAppSettings(context.env);
  return jsonResponse({
    success: true,
    data: {
      settings,
      source: context.env.CONFIG_KV ? 'config-kv' : 'defaults',
      writable: !!context.env.CONFIG_KV,
    },
  });
}

export async function onRequestPost(context) {
  try {
    const body = await readJsonRequest(context.request);
    const current = await loadAppSettings(context.env);
    const settings = await saveAppSettings(context.env, { ...current, ...body });
    return jsonResponse({
      success: true,
      data: {
        settings,
        message: `RSS refresh timer saved at ${settings.feedRefreshIntervalMinutes} minute intervals`,
      },
    });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
