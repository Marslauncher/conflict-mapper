import { generateReportText, getEffectiveAIConfig } from './ai.js';
import { filterArticles } from './static-data.js';

const COUNTRY_LABELS = {
  usa: 'United States',
  china: 'China',
  russia: 'Russia',
  ukraine: 'Ukraine',
  taiwan: 'Taiwan',
  iran: 'Iran',
  israel: 'Israel',
  india: 'India',
  pakistan: 'Pakistan',
  'north-korea': 'North Korea',
  nato: 'NATO',
};

export function reportPaths(scope, slug = 'global') {
  if (scope === 'global') {
    return {
      currentKey: 'reports/global/current/report.html',
      currentPath: '/reports/global/current/report.html',
      historicalPrefix: 'reports/global/historical',
      publicHistoricalPrefix: '/reports/global/historical',
    };
  }

  return {
    currentKey: `reports/countries/${slug}/current/report.html`,
    currentPath: `/reports/countries/${slug}/current/report.html`,
    historicalPrefix: `reports/countries/${slug}/historical`,
    publicHistoricalPrefix: `/reports/countries/${slug}/historical`,
  };
}

export async function getReportStatus(env) {
  if (!env.CONFIG_KV) return { running: false, phase: 'unconfigured', message: 'CONFIG_KV binding missing' };
  const raw = await env.CONFIG_KV.get('analysis:status');
  return raw ? JSON.parse(raw) : { running: false, phase: 'idle', message: 'Idle' };
}

export async function setReportStatus(env, status) {
  if (!env.CONFIG_KV) return;
  await env.CONFIG_KV.put('analysis:status', JSON.stringify({
    updatedAt: new Date().toISOString(),
    ...status,
  }));
}

export async function listReportMetadata(env, { scope = 'global', slug = 'global', limit = 50 } = {}) {
  if (!env.DB) return [];
  const result = await env.DB.prepare(`
    SELECT id, scope, slug, title, public_path AS publicPath, generated_at AS generatedAt,
           report_date AS reportDate, is_current AS isCurrent, provider, model, status
    FROM reports
    WHERE scope = ?1 AND slug = ?2
    ORDER BY is_current DESC, generated_at DESC
    LIMIT ?3
  `).bind(scope, slug, limit).all();
  return result.results || [];
}

export async function getCurrentReportMetadata(env, scope, slug = 'global') {
  if (!env.DB) return null;
  const result = await env.DB.prepare(`
    SELECT id, scope, slug, title, storage_key AS storageKey, public_path AS publicPath,
           generated_at AS generatedAt, report_date AS reportDate, provider, model, status
    FROM reports
    WHERE scope = ?1 AND slug = ?2 AND is_current = 1
    ORDER BY generated_at DESC
    LIMIT 1
  `).bind(scope, slug).first();
  return result || null;
}

export async function generateAndStoreReport(env, { scope = 'global', slug = 'global', articles = [] } = {}) {
  const startedAt = new Date().toISOString();
  const normalizedSlug = scope === 'global' ? 'global' : slug;
  const title = scope === 'global'
    ? `Global Intelligence Report - ${startedAt.slice(0, 10)}`
    : `${COUNTRY_LABELS[normalizedSlug] || normalizedSlug.toUpperCase()} Intelligence Report - ${startedAt.slice(0, 10)}`;

  await setReportStatus(env, {
    running: true,
    phase: 'generating',
    scope,
    slug: normalizedSlug,
    message: `Generating ${title}`,
    startedAt,
  });

  try {
    if (!env.REPORTS_BUCKET) throw new Error('REPORTS_BUCKET binding missing');
    if (!env.DB) throw new Error('DB binding missing');

    const selectedArticles = filterArticles(articles, {
      country: scope === 'country' ? normalizedSlug : '',
      limit: 80,
    });

    const aiText = await generateReportText(
      env,
      buildSystemPrompt(),
      buildUserPrompt({ scope, slug: normalizedSlug, title, articles: selectedArticles }),
    );
    const html = renderReportHtml({ title, scope, slug: normalizedSlug, body: aiText, articles: selectedArticles });
    const paths = reportPaths(scope, normalizedSlug);

    await archiveCurrentReport(env, scope, normalizedSlug, paths);

    await env.REPORTS_BUCKET.put(paths.currentKey, html, {
      httpMetadata: { contentType: 'text/html; charset=utf-8' },
      customMetadata: { scope, slug: normalizedSlug, generatedAt: startedAt },
    });

    const config = await getEffectiveAIConfig(env);
    const currentId = crypto.randomUUID();
    await env.DB.prepare(`
      UPDATE reports SET is_current = 0
      WHERE scope = ?1 AND slug = ?2 AND is_current = 1
    `).bind(scope, normalizedSlug).run();
    await env.DB.prepare(`
      INSERT INTO reports (
        id, scope, slug, title, storage_key, public_path, generated_at,
        report_date, is_current, provider, model, status, metadata
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, ?9, ?10, 'ready', ?11)
    `).bind(
      currentId,
      scope,
      normalizedSlug,
      title,
      paths.currentKey,
      paths.currentPath,
      startedAt,
      startedAt.slice(0, 10),
      config.provider,
      config.providers[config.provider]?.model || '',
      JSON.stringify({ articleCount: selectedArticles.length }),
    ).run();

    await setReportStatus(env, {
      running: false,
      phase: 'complete',
      scope,
      slug: normalizedSlug,
      message: `Generated ${title}`,
      lastRun: new Date().toISOString(),
      lastResult: { id: currentId, path: paths.currentPath, articleCount: selectedArticles.length },
    });

    return { id: currentId, title, path: paths.currentPath, articleCount: selectedArticles.length };
  } catch (err) {
    await setReportStatus(env, {
      running: false,
      phase: 'failed',
      scope,
      slug: normalizedSlug,
      message: err.message,
      lastRun: new Date().toISOString(),
    });
    throw err;
  }
}

