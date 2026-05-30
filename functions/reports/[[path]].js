export async function onRequestGet(context) {
  const path = Array.isArray(context.params.path)
    ? context.params.path.join('/')
    : context.params.path;
  const key = `reports/${path || ''}`.replace(/\/+/g, '/');

  if (context.env.REPORTS_BUCKET) {
    const object = await context.env.REPORTS_BUCKET.get(key);
    if (object) {
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('cache-control', 'public, max-age=300');
      if (!headers.has('content-type')) headers.set('content-type', 'text/html; charset=utf-8');
      return new Response(object.body, { headers });
    }
  }

  return context.env.ASSETS.fetch(context.request);
}
