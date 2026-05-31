const STATIC_REPORT_PATHS = [
  '/reports/countries/china/current/report.html',
  '/reports/countries/china/historical/report-2026-04-01T01-36-54.html',
  '/reports/countries/china/historical/report-2026-04-01T01-50-17.html',
  '/reports/countries/india/current/report.html',
  '/reports/countries/india/historical/report-2026-04-01T01-49-30.html',
  '/reports/countries/iran/current/report.html',
  '/reports/countries/iran/historical/report-2026-04-01T01-39-07.html',
  '/reports/countries/iran/historical/report-2026-04-01T01-50-19.html',
  '/reports/countries/israel/current/report.html',
  '/reports/countries/israel/historical/report-2026-04-01T01-50-25.html',
  '/reports/countries/nato/current/report.html',
  '/reports/countries/nato/historical/report-2026-04-01T01-50-26.html',
  '/reports/countries/north-korea/current/report.html',
  '/reports/countries/north-korea/historical/report-2026-04-01T01-49-51.html',
  '/reports/countries/pakistan/current/report.html',
  '/reports/countries/pakistan/historical/report-2026-04-01T01-50-00.html',
  '/reports/countries/russia/current/report.html',
  '/reports/countries/russia/historical/report-2026-03-28T22-55-52.html',
  '/reports/countries/russia/historical/report-2026-03-31T23-56-50.html',
  '/reports/countries/russia/historical/report-2026-04-01T01-37-03.html',
  '/reports/countries/russia/historical/report-2026-04-01T01-50-32.html',
  '/reports/countries/taiwan/current/report.html',
  '/reports/countries/taiwan/historical/report-2026-04-01T01-38-52.html',
  '/reports/countries/taiwan/historical/report-2026-04-01T01-50-18.html',
  '/reports/countries/ukraine/current/report.html',
  '/reports/countries/ukraine/historical/report-2026-04-01T01-50-34.html',
  '/reports/countries/usa/current/report.html',
  '/reports/countries/usa/historical/report-2026-04-01T01-36-34.html',
  '/reports/countries/usa/historical/report-2026-04-01T01-49-19.html',
  '/reports/global/current/report.html',
  '/reports/global/historical/report-2026-03-29T08-53-53.html',
  '/reports/global/historical/report-2026-03-31T21-34-41.html',
  '/reports/global/historical/report-2026-03-31T21-53-42.html',
];

const COUNTRY_NAMES = {
  china: 'China',
  india: 'India',
  iran: 'Iran',
  israel: 'Israel',
  nato: 'NATO',
  'north-korea': 'North Korea',
  pakistan: 'Pakistan',
  russia: 'Russia',
  taiwan: 'Taiwan',
  ukraine: 'Ukraine',
  usa: 'United States',
};

export async function listStaticReports(context, { scope = '', slug = '', includeCurrent = true } = {}) {
  const reports = [];
  for (const path of STATIC_REPORT_PATHS) {
    const report = parseReportPath(path);
    if (!report) continue;
    if (!includeCurrent && report.isCurrent) continue;
    if (scope && report.scope !== scope) continue;
    if (slug && report.slug !== slug) continue;

    const size = await readAssetSize(context, path);
    reports.push({ ...report, ...(size ? { size } : {}) });
  }
  return reports;
}

export function parseReportPath(publicPath) {
  const parts = publicPath.split('/').filter(Boolean);
  if (parts[0] !== 'reports') return null;

  const isCurrent = parts.includes('current');
  const fileName = parts[parts.length - 1];
  const generatedAt = parseReportDate(fileName, isCurrent);

  if (parts[1] === 'global') {
    return {
      id: `static:${publicPath}`,
      source: 'static',
      scope: 'global',
      type: 'global',
      slug: 'global',
      country: null,
      title: 'Global Intelligence Report',
      publicPath,
      path: publicPath,
      generatedAt,
      reportDate: generatedAt.slice(0, 10),
      isCurrent,
      tags: ['AI Generated', 'OSINT'],
    };
  }

  if (parts[1] === 'countries') {
    const slug = parts[2];
    const countryName = COUNTRY_NAMES[slug] || slug;
    return {
      id: `static:${publicPath}`,
      source: 'static',
      scope: 'country',
      type: 'country',
      slug,
      country: slug,
      title: `${countryName} Intelligence Report`,
      publicPath,
      path: publicPath,
      generatedAt,
      reportDate: generatedAt.slice(0, 10),
      isCurrent,
      tags: ['AI Generated', 'Strategic'],
    };
  }

  if (parts[1] === 'watches') {
    const slug = parts[2];
    return {
      id: `static:${publicPath}`,
      source: 'static',
      scope: 'watch',
      type: 'watch',
      slug,
      country: slug,
      title: slug === 'taiwan' ? 'China/Taiwan Threat Watch' : `${slug} Threat Watch`,
      publicPath,
      path: publicPath,
      generatedAt,
      reportDate: generatedAt.slice(0, 10),
      isCurrent,
      tags: ['Threat Watch', 'OSINT'],
    };
  }

  return null;
}

function parseReportDate(fileName, isCurrent) {
  if (isCurrent) return '2026-05-29T07:12:17.000Z';
  const match = fileName.match(/^report-(.+)\.html$/);
  if (!match) return '2026-05-29T07:12:17.000Z';
  return `${match[1].replace(/T(\d\d)-(\d\d)-(\d\d)$/, 'T$1:$2:$3')}Z`;
}

async function readAssetSize(context, path) {
  if (!context?.env?.ASSETS) return 0;
  const url = new URL(path, context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(url.toString(), { method: 'HEAD' }));
  if (!response.ok) return 0;
  return Number(response.headers.get('content-length') || 0);
}
