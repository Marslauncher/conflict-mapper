import { generateReportText, getEffectiveAIConfig } from './ai.js';
import { filterArticles } from './static-data.js';

const REPORT_STATUS_KEY = 'analysis:status';
const REPORT_LOGS_KEY = 'analysis:logs:v1';
const DEFAULT_STATUS_STALE_MINUTES = 90;

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

  if (scope === 'watch') {
    return {
      currentKey: `reports/watches/${slug}/current/report.html`,
      currentPath: `/reports/watches/${slug}/current/report.html`,
      historicalPrefix: `reports/watches/${slug}/historical`,
      publicHistoricalPrefix: `/reports/watches/${slug}/historical`,
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
  const raw = await env.CONFIG_KV.get(REPORT_STATUS_KEY);
  if (!raw) return { running: false, phase: 'idle', message: 'Idle' };

  let status;
  try {
    status = JSON.parse(raw);
  } catch (err) {
    return {
      running: false,
      phase: 'invalid_status',
      message: `Stored report status is invalid JSON: ${err.message}`,
    };
  }

  if (isStaleRunningStatus(env, status)) {
    const now = new Date().toISOString();
    const staleAfterMinutes = getStatusStaleMinutes(env);
    const staleStatus = {
      ...status,
      updatedAt: now,
      running: false,
      phase: 'stale',
      progress: 100,
      staleAt: now,
      message: `Previous ${status.scope || 'analysis'} job for ${status.slug || 'unknown'} was marked stale after ${staleAfterMinutes} minutes without a status update.`,
      staleJob: {
        phase: status.phase,
        scope: status.scope,
        slug: status.slug,
        startedAt: status.startedAt,
        lastUpdatedAt: status.updatedAt,
      },
    };
    await env.CONFIG_KV.put(REPORT_STATUS_KEY, JSON.stringify(staleStatus));
    await appendReportLog(env, {
      level: 'warn',
      message: staleStatus.message,
      details: staleStatus.staleJob,
    });
    return staleStatus;
  }

  return status;
}

export async function setReportStatus(env, status) {
  if (!env.CONFIG_KV) return;
  await env.CONFIG_KV.put(REPORT_STATUS_KEY, JSON.stringify({
    updatedAt: new Date().toISOString(),
    ...status,
  }));
}

export async function resetReportStatus(env, reason = 'Manual report status reset') {
  const next = {
    running: false,
    phase: 'idle',
    progress: 0,
    message: reason,
    resetAt: new Date().toISOString(),
  };
  await setReportStatus(env, next);
  await appendReportLog(env, {
    level: 'warn',
    message: reason,
  });
  return getReportStatus(env);
}

function isStaleRunningStatus(env, status) {
  if (!status?.running) return false;
  const lastUpdate = new Date(status.updatedAt || status.startedAt || 0).getTime();
  if (!Number.isFinite(lastUpdate) || lastUpdate <= 0) return false;
  return Date.now() - lastUpdate > getStatusStaleMinutes(env) * 60 * 1000;
}

function getStatusStaleMinutes(env) {
  const configured = Number(env.REPORT_STATUS_STALE_MINUTES || 0);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_STATUS_STALE_MINUTES;
}

export async function appendReportLog(env, entry) {
  if (!env.CONFIG_KV) return;
  const raw = await env.CONFIG_KV.get(REPORT_LOGS_KEY);
  let logs = [];
  try {
    logs = raw ? JSON.parse(raw) : [];
  } catch (_) {
    logs = [];
  }
  logs.unshift({
    timestamp: new Date().toISOString(),
    level: entry.level || 'info',
    category: entry.category || 'analysis',
    message: entry.message || '',
    ...(entry.details ? { details: entry.details } : {}),
  });
  await env.CONFIG_KV.put(REPORT_LOGS_KEY, JSON.stringify(logs.slice(0, 250)));
}

export async function listReportLogs(env, limit = 100) {
  if (!env.CONFIG_KV) return [];
  const raw = await env.CONFIG_KV.get(REPORT_LOGS_KEY);
  try {
    const logs = raw ? JSON.parse(raw) : [];
    return logs.slice(0, Math.max(1, Math.min(Number(limit) || 100, 250)));
  } catch (_) {
    return [];
  }
}

export async function listReportMetadata(env, { scope = 'global', slug = 'global', limit = 50 } = {}) {
  if (!env.DB) return [];
  try {
    const result = await env.DB.prepare(`
      SELECT id, scope, slug, title, public_path AS publicPath, generated_at AS generatedAt,
             report_date AS reportDate, is_current AS isCurrent, provider, model, status
      FROM reports
      WHERE scope = ?1 AND slug = ?2
      ORDER BY is_current DESC, generated_at DESC
      LIMIT ?3
    `).bind(scope, slug, limit).all();
    return result.results || [];
  } catch (_) {
    return [];
  }
}

export async function getCurrentReportMetadata(env, scope, slug = 'global') {
  if (!env.DB) return null;
  try {
    const result = await env.DB.prepare(`
      SELECT id, scope, slug, title, storage_key AS storageKey, public_path AS publicPath,
             generated_at AS generatedAt, report_date AS reportDate, provider, model, status
      FROM reports
      WHERE scope = ?1 AND slug = ?2 AND is_current = 1
      ORDER BY generated_at DESC
      LIMIT 1
    `).bind(scope, slug).first();
    return result || null;
  } catch (_) {
    return null;
  }
}

export async function generateAndStoreReport(env, { scope = 'global', slug = 'global', articles = [] } = {}) {
  const startedAt = new Date().toISOString();
  const normalizedSlug = scope === 'global' ? 'global' : slug;
  const title = scope === 'global'
    ? `Global Intelligence Report - ${startedAt.slice(0, 10)}`
    : scope === 'watch'
      ? `${watchTitle(normalizedSlug)} - ${startedAt.slice(0, 10)}`
      : `${COUNTRY_LABELS[normalizedSlug] || normalizedSlug.toUpperCase()} Intelligence Report - ${startedAt.slice(0, 10)}`;

  await setReportStatus(env, {
    running: true,
    phase: 'generating',
    progress: 5,
    scope,
    slug: normalizedSlug,
    message: `Generating ${title}`,
    startedAt,
  });
  await appendReportLog(env, { message: `Queued ${title}`, details: { scope, slug: normalizedSlug } });

  try {
    if (!env.REPORTS_BUCKET) throw new Error('REPORTS_BUCKET binding missing');
    if (!env.DB) throw new Error('DB binding missing');
    await ensureReportSchema(env);
    const config = await getEffectiveAIConfig(env);
    const provider = config.provider;
    const model = config.providers[provider]?.model || '';

    await setReportStatus(env, {
      running: true,
      phase: 'selecting_articles',
      progress: 20,
      scope,
      slug: normalizedSlug,
      message: 'Selecting source articles',
      startedAt,
    });
    const selectedArticles = filterArticles(articles, {
      country: scope === 'country' || scope === 'watch' ? normalizedSlug : '',
      limit: 80,
    });
    await appendReportLog(env, {
      message: `Selected ${selectedArticles.length} source articles`,
      details: {
        scope,
        slug: normalizedSlug,
        selectedArticles: selectedArticles.length,
        availableArticles: articles.length,
      },
    });

    await setReportStatus(env, {
      running: true,
      phase: 'ai_generation',
      progress: 35,
      scope,
      slug: normalizedSlug,
      message: 'Calling configured AI provider',
      startedAt,
    });
    await appendReportLog(env, {
      category: 'ai',
      message: `Calling AI provider ${provider}${model ? ` / ${model}` : ''}`,
      details: { scope, slug: normalizedSlug, provider, model, selectedArticles: selectedArticles.length },
    });
    const aiText = await generateReportText(
      env,
      buildSystemPrompt(scope),
      buildUserPrompt({ scope, slug: normalizedSlug, title, articles: selectedArticles }),
    );
    await appendReportLog(env, {
      category: 'ai',
      message: 'AI provider returned report body',
      details: { scope, slug: normalizedSlug, provider, model, bodyCharacters: aiText.length },
    });

    await setReportStatus(env, {
      running: true,
      phase: 'rendering',
      progress: 70,
      scope,
      slug: normalizedSlug,
      message: 'Rendering report HTML',
      startedAt,
    });
    const html = renderReportHtml({ title, scope, slug: normalizedSlug, body: aiText, articles: selectedArticles });
    const paths = reportPaths(scope, normalizedSlug);
    await appendReportLog(env, {
      message: 'Rendered report HTML',
      details: { scope, slug: normalizedSlug, htmlCharacters: html.length, currentKey: paths.currentKey },
    });

    await setReportStatus(env, {
      running: true,
      phase: 'storing',
      progress: 85,
      scope,
      slug: normalizedSlug,
      message: 'Archiving current report and writing R2 object',
      startedAt,
    });
    await appendReportLog(env, {
      message: 'Archiving previous report and writing current R2 object',
      details: { scope, slug: normalizedSlug, currentKey: paths.currentKey },
    });
    await archiveCurrentReport(env, scope, normalizedSlug, paths);

    await env.REPORTS_BUCKET.put(paths.currentKey, html, {
      httpMetadata: { contentType: 'text/html; charset=utf-8' },
      customMetadata: { scope, slug: normalizedSlug, generatedAt: startedAt },
    });
    await appendReportLog(env, {
      message: 'R2 report object written',
      details: { scope, slug: normalizedSlug, currentKey: paths.currentKey, bytes: html.length },
    });

    const currentId = crypto.randomUUID();
    await setReportStatus(env, {
      running: true,
      phase: 'writing_metadata',
      progress: 92,
      scope,
      slug: normalizedSlug,
      message: 'Writing D1 report metadata',
      startedAt,
    });
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
      provider,
      model,
      JSON.stringify({ articleCount: selectedArticles.length }),
    ).run();
    await appendReportLog(env, {
      message: 'D1 report metadata written',
      details: { scope, slug: normalizedSlug, id: currentId, path: paths.currentPath },
    });

    await setReportStatus(env, {
      running: false,
      phase: 'complete',
      progress: 100,
      scope,
      slug: normalizedSlug,
      message: `Generated ${title}`,
      lastRun: new Date().toISOString(),
      lastResult: { id: currentId, path: paths.currentPath, articleCount: selectedArticles.length },
    });
    await appendReportLog(env, {
      message: `Generated ${title}`,
      details: { id: currentId, path: paths.currentPath, articleCount: selectedArticles.length },
    });

    return { id: currentId, title, path: paths.currentPath, articleCount: selectedArticles.length };
  } catch (err) {
    const failure = describeReportFailure(err);
    await setReportStatus(env, {
      running: false,
      phase: 'failed',
      progress: 100,
      scope,
      slug: normalizedSlug,
      message: failure.message,
      mitigation: failure.mitigation,
      errorType: failure.type,
      lastRun: new Date().toISOString(),
    });
    await appendReportLog(env, {
      level: 'error',
      message: `Report generation failed: ${failure.message}`,
      details: { scope, slug: normalizedSlug, mitigation: failure.mitigation, type: failure.type },
    });
    throw err;
  }
}