async function archiveCurrentReport(env, scope, slug, paths) {
  const current = await env.REPORTS_BUCKET.get(paths.currentKey);
  const currentMeta = await getCurrentReportMetadata(env, scope, slug);
  if (!current) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const historicalKey = `${paths.historicalPrefix}/report-${timestamp}.html`;
  const historicalPath = `${paths.publicHistoricalPrefix}/report-${timestamp}.html`;
  await env.REPORTS_BUCKET.put(historicalKey, await current.text(), {
    httpMetadata: { contentType: 'text/html; charset=utf-8' },
    customMetadata: { scope, slug, archivedAt: new Date().toISOString() },
  });

  if (currentMeta?.id) {
    await env.DB.prepare(`
      UPDATE reports
      SET storage_key = ?1, public_path = ?2, is_current = 0
      WHERE id = ?3
    `).bind(historicalKey, historicalPath, currentMeta.id).run();
  }
}

function buildSystemPrompt() {
  return `You are a senior geopolitical intelligence analyst. Produce concise, sourced, decision-grade analysis for infrastructure and security professionals. Avoid speculation that is not labeled as assessment.`;
}

function buildUserPrompt({ scope, slug, title, articles }) {
  const articleText = articles.length
    ? articles.map((article, index) => {
        const date = article.pubDate ? new Date(article.pubDate).toISOString().slice(0, 10) : 'unknown-date';
        return `[${index + 1}] ${date} | ${article.source || 'unknown source'}\nTitle: ${article.title}\nSummary: ${(article.description || '').slice(0, 400)}\nURL: ${article.link || 'n/a'}`;
      }).join('\n\n')
    : 'No recent articles were available. Use only cautious, general assessment language.';

  return `Create the body content for: ${title}

Scope: ${scope === 'global' ? 'global' : `country/${slug}`}

Return HTML only. Use these sections:
- Executive Summary
- Key Developments
- Risk Assessment
- Indicators To Watch
- Source Notes

Articles:

${articleText}`;
}

function renderReportHtml({ title, body, articles }) {
  const generatedAt = new Date().toISOString();
  const sanitizedBody = sanitizeReportHtml(stripCodeFence(body));
  const sourceList = articles.slice(0, 20).map((article) => (
    `<li><a href="${escapeAttr(article.link || '#')}" rel="noopener noreferrer">${escapeHtml(article.title || 'Untitled')}</a> <span>${escapeHtml(article.source || '')}</span></li>`
  )).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/assets/style.css">
  <style>
    body { background:#05070b; color:#d7dde8; font-family:Inter, system-ui, sans-serif; margin:0; }
    main { max-width:1080px; margin:0 auto; padding:48px 24px; }
    h1, h2, h3 { color:#f8fafc; letter-spacing:.02em; }
    a { color:#7dd3fc; }
    .meta { color:#94a3b8; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:12px; margin-bottom:28px; }
    .report-body { line-height:1.65; }
    .sources { margin-top:40px; border-top:1px solid rgba(148,163,184,.25); padding-top:24px; }
    .sources span { color:#94a3b8; margin-left:8px; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Generated ${escapeHtml(generatedAt)} · Cloudflare R2/D1 backed report</div>
    <section class="report-body">${sanitizedBody}</section>
    <section class="sources">
      <h2>Source Articles</h2>
      <ol>${sourceList || '<li>No source articles attached.</li>'}</ol>
    </section>
  </main>
</body>
</html>`;
}

function stripCodeFence(value) {
  return String(value || '')
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function sanitizeReportHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
