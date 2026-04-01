/**
 * analysis-generator.js — AI-powered report generation for Conflict Mapper
 *
 * Orchestrates the full pipeline:
 *   1. Gather recent articles (from cache + flagged)
 *   2. Build AI prompts with article context
 *   3. Send to configured AI provider
 *   4. Parse JSON response from AI
 *   5. Render as HTML dossier matching the site's military aesthetic
 *   6. Save to reports/[global|countries]/[slug]/current/report.html
 *   7. Archive previous report to historical/ with timestamp
 *
 * Exports:
 *   generateGlobalAnalysis(options)
 *   generateCountryAnalysis(slug, options)
 *   generateAllCountries(options, progressCallback)
 *   generateAll(options, progressCallback)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { getProvider }       = require('./ai-providers');
const { getAIConfig, getArticles, getFlaggedArticles } = require('./feed-store');
const { getCountryFromSlug } = require('./geocoder');

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const REPORTS_DIR  = path.join(__dirname, '..', 'reports');
const MAX_ARTICLES_FOR_PROMPT = 80;  // Cap to avoid exceeding context limits
const ARTICLE_SNIPPET_LEN    = 200;  // Characters per article in prompt

// All countries available for per-country analysis
const COUNTRY_SLUGS = [
  'usa', 'russia', 'china', 'ukraine', 'taiwan',
  'iran', 'israel', 'india', 'pakistan', 'north-korea', 'nato',
];

// ─────────────────────────────────────────────────────────────────────────────
// FILE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Archive the current report to historical/, adding a timestamp to the filename.
 */