function describeReportFailure(err) {
  const message = err?.message || String(err || 'Unknown report generation error');
  const lower = message.toLowerCase();
  if (lower.includes('reports_bucket')) {
    return {
      type: 'cloudflare_binding',
      message,
      mitigation: 'Bind the R2 bucket as REPORTS_BUCKET in Cloudflare Pages production settings and redeploy.',
    };
  }
  if (lower.includes('db binding')) {
    return {
      type: 'cloudflare_binding',
      message,
      mitigation: 'Bind the D1 database as DB in Cloudflare Pages production settings, apply migrations, and redeploy.',
    };
  }
  if (lower.includes('no such table') || lower.includes('d1_error') || lower.includes('reports table missing')) {
    return {
      type: 'd1_schema',
      message,
      mitigation: 'Run the D1 migrations against the production database, then retry generation.',
    };
  }
  if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401')) {
    return {
      type: 'ai_credentials',
      message,
      mitigation: 'Open Settings > AI Config, save the provider API key, run Test Connection, then retry the report.',
    };
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
    return {
      type: 'ai_quota',
      message,
      mitigation: 'The AI provider rejected the request due to quota or rate limits. Check provider billing/limits or select a different model.',
    };
  }
  if (lower.includes('max_tokens') || lower.includes('max token')) {
    return {
      type: 'ai_model_settings',
      message,
      mitigation: 'The selected model rejected the token settings. Choose a standard chat/report model or reduce requested output size.',
    };
  }
  if (lower.includes('<!doctype') || lower.includes('not valid json')) {
    return {
      type: 'unexpected_html_response',
      message,
      mitigation: 'An API call returned an HTML error page instead of JSON. Check the endpoint URL, Cloudflare bindings, and provider/model selection.',
    };
  }
  return {
    type: 'unknown',
    message,
    mitigation: 'Review the latest analysis log entry, verify Cloudflare bindings and AI provider config, then retry.',
  };
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

