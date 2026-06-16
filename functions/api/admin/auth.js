import { jsonResponse, methodNotAllowed, readJsonRequest } from '../../../cloudflare/lib/http.js';

export async function onRequestGet(context) {
  return jsonResponse({
    success: true,
    data: {
      configured: Boolean(context.env.ADMIN_ACCESS_TOKEN),
      authMode: 'cloudflare-secret',
    },
  });
}

export async function onRequestDelete() {
  return jsonResponse({
    success: true,
    data: { authenticated: false },
  }, {
    headers: {
      'set-cookie': 'cm_admin=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    },
  });
}

export async function onRequestPost(context) {
  try {
    const body = await readJsonRequest(context.request);
    const provided = String(body.password || body.token || '').trim();
    const expected = String(context.env.ADMIN_ACCESS_TOKEN || '').trim();

    if (!expected) {
      return jsonResponse({
        success: false,
        error: 'ADMIN_ACCESS_TOKEN is not configured',
        data: { configured: false },
      }, { status: 503 });
    }

    const authenticated = await constantTimeEqual(provided, expected);
    const response = jsonResponse({
      success: authenticated,
      data: {
        authenticated,
        authMode: 'cloudflare-secret',
      },
    }, { status: authenticated ? 200 : 401 });
    if (authenticated) {
      response.headers.set('set-cookie', cookieHeader('cm_admin', provided));
    }
    return response;
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.message,
    }, { status: err.status || 500 });
  }
}

function cookieHeader(name, value) {
  const encoded = encodeURIComponent(value);
  return `${name}=${encoded}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=21600`;
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return onRequestGet(context);
  if (context.request.method === 'POST') return onRequestPost(context);
  if (context.request.method === 'DELETE') return onRequestDelete(context);
  return methodNotAllowed(['GET', 'POST', 'DELETE']);
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
