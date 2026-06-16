import { jsonResponse } from '../../cloudflare/lib/http.js';
import { listReportMetadata } from '../../cloudflare/lib/reports.js';
import { listStaticReports, parseReportPath } from '../../cloudflare/lib/report-manifest.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const scope = url.searchParams.get('scope') || '';
  const slug = url.searchParams.get('slug') || (scope === 'global' ? 'global' : '');
  const includeStorage = url.searchParams.get('storage') !== '0';
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') || 200), 1000));
  const prefix = url.searchParams.get('prefix') || '';

  const dbReports = scope
    ? await listReportMetadata(context.env, { scope, slug, limit })
    : [];
  const staticReports = await listStaticReports(context, { scope, slug });
  const storageReports = includeStorage
    ? await listR2Reports(context.env, { scope, slug, prefix, limit })
    : [];
  const reports = mergeReports([...storageReports, ...dbReports.map(normalizeDbReport), ...staticReports])
    .sort(compareReportFreshness);

  return jsonResponse({
    success: true,
    data: {
      reports,
      total: reports.length,
      sources: {
        r2: storageReports.length,
        d1: dbReports.length,
        static: staticReports.length,
      },
    },
  });
}

async function listR2Reports(env, { scope = '', slug = '', prefix = '', limit = 200 } = {}) {
  if (!env.REPORTS_BUCKET) return [];
  const listPrefix = prefix || r2PrefixForScope(scope, slug);
  const result = await env.REPORTS_BUCKET.list({
    prefix: listPrefix.replace(/^\/+/, ''),
    limit: Math.max(limit, scope && !slug ? 1000 : limit),
  });
  return (result.objects || [])
    .filter((object) => object.key.endsWith('.html'))
    .map((object) => {
      const publicPath = `/${object.key}`;
      const parsed = parseReportPath(publicPath) || {
        id: `r2:${object.key}`,
        source: 'r2',
        scope: 'unknown',
        type: 'unknown',
        slug: '',
        title: object.key,
        publicPath,
        path: publicPath,
        generatedAt: object.uploaded?.toISOString?.() || object.uploaded || new Date().toISOString(),
        reportDate: '',
        isCurrent: object.key.includes('/current/'),
        tags: ['R2'],
      };
      return {
        ...parsed,
        id: `r2:${object.key}`,
        source: 'r2',
        storageKey: object.key,
        size: object.size || 0,
        uploaded: object.uploaded?.toISOString?.() || object.uploaded || null,
        generatedAt: object.uploaded?.toISOString?.() || object.uploaded || parsed.generatedAt,
      };
    })
    .filter((report) => (!scope || report.scope === scope) && (!slug || report.slug === slug));
}

function r2PrefixForScope(scope = '', slug = '') {
  if (scope === 'global') return 'reports/global/';
  if (scope === 'watch') return slug ? `reports/watches/${slug}/` : 'reports/watches/';
  if (scope === 'country') return slug ? `reports/countries/${slug}/` : 'reports/countries/';
  return 'reports/';
}

function normalizeDbReport(report) {
  const publicPath = report.publicPath || report.path || '';
  const parsed = publicPath ? parseReportPath(publicPath) : null;
  return {
    ...(parsed || {}),
    ...report,
    id: report.id || `d1:${publicPath}`,
    source: 'd1',
    type: report.scope === 'country' ? 'country' : report.scope || parsed?.type || 'global',
    country: report.scope === 'country' ? report.slug : parsed?.country || null,
    path: publicPath,
    publicPath,
  };
}

function mergeReports(reports) {
  const seen = new Map();
  for (const report of reports) {
    const key = report.publicPath || report.path || report.storageKey || report.id;
    if (!key) continue;
    const previous = seen.get(key);
    seen.set(key, {
      ...(previous || {}),
      ...report,
      path: report.path || report.publicPath || previous?.path,
      publicPath: report.publicPath || report.path || previous?.publicPath,
    });
  }
  return Array.from(seen.values());
}

function compareReportFreshness(a, b) {
  const bTime = new Date(b.generatedAt || b.uploaded || 0).getTime();
  const aTime = new Date(a.generatedAt || a.uploaded || 0).getTime();
  return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
    || Number(Boolean(b.isCurrent)) - Number(Boolean(a.isCurrent));
}
