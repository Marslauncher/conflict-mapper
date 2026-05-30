import { jsonResponse } from '../../cloudflare/lib/http.js';
import { getReportStatus } from '../../cloudflare/lib/reports.js';

export async function onRequestGet(context) {
  const status = await getReportStatus(context.env);
  return jsonResponse({
    success: true,
    data: {
      server: 'Conflict Mapper Cloudflare API',
      runtime: 'Cloudflare Pages Functions',
      version: '3.0.0-cloudflare',
      bindings: {
        kv: !!context.env.CONFIG_KV,
        d1: !!context.env.DB,
        r2: !!context.env.REPORTS_BUCKET,
      },
      analysisStatus: status,
    },
  });
}
