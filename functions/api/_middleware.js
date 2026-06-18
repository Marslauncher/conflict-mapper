import { appendReportLog } from '../../cloudflare/lib/reports.js';

const QUIET_PATHS = new Set([
  '/api/logs',
  '/api/analysis/status',
]);

const ADMIN_REQUIRED_PREFIXES = [
  '/api/ai/',
  '/api/feeds/fetch',
  '/api/logs',
  '/api/prompts/',
  '/api/storage/',
];

const ADMIN_REQUIRED_MUTATION_PREFIXES = [
  '/api/countries',
  '/api/analysis',
  '/api/feeds',
  '/api/settings',
  '/api/topics',
  '/api/articles/reprocess',
  '/api/articles/flag',
];

export async function onRequest(context) {
  const started = Date.now();
  const request = context.request;
  const url = new URL(request.url);
  const method = request.method || 'GET';

  try {
    const authFailure = await rejectUnauthorizedAdminRequest(context, method, url.pathname);
    if (authFailure) return authFailure;

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

async function rejectUnauthorizedAdminRequest(context, method, path) {
  if (!requiresAdmin(method, path)) return null;
  const expected = String(context.env.ADMIN_ACCESS_TOKEN || '').trim();
  if (!expected) {
    return jsonError('ADMIN_ACCESS_TOKEN is not configured', 503);
  }
  const provided = adminTokenFromRequest(context.request);
  if (await constantTimeEqual(provided, expected)) return null;
  return jsonError('Admin authentication required', 401);
}

function requiresAdmin(method, path) {
  if (path === '/api/admin/auth') return false;
  if (ADMIN_REQUIRED_PREFIXES.some((prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix))) return true;
  if (method !== 'GET' && ADMIN_REQUIRED_MUTATION_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return true;
  return false;
}

function adminTokenFromRequest(request) {
  const header = request.headers.get('x-admin-token') || request.headers.get('authorization') || '';
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  return (bearer || header || readCookie(request.headers.get('cookie') || '', 'cm_admin')).trim();
}

function readCookie(cookieHeader, name) {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || '';
}

function jsonError(error, status) {
  return new Response(JSON.stringify({ success: false, error }, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function constantTimeEqual(a, b) {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const left = new Uint8Array(leftHash);
  const right = new Uint8Array(rightHash);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] || 0) ^ (right[i] || 0);
  }
  return diff === 0;
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
