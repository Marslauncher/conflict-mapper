import { jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { testAIConnection } from '../../../cloudflare/lib/ai.js';

export async function onRequestPost(context) {
  const body = await readJsonRequest(context.request);
  const result = await testAIConnection(context.env, body);
  return jsonResponse({
    success: result.success,
    data: result,
    ...(result.success ? {} : { error: result.message }),
  }, { status: result.success ? 200 : 502 });
}
