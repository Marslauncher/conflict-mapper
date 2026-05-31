const PROVIDERS = [
  { id: 'perplexity', name: 'Perplexity', defaultModel: 'sonar-pro' },
  { id: 'openrouter', name: 'OpenRouter', defaultModel: 'anthropic/claude-sonnet-4' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o' },
  { id: 'anthropic', name: 'Anthropic Claude', defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'google', name: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
  { id: 'nvidia', name: 'NVIDIA NIM', defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1' },
];

const AI_CONFIG_KV_KEY = 'ai:config:v1';
const AI_MODELS_CACHE_PREFIX = 'ai:models:v1:';
const AI_MODELS_CACHE_TTL_SECONDS = 6 * 60 * 60;

const FALLBACK_MODELS = {
  perplexity: [
    { id: 'sonar-pro', name: 'sonar-pro' },
    { id: 'sonar', name: 'sonar' },
    { id: 'sonar-deep-research', name: 'sonar-deep-research' },
    { id: 'sonar-reasoning-pro', name: 'sonar-reasoning-pro' },
  ],
  openrouter: [
    { id: 'anthropic/claude-sonnet-4', name: 'Anthropic: Claude Sonnet 4' },
    { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o Mini' },
    { id: 'google/gemini-2.0-flash-001', name: 'Google: Gemini 2.0 Flash' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'gpt-4o' },
    { id: 'gpt-4o-mini', name: 'gpt-4o-mini' },
    { id: 'gpt-4.1', name: 'gpt-4.1' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  ],
  google: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
  nvidia: [
    { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', name: 'NVIDIA: Llama 3.3 Nemotron Super 49B' },
    { id: 'nvidia/nemotron-3-super-120b-a12b', name: 'NVIDIA: Nemotron 3 Super 120B A12B' },
    { id: 'meta/llama-3.3-70b-instruct', name: 'Meta: Llama 3.3 70B Instruct' },
    { id: 'meta/llama-3.1-70b-instruct', name: 'Meta: Llama 3.1 70B Instruct' },
    { id: 'deepseek-ai/deepseek-v4-pro', name: 'DeepSeek: V4 Pro' },
  ],
  local: [
    { id: 'llama3.1', name: 'llama3.1' },
  ],
};

export function listProviders() {
  return PROVIDERS;
}

export function getAIConfig(env) {
  const provider = env.AI_PROVIDER || 'perplexity';
  return {
    provider,
    providers: {
      perplexity: {
        apiKey: env.PERPLEXITY_API_KEY || '',
        model: env.PERPLEXITY_MODEL || 'sonar-pro',
        baseUrl: env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai',
      },
      openrouter: {
        apiKey: env.OPENROUTER_API_KEY || '',
        model: env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4',
        baseUrl: env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        headers: {
          ...(env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': env.OPENROUTER_SITE_URL } : {}),
          'X-Title': env.OPENROUTER_APP_TITLE || 'Conflict Mapper',
        },
      },
      openai: {
        apiKey: env.OPENAI_API_KEY || '',
        model: env.OPENAI_MODEL || 'gpt-4o',
        baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      },
      anthropic: {
        apiKey: env.ANTHROPIC_API_KEY || '',
        model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        baseUrl: env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      },
      google: {
        apiKey: env.GOOGLE_API_KEY || '',
        model: env.GOOGLE_MODEL || 'gemini-2.0-flash',
        baseUrl: env.GOOGLE_BASE_URL || 'https://generativelanguage.googleapis.com',
      },
      nvidia: {
        apiKey: env.NVIDIA_API_KEY || '',
        model: env.NVIDIA_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1',
        baseUrl: env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      },
    },
  };
}

export async function getEffectiveAIConfig(env, { mask = false } = {}) {
  const base = getAIConfig(env);
  const stored = await readStoredAIConfig(env);
  const merged = mergeAIConfig(base, stored);
  return mask ? maskAIConfig(merged) : merged;
}

export async function saveAIConfig(env, update) {
  if (!env.CONFIG_KV) {
    throw new Error('CONFIG_KV binding is required to save AI configuration');
  }
  if (!env.AI_CONFIG_ENCRYPTION_KEY) {
    throw new Error('AI_CONFIG_ENCRYPTION_KEY secret is required before API keys can be saved from the app');
  }

  const provider = update.provider || 'perplexity';
  const existing = await readStoredAIConfig(env);
  const next = mergeAIConfig(existing || { provider, providers: {} }, {
    provider,
    providers: {
      [provider]: {
        ...(update.apiKey ? { apiKey: update.apiKey } : {}),
        ...(update.model ? { model: update.model } : {}),
        ...(update.baseUrl ? { baseUrl: update.baseUrl } : {}),
      },
    },
  });

  const encrypted = await encryptJson(env.AI_CONFIG_ENCRYPTION_KEY, next);
  await env.CONFIG_KV.put(AI_CONFIG_KV_KEY, JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    ...encrypted,
  }));

  return maskAIConfig(next);
}

async function readStoredAIConfig(env) {
  if (!env.CONFIG_KV) return null;
  const raw = await env.CONFIG_KV.get(AI_CONFIG_KV_KEY);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);
    if (!payload.iv || !payload.data) return null;
    if (!env.AI_CONFIG_ENCRYPTION_KEY) {
      throw new Error('AI_CONFIG_ENCRYPTION_KEY secret is required to read saved AI configuration');
    }
    return await decryptJson(env.AI_CONFIG_ENCRYPTION_KEY, payload);
  } catch (err) {
    return {
      provider: 'perplexity',
      providers: {},
      loadError: err.message,
    };
  }
}

function mergeAIConfig(base, overlay) {
  const merged = structuredClone(base || { provider: 'perplexity', providers: {} });
  if (overlay?.provider) merged.provider = overlay.provider;
  for (const [name, providerConfig] of Object.entries(overlay?.providers || {})) {
    merged.providers[name] = {
      ...(merged.providers[name] || {}),
      ...providerConfig,
    };
  }
  if (overlay?.loadError) merged.loadError = overlay.loadError;
  return merged;
}

export function maskAIConfig(config) {
  const clone = structuredClone(config);
  for (const provider of Object.values(clone.providers || {})) {
    if (provider.apiKey) provider.apiKey = `${provider.apiKey.slice(0, 4)}...${provider.apiKey.slice(-4)}`;
  }
  return clone;
}

export async function testAIConnection(env, override = {}) {
  const config = await getEffectiveAIConfig(env);
  const provider = override.provider || config.provider;
  const providerConfig = {
    ...(config.providers[provider] || {}),
    ...(override.apiKey ? { apiKey: override.apiKey } : {}),
    ...(override.model ? { model: override.model } : {}),
    ...(override.baseUrl ? { baseUrl: override.baseUrl } : {}),
  };

  if (!providerConfig.apiKey) {
    return { success: false, message: `No API key configured for ${provider}`, model: providerConfig.model };
  }

  try {
    const content = await callModel(provider, providerConfig, 'Reply with OK only.', { maxTokens: 12 });
    return { success: true, message: `Connected. Response: ${content.slice(0, 80)}`, model: providerConfig.model };
  } catch (err) {
    return { success: false, message: err.message, model: providerConfig.model };
  }
}

export async function listAIModels(env, override = {}) {
  const config = await getEffectiveAIConfig(env);
  const provider = override.provider || config.provider;
  const providerConfig = {
    ...(config.providers[provider] || {}),
    ...(override.apiKey ? { apiKey: override.apiKey } : {}),
    ...(override.baseUrl ? { baseUrl: override.baseUrl } : {}),
  };
  const cacheKey = `${AI_MODELS_CACHE_PREFIX}${provider}`;

  if (provider === 'perplexity') {
    return { provider, source: 'curated', models: FALLBACK_MODELS.perplexity };
  }

  if (!override.apiKey && env.CONFIG_KV) {
    const cached = await env.CONFIG_KV.get(cacheKey);
    if (cached) {
      return { provider, source: 'cache', models: JSON.parse(cached) };
    }
  }

  try {
    const models = await fetchProviderModels(provider, providerConfig);
    if (models.length > 0 && !override.apiKey && env.CONFIG_KV) {
      await env.CONFIG_KV.put(cacheKey, JSON.stringify(models), { expirationTtl: AI_MODELS_CACHE_TTL_SECONDS });
    }
    return { provider, source: 'provider', models };
  } catch (err) {
    return {
      provider,
      source: 'fallback',
      error: err.message,
      models: FALLBACK_MODELS[provider] || [],
    };
  }
}

export async function generateReportText(env, systemPrompt, userPrompt) {
  const config = await getEffectiveAIConfig(env);
  const providerConfig = normalizeReportProviderConfig(config.provider, config.providers[config.provider]);
  if (!providerConfig?.apiKey) {
    throw new Error(`No API key configured for provider "${config.provider}"`);
  }
  const maxTokens = resolveReportMaxTokens(env, config.provider, providerConfig.model);
  const timeoutMs = resolveReportTimeoutMs(env, config.provider);
  return callModel(config.provider, providerConfig, `${systemPrompt}\n\n${userPrompt}`, { maxTokens, timeoutMs, reportGeneration: true });
}

export function getReportGenerationModel(provider, model = '') {
  const value = String(model || '');
  if (provider === 'perplexity' && value.includes('deep-research')) return 'sonar-pro';
  return value;
}

function normalizeReportProviderConfig(provider, providerConfig) {
  if (!providerConfig) return providerConfig;
  const model = getReportGenerationModel(provider, providerConfig.model);
  return model === providerConfig.model ? providerConfig : { ...providerConfig, model };
}

function resolveReportMaxTokens(env, provider, model = '') {
  const configured = Number(env.REPORT_MAX_TOKENS || 0);
  if (Number.isFinite(configured) && configured >= 1024) return Math.floor(configured);
  const modelId = String(model || '').toLowerCase();
  if (provider === 'perplexity') return modelId.includes('deep-research') ? 8000 : 6000;
  if (provider === 'google') return 8192;
  if (provider === 'nvidia') return 8192;
  if (provider === 'anthropic') return 12000;
  return 12000;
}

function resolveReportTimeoutMs(env, provider = '') {
  const configured = Number(env.REPORT_AI_TIMEOUT_MS || 0);
  const providerMinimum = provider === 'perplexity' ? 45000 : 5000;
  const fallback = provider === 'perplexity' ? 45000 : 55000;
  if (Number.isFinite(configured) && configured >= 5000) {
    return Math.max(Math.floor(configured), providerMinimum);
  }
  return fallback;
}

async function importEncryptionKey(secret) {
  const material = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptJson(secret, value) {
  const key = await importEncryptionKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptJson(secret, payload) {
  const key = await importEncryptionKey(secret);
  const iv = base64ToBytes(payload.iv);
  const data = base64ToBytes(payload.data);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function callModel(provider, config, prompt, options = {}) {
  if (provider === 'perplexity') return callPerplexity(config, prompt, options);
  if (provider === 'anthropic') return callAnthropic(config, prompt, options);
  if (provider === 'google') return callGoogle(config, prompt, options);
  return callOpenAICompatible(config, prompt, options);
}

async function fetchProviderModels(provider, config) {
  if (provider === 'openrouter') return fetchOpenRouterModels(config);
  if (provider === 'openai') return fetchOpenAIModels(config);
  if (provider === 'anthropic') return fetchAnthropicModels(config);
  if (provider === 'google') return fetchGoogleModels(config);
  if (provider === 'nvidia') return fetchOpenAIModels(config);
  if (provider === 'local') return fetchLocalModels(config);

  // Perplexity does not expose a stable public model-list endpoint in this app.
  return FALLBACK_MODELS[provider] || [];
}

async function fetchOpenRouterModels(config) {
  const response = await fetch(`${config.baseUrl || 'https://openrouter.ai/api/v1'}/models`, {
    headers: {
      accept: 'application/json',
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      ...(config.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Model list HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return (data.data || []).map((model) => ({
    id: model.id,
    name: model.name || model.id,
    description: model.description || '',
    contextLength: model.context_length || model.contextLength || null,
    pricing: model.pricing || null,
  })).filter((model) => model.id);
}

async function fetchOpenAIModels(config) {
  if (!config.apiKey) throw new Error('OpenAI API key required to list models');
  const response = await fetch(`${config.baseUrl || 'https://api.openai.com/v1'}/models`, {
    headers: { authorization: `Bearer ${config.apiKey}` },
  });
  if (!response.ok) throw new Error(`Model list HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return (data.data || [])
    .map((model) => ({ id: model.id, name: model.id, owner: model.owned_by || '' }))
    .filter((model) => model.id)
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchAnthropicModels(config) {
  if (!config.apiKey) throw new Error('Anthropic API key required to list models');
  const response = await fetch(`${config.baseUrl || 'https://api.anthropic.com'}/v1/models`, {
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
  });
  if (!response.ok) throw new Error(`Model list HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return (data.data || []).map((model) => ({
    id: model.id,
    name: model.display_name || model.id,
    createdAt: model.created_at || null,
  })).filter((model) => model.id);
}

async function fetchGoogleModels(config) {
  if (!config.apiKey) throw new Error('Google API key required to list models');
  const response = await fetch(`${config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1beta/models?pageSize=1000&key=${encodeURIComponent(config.apiKey)}`);
  if (!response.ok) throw new Error(`Model list HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return (data.models || []).map((model) => ({
    id: (model.name || '').replace(/^models\//, ''),
    name: model.displayName || model.baseModelId || model.name,
    description: model.description || '',
    inputTokenLimit: model.inputTokenLimit || null,
    outputTokenLimit: model.outputTokenLimit || null,
    supportedGenerationMethods: model.supportedGenerationMethods || [],
  })).filter((model) => model.id && model.supportedGenerationMethods.includes('generateContent'));
}

async function fetchLocalModels(config) {
  const response = await fetch(`${config.baseUrl || 'http://localhost:11434/v1'}/models`);
  if (!response.ok) throw new Error(`Model list HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return (data.data || []).map((model) => ({
    id: model.id,
    name: model.id,
  })).filter((model) => model.id);
}

function buildPerplexityUrl(baseUrl = 'https://api.perplexity.ai') {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/v1/sonar')) return trimmed;
  if (trimmed.endsWith('/v1')) return `${trimmed}/sonar`;
  return `${trimmed}/v1/sonar`;
}

async function readProviderJson(response, providerName) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`${providerName} returned a non-JSON response (${response.status}): ${text.slice(0, 180)}`);
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || text || `HTTP ${response.status}`;
    throw new Error(`${providerName} HTTP ${response.status}: ${typeof message === 'string' ? message : JSON.stringify(message)}`);
  }
  return data;
}

async function callPerplexity(config, prompt, options) {
  const model = config.model || 'sonar-pro';
  const isDeepResearch = model.includes('deep-research');
  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: Math.max(16, options.maxTokens || 8000),
  };
  if (!isDeepResearch) {
    body.temperature = 0.2;
  }

  const response = await fetchWithTimeout(buildPerplexityUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  }, options.timeoutMs);

  const data = await readProviderJson(response, 'Perplexity');
  const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.delta?.content;
  if (!content) throw new Error('Perplexity returned an empty response');
  return content;
}

async function callOpenAICompatible(config, prompt, options) {
  const response = await fetchWithTimeout(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
      ...(config.headers || {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 8000,
      temperature: 0.25,
    }),
  }, options.timeoutMs);

  const data = await readProviderJson(response, 'AI provider');
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI provider returned an empty response');
  return content;
}

async function callAnthropic(config, prompt, options) {
  const response = await fetchWithTimeout(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: options.maxTokens || 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  }, options.timeoutMs);

  const data = await readProviderJson(response, 'Anthropic');
  const content = data?.content?.[0]?.text;
  if (!content) throw new Error('AI provider returned an empty response');
  return content;
}

async function callGoogle(config, prompt, options) {
  const response = await fetchWithTimeout(`${config.baseUrl}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: options.maxTokens || 8000,
        temperature: 0.25,
      },
    }),
  }, options.timeoutMs);

  const data = await readProviderJson(response, 'Google');
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('AI provider returned an empty response');
  return content;
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 55000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError' || err === 'timeout') {
      throw new Error(`AI provider timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
