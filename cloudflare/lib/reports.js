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
  return `You are the Conflict Mapper intelligence report engine. Write in the style of a daily OSINT watch-center product for enterprise infrastructure, security, and executive risk teams.

The target product is a compact but dense intelligence brief, not a narrative essay and not a generic news summary. Prioritize crisp assessments, operational consequences, and monitorable indicators.

Hard requirements:
- Return an HTML body fragment only. Do not return <!DOCTYPE>, <html>, <head>, <body>, markdown fences, preamble, or JSON.
- Use the provided article numbers as citations in bracket form, e.g. [3], [12].
- Distinguish reported facts from analytic assessment.
- Include risk severity labels from this exact set: CRITICAL, HIGH, MEDIUM, LOW.
- Include trajectory labels from this exact set: ESCALATING, STABLE, DE-ESCALATING.
- Write 1,200-2,200 words unless source material is sparse.
- Use the exact section structure below and preserve the class names because the renderer styles them.
- Do not invent exact casualty figures, classified intelligence, or unsupported claims.
- Keep paragraphs tight. The reference style is dense, direct, and scannable.

Use this HTML structure:
<div class="exec-summary">
  <strong>EXECUTIVE SUMMARY</strong>
  One dense paragraph summarizing the highest-impact global developments, including risk posture and operational implications.
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Global Trends</span>
    <span class="section-label">PRIORITY ANALYSIS</span>
  </div>
  <div class="trend-card">
    <div class="trend-card-head">
      <h3><span class="trend-rank">#1</span>Trend Title</h3>
      <div class="badge-row">
        <span class="risk-badge risk-critical">CRITICAL</span>
        <span class="risk-badge trajectory-escalating">ESCALATING</span>
      </div>
    </div>
    <p>Dense analytic paragraph with citations.</p>
    <div class="regions-line">REGIONS: middleEast · europe · asiaPacific</div>
  </div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Breaking Developments</span>
    <span class="section-label">LAST 72H</span>
  </div>
  <div class="panel">
    <div class="feed-row">
      <div class="feed-meta"><span class="breaking-dot">◉ BREAKING</span><span>YYYY-MM-DD</span><span>Source Name</span></div>
      <div class="feed-title">Development headline</div>
      <div class="feed-summary">One-sentence operational summary with citation.</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Areas of Concern</span>
    <span class="section-label">RISK ASSESSMENT</span>
  </div>
  <div class="panel">
    <div class="risk-row">
      <span class="risk-badge risk-high">HIGH</span>
      <div><div class="risk-location">Location or system</div><div class="risk-detail">Why it matters.</div></div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Regional Assessments</span>
    <span class="section-label">BY THEATER</span>
  </div>
  <div class="panel">
    <div class="theater-row"><div class="theater-name">middle east</div><div class="theater-assessment">Assessment.</div></div>
  </div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Near-Term Outlook</span>
    <span class="section-label">30-90 DAY FORECAST</span>
  </div>
  <div class="outlook-box">Forecast paragraph.</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Watch List</span>
    <span class="section-label">ITEMS TO MONITOR</span>
  </div>
  <div class="panel watch-panel">
    <div class="watch-row"><span>◆</span><span>Indicator to monitor</span></div>
  </div>
</div>`;
}

function buildUserPrompt({ scope, slug, title, articles }) {
  const articleText = articles.length
    ? articles.map((article, index) => {
        const date = article.pubDate ? new Date(article.pubDate).toISOString().slice(0, 10) : 'unknown-date';
        return `[${index + 1}] ${date} | ${article.source || 'unknown source'}\nTitle: ${article.title}\nSummary: ${(article.description || '').slice(0, 400)}\nURL: ${article.link || 'n/a'}`;
      }).join('\n\n')
    : 'No recent articles were available. Use only cautious, general assessment language.';

  return `Create a Conflict Mapper intelligence report body for: ${title}

Scope: ${scope === 'global' ? 'global' : `country/${slug}`}

The report must match the historical Conflict Mapper report style:
- Short classification-style executive summary.
- 5-7 Global Trends cards, ranked by impact.
- 6-10 Breaking Developments from the newest/highest-signal source articles.
- 6-10 Areas of Concern with risk badges.
- Regional Assessments by theater: europe, middle east, asia pacific, africa, americas, arctic when source material supports them.
- One Near-Term Outlook paragraph covering 30-90 days.
- 6-10 Watch List indicators suitable for alerting/monitoring dashboards.

Analytic emphasis:
- Geopolitical escalation pathways
- Military force posture and procurement signals
- Cyber, telecom, energy, logistics, and maritime infrastructure implications
- Supply chain and sanctions exposure
- Actionable indicators for monitoring dashboards and daily watchlists
- Cross-theater interaction, e.g. how Middle East escalation affects energy, shipping, cyber, and domestic security

Formatting requirements:
- Return HTML only.
- Return only the body fragment using the exact class names from the system prompt.
- Use risk badge classes: risk-critical, risk-high, risk-medium, risk-low.
- Use trajectory badge classes: trajectory-escalating, trajectory-stable, trajectory-deescalating.
- Do not use tables unless absolutely necessary. The historical format uses cards and panel rows.
- Cite source articles by bracket number throughout.
- Keep each card concise but information-rich.

Source articles:

${articleText}`;
}

