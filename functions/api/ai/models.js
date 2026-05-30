import { jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { listAIModels } from '../../../cloudflare/lib/ai.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const result = await listAIModels(context.env, {
    provider: url.searchParams.get('provider') || undefined,
  });
  return jsonResponse({ success: true, data: result });
}

export async function onRequestPost(context) {
  const body = await readJsonRequest(context.request);
  const result = await listAIModels(context.env, body);
  return jsonResponse({ success: true, data: result });
}
