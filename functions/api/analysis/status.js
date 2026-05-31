import { jsonResponse } from '../../../cloudflare/lib/http.js';
import { getReportStatus, resetReportStatus } from '../../../cloudflare/lib/reports.js';

export async function onRequestGet(context) {
  return jsonResponse({
    success: true,
    data: await getReportStatus(context.env),
  });
}

export async function onRequestPost(context) {
  return jsonResponse({
    success: true,
    data: await resetReportStatus(context.env, 'Manual report status reset from /api/analysis/status'),
  });
}