function renderReportHtml({ title, body, articles }) {
  const generatedAt = new Date().toISOString();
  const generatedDate = new Date(generatedAt);
  const displayTitle = escapeHtml(title).replace(' - ', ' &mdash; ');
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background:#0a0c10;
      color:#dde2ec;
      font-family:'Inter', system-ui, sans-serif;
      font-size:14px;
      line-height:1.6;
      padding:24px;
      max-width:1100px;
      margin:0 auto;
    }
    h1, h2, h3 { font-family:'Rajdhani', sans-serif; }
    a { color:#7dd3fc; text-decoration:none; }
    a:hover { text-decoration:underline; }
    .report-header {
      border-bottom:2px solid rgba(0,200,180,.3);
      padding-bottom:24px;
      margin-bottom:32px;
    }
    .classification-bar {
      background:rgba(0,200,180,.1);
      border:1px solid rgba(0,200,180,.2);
      border-radius:4px;
      padding:6px 14px;
      display:inline-block;
      font-family:'Share Tech Mono', monospace;
      font-size:11px;
      color:#00c8b4;
      letter-spacing:2px;
      margin-bottom:16px;
    }
    .report-title {
      font-size:32px;
      font-weight:700;
      color:#00c8b4;
      letter-spacing:1px;
      margin-bottom:8px;
    }
    .meta-row {
      display:flex;
      gap:24px;
      font-family:'Share Tech Mono', monospace;
      font-size:11px;
      color:#4a5168;
      flex-wrap:wrap;
    }
    .exec-summary {
      background:rgba(0,200,180,.07);
      border-left:3px solid #00c8b4;
      padding:16px 20px;
      border-radius:0 6px 6px 0;
      font-size:15px;
      line-height:1.8;
      color:#c8d0dc;
      margin-bottom:40px;
    }
    .exec-summary strong {
      display:block;
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      color:#00c8b4;
      letter-spacing:2px;
      margin-bottom:8px;
    }
    .section { margin-bottom:40px; }
    .section-header {
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:16px;
      padding-bottom:10px;
      border-bottom:1px solid rgba(0,200,180,.15);
    }
    .section-title {
      font-size:20px;
      font-weight:700;
      color:#dde2ec;
      text-transform:uppercase;
      letter-spacing:2px;
    }
    .section-label {
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      color:#00c8b4;
      background:rgba(0,200,180,.1);
      padding:2px 8px;
      border-radius:3px;
    }
    .panel {
      background:#0f1117;
      border:1px solid rgba(255,255,255,.06);
      border-radius:6px;
      overflow:hidden;
    }
    .trend-card {
      background:#141820;
      border:1px solid rgba(0,200,180,.15);
      border-radius:6px;
      padding:20px;
      margin-bottom:16px;
    }
    .trend-card-head {
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:16px;
      margin-bottom:10px;
    }
    .trend-card h3 {
      color:#00c8b4;
      font-size:18px;
      line-height:1.25;
      flex:1;
    }
    .trend-rank { opacity:.5; margin-right:8px; }
    .trend-card p { color:#c8d0dc; line-height:1.7; margin-bottom:12px; }
    .regions-line {
      color:#8a94a8;
      font-family:'Share Tech Mono', monospace;
      font-size:11px;
    }
    .badge-row { display:flex; flex-wrap:wrap; gap:8px; flex-shrink:0; }
    .risk-badge {
      display:inline-block;
      padding:2px 8px;
      border-radius:3px;
      font-family:'Share Tech Mono', monospace;
      font-size:11px;
      letter-spacing:1px;
      white-space:nowrap;
    }
    .risk-critical { background:#ff224422; color:#ff2244; border:1px solid #ff224444; }
    .risk-high { background:#ff660022; color:#ff6600; border:1px solid #ff660044; }
    .risk-medium { background:#ffaa0022; color:#ffaa00; border:1px solid #ffaa0044; }
    .risk-low { background:#00cc8822; color:#00cc88; border:1px solid #00cc8844; }
    .trajectory-escalating { background:#ff444422; color:#ff4444; border:1px solid #ff444444; }
    .trajectory-stable { background:#aaaaaa22; color:#aaaaaa; border:1px solid #aaaaaa44; }
    .trajectory-deescalating, .trajectory-de-escalating { background:#00cc8822; color:#00cc88; border:1px solid #00cc8844; }
    .feed-row, .risk-row, .theater-row {
      padding:14px;
      border-bottom:1px solid rgba(255,255,255,.05);
    }
    .feed-row:last-child, .risk-row:last-child, .theater-row:last-child, .watch-row:last-child { border-bottom:0; }
    .feed-meta {
      display:flex;
      align-items:center;
      gap:10px;
      margin-bottom:6px;
      color:#4a5168;
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      flex-wrap:wrap;
    }
    .breaking-dot { color:#ff4466; }
    .feed-title { color:#dde2ec; font-weight:600; margin-bottom:4px; }
    .feed-summary, .risk-detail, .theater-assessment { color:#8a94a8; font-size:13px; line-height:1.6; }
    .risk-row { display:flex; gap:12px; align-items:flex-start; }
    .risk-location { color:#dde2ec; font-weight:600; margin-bottom:4px; }
    .theater-name {
      color:#00c8b4;
      font-family:'Share Tech Mono', monospace;
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:1px;
      margin-bottom:6px;
    }
    .outlook-box {
      background:#141820;
      border:1px solid rgba(0,200,180,.2);
      border-radius:6px;
      padding:20px;
      font-size:14px;
      line-height:1.8;
      color:#c8d0dc;
    }
    .watch-panel { padding:8px 16px; }
    .watch-row {
      display:flex;
      align-items:flex-start;
      gap:10px;
      padding:8px 0;
      border-bottom:1px solid rgba(255,255,255,.05);
      color:#c8d0dc;
      font-size:13px;
    }
    .watch-row span:first-child { color:#00c8b4; flex-shrink:0; margin-top:2px; }
    .sources { margin-top:40px; }
    .sources .panel { padding:8px 16px; }
    .source-list { padding-left:20px; }
    .source-list li { padding:8px 0; color:#c8d0dc; border-bottom:1px solid rgba(255,255,255,.05); }
    .source-list span { color:#8a94a8; margin-left:8px; }
    .generated-stamp {
      margin-top:48px;
      padding-top:16px;
      border-top:1px solid rgba(255,255,255,.06);
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      color:#4a5168;
      text-align:center;
    }
    @media (max-width: 700px) {
      body { padding:16px; }
      .trend-card-head { flex-direction:column; }
      .badge-row { margin-left:0; }
      .meta-row { gap:8px 18px; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="classification-bar">UNCLASSIFIED // FOR INFORMATIONAL PURPOSES</div>
    <h1 class="report-title">${displayTitle}</h1>
    <div class="meta-row">
      <span>GENERATED: ${escapeHtml(generatedDate.toUTCString())}</span>
      <span>SOURCE: AI ANALYSIS + RSS MONITORING</span>
      <span>DISTRIBUTION: UNRESTRICTED</span>
    </div>
  </div>

  ${sanitizedBody}

  <div class="section sources">
    <div class="section-header">
      <span class="section-title">Source Articles</span>
      <span class="section-label">TRACEABILITY</span>
    </div>
    <div class="panel">
      <ol class="source-list">${sourceList || '<li>No source articles attached.</li>'}</ol>
    </div>
  </div>

  <div class="generated-stamp">
    CONFLICT MAPPER - AUTO-GENERATED INTELLIGENCE BRIEF // ${escapeHtml(generatedDate.toUTCString())} // CLOUDFLARE R2/D1 BACKED // AI-ASSISTED ANALYSIS
  </div>
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