function archiveCurrentReport(currentDir, historicalDir) {
  const currentFile = path.join(currentDir, 'report.html');
  if (!fs.existsSync(currentFile)) return;

  ensureDir(historicalDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archivePath = path.join(historicalDir, `report-${timestamp}.html`);

  try {
    fs.copyFileSync(currentFile, archivePath);
  } catch (err) {
    console.warn(`[analysis-generator] Could not archive report: ${err.message}`);
  }
}

/**
 * List historical reports for a given type + slug.
 */
function listHistoricalReports(type, slug = null) {
  let historicalDir;
  if (type === 'global') {
    historicalDir = path.join(REPORTS_DIR, 'global', 'historical');
  } else {
    historicalDir = path.join(REPORTS_DIR, 'countries', slug, 'historical');
  }

  if (!fs.existsSync(historicalDir)) return [];

  return fs.readdirSync(historicalDir)
    .filter(f => f.endsWith('.html'))
    .sort()
    .reverse()  // Newest first
    .map(f => ({
      filename:  f,
      timestamp: f.replace('report-', '').replace('.html', '').replace(/-/g, ':').slice(0, 19),
      url:       `/reports/${type === 'global' ? 'global/historical' : `countries/${slug}/historical`}/${f}`,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE PREPARATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format an article as a brief text snippet for the AI prompt.
 */
function formatArticleForPrompt(article, index) {
  const date = article.pubDate
    ? new Date(article.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown date';
  const desc = (article.description || '').slice(0, ARTICLE_SNIPPET_LEN);
  return `[${index + 1}] ${date} | ${article.source} | ${article.category?.toUpperCase() || 'NEWS'}\n` +
         `Title: ${article.title}\n` +
         `${desc ? `Summary: ${desc}\n` : ''}` +
         `URL: ${article.link || 'N/A'}`;
}

/**
 * Gather and format articles for a given country (or global).
 * Combines cached articles + flagged articles, capped to MAX_ARTICLES_FOR_PROMPT.
 *
 * @param {string|null} country - Country name to filter by, or null for global
 * @param {string|null} slug    - Country slug for flagged article filtering
 * @returns {string} Formatted article text for prompt insertion
 */
function gatherArticlesForPrompt(country = null, slug = null) {
  // Get regular articles
  const filters = { timeRange: 72 }; // Last 72 hours
  if (country && country !== 'global') {
    filters.country = country;
  }
  let articles = getArticles(filters);

  // Get flagged articles (include global flags too)
  const flagged = getFlaggedArticles(slug);
  const flaggedArticles = flagged
    .map(f => f.article)
    .filter(Boolean)
    .map(a => ({ ...a, isFlagged: true }));

  // Combine: flagged articles first (analyst-curated), then regular
  const combined = [...flaggedArticles, ...articles];

  // Deduplicate by ID
  const seen = new Set();
  const deduped = combined.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Cap and format
  const capped = deduped.slice(0, MAX_ARTICLES_FOR_PROMPT);
  if (capped.length === 0) {
    return 'No recent articles available from RSS feeds. Rely on your training data and web search capability for current events.';
  }

  return capped.map(formatArticleForPrompt).join('\n\n---\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// AI PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_SYSTEM_PROMPT = `You are a senior geopolitical intelligence analyst producing a classified-style global intelligence briefing. Your analysis is comprehensive, data-driven, and written for a high-level audience including national security professionals, defense analysts, and foreign policy experts.

Your output must be valid JSON matching this exact schema:
{
  "title": "Global Intelligence Report — [DATE]",
  "classification": "UNCLASSIFIED // FOR INFORMATIONAL PURPOSES",
  "generatedAt": "[ISO timestamp]",
  "executiveSummary": "2-3 sentence top-level summary of the most critical global developments",
  "globalTrends": [
    {
      "rank": 1,
      "title": "Trend title",
      "description": "Detailed description (100-200 words)",
      "riskLevel": "CRITICAL|HIGH|MEDIUM|LOW",
      "regions": ["region1", "region2"],
      "coordinates": [{"lat": 0, "lng": 0, "label": "location name"}],
      "trend": "ESCALATING|STABLE|DE-ESCALATING"
    }
  ],
  "areasOfConcern": [
    {
      "location": "Location name",
      "description": "What is happening and why it matters",
      "riskLevel": "CRITICAL|HIGH|MEDIUM|LOW",
      "coordinates": {"lat": 0, "lng": 0}
    }
  ],
  "breakingDevelopments": [
    {
      "headline": "Brief headline",
      "detail": "1-2 sentence detail",
      "source": "Source name or 'AI Analysis'",
      "timestamp": "Approximate date/time"
    }
  ],
  "regionAssessments": {
    "europe": "2-3 sentence assessment",
    "middleEast": "2-3 sentence assessment",
    "asiaPacific": "2-3 sentence assessment",
    "africa": "2-3 sentence assessment",
    "americas": "2-3 sentence assessment",
    "arctic": "2-3 sentence assessment"
  },
  "nearTermOutlook": "3-4 sentence forward-looking assessment of the next 30-90 days",
  "watchList": ["Item 1 to watch", "Item 2", "Item 3", "Item 4", "Item 5"]
}

Rules:
- Output ONLY the JSON object, no markdown code blocks, no preamble
- Use current date/time for generatedAt
- Include 5-7 globalTrends ranked by severity
- Include 5-10 areasOfConcern with accurate coordinates
- Keep descriptions factual, analytical, and cite article sources where possible
- Risk levels: CRITICAL (imminent conflict/catastrophe), HIGH (significant escalation risk), MEDIUM (notable development), LOW (monitoring required)`;

const GLOBAL_USER_PROMPT = (articles) => `Current date: ${new Date().toUTCString()}

The following articles have been collected from monitored RSS feeds over the past 72 hours:

${articles}

Based on these articles and your knowledge of current geopolitical events, produce the comprehensive global intelligence report in the exact JSON format specified. Focus on identifying what has CHANGED from baseline normal activity — escalations, de-escalations, new developments, and emerging threats. Provide accurate geographic coordinates for all referenced locations.`;

// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_SYSTEM_PROMPT = (countryName) => `You are a senior intelligence analyst specializing in ${countryName}. You are producing a comprehensive country intelligence dossier in the style of classified intelligence briefings.

Your output must be valid JSON matching this exact schema:
{
  "country": "${countryName}",
  "generatedAt": "[ISO timestamp]",
  "classification": "UNCLASSIFIED // FOR INFORMATIONAL PURPOSES",
  "executiveSummary": "3-4 sentence overall assessment of ${countryName}'s current situation",
  "threatLevel": "CRITICAL|HIGH|ELEVATED|GUARDED|LOW",
  "sections": {
    "geopolitical": {
      "title": "Geopolitical News",
      "content": "Comprehensive analysis of international relations, diplomatic developments, alliances, and foreign policy moves (200-400 words)",
      "keyDevelopments": ["Development 1", "Development 2", "Development 3"],
      "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
    },
    "breaking": {
      "title": "Breaking News",
      "content": "Most recent and time-sensitive developments (150-300 words)",
      "keyDevelopments": ["Item 1", "Item 2", "Item 3"],
      "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
    },
    "military": {
      "title": "Military & Defense",
      "content": "Weapons systems, capabilities, technology, deployments, exercises, procurement (200-400 words)",
      "keyDevelopments": ["System/development 1", "System/development 2", "System/development 3"],
      "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
    },
    "political": {
      "title": "Political News",
      "content": "Internal politics, leadership, governance, elections, political stability (200-400 words)",
      "keyDevelopments": ["Item 1", "Item 2", "Item 3"],
      "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
    },
    "economic": {
      "title": "Economic News",
      "content": "Economic indicators, sanctions, trade, markets, fiscal policy, energy (200-400 words)",
      "keyDevelopments": ["Item 1", "Item 2", "Item 3"],
      "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
    },
    "science": {
      "title": "Science & Technology",
      "content": "Scientific research, dual-use technology, space programs, energy technology (150-300 words)",
      "keyDevelopments": ["Item 1", "Item 2", "Item 3"],
      "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
    },
    "ai": {
      "title": "Artificial Intelligence",
      "content": "AI programs, investments, military AI applications, autonomous systems policy (150-300 words)",
      "keyDevelopments": ["Item 1", "Item 2", "Item 3"],
      "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
    },
    "robotics": {
      "title": "Robotics & Engineering",
      "content": "Drone programs, autonomous systems, manufacturing, robotics research with military/strategic implications (150-300 words)",
      "keyDevelopments": ["Item 1", "Item 2", "Item 3"],
      "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
    }
  },
  "areasOfConcern": [
    {
      "title": "Concern title",
      "description": "What is happening and why it matters strategically",
      "riskLevel": "CRITICAL|HIGH|MEDIUM|LOW",
      "coordinates": {"lat": 0, "lng": 0}
    }
  ],
  "nearTermOutlook": "3-4 sentence forward-looking assessment for ${countryName} over the next 30-90 days",
  "mapMarkers": [
    {"lat": 0, "lng": 0, "label": "Location name", "type": "event|base|conflict|political"}
  ]
}

Rules:
- Output ONLY the JSON object, no markdown, no preamble
- Provide accurate coordinates for all locations mentioned
- Be analytical and specific, not vague
- Cite specific article headlines as evidence where possible
- Distinguish between confirmed events and analyst assessment`;

const COUNTRY_USER_PROMPT = (countryName, articles) => `Current date: ${new Date().toUTCString()}
Country focus: ${countryName}

Articles from monitored feeds (past 72 hours, filtered for ${countryName} relevance):

${articles}

Produce the comprehensive ${countryName} intelligence dossier in the exact JSON format specified. Draw on both the provided articles AND your broader knowledge of ${countryName}'s current situation. Highlight what is NEW or CHANGING versus the established baseline.`;

// ─────────────────────────────────────────────────────────────────────────────
// HTML TEMPLATE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getRiskBadge(level)
 * Return HTML for a color-coded risk level badge.
 */
function getRiskBadge(level) {
  const colors = {
    CRITICAL:    '#ff2244',
    HIGH:        '#ff6600',
    ELEVATED:    '#ffaa00',
    MEDIUM:      '#ffaa00',
    GUARDED:     '#88cc00',
    LOW:         '#00cc88',
    IMPROVING:   '#00cc88',
    ESCALATING:  '#ff4444',
    STABLE:      '#aaaaaa',
    DE_ESCALATING: '#00cc88',
    MIXED:       '#ffaa00',
  };
  const color = colors[level?.toUpperCase()] || '#aaaaaa';
  return `<span class="risk-badge" style="background:${color}22;color:${color};border:1px solid ${color}44;padding:2px 8px;border-radius:3px;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1px;">${level || 'UNKNOWN'}</span>`;
}

/**
 * getTrendArrow(direction)
 * Return an HTML arrow symbol for trend direction.
 */
function getTrendArrow(direction) {
  const arrows = {
    ESCALATING:      '▲',
    DE_ESCALATING:   '▼',
    'DE-ESCALATING': '▼',
    IMPROVING:       '▼',
    STABLE:          '■',
    MIXED:           '◆',
  };
  return arrows[direction?.toUpperCase()] || '■';
}

/**
 * renderGlobalHTML(data)
 * Convert the AI JSON response to a styled HTML dossier page (global report).
 */
function renderGlobalHTML(data) {
  const now = new Date().toISOString();
  const trends = data.globalTrends || [];
  const concerns = data.areasOfConcern || [];
  const breaking = data.breakingDevelopments || [];
  const regions = data.regionAssessments || {};
  const watchList = data.watchList || [];

  const trendsHtml = trends.map(t => `
    <div class="trend-card" style="background:#141820;border:1px solid rgba(0,200,180,0.15);border-radius:6px;padding:20px;margin-bottom:16px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
        <h3 style="color:#00c8b4;font-family:'Rajdhani',sans-serif;font-size:18px;margin:0;flex:1;">
          <span style="opacity:0.5;margin-right:8px;">#${t.rank || '?'}</span>${t.title || 'Untitled Trend'}
        </h3>
        <div style="display:flex;gap:8px;flex-shrink:0;margin-left:16px;">
          ${getRiskBadge(t.riskLevel)}
          ${getRiskBadge(t.trend)}
        </div>
      </div>
      <p style="color:#c8d0dc;line-height:1.7;margin:0 0 12px;">${t.description || ''}</p>
      ${t.regions && t.regions.length > 0 ? `<div style="color:#8a94a8;font-family:'Share Tech Mono',monospace;font-size:11px;">REGIONS: ${t.regions.join(' · ')}</div>` : ''}
    </div>
  `).join('');

  const concernsHtml = concerns.map(c => `
    <div style="display:flex;gap:12px;padding:14px;border-bottom:1px solid rgba(255,255,255,0.05);">
      <div style="flex-shrink:0;">${getRiskBadge(c.riskLevel)}</div>
      <div>
        <div style="color:#dde2ec;font-weight:600;margin-bottom:4px;">${c.location || 'Unknown Location'}</div>
        <div style="color:#8a94a8;font-size:13px;line-height:1.6;">${c.description || ''}</div>
      </div>
    </div>
  `).join('');

  const breakingHtml = breaking.slice(0, 10).map(b => `
    <div style="padding:14px;border-bottom:1px solid rgba(255,255,255,0.05);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="color:#ff4466;font-family:'Share Tech Mono',monospace;font-size:10px;">◉ BREAKING</span>
        <span style="color:#4a5168;font-family:'Share Tech Mono',monospace;font-size:10px;">${b.timestamp || 'RECENT'}</span>
        <span style="color:#4a5168;font-family:'Share Tech Mono',monospace;font-size:10px;">${b.source || ''}</span>
      </div>
      <div style="color:#dde2ec;font-weight:600;margin-bottom:4px;">${b.headline || ''}</div>
      <div style="color:#8a94a8;font-size:13px;">${b.detail || ''}</div>
    </div>
  `).join('');

  const regionRows = Object.entries(regions).map(([region, text]) => `
    <div style="padding:14px;border-bottom:1px solid rgba(255,255,255,0.05);">
      <div style="color:#00c8b4;font-family:'Share Tech Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${region.replace(/([A-Z])/g, ' $1').trim()}</div>
      <div style="color:#c8d0dc;font-size:13px;line-height:1.7;">${text}</div>
    </div>
  `).join('');

  const watchHtml = watchList.map(item => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="color:#00c8b4;flex-shrink:0;margin-top:2px;">◆</span>
      <span style="color:#c8d0dc;font-size:13px;">${item}</span>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Global Intelligence Report — ${new Date().toLocaleDateString()}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0a0c10;
  color: #dde2ec;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}
h1, h2, h3 { font-family: 'Rajdhani', sans-serif; }
.report-header {
  border-bottom: 2px solid rgba(0,200,180,0.3);
  padding-bottom: 24px;
  margin-bottom: 32px;
}
.report-title {
  font-size: 32px;
  font-weight: 700;
  color: #00c8b4;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.classification-bar {
  background: rgba(0,200,180,0.1);
  border: 1px solid rgba(0,200,180,0.2);
  border-radius: 4px;
  padding: 6px 14px;
  display: inline-block;
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: #00c8b4;
  letter-spacing: 2px;
  margin-bottom: 16px;
}
.meta-row {
  display: flex;
  gap: 24px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: #4a5168;
  flex-wrap: wrap;
}
.section {
  margin-bottom: 40px;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0,200,180,0.15);
}
.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #dde2ec;
  text-transform: uppercase;
  letter-spacing: 2px;
}
.section-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  color: #00c8b4;
  background: rgba(0,200,180,0.1);
  padding: 2px 8px;
  border-radius: 3px;
}
.exec-summary {
  background: rgba(0,200,180,0.07);
  border-left: 3px solid #00c8b4;
  padding: 16px 20px;
  border-radius: 0 6px 6px 0;
  font-size: 15px;
  line-height: 1.8;
  color: #c8d0dc;
  margin-bottom: 40px;
}
.panel {
  background: #0f1117;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
  overflow: hidden;
}
.outlook-box {
  background: #141820;
  border: 1px solid rgba(0,200,180,0.2);
  border-radius: 6px;
  padding: 20px;
  font-size: 14px;
  line-height: 1.8;
  color: #c8d0dc;
}
.generated-stamp {
  margin-top: 48px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  color: #4a5168;
  text-align: center;
}
</style>
</head>
<body>
<div class="report-header">
  <div class="classification-bar">${data.classification || 'UNCLASSIFIED // FOR INFORMATIONAL PURPOSES'}</div>
  <h1 class="report-title">${data.title || 'GLOBAL INTELLIGENCE REPORT'}</h1>
  <div class="meta-row">
    <span>GENERATED: ${new Date(data.generatedAt || now).toUTCString()}</span>
    <span>SOURCE: AI ANALYSIS + RSS MONITORING</span>
    <span>DISTRIBUTION: UNRESTRICTED</span>
  </div>
</div>

<div class="exec-summary">
  <strong style="display:block;font-family:'Share Tech Mono',monospace;font-size:10px;color:#00c8b4;letter-spacing:2px;margin-bottom:8px;">EXECUTIVE SUMMARY</strong>
  ${data.executiveSummary || 'No summary available.'}
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Global Trends</span>
    <span class="section-label">PRIORITY ANALYSIS</span>
  </div>
  ${trendsHtml || '<p style="color:#4a5168;">No trends identified.</p>'}
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Breaking Developments</span>
    <span class="section-label">LAST 72H</span>
  </div>
  <div class="panel">${breakingHtml || '<p style="padding:16px;color:#4a5168;">No breaking developments.</p>'}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Areas of Concern</span>
    <span class="section-label">RISK ASSESSMENT</span>
  </div>
  <div class="panel">${concernsHtml || '<p style="padding:16px;color:#4a5168;">No areas of concern flagged.</p>'}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Regional Assessments</span>
    <span class="section-label">BY THEATER</span>
  </div>
  <div class="panel">${regionRows || '<p style="padding:16px;color:#4a5168;">No regional assessments.</p>'}</div>
</div>

<div class="section">
  <div class="section-header">
    <span class="section-title">Near-Term Outlook</span>
    <span class="section-label">30–90 DAY FORECAST</span>
  </div>
  <div class="outlook-box">${data.nearTermOutlook || 'No outlook available.'}</div>
</div>

${watchList.length > 0 ? `
<div class="section">
  <div class="section-header">
    <span class="section-title">Watch List</span>
    <span class="section-label">ITEMS TO MONITOR</span>
  </div>
  <div class="panel" style="padding:8px 16px;">
    ${watchHtml}
  </div>
</div>
` : ''}

<div class="generated-stamp">
  CONFLICT MAPPER — AUTO-GENERATED INTELLIGENCE BRIEF // ${new Date().toUTCString()} // AI-ASSISTED ANALYSIS
</div>
</body>
</html>`;
}

/**
 * renderCountryHTML(data)
 * Convert the AI JSON response to a styled HTML dossier page (country report).
 */
function renderCountryHTML(data) {
  const now = new Date().toISOString();
  const sections = data.sections || {};
  const concerns = data.areasOfConcern || [];

  // Section icon mapping
  const sectionIcons = {
    geopolitical: '🌐',
    breaking:     '⚡',
    military:     '⚔',
    political:    '🏛',
    economic:     '📊',
    science:      '🔬',
    ai:           '🤖',
    robotics:     '⚙',
  };

  const sectionsHtml = Object.entries(sections).map(([key, section]) => {
    if (!section) return '';
    const devItems = (section.keyDevelopments || []).map(d =>
      `<li style="color:#c8d0dc;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">${d}</li>`
    ).join('');

    return `
    <div class="section" id="section-${key}">
      <div class="section-header">
        <span class="section-title">${section.title || key}</span>
        <span class="section-label">${section.trendDirection || ''}</span>
        ${section.trendDirection ? getRiskBadge(section.trendDirection) : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 280px;gap:20px;align-items:flex-start;">
        <p style="color:#c8d0dc;line-height:1.8;font-size:14px;">${(section.content || '').replace(/\n/g, '<br>')}</p>
        ${devItems ? `
        <div style="background:#141820;border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:16px;">
          <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#00c8b4;letter-spacing:1px;margin-bottom:10px;">KEY DEVELOPMENTS</div>
          <ul style="list-style:none;padding:0;">${devItems}</ul>
        </div>
        ` : ''}
      </div>
    </div>`;
  }).join('');

  const concernsHtml = concerns.map(c => `
    <div style="display:flex;gap:12px;padding:14px;border-bottom:1px solid rgba(255,255,255,0.05);">
      <div style="flex-shrink:0;">${getRiskBadge(c.riskLevel)}</div>
      <div>
        <div style="color:#dde2ec;font-weight:600;margin-bottom:4px;">${c.title || 'Area of Concern'}</div>
        <div style="color:#8a94a8;font-size:13px;line-height:1.6;">${c.description || ''}</div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.country || 'Country'} Intelligence Dossier — ${new Date().toLocaleDateString()}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #0a0c10;
  color: #dde2ec;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}
h1, h2, h3 { font-family: 'Rajdhani', sans-serif; }
.report-header {
  border-bottom: 2px solid rgba(0,200,180,0.3);
  padding-bottom: 24px;
  margin-bottom: 32px;
}
.report-title { font-size: 32px; font-weight: 700; color: #00c8b4; letter-spacing: 1px; margin-bottom: 8px; }
.classification-bar {
  background: rgba(0,200,180,0.1);
  border: 1px solid rgba(0,200,180,0.2);
  border-radius: 4px;
  padding: 6px 14px;
  display: inline-block;
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: #00c8b4;
  letter-spacing: 2px;
  margin-bottom: 16px;
}
.meta-row { display: flex; gap: 24px; font-family: 'Share Tech Mono', monospace; font-size: 11px; color: #4a5168; flex-wrap: wrap; }
.section { margin-bottom: 40px; }
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0,200,180,0.15);
}
.section-title { font-size: 20px; font-weight: 700; color: #dde2ec; text-transform: uppercase; letter-spacing: 2px; }
.section-label { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: #00c8b4; background: rgba(0,200,180,0.1); padding: 2px 8px; border-radius: 3px; }
.exec-summary {
  background: rgba(0,200,180,0.07);
  border-left: 3px solid #00c8b4;
  padding: 16px 20px;
  border-radius: 0 6px 6px 0;
  font-size: 15px;
  line-height: 1.8;
  color: #c8d0dc;
  margin-bottom: 40px;
}
.threat-level-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: #0f1117;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
}
.panel { background: #0f1117; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden; }
.outlook-box { background: #141820; border: 1px solid rgba(0,200,180,0.2); border-radius: 6px; padding: 20px; font-size: 14px; line-height: 1.8; color: #c8d0dc; }
.generated-stamp { margin-top: 48px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); font-family: 'Share Tech Mono', monospace; font-size: 10px; color: #4a5168; text-align: center; }
@media (max-width: 768px) {
  .section > div[style*="grid-template-columns"] { display: block !important; }
}
</style>
</head>
<body>
<div class="report-header">
  <div class="classification-bar">${data.classification || 'UNCLASSIFIED // FOR INFORMATIONAL PURPOSES'}</div>
  <h1 class="report-title">${(data.country || 'Country').toUpperCase()} INTELLIGENCE DOSSIER</h1>
  <div class="meta-row">
    <span>GENERATED: ${new Date(data.generatedAt || now).toUTCString()}</span>
    <span>SUBJECT: ${data.country?.toUpperCase() || 'UNKNOWN'}</span>
    <span>SOURCE: AI + RSS MONITORING</span>
  </div>
</div>

<div class="threat-level-bar">
  <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#4a5168;letter-spacing:1px;">THREAT LEVEL:</span>
  ${getRiskBadge(data.threatLevel || 'UNKNOWN')}
</div>

<div class="exec-summary">
  <strong style="display:block;font-family:'Share Tech Mono',monospace;font-size:10px;color:#00c8b4;letter-spacing:2px;margin-bottom:8px;">EXECUTIVE SUMMARY</strong>
  ${data.executiveSummary || 'No summary available.'}
</div>

${sectionsHtml}

${concerns.length > 0 ? `
<div class="section">
  <div class="section-header">
    <span class="section-title">Areas of Concern</span>
    <span class="section-label">RISK ASSESSMENT</span>
  </div>
  <div class="panel">${concernsHtml}</div>
</div>
` : ''}

<div class="section">
  <div class="section-header">
    <span class="section-title">Near-Term Outlook</span>
    <span class="section-label">30–90 DAY FORECAST</span>
  </div>
  <div class="outlook-box">${data.nearTermOutlook || 'No outlook available.'}</div>
</div>

<div class="generated-stamp">
  CONFLICT MAPPER — AUTO-GENERATED INTELLIGENCE BRIEF // ${new Date().toUTCString()} // AI-ASSISTED ANALYSIS
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GENERATOR FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * parseAIJson(text)
 * Attempt to extract JSON from AI response text, which may include
 * markdown code fences or prose before/after the JSON block.
 */
function parseAIJson(text) {
  // Clean common AI artifacts before parsing:
  // - Remove Perplexity citation markers like [1], [2], etc.
  // - Remove zero-width chars, BOM, and other invisible characters
  let cleaned = text
    .replace(/\[\d+\]/g, '')           // Remove [1], [2] citation refs
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
    .replace(/\r\n/g, '\n')            // Normalize line endings
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Try extracting from markdown code block
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (_) {}
  }

  // Try finding outermost { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace  = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch (e) {
      // Log the parse error and a snippet of the problematic area for debugging
      console.error('[parseAIJson] Brace extraction failed:', e.message);
      const snippet = cleaned.slice(firstBrace, firstBrace + 200);
      console.error('[parseAIJson] Response starts with:', snippet);
      const endSnippet = cleaned.slice(Math.max(0, lastBrace - 200), lastBrace + 1);
      console.error('[parseAIJson] Response ends with:', endSnippet);
    }
  }

  // Last resort: try to fix truncated JSON by closing open structures
  if (firstBrace !== -1) {
    let partial = cleaned.slice(firstBrace);
    // Count open braces/brackets and try to close them
    let openBraces = 0, openBrackets = 0;
    let inString = false, escaped = false;
    for (let i = 0; i < partial.length; i++) {
      const ch = partial[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') openBraces++;
      if (ch === '}') openBraces--;
      if (ch === '[') openBrackets++;
      if (ch === ']') openBrackets--;
    }
    if (openBraces > 0 || openBrackets > 0) {
      console.warn(`[parseAIJson] Response appears truncated (${openBraces} unclosed braces, ${openBrackets} unclosed brackets). Attempting repair...`);
      // Remove any trailing incomplete key-value pair
      partial = partial.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}\[\]]*$/, '');
      partial = partial.replace(/,\s*$/, '');
      // Close remaining structures
      for (let i = 0; i < openBrackets; i++) partial += ']';
      for (let i = 0; i < openBraces; i++) partial += '}';
      try {
        return JSON.parse(partial);
      } catch (e2) {
        console.error('[parseAIJson] Repair attempt also failed:', e2.message);
      }
    }
  }

  // Log first/last 300 chars for debugging
  console.error('[parseAIJson] All parse attempts failed. Response length:', text.length);
  console.error('[parseAIJson] First 300 chars:', text.slice(0, 300));
  console.error('[parseAIJson] Last 300 chars:', text.slice(-300));
  throw new Error('Could not extract valid JSON from AI response');
}

/**
 * generateGlobalAnalysis(options)
 * Generate and save the global intelligence report.
 *
 * @param {object} options - { articleHours: 72, maxArticles: 80 }
 * @returns {{ success: boolean, reportPath: string, error?: string }}
 */
async function generateGlobalAnalysis(options = {}) {
  console.log('[analysis-generator] Starting global analysis...');

  try {
    const aiConfig = getAIConfig(false);
    const provider = getProvider(aiConfig);

    // Gather articles
    const articles = gatherArticlesForPrompt(null, null);

    // Call AI
    console.log(`[analysis-generator] Sending global prompt to ${provider.name}...`);
    const rawResponse = await provider.chat(
      GLOBAL_SYSTEM_PROMPT,
      GLOBAL_USER_PROMPT(articles),
      { maxTokens: 16000, temperature: 0.3 }
    );

    console.log(`[analysis-generator] Raw response length: ${rawResponse.length} chars`);

    // Parse JSON — if first attempt fails (deep-research often returns prose),
    // retry with a conversion prompt
    let data;
    try {
      data = parseAIJson(rawResponse);
    } catch (firstErr) {
      console.warn(`[analysis-generator] Global: First parse failed, attempting JSON conversion retry...`);
      const retryPrompt = `The following text is a global intelligence analysis. Convert it into the EXACT JSON schema below. Output ONLY valid JSON, no markdown, no prose, no code fences.\n\nRequired schema:\n${GLOBAL_SYSTEM_PROMPT.split('Your output must be valid JSON matching this exact schema:')[1]?.split('Rules:')[0] || ''}\n\nText to convert:\n${rawResponse.slice(0, 30000)}`;
      try {
        const retryResponse = await provider.chat(
          'You are a JSON converter. Output ONLY valid JSON matching the schema. No markdown, no explanation, no code fences. Start with { and end with }.',
          retryPrompt,
          { maxTokens: 16000, temperature: 0.1 }
        );
        console.log(`[analysis-generator] Global: Retry response length: ${retryResponse.length} chars`);
        data = parseAIJson(retryResponse);
        console.log(`[analysis-generator] Global: JSON conversion retry succeeded`);
      } catch (retryErr) {
        console.error(`[analysis-generator] Global: Retry also failed: ${retryErr.message}`);
        throw firstErr;
      }
    }

    // Render HTML
    const html = renderGlobalHTML(data);

    // Save to disk
    const currentDir    = path.join(REPORTS_DIR, 'global', 'current');
    const historicalDir = path.join(REPORTS_DIR, 'global', 'historical');

    archiveCurrentReport(currentDir, historicalDir);
    ensureDir(currentDir);
    const reportPath = path.join(currentDir, 'report.html');
    fs.writeFileSync(reportPath, html, 'utf8');

    console.log(`[analysis-generator] Global report saved to ${reportPath}`);
    return {
      success:    true,
      reportPath: `/reports/global/current/report.html`,
      reportData: data,
    };
  } catch (err) {
    console.error('[analysis-generator] Global analysis error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * generateCountryAnalysis(slug, options)
 * Generate and save an intelligence report for a specific country.
 *
 * @param {string} slug - Country slug (e.g., 'russia', 'north-korea')
 * @param {object} options
 * @returns {{ success: boolean, reportPath: string, error?: string }}
 */
async function generateCountryAnalysis(slug, options = {}) {
  console.log(`[analysis-generator] Starting analysis for: ${slug}`);

  try {
    const aiConfig   = getAIConfig(false);
    const provider   = getProvider(aiConfig);
    const countryName = getCountryFromSlug(slug);

    // Gather articles filtered for this country
    const articles = gatherArticlesForPrompt(countryName, slug);

    // Call AI
    console.log(`[analysis-generator] Sending ${slug} prompt to ${provider.name}...`);
    let rawResponse = await provider.chat(
      COUNTRY_SYSTEM_PROMPT(countryName),
      COUNTRY_USER_PROMPT(countryName, articles),
      { maxTokens: 16000, temperature: 0.3 }
    );

    console.log(`[analysis-generator] Raw response length: ${rawResponse.length} chars`);

    // Parse JSON — if first attempt fails (deep-research often returns prose),
    // retry with a conversion prompt
    let data;
    try {
      data = parseAIJson(rawResponse);
    } catch (firstErr) {
      console.warn(`[analysis-generator] ${slug}: First parse failed, attempting JSON conversion retry...`);
      const retryPrompt = `The following text is an intelligence analysis. Convert it into the EXACT JSON schema below. Output ONLY valid JSON, no markdown, no prose, no code fences.\n\nRequired schema:\n${COUNTRY_SYSTEM_PROMPT(countryName).split('Your output must be valid JSON matching this exact schema:')[1]?.split('Rules:')[0] || ''}\n\nText to convert:\n${rawResponse.slice(0, 30000)}`;
      try {
        const retryResponse = await provider.chat(
          'You are a JSON converter. Output ONLY valid JSON matching the schema. No markdown, no explanation, no code fences. Start with { and end with }.',
          retryPrompt,
          { maxTokens: 16000, temperature: 0.1 }
        );
        console.log(`[analysis-generator] ${slug}: Retry response length: ${retryResponse.length} chars`);
        data = parseAIJson(retryResponse);
        console.log(`[analysis-generator] ${slug}: JSON conversion retry succeeded`);
      } catch (retryErr) {
        console.error(`[analysis-generator] ${slug}: Retry also failed: ${retryErr.message}`);
        throw firstErr; // Throw original error
      }
    }

    // Render HTML
    const html = renderCountryHTML(data);

    // Save to disk
    const currentDir    = path.join(REPORTS_DIR, 'countries', slug, 'current');
    const historicalDir = path.join(REPORTS_DIR, 'countries', slug, 'historical');

    archiveCurrentReport(currentDir, historicalDir);
    ensureDir(currentDir);
    const reportPath = path.join(currentDir, 'report.html');
    fs.writeFileSync(reportPath, html, 'utf8');

    console.log(`[analysis-generator] ${countryName} report saved to ${reportPath}`);
    return {
      success:     true,
      reportPath:  `/reports/countries/${slug}/current/report.html`,
      country:     countryName,
      reportData:  data,
    };
  } catch (err) {
    console.error(`[analysis-generator] Country analysis error (${slug}):`, err.message);
    return { success: false, slug, error: err.message };
  }
}

/**
 * generateAllCountries(options, progressCallback)
 * Generate country reports for all configured countries, sequentially.
 *
 * @param {object}   options
 * @param {Function} progressCallback - ({ current, total, slug, done, error })
 * @returns {{ results: Array, completed: number, failed: number }}
 */
async function generateAllCountries(options = {}, progressCallback = null) {
  const CONCURRENCY = options.concurrency || 11; // Run all countries in parallel by default
  const results   = [];
  let completed   = 0;
  let failed      = 0;

  console.log(`[analysis-generator] Generating ${COUNTRY_SLUGS.length} country reports (concurrency: ${CONCURRENCY})`);

  // Process in batches of CONCURRENCY
  for (let i = 0; i < COUNTRY_SLUGS.length; i += CONCURRENCY) {
    const batch = COUNTRY_SLUGS.slice(i, i + CONCURRENCY);

    // Notify that batch is starting
    batch.forEach((slug, idx) => {
      if (progressCallback) {
        progressCallback({ current: i + idx + 1, total: COUNTRY_SLUGS.length, slug, done: false, phase: 'generating' });
      }
    });

    // Run batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(slug => generateCountryAnalysis(slug, options))
    );

    // Collect results
    batchResults.forEach((settled, idx) => {
      const slug = batch[idx];
      if (settled.status === 'fulfilled') {
        const result = settled.value;
        results.push({ slug, ...result });
        if (result.success) completed++;
        else failed++;
        if (progressCallback) {
          progressCallback({ current: i + idx + 1, total: COUNTRY_SLUGS.length, slug, done: true, success: result.success });
        }
      } else {
        failed++;
        results.push({ slug, success: false, error: settled.reason?.message || 'Unknown error' });
        if (progressCallback) {
          progressCallback({ current: i + idx + 1, total: COUNTRY_SLUGS.length, slug, done: true, success: false });
        }
      }
    });

    console.log(`[analysis-generator] Batch ${Math.floor(i/CONCURRENCY)+1} complete: ${batch.join(', ')}`);

    // Brief pause between batches
    if (i + CONCURRENCY < COUNTRY_SLUGS.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { results, completed, failed };
}

/**
 * generateAll(options, progressCallback)
 * Generate global + all country reports.
 */
async function generateAll(options = {}, progressCallback = null) {
  if (progressCallback) {
    progressCallback({ phase: 'parallel', current: 0, total: COUNTRY_SLUGS.length + 1, message: 'Generating global + all country reports in parallel...' });
  }

  console.log('[analysis-generator] Starting parallel generation: global + all countries');

  // Run global and all countries simultaneously
  const [globalResult, countryResults] = await Promise.all([
    generateGlobalAnalysis(options),
    generateAllCountries(options, (update) => {
      if (progressCallback) {
        progressCallback({
          phase:   'parallel',
          current: update.done ? (update.current + 1) : update.current, // +1 accounts for global
          total:   COUNTRY_SLUGS.length + 1,
          slug:    update.slug,
          message: update.done
            ? `${update.slug}: ${update.success ? '✓' : '✗'} (${update.current}/${COUNTRY_SLUGS.length} countries)`
            : `Generating ${update.slug}... (${update.current}/${COUNTRY_SLUGS.length})`,
        });
      }
    }),
  ]);

  console.log(`[analysis-generator] All done. Global: ${globalResult.success ? 'OK' : 'FAIL'}. Countries: ${countryResults.completed}/${COUNTRY_SLUGS.length}`);

  return {
    global:     globalResult,
    countries:  countryResults,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  generateGlobalAnalysis,
  generateCountryAnalysis,
  generateAllCountries,
  generateAll,
  listHistoricalReports,
  COUNTRY_SLUGS,
};
