import { errorResponse, jsonResponse } from '../../../cloudflare/lib/http.js';

export async function onRequestGet(context) {
  try {
    if (!context.env.REPORTS_BUCKET) throw new Error('REPORTS_BUCKET binding missing');
    const url = new URL(context.request.url);
    const prefix = (url.searchParams.get('prefix') || '').replace(/^\/+/, '');
    const cursor = url.searchParams.get('cursor') || undefined;
    const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') || 250), 1000));
    const result = await context.env.REPORTS_BUCKET.list({ prefix, cursor, limit });
    const objects = (result.objects || []).map((object) => ({
      key: object.key,
      path: object.key.startsWith('reports/') ? `/${object.key}` : `/storage/${object.key}`,
      downloadPath: `/storage/${object.key}`,
      size: object.size || 0,
      uploaded: object.uploaded?.toISOString?.() || object.uploaded || null,
      etag: object.etag || null,
      customMetadata: object.customMetadata || {},
    }));

    return jsonResponse({
      success: true,
      data: {
        objects,
        truncated: result.truncated || false,
        cursor: result.truncated ? result.cursor : null,
        prefix,
        total: objects.length,
      },
    });
  } catch (err) {
    return errorResponse(err.message, err.status || 500);
  }
}
