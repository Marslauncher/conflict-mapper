import { jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { getEffectiveAIConfig, listProviders, saveAIConfig } from '../../../cloudflare/lib/ai.js';

export async function onRequestGet(context) {
  return jsonResponse({
    success: true,
    data: {
      config: await getEffectiveAIConfig(context.env, { mask: true }),
      providers: listProviders(),
      writable: !!(context.env.CONFIG_KV && context.env.AI_CONFIG_ENCRYPTION_KEY),
    },
  });
}

export async function onRequestPost(context) {
  try {
    const body = await readJsonRequest(context.request);
    const config = await saveAIConfig(context.env, body);
    return jsonResponse({
      success: true,
      data: {
        config,
        message: 'AI provider configuration saved encrypted in CONFIG_KV',
      },
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.message,
      data: {
        bootstrapRequired: /AI_CONFIG_ENCRYPTION_KEY/.test(err.message),
        bootstrapCommand: 'npx wrangler pages secret put AI_CONFIG_ENCRYPTION_KEY --project-name conflict-mapper',
        workerBootstrapCommand: 'cd workers/report-cron && npx wrangler secret put AI_CONFIG_ENCRYPTION_KEY',
      },
    }, { status: err.status || 500 });
  }
}
