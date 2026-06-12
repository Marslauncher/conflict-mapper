const APP_SETTINGS_KV_KEY = 'app:settings:v1';

export const DEFAULT_APP_SETTINGS = Object.freeze({
  autoFetch: true,
  feedRefreshIntervalMinutes: 15,
  fetchIntervalMinutes: 15,
  fetchIntervalHours: 0.25,
  maxArticlesPerFeed: 50,
  deduplicationThreshold: 0.8,
  reportRetentionDays: 30,
  defaultCountries: ['usa', 'russia', 'china', 'ukraine', 'taiwan', 'iran', 'israel', 'india', 'pakistan', 'north-korea', 'nato'],
});

export function normalizeAppSettings(input = {}) {
  const legacyHours = Number(input.fetchIntervalHours);
  const rawMinutes = Number(
    input.feedRefreshIntervalMinutes
      ?? input.fetchIntervalMinutes
      ?? (Number.isFinite(legacyHours) ? legacyHours * 60 : DEFAULT_APP_SETTINGS.feedRefreshIntervalMinutes)
  );
  const feedRefreshIntervalMinutes = Number.isFinite(rawMinutes)
    ? Math.min(1440, Math.max(1, Math.round(rawMinutes)))
    : DEFAULT_APP_SETTINGS.feedRefreshIntervalMinutes;

  const maxArticlesPerFeed = boundedInt(input.maxArticlesPerFeed, DEFAULT_APP_SETTINGS.maxArticlesPerFeed, 1, 200);
  const deduplicationThreshold = boundedFloat(input.deduplicationThreshold, DEFAULT_APP_SETTINGS.deduplicationThreshold, 0.5, 1);
  const reportRetentionDays = boundedInt(input.reportRetentionDays, DEFAULT_APP_SETTINGS.reportRetentionDays, 1, 365);
  const defaultCountries = Array.isArray(input.defaultCountries) && input.defaultCountries.length
    ? input.defaultCountries.map((country) => String(country).trim()).filter(Boolean)
    : [...DEFAULT_APP_SETTINGS.defaultCountries];

  return {
    ...DEFAULT_APP_SETTINGS,
    ...input,
    autoFetch: input.autoFetch !== false,
    feedRefreshIntervalMinutes,
    fetchIntervalMinutes: feedRefreshIntervalMinutes,
    fetchIntervalHours: Number((feedRefreshIntervalMinutes / 60).toFixed(2)),
    maxArticlesPerFeed,
    deduplicationThreshold,
    reportRetentionDays,
    defaultCountries,
  };
}

export async function loadAppSettings(env) {
  if (!env?.CONFIG_KV) return normalizeAppSettings();
  try {
    const raw = await env.CONFIG_KV.get(APP_SETTINGS_KV_KEY);
    return normalizeAppSettings(raw ? JSON.parse(raw) : {});
  } catch (_) {
    return normalizeAppSettings();
  }
}

export async function saveAppSettings(env, settings) {
  if (!env?.CONFIG_KV) {
    const error = new Error('CONFIG_KV binding is required to persist application settings');
    error.status = 503;
    throw error;
  }
  const normalized = normalizeAppSettings(settings);
  await env.CONFIG_KV.put(APP_SETTINGS_KV_KEY, JSON.stringify(normalized));
  return normalized;
}

function boundedInt(value, fallback, min, max) {
  const parsed = Number(value);
  const next = Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  return Math.max(min, Math.min(next, max));
}

function boundedFloat(value, fallback, min, max) {
  const parsed = Number(value);
  const next = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(next, max));
}
