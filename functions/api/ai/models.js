import { jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { listAIModels } from '../../../cloudflare/lib/ai.js';

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const result = await listAIModels(context.env, {
      provider: url.searchParams.get('provider') || undefined,
    });
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await readJsonRequest(context.request);
    const result = await listAIModels(context.env, body);
    return jsonResponse({ success: true, data: result });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
