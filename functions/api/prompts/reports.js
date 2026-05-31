import { errorResponse, jsonResponse, readJsonRequest } from '../../../cloudflare/lib/http.js';
import { listReportPromptTemplates, saveReportPromptTemplate } from '../../../cloudflare/lib/reports.js';

export async function onRequestGet(context) {
  return jsonResponse({
    success: true,
    data: {
      version: 1,
      updatedAt: new Date().toISOString(),
      templates: await listReportPromptTemplates(context.env),
    },
  });
}

export async function onRequestPost(context) {
  try {
    const body = await readJsonRequest(context.request);
    const template = await saveReportPromptTemplate(context.env, body);
    return jsonResponse({
      success: true,
      data: { template },
    });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
