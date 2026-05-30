const PRIVATE_PREFIXES = [
  '/cloudflare/',
  '/functions/',
  '/workers/',
  '/migrations/',
  '/node_modules/',
];

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  const privateFiles = new Set(['/server.js', '/package.json', '/package-lock.json', '/wrangler.toml', '/Dockerfile']);
  if (privateFiles.has(path) || PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  return context.next();
}
