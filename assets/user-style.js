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
      .report-title, .classification-bar, .section-label, .theater-name,
      .topic-link, .watch-row span:first-child { color: var(--color-teal, #2dd4bf) !important; }
      .classification-bar, .exec-summary, .topic-link {
        border-color: color-mix(in srgb, var(--color-teal, #2dd4bf) 35%, transparent) !important;
      }
      .panel, .trend-card, .outlook-box, .threat-level-bar,
      .article-card, .stat-card, .admin-card, .nav-editor-group {
        background-color: var(--color-surface-2, #141820);
      }
      a { color: var(--color-accent, #c41e3a); }
      p, li, .feed-summary, .risk-detail, .theater-assessment {
        font-size: calc(1em * var(--cm-font-scale, 1));
      }
    `;
    document.head.appendChild(style);
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
