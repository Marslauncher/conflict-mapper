import { jsonResponse } from '../../../cloudflare/lib/http.js';
import { getReportStatus } from '../../../cloudflare/lib/reports.js';

export async function onRequestGet(context) {
  return jsonResponse({
    success: true,
    data: await getReportStatus(context.env),
  });
}
