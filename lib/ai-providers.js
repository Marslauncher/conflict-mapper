/**
 * ai-providers.js — Multi-provider AI abstraction layer for Conflict Mapper
 *
 * Supported providers:
 *   - perplexity  (OpenAI-compatible, sonar-pro with web search)
 *   - openai      (Standard chat completions, gpt-4o)
 *   - anthropic   (Messages API, claude-sonnet)
 *   - google      (Gemini REST API)
 *   - local       (Ollama OpenAI-compatible endpoint)
 *
 * Usage:
 *   const { getProvider } = require('./ai-providers');
 *   const provider = getProvider(aiConfig);
 *   const text = await provider.chat(systemPrompt, userPrompt, { maxTokens: 8000 });
 *   const status = await provider.testConnection();
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Make a JSON POST request using Node's native fetch (Node 18+).
 * Falls back to a simple https request if fetch is unavailable.
 */
async function httpPost(url, headers, body) {
  // Use native fetch (Node 18+)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
    // 5-minute timeout for large AI responses (analysis reports with web search can take 2-4 min)
    signal: AbortSignal.timeout(300000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  return response.json();
}

/**
 * Make a JSON GET request.
 */
async function httpGet(url, headers = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER: PERPLEXITY
// Uses OpenAI-compatible chat completions API with online search capability
// ─────────────────────────────────────────────────────────────────────────────

class PerplexityProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || '';
    this.model   = config.model   || 'sonar-pro';
    this.baseUrl = config.baseUrl || 'https://api.perplexity.ai';
  }

  get name() { return 'Perplexity'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) throw new Error('Perplexity API key not configured');

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens:  options.maxTokens  || 8000,
      temperature: options.temperature !== undefined ? options.temperature : 0.3,
    };

    const data = await httpPost(
      `${this.baseUrl}/chat/completions`,
      { Authorization: `Bearer ${this.apiKey}` },
      body
    );

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Perplexity returned empty response');
    return content;
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, message: 'No API key configured', model: this.model };
    }
    try {
      const data = await httpPost(
        `${this.baseUrl}/chat/completions`,
        { Authorization: `Bearer ${this.apiKey}` },
        {
          model: this.model,
          messages: [{ role: 'user', content: 'Reply with "OK" only.' }],
          max_tokens: 10,
        }
      );
      const content = data?.choices?.[0]?.message?.content;
      return { success: true, message: `Connected. Model: ${this.model}. Response: ${content}`, model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER: OPENAI
// Standard chat completions API
// ─────────────────────────────────────────────────────────────────────────────

class OpenAIProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || '';
    this.model   = config.model   || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  get name() { return 'OpenAI'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) throw new Error('OpenAI API key not configured');

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens:  options.maxTokens  || 8000,
      temperature: options.temperature !== undefined ? options.temperature : 0.3,
    };

    const data = await httpPost(
      `${this.baseUrl}/chat/completions`,
      { Authorization: `Bearer ${this.apiKey}` },
      body
    );

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned empty response');
    return content;
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, message: 'No API key configured', model: this.model };
    }
    try {
      // Use the models endpoint for a lightweight test
      const data = await httpGet(
        `${this.baseUrl}/models`,
        { Authorization: `Bearer ${this.apiKey}` }
      );
      const modelList = (data?.data || []).map(m => m.id).slice(0, 3).join(', ');
      return { success: true, message: `Connected. Available models include: ${modelList}`, model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER: ANTHROPIC
// Uses the Messages API
// ─────────────────────────────────────────────────────────────────────────────

class AnthropicProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || '';
    this.model   = config.model   || 'claude-sonnet-4-20250514';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  get name() { return 'Anthropic'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) throw new Error('Anthropic API key not configured');

    const body = {
      model: this.model,
      max_tokens: options.maxTokens || 8000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    };

    const data = await httpPost(
      `${this.baseUrl}/v1/messages`,
      {
        'x-api-key':         this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body
    );

    // Anthropic returns content as an array of content blocks
    const content = data?.content?.[0]?.text;
    if (!content) throw new Error('Anthropic returned empty response');
    return content;
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, message: 'No API key configured', model: this.model };
    }
    try {
      const data = await httpPost(
        `${this.baseUrl}/v1/messages`,
        {
          'x-api-key':         this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        {
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Reply with "OK" only.' }],
        }
      );
      const content = data?.content?.[0]?.text;
      return { success: true, message: `Connected. Model: ${this.model}. Response: ${content}`, model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER: GOOGLE GEMINI
// Uses the REST generateContent API
// ─────────────────────────────────────────────────────────────────────────────

class GoogleProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || '';
    this.model   = config.model   || 'gemini-2.0-flash';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
  }

  get name() { return 'Google Gemini'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) throw new Error('Google API key not configured');

    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        maxOutputTokens: options.maxTokens  || 8000,
        temperature:     options.temperature !== undefined ? options.temperature : 0.3,
      },
    };

    const data = await httpPost(url, {}, body);

    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Google Gemini returned empty response');
    return content;
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, message: 'No API key configured', model: this.model };
    }
    try {
      const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const data = await httpPost(url, {}, {
        contents: [{ role: 'user', parts: [{ text: 'Reply with "OK" only.' }] }],
        generationConfig: { maxOutputTokens: 10 },
      });
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return { success: true, message: `Connected. Model: ${this.model}. Response: ${content}`, model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER: LOCAL (OLLAMA)
// Uses OpenAI-compatible API served locally
// ─────────────────────────────────────────────────────────────────────────────

class LocalProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || 'ollama'; // Ollama doesn't require a real key
    this.model   = config.model   || 'llama3.1';
    this.baseUrl = config.baseUrl || 'http://localhost:11434/v1';
  }

  get name() { return 'Local (Ollama)'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens:  options.maxTokens  || 8000,
      temperature: options.temperature !== undefined ? options.temperature : 0.3,
    };

    // Ollama can be slow — extend timeout to 10 minutes
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(600000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Local model returned empty response');
    return content;
  }

  async testConnection() {
    try {
      const data = await httpGet(`${this.baseUrl}/models`);
      const models = (data?.data || []).map(m => m.id);
      if (models.length === 0) {
        return { success: false, message: 'Ollama running but no models loaded. Run: ollama pull llama3.1', model: this.model };
      }
      const hasModel = models.includes(this.model);
      return {
        success: true,
        message: `Ollama connected. Available: ${models.join(', ')}. ${hasModel ? 'Target model available.' : `Target model "${this.model}" not found — will use ${models[0]}.`}`,
        model: hasModel ? this.model : models[0],
      };
    } catch (err) {
      return { success: false, message: `Cannot reach Ollama at ${this.baseUrl}: ${err.message}`, model: this.model };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getProvider(config)
 * Returns the appropriate AI provider instance based on config.
 *
 * @param {object} config - AI config from data/ai-config.json
 *   { provider: 'perplexity', providers: { perplexity: { apiKey, model, baseUrl }, ... } }
 * @returns {PerplexityProvider|OpenAIProvider|AnthropicProvider|GoogleProvider|LocalProvider}
 */
function getProvider(config = {}) {
  const providerName = config.provider || 'perplexity';
  const providerConfig = (config.providers || {})[providerName] || {};

  switch (providerName) {
    case 'perplexity':
      return new PerplexityProvider(providerConfig);
    case 'openai':
      return new OpenAIProvider(providerConfig);
    case 'anthropic':
      return new AnthropicProvider(providerConfig);
    case 'google':
      return new GoogleProvider(providerConfig);
    case 'local':
      return new LocalProvider(providerConfig);
    default:
      console.warn(`[ai-providers] Unknown provider "${providerName}", falling back to Perplexity`);
      return new PerplexityProvider(providerConfig);
  }
}

/**
 * listProviders()
 * Returns metadata about all supported providers.
 */
function listProviders() {
  return [
    { id: 'perplexity', name: 'Perplexity',      defaultModel: 'sonar-pro',                    note: 'Has built-in web search (recommended)' },
    { id: 'openai',     name: 'OpenAI',           defaultModel: 'gpt-4o',                       note: 'Most capable general model' },
    { id: 'anthropic',  name: 'Anthropic Claude', defaultModel: 'claude-sonnet-4-20250514',     note: 'Strong long-context analysis' },
    { id: 'google',     name: 'Google Gemini',    defaultModel: 'gemini-2.0-flash',             note: 'Fast and cost-effective' },
    { id: 'local',      name: 'Local (Ollama)',   defaultModel: 'llama3.1',                     note: 'Private, no API key required' },
  ];
}

module.exports = {
  getProvider,
  listProviders,
  PerplexityProvider,
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  LocalProvider,
};
