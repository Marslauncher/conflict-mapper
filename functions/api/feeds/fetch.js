import { jsonResponse } from '../../../cloudflare/lib/http.js';

export async function onRequestPost() {
  return jsonResponse({
    success: true,
    data: {
      message: 'Cloudflare-native feed refresh is delegated to the scheduled Worker. Manual fetch endpoint acknowledged.',
      status: {
        running: false,
        phase: 'worker-cron',
      },
    },
  }, { status: 202 });
}