async function ensureReportSchema(env) {
  const row = await env.DB.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reports'
  `).first();
  if (!row?.name) {
    throw new Error('D1 reports table missing. Run the production D1 migrations before generating reports.');
  }
}

function watchTitle(slug) {
  if (slug === 'taiwan') return 'China/Taiwan Threat Watch';
  return `${COUNTRY_LABELS[slug] || slug.toUpperCase()} Threat Watch`;
}

export function buildSystemPrompt(scope = 'global') {
  const watchInstruction = scope === 'watch'
    ? '- This is a threat watch product. Emphasize warning indicators, likely escalation paths, PLA/ROC/US/Japan posture, maritime/air activity, cyber/economic pressure, and collection gaps.\n'
    : '';
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
${watchInstruction}

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

export function buildUserPrompt({ scope, slug, title, articles }) {
  const articleText = articles.length
    ? articles.map((article, index) => {
        const date = article.pubDate ? new Date(article.pubDate).toISOString().slice(0, 10) : 'unknown-date';
        return `[${index + 1}] ${date} | ${article.source || 'unknown source'}\nTitle: ${article.title}\nSummary: ${(article.description || '').slice(0, 400)}\nURL: ${article.link || 'n/a'}`;
      }).join('\n\n')
    : 'No recent articles were available. Use only cautious, general assessment language.';

  const scopeLine = scope === 'global' ? 'global' : scope === 'watch' ? `watch/${slug}` : `country/${slug}`;
  const sectionTarget = scope === 'watch'
    ? `- 5-7 Watch Trends ranked by threat relevance.
- 6-10 Breaking Developments focused on China/Taiwan and related regional security signals.
- 6-10 Warning Indicators and Areas of Concern.
- Regional Assessments by theater: Taiwan Strait, South China Sea, Japan/Ryukyu arc, Philippines, US Indo-Pacific posture, cyber/information operations.
- One Near-Term Outlook paragraph covering 30-90 days.
- 8-12 Watch List indicators suitable for alerting/monitoring dashboards.`
    : `- 5-7 Global Trends cards, ranked by impact.
- 6-10 Breaking Developments from the newest/highest-signal source articles.
- 6-10 Areas of Concern with risk badges.
- Regional Assessments by theater: europe, middle east, asia pacific, africa, americas, arctic when source material supports them.
- One Near-Term Outlook paragraph covering 30-90 days.
- 6-10 Watch List indicators suitable for alerting/monitoring dashboards.`;

  return `Create a Conflict Mapper intelligence report body for: ${title}

Scope: ${scopeLine}

The report must match the historical Conflict Mapper report style:
- Short classification-style executive summary.
${sectionTarget}

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

export function getReportPromptTemplates() {
  const date = 'YYYY-MM-DD';
  const sampleDate = '2026-01-01';
  const sampleArticles = [
    {
      pubDate: `${sampleDate}T00:00:00.000Z`,
      source: 'Source Name',
      title: 'Source article headline goes here',
      description: 'One to three sentence source summary, preferably translated to English and preserving operationally relevant detail.',
      link: 'https://example.com/source-article',
    },
    {
      pubDate: `${sampleDate}T00:00:00.000Z`,
      source: 'Second Source',
      title: 'Second source article headline goes here',
      description: 'Additional source summary used for cross-checking and citations.',
      link: 'https://example.com/second-source',
    },
  ];
  const templates = [
    {
      id: 'global',
      label: 'Global Analysis Report',
      scope: 'global',
      slug: 'global',
      title: `Global Intelligence Report - ${date}`,
    },
    {
      id: 'country',
      label: 'Country Dossier Report',
      scope: 'country',
      slug: 'usa',
      title: `United States Intelligence Report - ${date}`,
    },
    {
      id: 'watch-taiwan',
      label: 'China/Taiwan Threat Watch',
      scope: 'watch',
      slug: 'taiwan',
      title: `China/Taiwan Threat Watch - ${date}`,
    },
  ];

  return templates.map((template) => {
    const systemPrompt = buildSystemPrompt(template.scope);
    const userPrompt = buildUserPrompt({
      scope: template.scope,
      slug: template.slug,
      title: template.title,
      articles: sampleArticles,
    });
    return {
      ...template,
      systemPrompt,
      userPrompt,
      fullPrompt: `${systemPrompt}\n\n${userPrompt}`,
      importNotes: [
        'Return only the HTML body fragment requested by the prompt.',
        'Save the generated fragment inside the existing report HTML wrapper or use the app report renderer.',
        'Preserve citation numbers in bracket form and include source URLs in the Source Articles section.',
      ],
    };
  });
}

function renderReportHtml({ title, body, articles }) {
  const generatedAt = new Date().toISOString();
  const generatedDate = new Date(generatedAt);
  const displayTitle = escapeHtml(title).replace(' - ', ' &mdash; ');
  const sanitizedBody = sanitizeReportHtml(stripCodeFence(body));
  const mapMarkers = buildMapMarkers(articles);
  const topicLinks = buildTopicLinks(title, articles);
  const sourceList = articles.slice(0, 20).map((article) => (
    `<li><a href="${escapeAttr(article.link || '#')}" rel="noopener noreferrer">${escapeHtml(article.title || 'Untitled')}</a> <span>${escapeHtml(article.source || '')}</span></li>`
  )).join('');
  const topicList = topicLinks.map((link) => `<a class="topic-link" href="${escapeAttr(link.href)}" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIINfQPD+0DgM52rONKgrLqMEw3u96rBKUE=" crossorigin="">
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
    .article-map {
      height:360px;
      border:1px solid rgba(0,200,180,.2);
      border-radius:6px;
      overflow:hidden;
      background:#05070a;
    }
    .leaflet-container { background:#05070a; font-family:'Inter', system-ui, sans-serif; }
    .leaflet-popup-content-wrapper, .leaflet-popup-tip { background:#111722; color:#dde2ec; }
    .leaflet-popup-content a { color:#7dd3fc; }
    .topic-grid {
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      padding:16px;
    }
    .topic-link {
      display:inline-flex;
      border:1px solid rgba(0,200,180,.18);
      background:rgba(0,200,180,.07);
      border-radius:4px;
      padding:8px 10px;
      font-family:'Share Tech Mono', monospace;
      font-size:11px;
      letter-spacing:.6px;
      text-transform:uppercase;
    }
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

  <div class="section">
    <div class="section-header">
      <span class="section-title">Source Map</span>
      <span class="section-label">${mapMarkers.length} GEO-TAGGED ITEMS</span>
    </div>
    <div id="report-map" class="article-map"></div>
  </div>

  <div class="section sources">
    <div class="section-header">
      <span class="section-title">Source Articles</span>
      <span class="section-label">TRACEABILITY</span>
    </div>
    <div class="panel">
      <ol class="source-list">${sourceList || '<li>No source articles attached.</li>'}</ol>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <span class="section-title">Further Reading</span>
      <span class="section-label">TOPIC LINKS</span>
    </div>
    <div class="panel">
      <div class="topic-grid">${topicList}</div>
    </div>
  </div>

  <div class="generated-stamp">
    CONFLICT MAPPER - AUTO-GENERATED INTELLIGENCE BRIEF // ${escapeHtml(generatedDate.toUTCString())} // CLOUDFLARE R2/D1 BACKED // AI-ASSISTED ANALYSIS
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    const reportMarkers = ${safeJson(mapMarkers)};
    const mapEl = document.getElementById('report-map');
    if (mapEl && window.L) {
      const map = L.map(mapEl, { scrollWheelZoom: false, worldCopyJump: true }).setView([20, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 8,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      const points = [];
      for (const marker of reportMarkers) {
        const lat = Number(marker.lat);
        const lng = Number(marker.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        points.push([lat, lng]);
        L.circleMarker([lat, lng], {
          radius: 7,
          color: '#00c8b4',
          fillColor: '#00c8b4',
          fillOpacity: 0.75,
          weight: 1
        }).addTo(map).bindPopup(
          '<strong>' + escapePopup(marker.title) + '</strong><br>' +
          '<span>' + escapePopup(marker.place || marker.country || 'Location') + '</span><br>' +
          '<a href="' + encodeURI(marker.link || '#') + '" target="_blank" rel="noopener noreferrer">Open source</a>'
        );
      }
      if (points.length > 1) map.fitBounds(points, { padding: [28, 28] });
      if (points.length === 1) map.setView(points[0], 5);
    }
    function escapePopup(value) {
      return String(value || '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    }
  </script>
</body>
</html>`;
}

function buildMapMarkers(articles) {
  return articles
    .map((article) => ({
      lat: Number(article.lat ?? article.geo?.lat),
      lng: Number(article.lng ?? article.geo?.lng),
      title: String(article.title || 'Untitled').slice(0, 160),
      link: article.link || '#',
      source: article.source || '',
      place: article.geo?.place || article.location || '',
      country: article.country || article.geo?.country || '',
    }))
    .filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng))
    .slice(0, 60);
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function buildTopicLinks(title, articles) {
  const topics = new Set();
  topics.add(title.replace(/\s+-\s+.+$/, ''));
  for (const article of articles.slice(0, 30)) {
    for (const tag of article.tags || []) topics.add(tag);
    if (article.category) topics.add(article.category);
    if (article.geo?.place) topics.add(article.geo.place);
  }

  const values = Array.from(topics)
    .map((topic) => String(topic || '').trim())
    .filter((topic) => topic.length > 2)
    .slice(0, 14);

  return values.map((topic) => ({
    label: topic,
    href: `https://news.google.com/search?q=${encodeURIComponent(`${topic} geopolitics security`)}`,
  }));
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
