export function jsonResponse(payload, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(payload, null, 2), {
    ...init,
    headers,
  });
}

export function errorResponse(message, status = 500, details = undefined) {
  return jsonResponse({
    success: false,
    error: message,
    ...(details ? { details } : {}),
  }, { status });
}

export function methodNotAllowed(allowed) {
  return errorResponse(`Method not allowed. Allowed: ${allowed.join(', ')}`, 405, { allowed });
}

export async function readJsonRequest(request) {
  const raw = await request.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    const error = new Error(`Invalid JSON body: ${err.message}`);
    error.status = 400;
    throw error;
  }
}

export function requireBinding(env, bindingName) {
  if (!env || !env[bindingName]) {
    const error = new Error(`Missing Cloudflare binding: ${bindingName}`);
    error.status = 503;
    throw error;
  }
  return env[bindingName];
}
