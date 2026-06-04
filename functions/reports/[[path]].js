export async function onRequestGet(context) {
  const path = Array.isArray(context.params.path)
    ? context.params.path.join('/')
    : context.params.path;
  const key = `reports/${path || ''}`.replace(/\/+/g, '/');
  const candidateKeys = reportKeyCandidates(key);

  if (context.env.REPORTS_BUCKET) {
    for (const candidateKey of candidateKeys) {
      const object = await context.env.REPORTS_BUCKET.get(candidateKey);
      if (object) {
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('cache-control', 'public, max-age=300');
        if (!headers.has('content-type')) headers.set('content-type', 'text/html; charset=utf-8');
        return new Response(await reportBody(object, headers, candidateKey), { headers });
      }
    }
  }

  return context.env.ASSETS.fetch(normalizedAssetRequest(context.request, key));
}

function reportKeyCandidates(key) {
  const clean = String(key || '').replace(/^\/+/, '');
  const candidates = [clean];
  if (clean && !clean.endsWith('/') && !/\.[a-z0-9]+$/i.test(clean)) {
    candidates.push(`${clean}.html`);
  }
  return Array.from(new Set(candidates.filter(Boolean)));
}

function normalizedAssetRequest(request, key) {
  if (!key || key.endsWith('/') || /\.[a-z0-9]+$/i.test(key)) return request;
  const url = new URL(request.url);
  url.pathname = `/${key}.html`.replace(/\/+/g, '/');
  return new Request(url.toString(), request);
}

async function reportBody(object, headers, key) {
  const contentType = headers.get('content-type') || '';
  if (!isHtmlReport(key, contentType)) return object.body;
  const html = await object.text();
  const styled = injectUserStyle(html);
  if (styled !== html) {
    headers.delete('content-length');
    headers.delete('etag');
  }
  return styled;
}

function isHtmlReport(key, contentType) {
  return contentType.includes('text/html') || key.endsWith('.html') || !/\.[a-z0-9]+$/i.test(key);
}

function injectUserStyle(html) {
  if (!html || html.includes('/assets/user-style.js')) return html;
  const script = '<script src="/assets/user-style.js"></script>';
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${script}\n</head>`);
  return `${script}\n${html}`;
}
