export async function onRequestGet(context) {
  const path = Array.isArray(context.params.path)
    ? context.params.path.join('/')
    : context.params.path;
  const key = String(path || '').replace(/^\/+/, '');

  if (!key) return new Response('Storage object key required', { status: 400 });

  if (context.env.REPORTS_BUCKET) {
    const object = await context.env.REPORTS_BUCKET.get(key);
    if (object) {
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('cache-control', 'private, max-age=60');
      if (!headers.has('content-type')) headers.set('content-type', 'application/octet-stream');
      return new Response(object.body, { headers });
    }
  }

  return new Response('Storage object not found', { status: 404 });
}
