import { generateReportText, getEffectiveAIConfig, getReportGenerationModel } from './ai.js';

const REPORT_STATUS_KEY = 'analysis:status';
const REPORT_LOGS_KEY = 'analysis:logs:v1';
const DEFAULT_STATUS_STALE_MINUTES = 5;
const PROMPT_STORAGE_PREFIX = 'prompts/';
const REPORT_ARTICLE_LIMIT = 80;
const DEFAULT_REPORT_AI_ARTICLE_LIMIT = 24;
const SOURCE_BRIEF_WINDOW_HOURS = 24;
const SOURCE_BRIEF_ARTICLE_LIMIT = 80;

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
  'korean-peninsula': 'Korean Peninsula',
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
    await safeKvPut(env.CONFIG_KV, REPORT_STATUS_KEY, JSON.stringify(staleStatus));
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
  await safeKvPut(env.CONFIG_KV, REPORT_STATUS_KEY, JSON.stringify({
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
  try {
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
    await safeKvPut(env.CONFIG_KV, REPORT_LOGS_KEY, JSON.stringify(logs.slice(0, 250)));
  } catch (err) {
    console.warn(`Report log write skipped: ${err.message}`);
  }
}

async function safeKvPut(kv, key, value, options) {
  try {
    await kv.put(key, value, options);
    return true;
  } catch (err) {
    console.warn(`KV write skipped for ${key}: ${err.message}`);
    return false;
  }
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

export async function generateAndStoreReport(env, { scope = 'global', slug = 'global', articles = [], promptId = '' } = {}) {
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
    const configuredModel = config.providers[provider]?.model || '';
    const model = getReportGenerationModel(provider, configuredModel);
    if (model !== configuredModel) {
      await appendReportLog(env, {
        level: 'warn',
        category: 'ai',
        message: `Using ${model} for live report generation instead of ${configuredModel}`,
        details: {
          provider,
          configuredModel,
          reportModel: model,
          mitigation: 'Deep-research models are too slow for synchronous Cloudflare Pages report requests. Use sonar-pro for live generation.',
        },
      });
    }

    await setReportStatus(env, {
      running: true,
      phase: 'selecting_articles',
      progress: 20,
      scope,
      slug: normalizedSlug,
      message: 'Selecting source articles',
      startedAt,
    });
    const selection = selectReportArticles(articles, {
      scope,
      slug: normalizedSlug,
      limit: REPORT_ARTICLE_LIMIT,
    });
    const selectedArticles = selection.articles;
    const sourceBrief = buildSourceBrief({
      scope,
      slug: normalizedSlug,
      articles: selection.priorWindowArticles,
      generatedAt: startedAt,
    });
    const aiArticles = selectedArticles.slice(0, getReportAiArticleLimit(env, selectedArticles.length));
    await appendReportLog(env, {
      message: `Selected ${selectedArticles.length} source articles`,
      details: {
        scope,
        slug: normalizedSlug,
        selectedArticles: selectedArticles.length,
        sourceBriefArticles: sourceBrief.articleCount,
        sourceBriefWindowHours: SOURCE_BRIEF_WINDOW_HOURS,
        aiArticles: aiArticles.length,
        availableArticles: articles.length,
        excludedLowRelevance: selection.excludedLowRelevance,
        excludedStale: selection.excludedStale,
        newestArticle: selectedArticles[0]?.pubDate || selectedArticles[0]?.fetchedAt || null,
        oldestArticle: selectedArticles[selectedArticles.length - 1]?.pubDate || selectedArticles[selectedArticles.length - 1]?.fetchedAt || null,
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
      details: {
        scope,
        slug: normalizedSlug,
        provider,
        model,
        promptId,
        selectedArticles: selectedArticles.length,
        aiArticles: aiArticles.length,
      },
    });
    let aiText = '';
    let aiFallback = false;
    try {
      const prompts = await resolveGenerationPrompts(env, {
        scope,
        slug: normalizedSlug,
        title,
        articles: aiArticles,
        sourceBrief: sourceBrief.text,
        promptId,
      });
      aiText = await generateReportText(
        env,
        prompts.systemPrompt,
        prompts.userPrompt,
      );
    } catch (err) {
      const allowFallback = env.ALLOW_REPORT_FALLBACK !== 'false';
      const failure = describeReportFailure(err);
      await appendReportLog(env, {
        level: 'error',
        category: 'ai',
        message: `AI provider failed: ${failure.message}`,
        details: { scope, slug: normalizedSlug, provider, model, promptId, mitigation: failure.mitigation, type: failure.type },
      });
      if (!allowFallback) throw err;

      aiFallback = true;
      await setReportStatus(env, {
        running: true,
        phase: 'fallback_rendering',
        progress: 58,
        scope,
        slug: normalizedSlug,
        message: 'AI provider failed; rendering source-based interim report',
        mitigation: failure.mitigation,
        errorType: failure.type,
        startedAt,
      });
      aiText = generateFallbackReportBody({
        title,
        scope,
        slug: normalizedSlug,
        articles: selectedArticles,
        error: failure.message,
      });
      await appendReportLog(env, {
        level: 'warn',
        category: 'analysis',
        message: 'Using source-based interim report renderer',
        details: {
          scope,
          slug: normalizedSlug,
          provider,
          model,
          promptId,
          selectedArticles: selectedArticles.length,
          aiArticles: aiArticles.length,
        },
      });
    }
    const formatResult = normalizeReportBody({
      body: aiText,
      title,
      scope,
      slug: normalizedSlug,
      articles: selectedArticles,
      aiFallback,
    });
    aiText = formatResult.body;
    if (formatResult.changed) {
      await appendReportLog(env, {
        level: formatResult.fallback ? 'warn' : 'info',
        category: 'analysis',
        message: formatResult.message,
        details: {
          scope,
          slug: normalizedSlug,
          provider,
          model,
          promptId,
          fallback: formatResult.fallback,
        },
      });
    }

    await appendReportLog(env, {
      category: 'ai',
      message: aiFallback ? 'Fallback report body generated' : 'AI provider returned report body',
      details: {
        scope,
        slug: normalizedSlug,
        provider,
        model,
        promptId,
        selectedArticles: selectedArticles.length,
        aiArticles: aiArticles.length,
        bodyCharacters: aiText.length,
        aiFallback,
        formatNormalized: formatResult.changed,
      },
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
      JSON.stringify({ articleCount: selectedArticles.length, aiFallback, promptId }),
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
      lastResult: { id: currentId, path: paths.currentPath, articleCount: selectedArticles.length, aiFallback, promptId },
    });
    await appendReportLog(env, {
      message: `Generated ${title}`,
      details: { id: currentId, path: paths.currentPath, articleCount: selectedArticles.length, aiFallback, promptId },
    });

    return { id: currentId, title, path: paths.currentPath, articleCount: selectedArticles.length, aiFallback, promptId };
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
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return {
      type: 'ai_timeout',
      message,
      mitigation: 'The AI provider did not return before the report timeout. Reduce REPORT_AI_ARTICLE_LIMIT, increase REPORT_AI_TIMEOUT_MS, or use a faster provider/model.',
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
  if (slug === 'korean-peninsula' || slug === 'korea') return 'Korean Peninsula Threat Watch';
  return `${COUNTRY_LABELS[slug] || slug.toUpperCase()} Threat Watch`;
}

function selectReportArticles(articles, { scope = 'global', slug = 'global', limit = REPORT_ARTICLE_LIMIT } = {}) {
  const input = Array.isArray(articles) ? articles : [];
  const now = Date.now();
  const scored = input
    .map((article) => ({
      article,
      score: reportArticleScore(article, { scope, slug, now }),
      ageDays: articleAgeDays(article, now),
      storyKey: reportStoryKey(article),
    }))
    .filter((item) => scope === 'global' || item.score.countryMatch);
  const recentScored = scored.filter((item) => item.ageDays <= SOURCE_BRIEF_WINDOW_HOURS / 24);
  const priorWindowArticles = scored
    .filter((item) => item.ageDays <= SOURCE_BRIEF_WINDOW_HOURS / 24)
    .sort((a, b) => articleTimestamp(b.article) - articleTimestamp(a.article)
      || b.score.value - a.score.value)
    .slice(0, SOURCE_BRIEF_ARTICLE_LIMIT)
    .map((item) => ({
      ...item.article,
      relevanceScore: item.score.value,
    }));

  const primaryThreshold = scope === 'global' ? 12 : 8;
  const fallbackThreshold = scope === 'global' ? 8 : 5;

  let selected = pickRankedArticles(recentScored, {
    limit,
    minScore: primaryThreshold,
    maxAgeDays: SOURCE_BRIEF_WINDOW_HOURS / 24,
    maxCategoryShare: globalCategoryShare(scope),
  });

  if (selected.length < Math.min(24, limit)) {
    selected = pickRankedArticles(recentScored, {
      limit,
      minScore: fallbackThreshold,
      maxAgeDays: SOURCE_BRIEF_WINDOW_HOURS / 24,
      maxCategoryShare: globalCategoryShare(scope),
    });
  }

  if (selected.length < Math.min(12, limit)) {
    selected = pickRankedArticles(recentScored, {
      limit,
      minScore: 1,
      maxAgeDays: SOURCE_BRIEF_WINDOW_HOURS / 24,
      maxCategoryShare: globalCategoryShare(scope),
    });
  }

  const selectedSet = new Set(selected.map((item) => item.article));
  return {
    articles: selected.map((item) => ({
      ...item.article,
      relevanceScore: item.score.value,
    })),
    priorWindowArticles,
    excludedLowRelevance: scored.filter((item) => !selectedSet.has(item.article) && item.score.value < fallbackThreshold).length,
    excludedStale: scored.filter((item) => !selectedSet.has(item.article) && item.ageDays > SOURCE_BRIEF_WINDOW_HOURS / 24).length,
  };
}

function getReportAiArticleLimit(env, selectedCount = REPORT_ARTICLE_LIMIT) {
  const configured = Number(env.REPORT_AI_ARTICLE_LIMIT || 0);
  const limit = Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_REPORT_AI_ARTICLE_LIMIT;
  return Math.min(Math.max(12, Math.floor(limit)), REPORT_ARTICLE_LIMIT, Math.max(1, selectedCount));
}

function globalCategoryShare(scope) {
  return scope === 'global' ? 0.35 : 0.75;
}

function pickRankedArticles(scored, { limit, minScore, maxAgeDays, maxCategoryShare = 0.75 }) {
  const seenStories = new Set();
  const candidates = scored
    .filter((item) => item.score.value >= minScore && item.ageDays <= maxAgeDays)
    .sort((a, b) => b.score.value - a.score.value
      || articleTimestamp(b.article) - articleTimestamp(a.article))
    .filter((item) => {
      if (!item.storyKey) return true;
      if (seenStories.has(item.storyKey)) return false;
      seenStories.add(item.storyKey);
      return true;
    });
  return limitReportConcentration(candidates, Math.max(1, limit), { maxCategoryShare });
}

function limitReportConcentration(items, limit, { maxSourceShare = 0.22, maxCategoryShare = 0.75, minPerSource = 2, minPerCategory = 3 } = {}) {
  const output = [];
  const used = new Set();
  const sourceCounts = new Map();
  const categoryCounts = new Map();
  const maxPerSource = Math.max(minPerSource, Math.ceil(limit * maxSourceShare));
  const maxPerCategory = Math.max(minPerCategory, Math.ceil(limit * maxCategoryShare));

  for (const item of items) {
    if (output.length >= limit) break;
    const source = sourceKey(item.article);
    const category = categoryKey(item.article);
    const count = sourceCounts.get(source) || 0;
    const categoryCount = categoryCounts.get(category) || 0;
    if (count >= maxPerSource) continue;
    if (categoryCount >= maxPerCategory) continue;
    output.push(item);
    used.add(item);
    sourceCounts.set(source, count + 1);
    categoryCounts.set(category, categoryCount + 1);
  }

  for (const item of items) {
    if (output.length >= limit) break;
    if (used.has(item)) continue;
    output.push(item);
  }

  return output;
}

function sourceKey(article) {
  return String(article?.source || article?.thinkTank || article?.publisher || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') || 'unknown';
}

function categoryKey(article) {
  return String(article?.category || 'general')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') || 'general';
}

function reportArticleScore(article, { scope, slug, now }) {
  const text = reportSearchText(article);
  const ageDays = articleAgeDays(article, now);
  const category = String(article.category || '').toLowerCase();
  const source = String(article.source || '').toLowerCase();
  const tags = (article.tags || []).map((tag) => String(tag).toLowerCase());
  let value = 0;

  if (ageDays <= 1) value += 12;
  else if (ageDays <= 3) value += 10;
  else if (ageDays <= 7) value += 8;
  else if (ageDays <= 14) value += 5;
  else if (ageDays <= 30) value += 2;
  else if (ageDays > 90) value -= 18;
  else if (ageDays > 45) value -= 8;

  const weightedTerms = [
    [/(\bwar\b|\binvasion\b|\bescalat|\bairstrike\b|\bmissile\b|\bdrone\b|\bartillery\b|\bshelling\b|\boffensive\b|\bfrontline\b|\bstrike\b)/, 10],
    [/(\bmilitary\b|\btroops?\b|\bforce posture\b|\bnaval\b|\bwarship\b|\bsubmarine\b|\bweapons?\b|\bdefen[cs]e\b|\bprocurement\b|\bmunitions?\b)/, 8],
    [/(\bnuclear\b|\buranium\b|\biaea\b|\bwmd\b|\balliance\b|\bnato\b|\bsanctions?\b|\bexport controls?\b)/, 8],
    [/(\bcyberattack\b|\bransomware\b|\bmalware\b|\bzero-day\b|\bsabotage\b|\bcritical infrastructure\b|\bpower grid\b|\btelecom\b|\bsubsea cable\b|\bpipeline\b|\bport\b)/, 7],
    [/(\btaiwan strait\b|\bsouth china sea\b|\bred sea\b|\bblack sea\b|\bstrait of hormuz\b|\bgaza\b|\biran\b|\bisrael\b|\bukraine\b|\brussia\b|\bchina\b|\bnorth korea\b|\bhouthi\b|\bhezbollah\b|\bhamas\b)/, 7],
    [/(\bthink tank\b|\breport\b|\banalysis\b|\bbriefing\b|\bcsis\b|\brusi\b|\brand\b|\bisw\b|\biiss\b|\batlantic council\b|\barms control\b)/, 4],
  ];
  for (const [regex, weight] of weightedTerms) {
    if (regex.test(text)) value += weight;
  }

  if (['military', 'conflict', 'geopolitics', 'cyber', 'infrastructure', 'nuclear', 'terrorism', 'maritime', 'energy'].includes(category)) value += 7;
  else if (['political', 'economic', 'technology', 'breaking'].includes(category)) value += 3;

  if (tags.some((tag) => ['military', 'conflict', 'geopolitics', 'cyber', 'infrastructure', 'nuclear', 'terrorism', 'maritime', 'energy', 'taiwan', 'china', 'russia', 'ukraine', 'iran', 'israel', 'north korea', 'south korea', 'korea', 'dprk', 'rok', 'usfk'].includes(tag))) {
    value += 4;
  }

  if (/(semiconductor|chip|export control|rare earth|supply chain|shipping lane|maritime|defence industrial|defense industrial)/.test(text)) {
    value += 6;
  }

  if (/(defence|defense|military|war|arms control|foreign affairs|csis|rusi|rand|isw|iiss|atlantic council|reuters|associated press|bbc world|al jazeera|france 24|financial times world|south china morning post)/.test(source)) {
    value += 3;
  }

  const hardSignal = hasHardSecuritySignal(text);
  const noiseTerms = /(\bcelebrity\b|\bentertainment\b|\bsports?\b|\broyal\b|\bfashion\b|\bhome loan\b|\bcash back\b|\bcredit card\b|\bhoroscope\b|\bnicola sturgeon\b|\bfirst minister\b|\bfederal judge\b|\bastronaut\b|\bmoon mission\b|\bceos?\b.*\bresign|\bresign.*\bceos?\b)/;
  if (noiseTerms.test(text) && !hasHardSecuritySignal(text)) value -= 18;
  if (scope === 'global' && !hardSignal && !/(semiconductor|chip|export control|supply chain|shipping|sanctions?|think tank|arms control|foreign policy|defen[cs]e industrial)/.test(text)) {
    value -= 10;
  }

  const countryMatch = scope === 'global' || reportArticleMatchesScope(article, slug);
  if (scope !== 'global' && countryMatch) value += 8;

  return { value, countryMatch };
}

function reportArticleMatchesScope(article, slug) {
  const normalized = String(slug || '').toLowerCase();
  if (normalized === 'korea' || normalized === 'korean-peninsula') {
    return isKoreaReportArticle(article);
  }
  if (normalized === 'north-korea') {
    const text = reportSearchText(article);
    return /(north korea|dprk|pyongyang|kim jong un|kim yo jong|yongbyon|punggye|sinpo|sohae)/.test(text);
  }
  const text = reportSearchText(article);
  return reportCountryAliases(slug).some((alias) => text.includes(alias));
}

function isKoreaReportArticle(article) {
  const primary = ` ${[
    article.title,
    article.country,
    article.geo?.place,
    article.geo?.country,
    ...(article.tags || []),
  ].filter(Boolean).join(' ').toLowerCase()} `;
  const text = reportSearchText(article);
  const title = String(article.title || '').toLowerCase();
  const highConfidence = /(north korea|dprk|pyongyang|korean peninsula|kim jong un|kim yo jong|\bdmz\b|\busfk\b|yongbyon|punggye|sinpo|sohae|kaesong|panmunjom|38th parallel|freedom shield|ulchi freedom shield|inter-korean|korean war)/;
  const southKorea = /(south korea|\brok\b|seoul|incheon|busan|kunsan|osan|camp humphreys)/;
  const securityContext = /(missile|nuclear|artillery|military|defen[cs]e|drill|exercise|cyber|sanction|border|alliance|deterrence|troops?|war|weapon|drone|satellite|submarine|readiness|posture|provocation|shelling|launch)/;
  const taiwanTitle = /(taiwan|taipei|taiwan strait)/.test(title);
  const otherTheaterTitle = /(strait of hormuz|hormuz|iran|gaza|israel|ukraine|red sea|houthi|black sea|south china sea|taiwan|taipei|taiwan strait)/.test(title);
  const koreaTitle = highConfidence.test(title);
  if (taiwanTitle) return false;
  if (otherTheaterTitle && !koreaTitle) return false;
  if (highConfidence.test(primary)) return true;
  if (highConfidence.test(text) && securityContext.test(text)) return true;
  if (southKorea.test(primary) && securityContext.test(text) && !taiwanTitle) return true;
  const koreaMentions = (text.match(/north korea|south korea|korean peninsula|\bdprk\b|\brok\b|pyongyang|seoul|\bdmz\b|\busfk\b/g) || []).length;
  return koreaMentions >= 2 && securityContext.test(text) && !taiwanTitle;
}

function hasHardSecuritySignal(text) {
  return /(\bwar\b|\bmilitary\b|\bmissile\b|\bweapon\b|\bairstrike\b|\bnuclear\b|\bterror\b|\bsanction\b|\bcyberattack\b|\bcritical infrastructure\b|\btaiwan strait\b|\biran\b|\bukraine\b|\brussia\b|\bgaza\b|\bnato\b|\bdrone\b|\bnaval\b|\bsubmarine\b|\bmunitions?\b|\bfrontline\b)/.test(text);
}

function reportSearchText(article) {
  return ` ${[
    article.title,
    article.description,
    article.source,
    article.category,
    article.country,
    article.geo?.place,
    article.geo?.country,
    ...(article.tags || []),
  ].filter(Boolean).join(' ').toLowerCase()} `;
}

function articleAgeDays(article, now = Date.now()) {
  const time = articleTimestamp(article);
  if (!Number.isFinite(time) || time <= 0) return 3650;
  return Math.max(0, (now - time) / 86_400_000);
}

function articleTimestamp(article) {
  const value = article?.pubDate || article?.publishedAt || article?.date || article?.fetchedAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function reportStoryKey(article) {
  const value = String(article.title || article.link || '').toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!value) return '';
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'after', 'before', 'says', 'said', 'new', 'live', 'news', 'update', 'updates', 'analysis', 'report', 'a', 'an', 'to', 'of', 'in', 'on', 'as', 'by', 'at', 'is', 'are', 'be', 'was', 'were']);
  const tokens = value.split(' ').filter((token) => token.length > 2 && !stop.has(token)).slice(0, 18);
  return tokens.length < 3 ? value.slice(0, 100) : tokens.sort().slice(0, 12).join('|');
}

function reportCountryAliases(slug) {
  const normalized = String(slug || '').toLowerCase();
  const map = {
    usa: [' usa ', ' us ', 'united states', 'u.s.', 'u.s', 'america', 'washington', 'pentagon'],
    china: ['china', 'chinese', 'beijing', 'pla'],
    russia: ['russia', 'russian', 'moscow'],
    ukraine: ['ukraine', 'kyiv', 'kiev'],
    taiwan: ['taiwan', 'taipei', 'taiwan strait'],
    iran: ['iran', 'tehran'],
    israel: ['israel', 'gaza', 'tel aviv', 'jerusalem'],
    india: ['india', 'new delhi'],
    pakistan: ['pakistan', 'islamabad'],
    'north-korea': ['north korea', 'dprk', 'pyongyang'],
    'korean-peninsula': ['korean peninsula', 'north korea', 'south korea', 'dprk', 'rok', 'pyongyang', 'seoul', 'dmz', 'usfk', 'yongbyon', 'punggye', 'sinpo', 'sohae', 'freedom shield', 'korean'],
    korea: ['korean peninsula', 'north korea', 'south korea', 'dprk', 'rok', 'pyongyang', 'seoul', 'dmz', 'usfk', 'yongbyon', 'punggye', 'sinpo', 'sohae', 'freedom shield', 'korean'],
    nato: ['nato', 'brussels', 'alliance'],
  };
  return map[normalized] || [normalized.replace(/-/g, ' '), normalized];
}

export function buildSystemPrompt(scope = 'global') {
  const watchInstruction = scope === 'watch'
    ? `- This is a threat watch product. Emphasize warning indicators, likely escalation paths, military posture, cyber/information pressure, logistics, weather/terrain effects, alliance decision stress, and collection gaps for the requested theater.
- For watch products, do not use generic "Global Trends" or generic global-report section titles. Use theater-watch section titles inside the same styled HTML classes: Current Regional Assessment, Recent Think Tank Coverage, Operational Map, Situational Status, Weather & Sea State, Intelligence Feed, Force Comparison, Strategic Assessment, Current Assessment, Things To Note, Things To Watch, and Escalation Likelihood.
- For each theater-watch section, use <div class="section"><div class="section-header"><span class="section-title">SECTION NAME</span><span class="section-label">SHORT LABEL</span></div>...</div>. Use trend-card, panel, feed-row, risk-row, theater-row, outlook-box, and watch-row classes as needed, but preserve the requested section names exactly.
`
    : '';
  return `You are the Conflict Mapper intelligence report engine. Write in the style of a daily OSINT watch-center product for enterprise infrastructure, security, and executive risk teams.

The target product is a compact but dense intelligence brief, not a narrative essay and not a generic news summary. Prioritize crisp assessments, operational consequences, and monitorable indicators.

Hard requirements:
- Return an HTML body fragment only. Do not return <!DOCTYPE>, <html>, <head>, <body>, markdown fences, preamble, or JSON.
- Use the provided article numbers as citations in bracket form, e.g. [3], [12].
- Ground the report in the deterministic prior-24-hour source brief: roughly 70% of the analysis should come from the provided RSS/news/website/think-tank feed summary, and roughly 30% may come from live web/news search at prompt time to catch blind spots.
- Do not let live web search displace the source brief unless it materially updates, contradicts, or fills a gap in the provided source corpus.
- Distinguish reported facts from analytic assessment.
- Include risk severity labels from this exact set: CRITICAL, HIGH, MEDIUM, LOW.
- Include trajectory labels from this exact set: ESCALATING, STABLE, DE-ESCALATING.
- Write 1,400-2,600 words unless source material is sparse. Favor depth, cited analytic detail, and operational implications, but do not create walls of text.
- Use the exact section structure below and preserve the class names because the renderer styles them.
- No wall of text: use short paragraphs, feed rows, risk rows, theater rows, watch rows, badges, source-backed data, and scannable cards. Do not place more than 120 words in any single paragraph.
- The renderer will add source visual cards, map, and a source signal matrix. Your body should complement those modules with concise analysis, not duplicate a long source list.
- Do not invent exact casualty figures, classified intelligence, or unsupported claims.
- Keep paragraphs tight. The reference style is dense, direct, multimodal, and scannable.
${watchInstruction}

Use this HTML structure:
<div class="exec-summary">
  <strong>EXECUTIVE SUMMARY</strong>
  Two or three short sentences summarizing the highest-impact global developments, including risk posture and operational implications.
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

export function buildUserPrompt({ scope, slug, title, articles, sourceBrief = '' }) {
  const articleText = articles.length
    ? articles.map((article, index) => {
        const time = articleTimestamp(article);
        const date = time ? new Date(time).toISOString().slice(0, 10) : 'unknown-date';
        return `[${index + 1}] ${date} | ${article.source || 'unknown source'}\nTitle: ${article.title}\nSummary: ${(article.description || '').slice(0, 400)}\nURL: ${article.link || 'n/a'}`;
      }).join('\n\n')
    : 'No recent articles were available. Use only cautious, general assessment language.';

  const scopeLine = scope === 'global' ? 'global' : scope === 'watch' ? `watch/${slug}` : `country/${slug}`;
  const watchSlug = String(slug || '').toLowerCase();
  const sectionTarget = scope === 'watch'
    ? (watchSlug === 'korean-peninsula' || watchSlug === 'korea'
      ? `- Current Regional Assessment covering North Korean posturing, readiness, missile/nuclear indicators, alliance posture, civil-warning risk, and collection gaps.
- Recent Think Tank Coverage with 5-10 sentence analysis of any robust regional report and why its ramifications matter.
- Operational Map and Situational Status narrative tied to DMZ, Seoul/Incheon exposure, USFK/ROK nodes, Japan access, nuclear/missile facilities, cyber/space, and logistics.
- Weather & Sea State / Ground Conditions with tactical relevance for air, maritime, ground movement, ports, visibility, and civil response.
- Intelligence Feed: 5-10 militarily significant news stories with concise summaries plus 1-5 sentence analysis on why each matters.
- Force Comparison and Strategic Assessment updates covering DPRK fires/missiles/SOF/cyber/nuclear leverage versus ROK/US/Japan conventional, air, naval, missile defense, ISR, and sustainment advantages.
- Current Assessment, Things To Note, Things To Watch, and Escalation Likelihood for 24 hours, 7 days, and 1 month.
- Outlook bands: short term 24 hours to 1 week, medium term 1 week to 6 months, and long term beyond 6 months.`
      : `- 5-7 Watch Trends ranked by threat relevance.
- 6-10 Breaking Developments focused on China/Taiwan and related regional security signals.
- 6-10 Warning Indicators and Areas of Concern.
- Regional Assessments by theater: Taiwan Strait, South China Sea, Japan/Ryukyu arc, Philippines, US Indo-Pacific posture, cyber/information operations.
- One Near-Term Outlook paragraph covering 30-90 days.
- 8-12 Watch List indicators suitable for alerting/monitoring dashboards.`)
    : `- 7-10 Global Trends cards, ranked by impact.
- 8-12 Breaking Developments from the newest/highest-signal source articles.
- 8-12 Areas of Concern with risk badges.
- Regional Assessments by theater: europe, middle east, asia pacific, africa, americas, arctic when source material supports them.
- One detailed Near-Term Outlook section covering 30-90 days.
- 8-12 Watch List indicators suitable for alerting/monitoring dashboards.`;

  return `Create a Conflict Mapper intelligence report body for: ${title}

Scope: ${scopeLine}

The report must match the historical Conflict Mapper report style:
- Short classification-style executive summary.
${sectionTarget}

Analytic emphasis:
- First create your analysis from the prior-24-hour source brief below. The final report should be about 70% grounded in that sourced feed brief and about 30% informed by additional live web/news search at the time of prompting to catch blind spots.
- Do not let web search override the sourced brief unless live search clearly updates, contradicts, or fills a material gap. Label externally discovered updates as live web checks in prose and keep bracket citations for provided source articles.
- Source article citations must only refer to the provided prior-24-hour feed items. Do not cite, quote, or reference older RSS/news/website/think-tank feed articles.
- If the prior-24-hour source brief is sparse, state that coverage limitation and lean more heavily on monitorable indicators instead of inventing details.
- Geopolitical escalation pathways
- Military force posture and procurement signals
- Cyber, telecom, energy, logistics, and maritime infrastructure implications
- Supply chain and sanctions exposure
- Actionable indicators for monitoring dashboards and daily watchlists
- Cross-theater interaction, e.g. how Middle East escalation affects energy, shipping, cyber, and domestic security
- Ignore domestic political personality stories, celebrity/legal items, consumer-finance stories, lifestyle/science features, and generic politics unless they have a direct conflict, escalation, military, sanctions, cyber, infrastructure, weapons, or geopolitical-security implication.
- Do not elevate a story just because it is recent; prioritize recent high-signal global security developments.

Formatting requirements:
- Return HTML only.
- Return only the body fragment using the exact class names from the system prompt.
- Use risk badge classes: risk-critical, risk-high, risk-medium, risk-low.
- Use trajectory badge classes: trajectory-escalating, trajectory-stable, trajectory-deescalating.
- Do not use tables unless absolutely necessary. The historical format uses cards and panel rows.
- Cite source articles by bracket number throughout.
- Keep each card concise but information-rich.

Prior-24-hour sourced feed brief:

${sourceBrief || 'No deterministic source brief was available for this generation run.'}

Source articles:

${articleText}`;
}

function buildSourceBrief({ scope, slug, articles = [], generatedAt = new Date().toISOString() }) {
  const corpus = articles.slice(0, SOURCE_BRIEF_ARTICLE_LIMIT);
  const scopeLine = scope === 'global' ? 'global' : scope === 'watch' ? `watch/${slug}` : `country/${slug}`;
  if (!corpus.length) {
    return {
      articleCount: 0,
      text: `Generated: ${generatedAt}\nScope: ${scopeLine}\nCorpus: 0 articles in the prior ${SOURCE_BRIEF_WINDOW_HOURS} hours. Use cautious language and identify RSS/feed coverage as a gap.`,
    };
  }

  const sourceCounts = countBy(corpus, (article) => article.source || 'unknown source');
  const topicCounts = countBy(corpus, (article) => article.category || 'general');
  const countryCounts = countBy(corpus, (article) => article.country || article.geo?.country || 'unresolved');
  const themes = buildBriefThemes(corpus);
  const firstTime = Math.max(...corpus.map(articleTimestamp).filter(Boolean));
  const lastTime = Math.min(...corpus.map(articleTimestamp).filter(Boolean));
  const lines = corpus.map((article, index) => {
    const time = articleTimestamp(article);
    const date = time ? new Date(time).toISOString() : 'unknown-date';
    const summary = cleanBriefText(article.description || article.summary || '').slice(0, 240);
    return `[${index + 1}] ${date} | ${article.source || 'unknown source'} | ${article.category || 'general'} | ${article.country || 'global'}\nHeadline: ${cleanBriefText(article.title || 'Untitled')}\nSource summary: ${summary || 'No source summary available.'}\nURL: ${article.link || article.url || 'n/a'}`;
  }).join('\n\n');

  return {
    articleCount: corpus.length,
    text: `Generated: ${generatedAt}
Scope: ${scopeLine}
Corpus: ${corpus.length} prior-${SOURCE_BRIEF_WINDOW_HOURS}h source articles.
Window: ${lastTime ? new Date(lastTime).toISOString() : 'unknown'} to ${firstTime ? new Date(firstTime).toISOString() : 'unknown'}
Source mix: ${formatTopCounts(sourceCounts, 12)}
Topic mix: ${formatTopCounts(topicCounts, 12)}
Country/place mix: ${formatTopCounts(countryCounts, 12)}
Dominant source themes: ${themes.join('; ') || 'No dominant theme detected.'}
Grounding rule: Use this source brief for roughly 70% of the analysis. Use live web/news search for roughly 30% to identify blind spots, recent updates, contradictions, or missing context. Preserve bracket citations for feed-derived claims.

Source brief items:

${lines}`,
  };
}

function buildBriefThemes(articles) {
  const themeDefs = [
    ['military escalation', /\b(war|invasion|strike|missile|drone|frontline|troops?|military|naval|air defense|artillery|offensive)\b/i],
    ['nuclear and strategic weapons', /\b(nuclear|uranium|iaea|missile defense|wmd|ballistic|hypersonic)\b/i],
    ['cyber and critical infrastructure', /\b(cyber|ransomware|malware|sabotage|critical infrastructure|power grid|telecom|subsea|pipeline)\b/i],
    ['maritime chokepoints and energy', /\b(red sea|hormuz|suez|black sea|south china sea|shipping|port|oil|gas|energy)\b/i],
    ['alliances and sanctions', /\b(nato|g7|alliance|sanctions?|export controls?|aid package|defense pact)\b/i],
    ['think-tank or research signal', /\b(think tank|report|analysis|briefing|csis|rusi|rand|isw|iiss|atlantic council)\b/i],
  ];
  return themeDefs
    .map(([label, regex]) => {
      const count = articles.filter((article) => regex.test(`${article.title || ''} ${article.description || ''} ${article.source || ''} ${article.category || ''}`)).length;
      return { label, count };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((item) => `${item.label} (${item.count})`);
}

function formatTopCounts(counts, limit) {
  const entries = counts instanceof Map ? Array.from(counts.entries()) : Object.entries(counts || {});
  return entries
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ') || 'none';
}

function cleanBriefText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildKoreaWatchCompositionPrompt() {
  return `You are updating the Korean Peninsula Watch page for Conflict Mapper.

Goal: update current content without breaking the page composition, shared theme variables, responsive behavior, map/feed IDs, or Korea-only analytic focus.

Required page sections, in this order:
1. Current Regional Assessment
2. Recent Think Tank Coverage
3. Operational Map
4. Situational Status
5. Weather & Sea State
6. Intelligence Feed
7. Force Comparison
8. Strategic Assessment
9. Current Assessment
10. Things To Note
11. Things To Watch
12. Escalation Likelihood

Update expectations:
- Use the latest available RSS, think tank, official, and reputable open-source reporting.
- Analyze North Korean posturing, missile and nuclear readiness, artillery/MLRS posture, SOF/drone activity, cyber/space indicators, public-warning risk, and US/ROK/Japan alliance posture.
- Include weather and ground-condition relevance for air operations, maritime access, ground movement, ports, visibility, cyber/public-warning response, and civilian movement.
- Highlight 5-10 militarily significant stories. Each story needs a concise summary plus 1-5 sentences explaining why it matters.
- Include short-term 24 hours to 1 week, medium-term 1 week to 6 months, and long-term 6 months plus outlook.
- Think tank coverage must not be a link list. Showcase robust regional analysis with 5-10 sentences on ramifications and include visual/context cards where possible.
- Use bullet lists with hover/focus insight overlays for dense items. Avoid walls of text.
- Do not cross-post Taiwan-specific force reports or Taiwan-only imagery on Korean pages unless explicitly analyzing regional spillover.
- Preserve CSS variables for font sizes, content width, theme colors, and light/dark theme behavior. Do not hard-code local text sizes that override global style settings.`;
}

function buildKoreaWarGamesCompositionPrompt() {
  return `You are updating the Korean Peninsula War Games page and related scenario deep-review pages for Conflict Mapper.

Goal: preserve the flagship analysis structure while updating scenario research, source links, imagery, and comparison logic.

Required page composition:
- Executive Assessment: high-impact synthesis that explains why the page matters before the reader reaches the cards.
- Scenario Deep Review: each scenario card must include an image, source link, more than one sentence of context, the war-game purpose, warning indicators, and outcome logic.
- Geography And Terrain Context: use Korea-specific maps and terrain analysis only. Explain DMZ compression, Seoul/Incheon exposure, mountains, corridors, ports, air bases, logistics depth, Japan access, and why historical maps remain relevant.
- Scenario Families: every family must include imagery and 5-10 sentences of context, not a one-line label.
- Scenario Comparison Matrix: compare scenario pathways with readable cards, qualitative stress bars, and a summary matrix overview. Do not include prompt text or page-building meta-language.
- Escalation Model, Assumptions And Limits, Warning Indicators, Planning Implications, and Source Index: each section must have enough analytical depth, useful visuals, and clear reader purpose.
- Source Index should start with a carousel of the three most important/current scenarios, then provide summary cards for all relevant scenarios, then a readable reference library.

Content expectations:
- Cite original reports directly when available.
- Use Korean Peninsula-specific sources, maps, and images. Remove Taiwan imagery unless the section explicitly covers dual-contingency regional spillover.
- Planning Implications should use bullet points with hover/focus overlays explaining why each item matters.
- Scenario analysis should explain what the game tested, what assumptions mattered, what outcome occurred, what warning indicators follow, and what limits remain.
- Preserve global style variables and responsive behavior. All text should inherit editable Conflict Mapper style settings.`;
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
      filename: 'global-analysis-report-prompt.md',
      scope: 'global',
      slug: 'global',
      title: `Global Intelligence Report - ${date}`,
    },
    {
      id: 'country',
      label: 'Country Dossier Report',
      filename: 'country-dossier-report-prompt.md',
      scope: 'country',
      slug: 'usa',
      title: `United States Intelligence Report - ${date}`,
    },
    {
      id: 'watch-taiwan',
      label: 'China/Taiwan Threat Watch',
      filename: 'china-taiwan-watch-prompt.md',
      scope: 'watch',
      slug: 'taiwan',
      title: `China/Taiwan Threat Watch - ${date}`,
    },
    {
      id: 'watch-korea',
      label: 'Korean Peninsula Threat Watch',
      filename: 'korean-peninsula-watch-prompt.md',
      scope: 'watch',
      slug: 'korea',
      title: `Korean Peninsula Threat Watch - ${date}`,
      compositionPrompt: buildKoreaWatchCompositionPrompt(),
    },
    {
      id: 'korean-peninsula-war-games-page',
      label: 'Korean Peninsula War Games Page Update',
      filename: 'korean-peninsula-war-games-page-prompt.md',
      scope: 'watch',
      slug: 'korean-peninsula-war-games',
      title: `Korean Peninsula War Games Page Update - ${date}`,
      compositionPrompt: buildKoreaWarGamesCompositionPrompt(),
    },
  ];

  return templates.map((template) => {
    const systemPrompt = buildSystemPrompt(template.scope);
    const generatedUserPrompt = buildUserPrompt({
      scope: template.scope,
      slug: template.slug,
      title: template.title,
      articles: sampleArticles,
    });
    const userPrompt = template.compositionPrompt
      ? `${template.compositionPrompt}\n\n${generatedUserPrompt}`
      : generatedUserPrompt;
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

export async function listReportPromptTemplates(env) {
  const builtin = getReportPromptTemplates().map((template) => ({
    ...template,
    source: 'builtin',
    saved: false,
    storageKey: '',
  }));
  const stored = await listStoredPromptTemplates(env);
  return [...stored, ...builtin];
}

export async function saveReportPromptTemplate(env, input = {}) {
  if (!env.REPORTS_BUCKET) throw new Error('REPORTS_BUCKET binding missing');
  const filename = sanitizePromptFilename(input.filename || input.label || 'custom-report-prompt.md');
  const storageKey = `${PROMPT_STORAGE_PREFIX}${filename}`;
  const id = promptIdFromFilename(filename);
  const label = String(input.label || filename.replace(/\.md$/i, '').replace(/[-_]+/g, ' ')).trim();
  const scope = String(input.scope || 'global').trim();
  const slug = String(input.slug || (scope === 'global' ? 'global' : 'usa')).trim();
  const title = String(input.title || `${label} - YYYY-MM-DD`).trim();
  const fullPrompt = String(input.fullPrompt || input.prompt || '').trim();
  if (!fullPrompt) throw new Error('Prompt text is required');

  const markdown = buildStoredPromptMarkdown({
    id,
    label,
    filename,
    scope,
    slug,
    title,
    importNotes: Array.isArray(input.importNotes) ? input.importNotes : [],
    fullPrompt,
  });

  await env.REPORTS_BUCKET.put(storageKey, markdown, {
    httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
    customMetadata: { id, label, scope, slug, title, type: 'report-prompt' },
  });

  return {
    id,
    label,
    filename,
    scope,
    slug,
    title,
    fullPrompt,
    source: 'r2',
    saved: true,
    storageKey,
    path: `/storage/${storageKey}`,
    importNotes: Array.isArray(input.importNotes) ? input.importNotes : [],
  };
}

async function resolveGenerationPrompts(env, { scope, slug, title, articles, sourceBrief = '', promptId = '' }) {
  if (!promptId) {
    return {
      systemPrompt: buildSystemPrompt(scope),
      userPrompt: buildUserPrompt({ scope, slug, title, articles, sourceBrief }),
    };
  }

  const template = await getReportPromptTemplate(env, promptId);
  if (!template) {
    await appendReportLog(env, {
      level: 'warn',
      category: 'ai',
      message: `Selected prompt template not found; using built-in prompt: ${promptId}`,
      details: { promptId, scope, slug },
    });
    return {
      systemPrompt: buildSystemPrompt(scope),
      userPrompt: buildUserPrompt({ scope, slug, title, articles, sourceBrief }),
    };
  }

  const dynamicPrompt = buildUserPrompt({ scope, slug, title, articles, sourceBrief });
  const sourceArticles = buildSourceArticleBlock(articles);
  const templated = applyPromptPlaceholders(template.fullPrompt || '', {
    title,
    scope,
    slug,
    sourceBrief,
    sourceArticles,
    dynamicPrompt,
  });

  if (templated !== (template.fullPrompt || '') || /\{\{DYNAMIC_REPORT_REQUEST\}\}/.test(template.fullPrompt || '')) {
    return { systemPrompt: '', userPrompt: templated };
  }

  return {
    systemPrompt: templated,
    userPrompt: dynamicPrompt,
  };
}

async function getReportPromptTemplate(env, promptId) {
  const id = String(promptId || '').trim();
  if (!id) return null;
  const all = await listReportPromptTemplates(env);
  return all.find((template) => template.id === id || template.filename === id || template.storageKey === id) || null;
}

async function listStoredPromptTemplates(env) {
  if (!env.REPORTS_BUCKET) return [];
  const result = await env.REPORTS_BUCKET.list({ prefix: PROMPT_STORAGE_PREFIX, limit: 1000 });
  const templates = [];
  for (const object of result.objects || []) {
    if (!object.key.endsWith('.md')) continue;
    const stored = await env.REPORTS_BUCKET.get(object.key);
    if (!stored) continue;
    const text = await stored.text();
    templates.push(parseStoredPromptMarkdown(text, object));
  }
  return templates.sort((a, b) => a.label.localeCompare(b.label));
}

function parseStoredPromptMarkdown(text, object) {
  const filename = object.key.replace(PROMPT_STORAGE_PREFIX, '');
  const id = promptIdFromFilename(filename);
  const lines = String(text || '').split(/\r?\n/);
  const heading = lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, '').replace(/\s+Prompt$/i, '').trim();
  const scope = findMarkdownMeta(lines, 'Scope') || object.customMetadata?.scope || 'global';
  const slug = findMarkdownMeta(lines, 'Slug') || object.customMetadata?.slug || (scope === 'global' ? 'global' : 'usa');
  const title = findMarkdownMeta(lines, 'Default title') || object.customMetadata?.title || `${heading || id} - YYYY-MM-DD`;
  const fullPromptMarker = lines.findIndex((line) => /^##\s+Full Prompt\s*$/i.test(line));
  const fullPrompt = fullPromptMarker >= 0
    ? lines.slice(fullPromptMarker + 1).join('\n').trim()
    : String(text || '').trim();
  const label = object.customMetadata?.label || heading || filename.replace(/\.md$/i, '').replace(/[-_]+/g, ' ');

  return {
    id,
    label,
    filename,
    scope,
    slug,
    title,
    fullPrompt,
    source: 'r2',
    saved: true,
    storageKey: object.key,
    path: `/storage/${object.key}`,
    uploaded: object.uploaded?.toISOString?.() || object.uploaded || null,
    size: object.size || 0,
    importNotes: [
      'Saved prompt template loaded from Cloudflare R2.',
      'Use placeholders {{REPORT_TITLE}}, {{REPORT_SCOPE}}, {{REPORT_SLUG}}, {{SOURCE_BRIEF}}, {{SOURCE_ARTICLES}}, or {{DYNAMIC_REPORT_REQUEST}} for dynamic report context.',
    ],
  };
}

function buildStoredPromptMarkdown(template) {
  return `# ${template.label} Prompt

Scope: ${template.scope}
Slug: ${template.slug}
Default title: ${template.title}

## Import Notes
${(template.importNotes || []).map((note) => `- ${note}`).join('\n') || '- Saved Cloudflare report prompt template.'}

## Full Prompt

${template.fullPrompt}
`;
}

function findMarkdownMeta(lines, key) {
  const prefix = `${key}:`.toLowerCase();
  const line = lines.find((item) => item.toLowerCase().startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : '';
}

function sanitizePromptFilename(value) {
  const base = String(value || 'custom-report-prompt.md')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^prompts\//i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 120) || 'custom-report-prompt.md';
  return base.toLowerCase().endsWith('.md') ? base : `${base}.md`;
}

function promptIdFromFilename(filename) {
  return String(filename || '')
    .replace(/^prompts\//i, '')
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'custom-report-prompt';
}

function applyPromptPlaceholders(prompt, { title, scope, slug, sourceBrief, sourceArticles, dynamicPrompt }) {
  return String(prompt || '')
    .replaceAll('{{REPORT_TITLE}}', title)
    .replaceAll('{{REPORT_SCOPE}}', scope)
    .replaceAll('{{REPORT_SLUG}}', slug)
    .replaceAll('{{SOURCE_BRIEF}}', sourceBrief || '')
    .replaceAll('{{SOURCE_ARTICLES}}', sourceArticles)
    .replaceAll('{{DYNAMIC_REPORT_REQUEST}}', dynamicPrompt);
}

function buildSourceArticleBlock(articles = []) {
  return articles.length
    ? articles.map((article, index) => {
        const time = articleTimestamp(article);
        const date = time ? new Date(time).toISOString().slice(0, 10) : 'unknown-date';
        return `[${index + 1}] ${date} | ${article.source || 'unknown source'}\nTitle: ${article.title}\nSummary: ${(article.description || '').slice(0, 500)}\nURL: ${article.link || 'n/a'}`;
      }).join('\n\n')
    : 'No recent articles were available.';
}

function generateFallbackReportBody({ title, scope, slug, articles, error }) {
  const sourceArticles = articles.slice(0, 18);
  const topArticles = sourceArticles.length ? sourceArticles : [{
    title: 'No topic-matched RSS articles were available for this generation run',
    source: 'Conflict Mapper',
    description: 'The report engine completed, but the feed cache did not provide current source material for this scope.',
    pubDate: new Date().toISOString(),
    category: 'system',
  }];
  const scopeName = scope === 'global'
    ? 'global'
    : scope === 'watch'
      ? watchTitle(slug)
      : (COUNTRY_LABELS[slug] || slug.replace(/-/g, ' '));
  const citations = topArticles.map((_, index) => `[${index + 1}]`).slice(0, 8).join(', ');
  const summaryLead = 'This source-grounded interim brief was generated from the current feed corpus. It should be reviewed against the cited articles and replaced by the next provider-generated analytic pass when available.';
  const categoryCounts = countBy(topArticles, (article) => article.category || 'general');
  const regionCounts = countBy(topArticles, (article) => article.geo?.place || article.geo?.country || article.country || 'unresolved');
  const primaryCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => `${escapeHtml(category)} (${count})`)
    .join(' · ') || 'none';
  const primaryRegions = Object.entries(regionCounts)
    .filter(([region]) => region !== 'unresolved')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([region, count]) => `${escapeHtml(region)} (${count})`)
    .join(' · ') || 'No precise geotags available';

  const trends = topArticles.slice(0, 7).map((article, index) => {
    const risk = riskForArticle(article, index);
    const trajectory = index < 2 ? 'escalating' : 'stable';
    return `<div class="trend-card">
      <div class="trend-card-head">
        <h3><span class="trend-rank">#${index + 1}</span>${escapeHtml(article.title || 'Untitled source item')}</h3>
        <div class="badge-row">
          <span class="risk-badge risk-${risk.toLowerCase()}">${risk}</span>
          <span class="risk-badge trajectory-${trajectory}">${trajectory.toUpperCase()}</span>
        </div>
      </div>
      <p>${escapeHtml(article.description || 'Source item requires analyst review for operational relevance.')} [${index + 1}]</p>
      <div class="regions-line">REGIONS: ${escapeHtml(article.geo?.place || article.geo?.country || article.country || scopeName)} · SOURCE: ${escapeHtml(article.source || 'unknown')}</div>
    </div>`;
  }).join('');

  const developments = topArticles.slice(0, 10).map((article, index) => {
    const date = article.pubDate ? new Date(article.pubDate).toISOString().slice(0, 10) : 'unknown-date';
    return `<div class="feed-row">
      <div class="feed-meta"><span class="breaking-dot">◉ ${escapeHtml(article.category || 'UPDATE').toUpperCase()}</span><span>${date}</span><span>${escapeHtml(article.source || 'unknown source')}</span></div>
      <div class="feed-title">${escapeHtml(article.title || 'Untitled source item')}</div>
      <div class="feed-summary">${escapeHtml(article.description || 'No summary was available from the feed parser.')} [${index + 1}]</div>
    </div>`;
  }).join('');

  const risks = topArticles.slice(0, 8).map((article, index) => {
    const risk = riskForArticle(article, index);
    const location = article.geo?.place || article.geo?.country || article.country || scopeName;
    return `<div class="risk-row">
      <span class="risk-badge risk-${risk.toLowerCase()}">${risk}</span>
      <div><div class="risk-location">${escapeHtml(location)}</div><div class="risk-detail">${escapeHtml(riskDetailForArticle(article, scopeName))} [${index + 1}]</div></div>
    </div>`;
  }).join('');

  const theaters = Object.entries(regionCounts)
    .filter(([region]) => region !== 'unresolved')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([region, count]) => `<div class="theater-row"><div class="theater-name">${escapeHtml(region)}</div><div class="theater-assessment">${count} topic-matched source item${count === 1 ? '' : 's'} currently map to this area. Review newest articles for escalation, infrastructure exposure, force posture changes, and secondary effects.</div></div>`)
    .join('') || `<div class="theater-row"><div class="theater-name">${escapeHtml(scopeName)}</div><div class="theater-assessment">No precise regional clustering was available. Improve geotagging coverage by validating article place extraction and RSS source metadata.</div></div>`;

  const watchItems = topArticles.slice(0, 10).map((article, index) => {
    const place = article.geo?.place || article.geo?.country || article.country || scopeName;
    return `<div class="watch-row"><span>◆</span><span>Monitor ${escapeHtml(place)} for follow-on reporting linked to "${escapeHtml(shortTitle(article.title))}" [${index + 1}]</span></div>`;
  }).join('');

  return `<div class="exec-summary">
  <strong>EXECUTIVE SUMMARY</strong>
  ${summaryLead} Current ${escapeHtml(scopeName)} source coverage includes ${topArticles.length} article${topArticles.length === 1 ? '' : 's'} across ${escapeHtml(primaryCategories)}. Highest-signal reporting clusters around ${primaryRegions}. Analyst review should prioritize escalation indicators, operational infrastructure impacts, and cross-source validation using ${citations || 'the Source Articles section'}.
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">${scope === 'watch' ? 'Watch Trends' : 'Global Trends'}</span>
    <span class="section-label">SOURCE-BASED FALLBACK</span>
  </div>
  ${trends}
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Breaking Developments</span>
    <span class="section-label">PRIOR 24H FEED CACHE</span>
  </div>
  <div class="panel">${developments}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Areas of Concern</span>
    <span class="section-label">RISK ASSESSMENT</span>
  </div>
  <div class="panel">${risks}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Regional Assessments</span>
    <span class="section-label">BY GEOTAG</span>
  </div>
  <div class="panel">${theaters}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Near-Term Outlook</span>
    <span class="section-label">30-90 DAY FORECAST</span>
  </div>
  <div class="outlook-box">Expect reporting volume and cross-source confirmation to determine whether these signals mature into persistent operational risk. Continue monitoring for repeated references to force posture, infrastructure disruption, cyber activity, shipping/logistics effects, sanctions exposure, and official government warnings. Prioritize sources that independently corroborate the same operational indicators before escalating confidence.</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Watch List</span>
    <span class="section-label">ITEMS TO MONITOR</span>
  </div>
  <div class="panel watch-panel">${watchItems}</div>
</div>`;
}

function normalizeReportBody({ body, title, scope, slug, articles, aiFallback = false }) {
  const cleaned = stripCodeFence(body);
  if (isStructuredReportBody(cleaned)) {
    const koreaWatch = enforceKoreaWatchSections(cleaned, { scope, slug, articles });
    if (koreaWatch.changed) {
      return {
        body: koreaWatch.body,
        changed: true,
        fallback: aiFallback,
        message: describeKoreaWatchNormalization(koreaWatch),
      };
    }
    return { body: cleaned, changed: false, fallback: aiFallback, message: 'Report body already uses the styled report structure' };
  }

  const coerced = coercePlainReportBody(cleaned, { title, scope, slug, articles });
  if (coerced) {
    const koreaWatch = enforceKoreaWatchSections(coerced, { scope, slug, articles });
    return {
      body: koreaWatch.body,
      changed: true,
      fallback: aiFallback,
      message: koreaWatch.changed
        ? describeKoreaWatchNormalization(koreaWatch)
        : 'AI report body did not preserve styled class structure; converted plain sections to styled report panels',
    };
  }

  const fallbackBody = generateFallbackReportBody({
    title,
    scope,
    slug,
    articles,
    error: 'AI response did not preserve the required Conflict Mapper report HTML structure.',
  });
  const koreaWatch = enforceKoreaWatchSections(fallbackBody, { scope, slug, articles });
  return {
    body: koreaWatch.body,
    changed: true,
    fallback: true,
    message: koreaWatch.changed
      ? describeKoreaWatchNormalization(koreaWatch)
      : 'AI report body did not preserve styled class structure; using deterministic styled fallback renderer',
  };
}

function isStructuredReportBody(value) {
  const html = String(value || '').toLowerCase();
  return html.includes('class="exec-summary"')
    && html.includes('class="section"')
    && (html.includes('class="trend-card"') || html.includes('class="panel"'))
    && (html.includes('class="section-title"') || html.includes('class="section-header"'));
}

function enforceKoreaWatchSections(body, { scope, slug, articles }) {
  const normalizedSlug = String(slug || '').toLowerCase();
  if (scope !== 'watch' || (normalizedSlug !== 'korea' && normalizedSlug !== 'korean-peninsula')) {
    return { body, changed: false, missing: [] };
  }
  const plain = String(body || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const required = [
    'Current Regional Assessment',
    'Recent Think Tank Coverage',
    'Operational Map',
    'Situational Status',
    'Weather & Sea State',
    'Intelligence Feed',
    'Force Comparison',
    'Strategic Assessment',
    'Current Assessment',
    'Things To Note',
    'Things To Watch',
    'Escalation Likelihood',
  ];
  const missing = required.filter((name) => !plain.includes(name));
  const genericSections = [
    'Global Trends',
    'Breaking Developments',
    'Areas of Concern',
    'Regional Assessments',
    'Near-Term Outlook',
    'Watch List',
    'Watch Trends',
  ].filter((name) => plain.includes(name));
  if (!missing.length && !genericSections.length) return { body, changed: false, missing: [] };
  return {
    body: buildKoreaWatchReportBody({ sourceBody: body, articles, required }),
    changed: true,
    missing,
    genericSections,
  };
}

function describeKoreaWatchNormalization(result) {
  const details = [];
  if (result.missing?.length) details.push(`missing sections: ${result.missing.join(', ')}`);
  if (result.genericSections?.length) details.push(`generic sections removed: ${result.genericSections.join(', ')}`);
  return `Korean Peninsula watch report was normalized to the required theater-watch section structure${details.length ? ` (${details.join('; ')})` : ''}`;
}

function buildKoreaWatchReportBody({ sourceBody, articles, required }) {
  const summary = koreaWatchExecutiveSummary(sourceBody, articles);
  const sections = required
    .map((name) => koreaWatchSection(name, articles))
    .filter(Boolean)
    .join('\n');
  return `<div class="exec-summary">
  <strong>EXECUTIVE SUMMARY</strong>
  ${escapeHtml(summary)}
</div>

${sections}`;
}

function koreaWatchExecutiveSummary(sourceBody, articles = []) {
  const existing = String(sourceBody || '')
    .match(/<div[^>]+class=["'][^"']*exec-summary[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/\bEXECUTIVE SUMMARY\b/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (existing && !/(global trends|breaking developments|regional assessments|near-term outlook)/i.test(existing)) {
    return existing;
  }
  const sourceArticles = Array.isArray(articles) ? articles : [];
  const themes = sourceArticles
    .slice(0, 5)
    .map((article) => shortTitle(article.title || article.description || 'source item'))
    .filter(Boolean)
    .join('; ');
  return `Korean Peninsula monitoring remains focused on DPRK missile, nuclear, artillery, cyber, and political-signaling indicators, with escalation risk rising when military posture changes converge with alliance readiness stress, public-warning friction, maritime or air activity, and Japan-access implications. Current source themes: ${themes || 'no high-signal Korea source articles were attached'}.`;
}

function koreaWatchSection(name, articles = []) {
  const sourceArticles = Array.isArray(articles) ? articles : [];
  const articleRows = sourceArticles.slice(0, 8).map((article, index) => {
    const date = article.pubDate ? new Date(article.pubDate).toISOString().slice(0, 10) : 'unknown-date';
    return `<div class="feed-row">
      <div class="feed-meta"><span class="breaking-dot">◉ KOREA WATCH</span><span>${date}</span><span>${escapeHtml(article.source || 'unknown source')}</span></div>
      <div class="feed-title">${escapeHtml(article.title || 'Untitled source item')}</div>
      <div class="feed-summary">${escapeHtml(article.description || 'No summary was available from the feed parser.')} [${index + 1}]</div>
    </div>`;
  }).join('');
  const firstTitles = sourceArticles.slice(0, 4).map((article) => shortTitle(article.title || article.description || 'source item')).join('; ');
  const panels = {
    'Current Regional Assessment': `<div class="trend-card"><div class="trend-card-head"><h3><span class="trend-rank">#1</span>DPRK posture and alliance readiness baseline</h3><div class="badge-row"><span class="risk-badge risk-high">HIGH</span><span class="risk-badge trajectory-stable">STABLE</span></div></div><p>Current Korea watch risk remains elevated because missile activity, nuclear signaling, cyber pressure, public-warning resilience, and US/ROK/Japan coordination can interact quickly. Latest selected source themes: ${escapeHtml(firstTitles || 'no high-signal Korea articles were attached')}.</p><div class="regions-line">REGIONS: koreanPeninsula · dprk · rok · japanAccess</div></div>`,
    'Recent Think Tank Coverage': `<div class="panel"><div class="theater-row"><div class="theater-name">Analytic Ramifications</div><div class="theater-assessment">Use current think tank reporting to test whether new analysis changes DPRK readiness, alliance cohesion, missile-defense assumptions, nuclear leverage, Japan access, cyber/space resilience, or public-warning confidence. Robust reports should be treated as assessment inputs, not link lists.</div></div></div>`,
    'Operational Map': `<div class="panel"><div class="theater-row"><div class="theater-name">Mapped Theater Logic</div><div class="theater-assessment">Interpret reporting against the DMZ, Seoul-Incheon exposure, Pyongyang command nodes, Yongbyon and Punggye-ri nuclear indicators, Sinpo maritime activity, USFK bases, southern ports, Japan access, and logistics corridors. Map relevance rises when source reporting changes posture at a specific node.</div></div></div>`,
    'Situational Status': `<div class="panel"><div class="risk-row"><span class="risk-badge risk-high">HIGH</span><div><div class="risk-location">Missile, artillery, cyber, and public-warning convergence</div><div class="risk-detail">Concern rises when launcher activity, artillery readiness, cyber disruption, nuclear language, evacuation narratives, and allied consultation stress appear together.</div></div></div></div>`,
    'Weather & Sea State': `<div class="panel"><div class="theater-row"><div class="theater-name">Ground, Air, And Maritime Conditions</div><div class="theater-assessment">Assess weather through operational effects: visibility and ceiling for air operations, sea state in the Yellow Sea/East Sea/Korea Strait, mountain corridor mobility, runway and bridge repair, port throughput, and civilian movement during public-warning events.</div></div></div>`,
    'Intelligence Feed': `<div class="panel">${articleRows || '<div class="feed-row"><div class="feed-title">No Korea source articles attached.</div></div>'}</div>`,
    'Force Comparison': `<div class="panel"><div class="risk-row"><span class="risk-badge risk-high">HIGH</span><div><div class="risk-location">DPRK coercive strengths</div><div class="risk-detail">Missiles, artillery, SOF/drone incidents, cyber activity, and nuclear leverage compress decision time.</div></div></div><div class="risk-row"><span class="risk-badge risk-medium">MEDIUM</span><div><div class="risk-location">ROK/US/Japan advantages</div><div class="risk-detail">Air/ISR, missile defense, sustainment, Japan access, and command continuity shape containment and recovery.</div></div></div></div>`,
    'Strategic Assessment': `<div class="outlook-box"><strong>Current Assessment:</strong> Monitor for convergence rather than isolated rhetoric. <strong>Things To Note:</strong> single launches are weaker evidence than launch-plus-logistics or launch-plus-cyber clusters. <strong>Things To Watch:</strong> missile/artillery posture, cyber or space shock, Japan access, USFK posture, evacuation guidance, and trilateral messaging. <strong>Escalation Likelihood:</strong> elevated monitoring in the next 24 hours to 1 week, persistent coercion risk over 1 week to 6 months, and durable structural risk beyond 6 months.</div>`,
    'Current Assessment': `<div class="outlook-box">The Korean Peninsula remains elevated but not invasion-imminent unless multiple posture, logistics, cyber, nuclear-signaling, and public-warning indicators converge.</div>`,
    'Things To Note': `<div class="panel watch-panel"><div class="watch-row"><span>◆</span><span>Single missile launches are lower-confidence indicators unless paired with dispersal, ammunition movement, cyber disruption, or political demands.</span></div><div class="watch-row"><span>◆</span><span>Public-warning credibility and false-alert correction are operational resilience issues in the Seoul-Incheon corridor.</span></div></div>`,
    'Things To Watch': `<div class="panel watch-panel"><div class="watch-row"><span>◆</span><span>SRBM/MRBM launches, 600mm MLRS posture, forward artillery, cyber outages, GPS interference, Japan access, USFK posture, and evacuation guidance.</span></div></div>`,
    'Escalation Likelihood': `<div class="panel"><div class="risk-row"><span class="risk-badge risk-medium">MEDIUM</span><div><div class="risk-location">24 hours to 1 week</div><div class="risk-detail">Elevated monitoring; concern rises with synchronized military, cyber, nuclear, and public-warning indicators.</div></div></div><div class="risk-row"><span class="risk-badge risk-high">HIGH</span><div><div class="risk-location">1 week to 6 months</div><div class="risk-detail">Persistent coercion risk from exercise cycles, sanctions pressure, nuclear rhetoric, and regional diversion.</div></div></div></div>`,
  };
  const content = panels[name];
  if (!content) return '';
  return `<div class="section">
  <div class="section-header">
    <span class="section-title">${escapeHtml(name)}</span>
    <span class="section-label">KOREA WATCH</span>
  </div>
  ${content}
</div>`;
}

function coercePlainReportBody(value, { scope, slug, articles }) {
  const sections = extractPlainReportSections(value);
  const executiveSummary = firstSectionText(sections, ['executive summary', 'summary']);
  const keyDevelopments = sectionBullets(sections, ['key developments', 'global trends', 'priority analysis']);
  const risks = sectionBullets(sections, ['risk assessment', 'areas of concern', 'risks']);
  const watchItems = sectionBullets(sections, ['indicators to watch', 'watch list', 'items to monitor']);
  const outlook = firstSectionText(sections, ['near-term outlook', 'outlook', 'forecast']);

  if (!executiveSummary && keyDevelopments.length < 2 && risks.length < 2) return '';

  const scopeName = scope === 'global'
    ? 'global'
    : scope === 'watch'
      ? watchTitle(slug)
      : (COUNTRY_LABELS[slug] || slug.replace(/-/g, ' '));
  const sourceArticles = Array.isArray(articles) ? articles : [];
  const topDevelopments = keyDevelopments.length
    ? keyDevelopments.slice(0, 8)
    : sourceArticles.slice(0, 8).map((article) => `${article.title}. ${article.description || ''}`.trim());
  const topRisks = risks.length
    ? risks.slice(0, 8)
    : topDevelopments.slice(0, 6);
  const topWatch = watchItems.length
    ? watchItems.slice(0, 12)
    : topDevelopments.slice(0, 8).map((item) => `Monitor follow-on reporting for ${shortTitle(item)}`);

  const trendCards = topDevelopments.map((item, index) => {
    const risk = riskForText(item, index);
    const trajectory = trajectoryForText(item, index);
    const { heading, detail } = splitLeadPhrase(item);
    return `<div class="trend-card">
      <div class="trend-card-head">
        <h3><span class="trend-rank">#${index + 1}</span>${escapeHtml(heading)}</h3>
        <div class="badge-row">
          <span class="risk-badge risk-${risk.toLowerCase()}">${risk}</span>
          <span class="risk-badge trajectory-${trajectory}">${trajectory.toUpperCase()}</span>
        </div>
      </div>
      <p>${escapeHtml(detail || item)}</p>
      <div class="regions-line">REGIONS: ${escapeHtml(inferRegionsLine(item, sourceArticles, scopeName))}</div>
    </div>`;
  }).join('');

  const developments = sourceArticles.slice(0, 10).map((article, index) => {
    const date = article.pubDate ? new Date(article.pubDate).toISOString().slice(0, 10) : 'unknown-date';
    return `<div class="feed-row">
      <div class="feed-meta"><span class="breaking-dot">◉ ${escapeHtml(article.category || 'UPDATE').toUpperCase()}</span><span>${date}</span><span>${escapeHtml(article.source || 'unknown source')}</span></div>
      <div class="feed-title">${escapeHtml(article.title || 'Untitled source item')}</div>
      <div class="feed-summary">${escapeHtml(article.description || 'No summary was available from the feed parser.')} [${index + 1}]</div>
    </div>`;
  }).join('');

  const riskRows = topRisks.map((item, index) => {
    const risk = riskForText(item, index);
    const { heading, detail } = splitLeadPhrase(item);
    return `<div class="risk-row">
      <span class="risk-badge risk-${risk.toLowerCase()}">${risk}</span>
      <div><div class="risk-location">${escapeHtml(heading)}</div><div class="risk-detail">${escapeHtml(detail || item)}</div></div>
    </div>`;
  }).join('');

  const regionCounts = countBy(sourceArticles, (article) => article.geo?.place || article.geo?.country || article.country || scopeName);
  const theaterRows = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([region, count]) => `<div class="theater-row"><div class="theater-name">${escapeHtml(region)}</div><div class="theater-assessment">${count} selected source item${count === 1 ? '' : 's'} currently map to this area. Review for escalation indicators, force posture changes, infrastructure exposure, and second-order operational impacts.</div></div>`)
    .join('');

  const watchRows = topWatch.map((item) => `<div class="watch-row"><span>◆</span><span>${escapeHtml(item)}</span></div>`).join('');
  const summary = executiveSummary || `Current ${scopeName} source coverage is concentrated around ${topDevelopments.slice(0, 3).map(shortTitle).join('; ')}. Prioritize validation of escalation indicators, operational infrastructure impacts, and cross-source confirmation.`;

  return `<div class="exec-summary">
  <strong>EXECUTIVE SUMMARY</strong>
  ${escapeHtml(summary)}
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">${scope === 'watch' ? 'Watch Trends' : 'Global Trends'}</span>
    <span class="section-label">PRIORITY ANALYSIS</span>
  </div>
  ${trendCards}
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Breaking Developments</span>
    <span class="section-label">LATEST SOURCES</span>
  </div>
  <div class="panel">${developments || '<div class="feed-row"><div class="feed-title">No source articles attached.</div></div>'}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Areas of Concern</span>
    <span class="section-label">RISK ASSESSMENT</span>
  </div>
  <div class="panel">${riskRows}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Regional Assessments</span>
    <span class="section-label">BY THEATER</span>
  </div>
  <div class="panel">${theaterRows || `<div class="theater-row"><div class="theater-name">${escapeHtml(scopeName)}</div><div class="theater-assessment">No precise regional clustering was available in the selected source set.</div></div>`}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Near-Term Outlook</span>
    <span class="section-label">30-90 DAY FORECAST</span>
  </div>
  <div class="outlook-box">${escapeHtml(outlook || 'Expect reporting volume and cross-source confirmation to determine whether these signals mature into persistent operational risk. Continue monitoring force posture, infrastructure disruption, cyber activity, logistics effects, sanctions exposure, and official government warnings.')}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Watch List</span>
    <span class="section-label">ITEMS TO MONITOR</span>
  </div>
  <div class="panel watch-panel">${watchRows}</div>
</div>`;
}

function extractPlainReportSections(value) {
  const lines = htmlToPlainReportLines(value);
  const sections = new Map();
  let current = 'preamble';
  sections.set(current, []);
  for (const line of lines) {
    const heading = normalizePlainHeading(line);
    if (heading) {
      current = heading;
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    sections.get(current).push(line);
  }
  return sections;
}

function htmlToPlainReportLines(value) {
  return decodeHtmlEntities(String(value || '')
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n## $1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1\n')
    .replace(/<\/(p|div|section|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\r/g, '\n'))
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizePlainHeading(line) {
  const cleaned = String(line || '')
    .replace(/^#+\s*/, '')
    .replace(/:$/, '')
    .trim()
    .toLowerCase();
  const known = [
    'executive summary',
    'key developments',
    'global trends',
    'priority analysis',
    'breaking developments',
    'risk assessment',
    'areas of concern',
    'regional assessments',
    'near-term outlook',
    'outlook',
    'forecast',
    'indicators to watch',
    'watch list',
    'items to monitor',
  ];
  return known.includes(cleaned) ? cleaned : '';
}

function firstSectionText(sections, names) {
  for (const name of names) {
    const lines = sections.get(name);
    if (lines?.length) return joinSectionLines(lines).slice(0, 2200);
  }
  return '';
}

function sectionBullets(sections, names) {
  for (const name of names) {
    const lines = sections.get(name);
    if (lines?.length) {
      const bullets = splitPlainBullets(lines);
      if (bullets.length) return bullets;
    }
  }
  return [];
}

function splitPlainBullets(lines) {
  const items = [];
  let current = '';
  for (const line of lines) {
    if (/^[-•*]\s+/.test(line)) {
      if (current) items.push(current.trim());
      current = line.replace(/^[-•*]\s+/, '').trim();
    } else if (current) {
      current += ` ${line}`;
    } else {
      current = line;
    }
  }
  if (current) items.push(current.trim());
  return items.filter((item) => item.length > 20);
}

function joinSectionLines(lines) {
  return lines
    .map((line) => line.replace(/^[-•*]\s+/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitLeadPhrase(value) {
  const text = String(value || '').trim();
  const colon = text.match(/^(.{8,110}?):\s+(.+)$/);
  if (colon) return { heading: colon[1], detail: colon[2] };
  const sentence = text.match(/^(.{8,110}?\.)\s+(.+)$/);
  if (sentence) return { heading: sentence[1].replace(/\.$/, ''), detail: sentence[2] };
  return { heading: shortTitle(text), detail: text };
}

function riskForText(value, index = 0) {
  const text = String(value || '').toLowerCase();
  if (/(nuclear|missile|airstrike|war|invasion|critical infrastructure|cyberattack|maritime interdiction|hormuz|taiwan strait|gaza|ukraine|iran)/.test(text)) {
    return index < 3 ? 'CRITICAL' : 'HIGH';
  }
  if (/(military|weapon|sanction|shipping|energy|drone|naval|escalat|frontline|procurement|supply chain)/.test(text)) return 'HIGH';
  if (/(political|economic|technology|semiconductor|trade|diplomatic)/.test(text)) return 'MEDIUM';
  return 'LOW';
}

function trajectoryForText(value, index = 0) {
  const text = String(value || '').toLowerCase();
  if (/(de-escalat|ceasefire|truce|talks resumed|withdraw)/.test(text)) return 'deescalating';
  if (/(escalat|strike|attack|surge|reinforce|mobiliz|offensive|threat)/.test(text)) return 'escalating';
  return index < 3 ? 'escalating' : 'stable';
}

function inferRegionsLine(value, articles, fallback) {
  const text = String(value || '').toLowerCase();
  const regions = [];
  if (/(iran|israel|gaza|lebanon|hormuz|red sea|houthi|middle east)/.test(text)) regions.push('middleEast');
  if (/(ukraine|russia|nato|europe|black sea)/.test(text)) regions.push('europe');
  if (/(china|taiwan|south china sea|north korea|japan|philippines|india|pakistan)/.test(text)) regions.push('asiaPacific');
  if (/(africa|sahel|sudan|ethiopia|congo)/.test(text)) regions.push('africa');
  if (/(america|united states|washington|latin america|caribbean)/.test(text)) regions.push('americas');
  if (regions.length) return Array.from(new Set(regions)).join(' · ');
  const articleRegion = articles.find((article) => article.geo?.place || article.geo?.country || article.country);
  return articleRegion?.geo?.place || articleRegion?.geo?.country || articleRegion?.country || fallback;
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function renderReportHtml({ title, body, articles }) {
  const generatedAt = new Date().toISOString();
  const generatedDate = new Date(generatedAt);
  const displayTitle = escapeHtml(title).replace(' - ', ' &mdash; ');
  const sanitizedBody = closeUnbalancedDivs(sanitizeReportHtml(extractReportBody(stripCodeFence(body))));
  const mapMarkers = buildMapMarkers(articles);
  const topicLinks = buildTopicLinks(title, articles);
  const sourceVisualBrief = buildSourceVisualBrief(articles);
  const signalMatrix = buildSignalMatrix(articles, mapMarkers);
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
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="/assets/user-style.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --report-bg: var(--bg, #0a0c10);
      --report-surface: var(--surface, #0f1117);
      --report-surface-2: var(--surface-2, #141820);
      --report-text: var(--text, #dde2ec);
      --report-muted: var(--muted, #8a94a8);
      --report-faint: var(--faint, #4a5168);
      --report-border: var(--border, rgba(255,255,255,.08));
      --report-accent: var(--accent, #00c8b4);
    }
    body {
      background:var(--report-bg);
      color:var(--report-text);
      font-family:'Inter', system-ui, sans-serif;
      font-size:14px;
      line-height:1.6;
      margin:0;
      min-height:100vh;
      overflow-x:hidden;
    }
    .report-shell {
      width:var(--cm-content-max-width, min(92vw, calc(100vw - 32px)));
      max-width:none;
      margin:0 auto;
      padding:clamp(16px, 2vw, 28px) 0 48px;
    }
    .report-shell * { max-width:100%; }
    .article-map *,
    .leaflet-container *,
    .leaflet-pane *,
    .leaflet-tile-container *,
    .leaflet-tile {
      max-width:none !important;
      max-height:none !important;
    }
    .leaflet-container img { max-width:none !important; }
    .report-shell p,
    .report-shell li,
    .exec-summary,
    .outlook-box,
    .feed-summary,
    .risk-detail,
    .theater-assessment {
      overflow-wrap:anywhere;
    }
    h1, h2, h3 { font-family:'Rajdhani', sans-serif; }
    a { color:var(--report-accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .report-header {
      border-bottom:2px solid color-mix(in srgb, var(--report-accent) 45%, transparent);
      padding-bottom:24px;
      margin-bottom:32px;
    }
    .classification-bar {
      background:color-mix(in srgb, var(--report-accent) 12%, transparent);
      border:1px solid color-mix(in srgb, var(--report-accent) 30%, transparent);
      border-radius:4px;
      padding:6px 14px;
      display:inline-block;
      font-family:'Share Tech Mono', monospace;
      font-size:11px;
      color:var(--report-accent);
      letter-spacing:2px;
      margin-bottom:16px;
    }
    .report-title {
      font-size:32px;
      font-weight:700;
      color:var(--report-accent);
      letter-spacing:1px;
      margin-bottom:8px;
    }
    .meta-row {
      display:flex;
      gap:24px;
      font-family:'Share Tech Mono', monospace;
      font-size:11px;
      color:var(--report-faint);
      flex-wrap:wrap;
    }
    .exec-summary {
      background:var(--report-surface);
      border-left:3px solid var(--report-accent);
      padding:16px 20px;
      border-radius:0 6px 6px 0;
      font-size:15px;
      line-height:1.8;
      color:var(--report-text);
      margin-bottom:40px;
      max-width:none;
      columns:2 360px;
      column-gap:28px;
    }
    .exec-summary strong {
      display:block;
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      color:var(--report-accent);
      letter-spacing:2px;
      margin-bottom:8px;
      column-span:all;
    }
    .section { margin-bottom:40px; }
    .generated-body { display:block; }
    .generated-body::after { content:''; display:block; clear:both; }
    .section,
    .panel,
    .trend-card,
    .outlook-box {
      width:100%;
    }
    .section-header {
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:16px;
      padding-bottom:10px;
      border-bottom:1px solid color-mix(in srgb, var(--report-accent) 22%, transparent);
    }
    .section-title {
      font-size:20px;
      font-weight:700;
      color:var(--report-text);
      text-transform:uppercase;
      letter-spacing:2px;
    }
    .section-label {
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      color:var(--report-accent);
      background:color-mix(in srgb, var(--report-accent) 12%, transparent);
      padding:2px 8px;
      border-radius:3px;
    }
    .panel {
      background:var(--report-surface);
      border:1px solid var(--report-border);
      border-radius:6px;
      overflow:hidden;
    }
    .trend-card {
      background:var(--report-surface-2);
      border:1px solid color-mix(in srgb, var(--report-accent) 25%, var(--report-border));
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
      color:var(--report-accent);
      font-size:18px;
      line-height:1.25;
      flex:1;
    }
    .trend-rank { opacity:.5; margin-right:8px; }
    .trend-card p { color:var(--report-text); line-height:1.7; margin-bottom:12px; }
    .visual-grid {
      display:grid;
      grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));
      gap:14px;
    }
    .visual-card {
      display:grid;
      grid-template-rows:150px auto;
      min-height:320px;
      overflow:visible;
      border:1px solid color-mix(in srgb, var(--report-accent) 25%, var(--report-border));
      border-radius:6px;
      background:var(--report-surface);
      text-decoration:none;
    }
    .visual-card-media {
      display:grid;
      place-items:center;
      min-height:150px;
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--report-accent) 18%, transparent), transparent 60%),
        var(--report-surface-2);
      border-bottom:1px solid var(--report-border);
      overflow:hidden;
    }
    .visual-card-media img {
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }
    .visual-card-placeholder {
      width:100%;
      height:100%;
      display:grid;
      align-content:center;
      gap:8px;
      padding:16px;
      font-family:'Share Tech Mono', monospace;
      color:var(--report-accent);
      letter-spacing:.12em;
      text-transform:uppercase;
    }
    .visual-card-placeholder[hidden] { display:none; }
    .visual-card-placeholder strong {
      display:block;
      color:var(--report-text);
      font-family:'Rajdhani', sans-serif;
      font-size:clamp(18px, 2vw, 24px);
      letter-spacing:.06em;
      line-height:1.08;
      overflow-wrap:anywhere;
      word-break:break-word;
    }
    .visual-card-body { padding:14px; display:grid; gap:8px; align-content:start; }
    .visual-card-title { color:var(--report-text); font-weight:700; line-height:1.25; }
    .visual-card-summary { color:var(--report-muted); font-size:13px; line-height:1.55; }
    .visual-card-meta {
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      color:var(--report-faint);
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .signal-grid {
      display:grid;
      grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));
      gap:10px;
      padding:14px;
    }
    .signal-tile {
      border:1px solid var(--report-border);
      border-radius:6px;
      background:var(--report-surface-2);
      padding:12px;
    }
    .signal-value { color:var(--report-accent); font-family:'Rajdhani', sans-serif; font-size:30px; font-weight:700; line-height:1; }
    .signal-label { margin-top:6px; color:var(--report-muted); font-family:'Share Tech Mono', monospace; font-size:10px; letter-spacing:.1em; text-transform:uppercase; }
    .source-data-table {
      width:100%;
      border-collapse:collapse;
      font-size:13px;
    }
    .source-data-table th,
    .source-data-table td {
      padding:10px 12px;
      border-bottom:1px solid var(--report-border);
      text-align:left;
      vertical-align:top;
    }
    .source-data-table th {
      color:var(--report-accent);
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      letter-spacing:.1em;
      text-transform:uppercase;
      background:color-mix(in srgb, var(--report-accent) 8%, transparent);
    }
    .source-data-table td { color:var(--report-text); }
    .source-data-table .muted { color:var(--report-muted); }
    .regions-line {
      color:var(--report-muted);
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
      border-bottom:1px solid var(--report-border);
    }
    .feed-row:last-child, .risk-row:last-child, .theater-row:last-child, .watch-row:last-child { border-bottom:0; }
    .feed-meta {
      display:flex;
      align-items:center;
      gap:10px;
      margin-bottom:6px;
      color:var(--report-faint);
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      flex-wrap:wrap;
    }
    .breaking-dot { color:#ff4466; }
    .feed-title { color:var(--report-text); font-weight:600; margin-bottom:4px; }
    .feed-summary, .risk-detail, .theater-assessment { color:var(--report-muted); font-size:13px; line-height:1.6; }
    .risk-row { display:flex; gap:12px; align-items:flex-start; }
    .risk-location { color:var(--report-text); font-weight:600; margin-bottom:4px; }
    .theater-name {
      color:var(--report-accent);
      font-family:'Share Tech Mono', monospace;
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:1px;
      margin-bottom:6px;
    }
    .outlook-box {
      background:var(--report-surface-2);
      border:1px solid color-mix(in srgb, var(--report-accent) 30%, var(--report-border));
      border-radius:6px;
      padding:20px;
      font-size:14px;
      line-height:1.8;
      color:var(--report-text);
    }
    .watch-panel { padding:8px 16px; }
    .watch-row {
      display:flex;
      align-items:flex-start;
      gap:10px;
      padding:8px 0;
      border-bottom:1px solid var(--report-border);
      color:var(--report-text);
      font-size:13px;
    }
    .watch-row span:first-child { color:var(--report-accent); flex-shrink:0; margin-top:2px; }
    .sources { margin-top:40px; }
    .sources .panel { padding:8px 16px; }
    .source-list { padding-left:20px; }
    .source-list li { padding:8px 0; color:var(--report-text); border-bottom:1px solid var(--report-border); }
    .source-list span { color:var(--report-muted); margin-left:8px; }
    .article-map {
      height:360px;
      border:1px solid color-mix(in srgb, var(--report-accent) 30%, var(--report-border));
      border-radius:6px;
      overflow:hidden;
      background:#05070a;
    }
    .article-map .leaflet-tile { width:256px !important; height:256px !important; }
    .leaflet-container { background:#05070a; font-family:'Inter', system-ui, sans-serif; }
    .leaflet-popup-content-wrapper, .leaflet-popup-tip { background:var(--report-surface-2); color:var(--report-text); }
    .leaflet-popup-content a { color:var(--report-accent); }
    .topic-grid {
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      padding:16px;
    }
    .topic-link {
      display:inline-flex;
      border:1px solid color-mix(in srgb, var(--report-accent) 28%, var(--report-border));
      background:color-mix(in srgb, var(--report-accent) 9%, var(--report-surface));
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
      border-top:1px solid var(--report-border);
      font-family:'Share Tech Mono', monospace;
      font-size:10px;
      color:var(--report-faint);
      text-align:center;
    }
    @media (max-width: 700px) {
      .report-shell { width:calc(100vw - 28px); padding-top:16px; padding-bottom:36px; }
      .trend-card-head { flex-direction:column; }
      .badge-row { margin-left:0; }
      .meta-row { gap:8px 18px; }
      .visual-card { grid-template-rows:130px auto; }
      .source-data-table { display:block; overflow-x:auto; }
    }
  </style>
</head>
<body>
<main class="report-shell">
  <div class="report-header">
    <div class="classification-bar">UNCLASSIFIED // FOR INFORMATIONAL PURPOSES</div>
    <h1 class="report-title">${displayTitle}</h1>
    <div class="meta-row">
      <span>GENERATED: ${escapeHtml(generatedDate.toUTCString())}</span>
      <span>SOURCE: AI ANALYSIS + RSS MONITORING</span>
      <span>DISTRIBUTION: UNRESTRICTED</span>
    </div>
  </div>

  ${sourceVisualBrief}

  ${signalMatrix}

  <div class="generated-body">
    ${sanitizedBody}
  </div>

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
</main>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const reportMarkers = ${safeJson(mapMarkers)};
    const mapEl = document.getElementById('report-map');
    if (mapEl && window.L) {
      const map = L.map(mapEl, { scrollWheelZoom: false, worldCopyJump: true }).setView([20, 0], 2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 8,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
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
      requestAnimationFrame(() => map.invalidateSize());
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

function buildSourceVisualBrief(articles = []) {
  const visualArticles = selectDiverseSourcePreview(articles, 6);
  if (!visualArticles.length) return '';
  const cards = visualArticles.map((article, index) => {
    const image = articleImageUrl(article);
    const title = article.title || 'Untitled source item';
    const source = article.source || article.thinkTank || 'unknown source';
    const date = article.pubDate || article.publishedAt || article.fetchedAt;
    const dateLabel = date ? new Date(date).toISOString().slice(0, 10) : 'undated';
    const summary = articleSummary(article);
    const href = article.link || article.url || `https://news.google.com/search?q=${encodeURIComponent(title)}`;
    const fallback = `<div class="visual-card-placeholder"${image ? ' hidden' : ''}><span>Source preview</span><strong>${escapeHtml(source)}</strong><span>${escapeHtml((article.category || 'reporting').toUpperCase())}</span></div>`;
    const media = image
      ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true; this.nextElementSibling.hidden=false">${fallback}`
      : fallback;
    return `<a class="visual-card" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">
      <div class="visual-card-media">${media}</div>
      <div class="visual-card-body">
        <div class="visual-card-meta"><span>#${index + 1}</span><span>${escapeHtml(source)}</span><span>${escapeHtml(dateLabel)}</span></div>
        <div class="visual-card-title">${escapeHtml(title)}</div>
        <div class="visual-card-summary">${escapeHtml(summary)}</div>
      </div>
    </a>`;
  }).join('');

  return `<div class="section">
    <div class="section-header">
      <span class="section-title">Source Visual Brief</span>
      <span class="section-label">DIVERSE SOURCE PREVIEW</span>
    </div>
    <div class="visual-grid">${cards}</div>
  </div>`;
}

function selectDiverseSourcePreview(articles = [], limit = 6) {
  const candidates = articles.filter((article) => article?.title || article?.description);
  const selected = [];
  const used = new Set();
  const sourceCounts = new Map();

  for (const article of candidates) {
    if (selected.length >= limit) break;
    const source = sourceKey(article);
    const count = sourceCounts.get(source) || 0;
    if (count >= 1) continue;
    selected.push(article);
    used.add(article);
    sourceCounts.set(source, count + 1);
  }

  for (const article of candidates) {
    if (selected.length >= limit) break;
    if (used.has(article)) continue;
    const source = sourceKey(article);
    const count = sourceCounts.get(source) || 0;
    if (count >= 2) continue;
    selected.push(article);
    used.add(article);
    sourceCounts.set(source, count + 1);
  }

  for (const article of candidates) {
    if (selected.length >= limit) break;
    if (!used.has(article)) selected.push(article);
  }

  return selected;
}

function buildSignalMatrix(articles = [], mapMarkers = []) {
  const recent24 = articles.filter((article) => articleWithinDays(article, 1)).length;
  const recent7 = articles.filter((article) => articleWithinDays(article, 7)).length;
  const sourceCounts = countBy(articles, (article) => article.source || article.thinkTank || 'unknown');
  const categoryCounts = countBy(articles, (article) => article.category || 'analysis');
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0] || ['unknown', 0];
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] || ['analysis', 0];
  const rows = articles.slice(0, 8).map((article, index) => {
    const date = article.pubDate || article.publishedAt || article.fetchedAt;
    const dateLabel = date ? new Date(date).toISOString().slice(0, 10) : 'undated';
    const place = article.geo?.place || article.geo?.country || article.country || 'unresolved';
    return `<tr>
      <td>${index + 1}</td>
      <td><a href="${escapeAttr(article.link || article.url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title || 'Untitled source item')}</a></td>
      <td class="muted">${escapeHtml(article.source || article.thinkTank || 'unknown')}</td>
      <td class="muted">${escapeHtml(place)}</td>
      <td class="muted">${escapeHtml(dateLabel)}</td>
    </tr>`;
  }).join('');

  return `<div class="section">
    <div class="section-header">
      <span class="section-title">Source Signal Matrix</span>
      <span class="section-label">DATA VIEW</span>
    </div>
    <div class="panel">
      <div class="signal-grid">
        <div class="signal-tile"><div class="signal-value">${articles.length}</div><div class="signal-label">referenced source articles</div></div>
        <div class="signal-tile"><div class="signal-value">${recent24}</div><div class="signal-label">published in last 24 hours</div></div>
        <div class="signal-tile"><div class="signal-value">${recent7}</div><div class="signal-label">published in last 7 days</div></div>
        <div class="signal-tile"><div class="signal-value">${mapMarkers.length}</div><div class="signal-label">geo-tagged map records</div></div>
        <div class="signal-tile"><div class="signal-value">${escapeHtml(String(topSource[1]))}</div><div class="signal-label">top source: ${escapeHtml(topSource[0])}</div></div>
        <div class="signal-tile"><div class="signal-value">${escapeHtml(String(topCategory[1]))}</div><div class="signal-label">top category: ${escapeHtml(topCategory[0])}</div></div>
      </div>
      <table class="source-data-table">
        <thead><tr><th>#</th><th>Referenced Article</th><th>Source</th><th>Place</th><th>Date</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="muted">No source rows available.</td></tr>'}</tbody>
      </table>
    </div>
  </div>`;
}

function articleWithinDays(article, days) {
  const raw = article?.pubDate || article?.publishedAt || article?.fetchedAt;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) && time >= Date.now() - days * 86400000;
}

function articleSummary(article) {
  const raw = article?.summary || article?.description || article?.contentSnippet || article?.title || 'No feed summary was available.';
  return decodeHtmlEntities(String(raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 220);
}

function articleImageUrl(article) {
  const candidates = [
    article?.image,
    article?.imageUrl,
    article?.thumbnail,
    article?.media?.url,
    article?.media?.thumbnail,
    article?.enclosure?.url,
    article?.ogImage,
  ];
  return candidates.find((value) => /^https?:\/\//i.test(String(value || '').trim())) || '';
}

function closeUnbalancedDivs(html) {
  const value = String(html || '');
  const openCount = (value.match(/<div\b/gi) || []).length;
  const closeCount = (value.match(/<\/div>/gi) || []).length;
  if (openCount <= closeCount) return value;
  return `${value}${'</div>'.repeat(openCount - closeCount)}`;
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

function countBy(items, fn) {
  const counts = {};
  for (const item of items) {
    const key = String(fn(item) || 'unknown').trim() || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function riskForArticle(article, index = 0) {
  const text = `${article.title || ''} ${article.description || ''} ${article.category || ''}`.toLowerCase();
  if (/(nuclear|missile|airstrike|invasion|war|attack|killed|evacuation|emergency|critical infrastructure|cyberattack|explosion)/.test(text)) {
    return index < 3 ? 'HIGH' : 'MEDIUM';
  }
  if (/(military|sanction|shipping|energy|semiconductor|supply chain|protest|border|drone|naval)/.test(text)) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function riskDetailForArticle(article, scopeName) {
  const category = article.category || 'general';
  const source = article.source || 'unknown source';
  const base = article.description || article.title || 'Source item requires analyst review.';
  return `${source} reporting in the ${category} category may affect ${scopeName} risk posture. ${base}`.slice(0, 360);
}

function shortTitle(title) {
  const value = String(title || 'source item').trim();
  return value.length > 86 ? `${value.slice(0, 83)}...` : value;
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

function extractReportBody(value) {
  const html = String(value || '').trim();
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  return html
    .replace(/<!doctype[^>]*>/i, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .trim();
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
