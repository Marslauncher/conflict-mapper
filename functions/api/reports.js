import { jsonResponse } from '../../cloudflare/lib/http.js';
import { listReportMetadata } from '../../cloudflare/lib/reports.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const scope = url.searchParams.get('scope') || 'global';
  const slug = url.searchParams.get('slug') || (scope === 'global' ? 'global' : '');
  const reports = await listReportMetadata(context.env, { scope, slug, limit: 100 });

  return jsonResponse({
    success: true,
    data: {
      reports,
      total: reports.length,
    },
  });
}
