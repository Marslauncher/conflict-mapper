const PROVIDERS = [
  { id: 'perplexity', name: 'Perplexity', defaultModel: 'sonar-pro' },
  { id: 'openrouter', name: 'OpenRouter', defaultModel: 'openai/gpt-4o-mini' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o' },
  { id: 'anthropic', name: 'Anthropic Claude', defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'google', name: 'Google Gemini', defaultModel: 'gemini-2.0-flash' },
];

const AI_CONFIG_KV_KEY = 'ai:config:v1';

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
        model: env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
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

export async function generateReportText(env, systemPrompt, userPrompt) {
  const config = await getEffectiveAIConfig(env);
  const providerConfig = config.providers[config.provider];
  if (!providerConfig?.apiKey) {
    throw new Error(`No API key configured for provider "${config.provider}"`);
  }
  return callModel(config.provider, providerConfig, `${systemPrompt}\n\n${userPrompt}`, { maxTokens: 12000 });
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
  if (provider === 'anthropic') return callAnthropic(config, prompt, options);
  if (provider === 'google') return callGoogle(config, prompt, options);
  return callOpenAICompatible(config, prompt, options);
}

async function callOpenAICompatible(config, prompt, options) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
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
  });

  if (!response.ok) throw new Error(`AI HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI provider returned an empty response');
  return content;
}

async function callAnthropic(config, prompt, options) {
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
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
  });

  if (!response.ok) throw new Error(`AI HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (!content) throw new Error('AI provider returned an empty response');
  return content;
}

async function callGoogle(config, prompt, options) {
  const response = await fetch(`${config.baseUrl}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: options.maxTokens || 8000,
        temperature: 0.25,
      },
    }),
  });

  if (!response.ok) throw new Error(`AI HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('AI provider returned an empty response');
  return content;
}
