(function () {
  'use strict';

  const STORAGE_KEY = 'conflictMapper.styleSettings.v1';
  const LEGACY_THEME_KEY = 'conflictMapper.theme.v1';

  const THEMES = {
    command: {
      label: 'Command Dark',
      mode: 'dark',
      fontScale: 1.08,
      colors: {
        bg: '#0a0c10',
        surface: '#0f1117',
        surface2: '#141820',
        surface3: '#1a2030',
        text: '#dde2ec',
        muted: '#9aa4b8',
        faint: '#5a6478',
        accent: '#c41e3a',
        accentHover: '#e02442',
        teal: '#2dd4bf',
        amber: '#f59e0b',
        blue: '#60a5fa',
        green: '#22c55e',
      },
    },
    highContrast: {
      label: 'High Contrast',
      mode: 'dark',
      fontScale: 1.14,
      colors: {
        bg: '#050608',
        surface: '#0d1016',
        surface2: '#171b24',
        surface3: '#232936',
        text: '#f4f7fb',
        muted: '#c4cedd',
        faint: '#7f8aa0',
        accent: '#ff3355',
        accentHover: '#ff6680',
        teal: '#34f5d0',
        amber: '#ffd166',
        blue: '#7cc7ff',
        green: '#46e885',
      },
    },
    lightOps: {
      label: 'Light Ops',
      mode: 'light',
      fontScale: 1.06,
      colors: {
        bg: '#f3f5f8',
        surface: '#ffffff',
        surface2: '#eef1f5',
        surface3: '#e2e7ef',
        text: '#111827',
        muted: '#475569',
        faint: '#8a94a6',
        accent: '#b91c1c',
        accentHover: '#991b1b',
        teal: '#0f766e',
        amber: '#b45309',
        blue: '#1d4ed8',
        green: '#15803d',
      },
    },
    maritime: {
      label: 'Maritime Watch',
      mode: 'dark',
      fontScale: 1.08,
      colors: {
        bg: '#061014',
        surface: '#0d1b22',
        surface2: '#122732',
        surface3: '#193541',
        text: '#e5f4f6',
        muted: '#9fb8c1',
        faint: '#5d7480',
        accent: '#14b8a6',
        accentHover: '#2dd4bf',
        teal: '#22d3ee',
        amber: '#fbbf24',
        blue: '#38bdf8',
        green: '#22c55e',
      },
    },
    graphite: {
      label: 'Graphite Intel',
      mode: 'dark',
      fontScale: 1.1,
      colors: {
        bg: '#101113',
        surface: '#181a1e',
        surface2: '#20242a',
        surface3: '#2b3038',
        text: '#edf0f4',
        muted: '#aeb7c4',
        faint: '#6f7785',
        accent: '#d946ef',
        accentHover: '#e879f9',
        teal: '#2dd4bf',
        amber: '#f59e0b',
        blue: '#93c5fd',
        green: '#4ade80',
      },
    },
  };

  const DEFAULT_SETTINGS = {
    template: 'command',
    mode: THEMES.command.mode,
    fontScale: THEMES.command.fontScale,
    colors: { ...THEMES.command.colors },
  };

  function readSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return syncLegacyTheme({ ...DEFAULT_SETTINGS, colors: { ...DEFAULT_SETTINGS.colors } });
      return normalize(JSON.parse(raw));
    } catch (_) {
      return { ...DEFAULT_SETTINGS, colors: { ...DEFAULT_SETTINGS.colors } };
    }
  }

  function syncLegacyTheme(settings) {
    try {
      const legacy = localStorage.getItem(LEGACY_THEME_KEY);
      if (legacy && !localStorage.getItem(STORAGE_KEY)) {
        settings.mode = legacy === 'light' ? 'light' : 'dark';
      }
    } catch (_) {}
    return settings;
  }

  function normalize(input) {
    const base = THEMES[input?.template] || THEMES.command;
    const fontScale = Number(input?.fontScale);
    return {
      template: input?.template && THEMES[input.template] ? input.template : 'command',
      mode: input?.mode === 'light' ? 'light' : 'dark',
      fontScale: Number.isFinite(fontScale) ? Math.min(1.35, Math.max(0.92, fontScale)) : base.fontScale,
      colors: { ...base.colors, ...(input?.colors || {}) },
    };
  }

  function writeSettings(settings) {
    const normalized = normalize(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(LEGACY_THEME_KEY, normalized.mode);
    applySettings(normalized);
    return normalized;
  }

  function applySettings(settings = readSettings()) {
    const normalized = normalize(settings);
    const root = document.documentElement;
    const c = normalized.colors;
    root.setAttribute('data-theme', normalized.mode);
    root.style.setProperty('--cm-font-scale', String(normalized.fontScale));
    root.style.setProperty('--cm-text-base-px', `${Math.round(16 * normalized.fontScale)}px`);
    root.style.setProperty('--color-bg', c.bg);
    root.style.setProperty('--color-surface', c.surface);
    root.style.setProperty('--color-surface-2', c.surface2);
    root.style.setProperty('--color-surface-3', c.surface3);
    root.style.setProperty('--color-text', c.text);
    root.style.setProperty('--color-text-muted', c.muted);
    root.style.setProperty('--color-text-faint', c.faint);
    root.style.setProperty('--color-accent', c.accent);
    root.style.setProperty('--color-accent-hover', c.accentHover);
    root.style.setProperty('--color-accent-dim', hexToRgba(c.accent, 0.1));
    root.style.setProperty('--color-accent-glow', hexToRgba(c.accent, 0.18));
    root.style.setProperty('--color-border', hexToRgba(c.accent, 0.24));
    root.style.setProperty('--color-border-dim', normalized.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)');
    root.style.setProperty('--color-teal', c.teal);
    root.style.setProperty('--color-amber', c.amber);
    root.style.setProperty('--color-blue', c.blue);
    root.style.setProperty('--color-green', c.green);
    root.style.setProperty('--color-red', c.accent);
    root.style.setProperty('--color-red-bright', c.accentHover);
    root.style.setProperty('--color-gold', c.amber);
    root.style.setProperty('--color-gold-dim', c.amber);
    root.style.setProperty('--bg', c.bg);
    root.style.setProperty('--surface', c.surface);
    root.style.setProperty('--surface-2', c.surface2);
    root.style.setProperty('--surface-3', c.surface3);
    root.style.setProperty('--text', c.text);
    root.style.setProperty('--text-muted', c.muted);
    root.style.setProperty('--text-faint', c.faint);
    root.style.setProperty('--accent', c.accent);
    root.style.setProperty('--accent-dim', hexToRgba(c.accent, 0.12));
    ensureOverrideStyle();
    scheduleLegacyReportNormalization();
  }

  function ensureOverrideStyle() {
    if (document.getElementById('cm-user-style-overrides')) return;
    const style = document.createElement('style');
    style.id = 'cm-user-style-overrides';
    style.textContent = `
      html { font-size: var(--cm-text-base-px, 16px); }
      body {
        background-color: var(--color-bg, var(--bg, #0a0c10)) !important;
        color: var(--color-text, var(--text, #dde2ec)) !important;
      }
      body, button, input, select, textarea { font-size-adjust: none; }
      button, input, select, textarea, table, .storage-object-browser {
        font-size: calc(1em * var(--cm-font-scale, 1));
      }
      .report-title, .classification-bar, .section-label, .theater-name,
      .topic-link, .watch-row span:first-child, .page-title, .hero-title {
        color: var(--color-teal, #2dd4bf) !important;
      }
      .classification-bar, .exec-summary, .topic-link {
        border-color: color-mix(in srgb, var(--color-teal, #2dd4bf) 35%, transparent) !important;
      }
      .panel, .trend-card, .outlook-box, .threat-level-bar, .exec-summary,
      .article-card, .article, .stat-card, .admin-card, .nav-editor-group,
      .storage-table, .storage-row, .card, .section, .report-section {
        background-color: var(--color-surface-2, #141820) !important;
        border-color: var(--color-border-dim, rgba(255,255,255,0.08)) !important;
      }
      a { color: var(--color-accent, #c41e3a); }
      p, li, .feed-summary, .risk-detail, .theater-assessment,
      .article-summary, .summary, .storage-row, .source-list li,
      .trend-card, .outlook-box, .exec-summary {
        font-size: calc(1em * var(--cm-font-scale, 1)) !important;
      }
      .muted, .meta, .feed-meta, .article-meta, .report-meta,
      .storage-row:not(.header), .source-list, .risk-detail {
        color: var(--color-text-muted, var(--text-muted, #9aa4b8)) !important;
      }
      html.cm-legacy-report body {
        background:
          radial-gradient(circle at 70% -18%, color-mix(in srgb, var(--color-accent, #c41e3a) 14%, transparent), transparent 34%),
          var(--color-bg, #0a0c10) !important;
      }
      html.cm-legacy-report main {
        width: min(1120px, calc(100vw - 32px)) !important;
        max-width: min(1120px, calc(100vw - 32px)) !important;
        margin: 0 auto !important;
        padding: clamp(28px, 4vw, 58px) 0 !important;
        color: var(--color-text, #dde2ec) !important;
        font-family: Inter, system-ui, sans-serif !important;
      }
      html.cm-legacy-report main h1 {
        margin: 0 0 16px !important;
        color: var(--color-teal, #2dd4bf) !important;
        font-family: Rajdhani, system-ui, sans-serif !important;
        font-size: clamp(2rem, 4vw, 3.3rem) !important;
        line-height: 1.02 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
      }
      html.cm-legacy-report main .meta,
      html.cm-legacy-report main > .meta {
        display: block !important;
        margin: 0 0 22px !important;
        padding: 10px 12px !important;
        border: 1px solid var(--color-border-dim, rgba(255,255,255,0.08)) !important;
        border-radius: 6px !important;
        background: var(--color-surface, #0f1117) !important;
        color: var(--color-text-muted, #9aa4b8) !important;
        font-family: Share Tech Mono, monospace !important;
        font-size: calc(0.72rem * var(--cm-font-scale, 1)) !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
      }
      html.cm-legacy-report .report-body,
      html.cm-legacy-report .sources {
        margin: 0 0 18px !important;
        padding: clamp(18px, 3vw, 28px) !important;
        border: 1px solid var(--color-border-dim, rgba(255,255,255,0.08)) !important;
        border-radius: 8px !important;
        background: linear-gradient(180deg, var(--color-surface-2, #141820), var(--color-surface, #0f1117)) !important;
        box-shadow: 0 16px 42px rgba(0,0,0,0.22) !important;
      }
      html.cm-legacy-report .report-body h2,
      html.cm-legacy-report .report-body h3,
      html.cm-legacy-report .sources h2,
      html.cm-legacy-report .sources h3 {
        margin: 20px 0 10px !important;
        color: var(--color-teal, #2dd4bf) !important;
        font-family: Rajdhani, system-ui, sans-serif !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
      }
      html.cm-legacy-report .report-body h2:first-child,
      html.cm-legacy-report .report-body h3:first-child {
        margin-top: 0 !important;
      }
      html.cm-legacy-report .report-body p,
      html.cm-legacy-report .report-body li,
      html.cm-legacy-report .sources li {
        color: var(--color-text, #dde2ec) !important;
        font-size: calc(0.98rem * var(--cm-font-scale, 1)) !important;
        line-height: 1.68 !important;
      }
      html.cm-legacy-report .report-body ul,
      html.cm-legacy-report .report-body ol,
      html.cm-legacy-report .sources ul,
      html.cm-legacy-report .sources ol {
        padding-left: 1.25rem !important;
      }
      html.cm-legacy-report .report-body a,
      html.cm-legacy-report .sources a {
        color: var(--color-accent-hover, #e02442) !important;
        overflow-wrap: anywhere !important;
      }
    `;
    document.head.appendChild(style);
  }

  let legacyReportNormalizationQueued = false;

  function scheduleLegacyReportNormalization() {
    if (legacyReportNormalizationQueued) return;
    legacyReportNormalizationQueued = true;
    const run = () => {
      legacyReportNormalizationQueued = false;
      normalizeLegacyReport();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  }

  function normalizeLegacyReport() {
    const reportBody = document.querySelector('.report-body');
    if (!reportBody) return;
    document.documentElement.classList.add('cm-legacy-report');
    reportBody.querySelectorAll('html, body').forEach((node) => {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      node.remove();
    });
    reportBody.querySelectorAll('p').forEach((paragraph) => {
      if (!paragraph.textContent.trim()) paragraph.remove();
    });
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || '').replace('#', '').trim();
    const full = clean.length === 3
      ? clean.split('').map((ch) => ch + ch).join('')
      : clean;
    const value = Number.parseInt(full, 16);
    if (!Number.isFinite(value)) return `rgba(196,30,58,${alpha})`;
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  window.ConflictMapperStyle = {
    storageKey: STORAGE_KEY,
    templates: THEMES,
    defaults: DEFAULT_SETTINGS,
    read: readSettings,
    write: writeSettings,
    apply: applySettings,
  };

  applySettings();
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === LEGACY_THEME_KEY) applySettings();
  });
})();
