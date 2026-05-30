import { jsonResponse } from '../../cloudflare/lib/http.js';

export async function onRequestGet(context) {
  const statusRaw = context.env.CONFIG_KV
    ? await context.env.CONFIG_KV.get('analysis:status')
    : null;
  const status = statusRaw ? JSON.parse(statusRaw) : null;

  return jsonResponse({
    success: true,
    data: {
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          category: 'system',
          message: 'Cloudflare Pages Function logging endpoint active',
          details: status,
        },
      ],
      total: 1,
    },
  });
}
