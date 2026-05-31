import { jsonResponse } from '../../../cloudflare/lib/http.js';
import { getReportPromptTemplates } from '../../../cloudflare/lib/reports.js';

export async function onRequestGet() {
  return jsonResponse({
    success: true,
    data: {
      version: 1,
      updatedAt: new Date().toISOString(),
      templates: getReportPromptTemplates(),
    },
  });
}
