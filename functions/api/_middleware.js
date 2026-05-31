import { appendReportLog } from '../../cloudflare/lib/reports.js';

const QUIET_PATHS = new Set([
  '/api/logs',
  '/api/analysis/status',
]);

export async function onRequest(context) {
  const started = Date.now();
  const request = context.request;
  const url = new URL(request.url);
  const method = request.method || 'GET';

  try {
    const response = await context.next();
    queueApiLog(context, {
      level: response.ok ? 'info' : 'warn',
      message: `${method} ${url.pathname} -> ${response.status}`,
      details: {
        method,
        path: url.pathname,
        status: response.status,
        durationMs: Date.now() - started,
        contentType: response.headers.get('content-type') || '',
      },
    });
    return response;
  } catch (err) {
    queueApiLog(context, {
      level: 'error',
      message: `${method} ${url.pathname} failed: ${err.message}`,
      details: {
        method,
        path: url.pathname,
        durationMs: Date.now() - started,
      },
    });
    throw err;
  }
}

function queueApiLog(context, entry) {
  if (context.env.ENABLE_API_TRACE_LOGS !== 'true') return;
  const path = entry.details?.path || '';
  if (QUIET_PATHS.has(path)) return;
  const payload = appendReportLog(context.env, {
    category: 'api',
    ...entry,
  }).catch(() => {});
  if (typeof context.waitUntil === 'function') context.waitUntil(payload);
}
