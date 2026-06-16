const PRIVATE_PREFIXES = [
  '/cloudflare/',
  '/data/',
  '/datasources/',
  '/docs/',
  '/functions/',
  '/generated-samples/',
  '/lib/',
  '/screenshots/',
  '/scripts/',
  '/workers/',
  '/migrations/',
  '/node_modules/',
];

const PRIVATE_FILES = new Set([
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/wrangler.toml',
  '/docker-compose.yml',
  '/Dockerfile',
  '/CONFLICT_MAPPER_STYLE_GUIDE.md',
  '/COUNTRY_DOSSIER_TEMPLATE.md',
  '/DOSSIER_MASTER_PLAN.md',
  '/NEXT_STEPS.md',
  '/THEATER_DOSSIER_TEMPLATE.md',
  '/.env',
  '/.dev.vars',
  '/data/ai-config.json',
  '/data/server.log',
  '/data/settings.json',
  '/data/flagged-articles.json',
]);

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (path === '/favicon.ico') {
    return new Response(null, {
      status: 204,
      headers: {
        'cache-control': 'public, max-age=86400',
      },
    });
  }

  if (isPrivatePath(path)) {
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

function isPrivatePath(path) {
  if (PRIVATE_FILES.has(path)) return true;
  if (/\/\.[^/]+/.test(path)) return true;
  return PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix));
}
