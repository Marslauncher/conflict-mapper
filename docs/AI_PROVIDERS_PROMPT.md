# AI PROVIDERS — Build Spec
## `lib/ai-providers.js`
### Conflict Mapper Backend Module

You are an expert Node.js developer building the multi-provider AI abstraction layer for Conflict Mapper. This document is the complete specification for `lib/ai-providers.js`. The module provides a unified `chat(systemPrompt, userPrompt, options)` interface over 5 different AI providers.

---

## Architecture

```
ai-config.json
      ↓
getProvider(config)     — factory function
      ↓
PerplexityProvider | OpenAIProvider | AnthropicProvider | GoogleProvider | LocalProvider
      ↓
provider.chat(systemPrompt, userPrompt, options)
      ↓
string (AI response text)
```

All providers implement the same interface:
```js
class SomeProvider {
  get name()                                    // display name string
  async chat(systemPrompt, userPrompt, options) // returns string
  async testConnection()                        // returns { success, message, model }
}
```

---

## HTTP Helpers

Two internal helpers handle all HTTP calls. **`httpPost` has no timeout** — callers that need timeouts (like `LocalProvider`) implement their own via `fetch` directly.

```js
// POST with JSON body — NO timeout (Perplexity sonar-deep-research can run 5–10+ minutes)
async function httpPost(url, headers, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }
  return response.json();
}

// GET — 1-minute timeout for test connection calls
async function httpGet(url, headers = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(60000),  // 1 minute for connection tests
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }
  return response.json();
}
```

---

## Provider 1: Perplexity

**Best for:** Analysis generation with real-time web search built in. Default provider.

| Property | Value |
|---|---|
| API Style | OpenAI-compatible chat completions |
| Base URL | `https://api.perplexity.ai` |
| Default Model | `sonar-pro` |
| Auth | `Authorization: Bearer <apiKey>` |
| Endpoint | `POST /chat/completions` |
| Key Feature | Built-in web search — model cites live sources |

### Model-specific parameter rules

| Model | max_tokens | temperature | Notes |
|---|---|---|---|
| `sonar-pro` | 16000 | 0.3 | Standard analysis model |
| `sonar` | 8000 | 0.3 | Lighter/faster |
| `sonar-deep-research` | **omit entirely** | **omit entirely** | Will error if either param is sent |
| `sonar-reasoning` | 8000 | omit | Chain-of-thought model |
| `sonar-reasoning-pro` | 8000 | omit | — |

```js
class PerplexityProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || '';
    this.model   = config.model   || 'sonar-pro';
    this.baseUrl = config.baseUrl || 'https://api.perplexity.ai';
  }

  get name() { return 'Perplexity'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) throw new Error('Perplexity API key not configured');

    const isDeepResearch = this.model === 'sonar-deep-research';

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    };

    // sonar-deep-research does not accept max_tokens or temperature — omit them entirely
    if (!isDeepResearch) {
      body.max_tokens  = options.maxTokens  || 16000;
      body.temperature = options.temperature !== undefined ? options.temperature : 0.3;
    }

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
    if (!this.apiKey) return { success: false, message: 'No API key configured', model: this.model };
    try {
      const data = await httpPost(
        `${this.baseUrl}/chat/completions`,
        { Authorization: `Bearer ${this.apiKey}` },
        { model: 'sonar', messages: [{ role: 'user', content: 'Reply with "OK" only.' }], max_tokens: 10 }
      );
      const content = data?.choices?.[0]?.message?.content;
      return { success: true, message: `Connected. Model: ${this.model}. Response: ${content}`, model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}
```

---

## Provider 2: OpenAI

**Best for:** General-purpose analysis. Strong instruction following.

| Property | Value |
|---|---|
| API Style | Standard chat completions |
| Base URL | `https://api.openai.com/v1` |
| Default Model | `gpt-4o` |
| Auth | `Authorization: Bearer <apiKey>` |
| Endpoint | `POST /chat/completions` |

```js
class OpenAIProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || '';
    this.model   = config.model   || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  get name() { return 'OpenAI'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) throw new Error('OpenAI API key not configured');

    const data = await httpPost(
      `${this.baseUrl}/chat/completions`,
      { Authorization: `Bearer ${this.apiKey}` },
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens:  options.maxTokens  || 8000,
        temperature: options.temperature !== undefined ? options.temperature : 0.3,
      }
    );

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned empty response');
    return content;
  }

  async testConnection() {
    if (!this.apiKey) return { success: false, message: 'No API key configured', model: this.model };
    try {
      const data = await httpGet(`${this.baseUrl}/models`, { Authorization: `Bearer ${this.apiKey}` });
      const modelList = (data?.data || []).map(m => m.id).slice(0, 3).join(', ');
      return { success: true, message: `Connected. Available models include: ${modelList}`, model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}
```

**Other OpenAI models:** `gpt-4o-mini`, `gpt-4-turbo`, `o1`, `o1-mini`

---

## Provider 3: Anthropic Claude

**Best for:** Long-context analysis, document summarization. Strong at following complex system prompts.

| Property | Value |
|---|---|
| API Style | Messages API (different from OpenAI format) |
| Base URL | `https://api.anthropic.com` |
| Default Model | `claude-sonnet-4-20250514` |
| Auth | `x-api-key: <apiKey>` |
| Version Header | `anthropic-version: 2023-06-01` (required) |
| Endpoint | `POST /v1/messages` |

**Key difference from OpenAI:** System prompt is a top-level field, not in the messages array.

```js
class AnthropicProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || '';
    this.model   = config.model   || 'claude-sonnet-4-20250514';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  get name() { return 'Anthropic'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) throw new Error('Anthropic API key not configured');

    const data = await httpPost(
      `${this.baseUrl}/v1/messages`,
      {
        'x-api-key':         this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      {
        model:      this.model,
        max_tokens: options.maxTokens || 8000,
        system:     systemPrompt,           // ← top-level, not in messages
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }
    );

    // Anthropic returns content as an array of content blocks
    const content = data?.content?.[0]?.text;
    if (!content) throw new Error('Anthropic returned empty response');
    return content;
  }

  async testConnection() {
    if (!this.apiKey) return { success: false, message: 'No API key configured', model: this.model };
    try {
      const data = await httpPost(
        `${this.baseUrl}/v1/messages`,
        { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
        { model: this.model, max_tokens: 10, messages: [{ role: 'user', content: 'Reply "OK" only.' }] }
      );
      const content = data?.content?.[0]?.text;
      return { success: true, message: `Connected. Response: ${content}`, model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}
```

**Other Anthropic models:** `claude-opus-4-20250514`, `claude-haiku-3-5-20241022`

---

## Provider 4: Google Gemini

**Best for:** Fast, cost-effective analysis. Good for batch processing.

| Property | Value |
|---|---|
| API Style | REST generateContent (not OpenAI compatible) |
| Base URL | `https://generativelanguage.googleapis.com` |
| Default Model | `gemini-2.0-flash` |
| Auth | `?key=<apiKey>` query parameter |
| Endpoint | `POST /v1beta/models/{model}:generateContent?key=...` |

**Key difference:** API key goes in query param, not header. System prompt uses `system_instruction` field with `parts` array.

```js
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

    const data = await httpPost(url, {}, {
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
    });

    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Google Gemini returned empty response');
    return content;
  }

  async testConnection() {
    if (!this.apiKey) return { success: false, message: 'No API key configured', model: this.model };
    try {
      const url = `${this.baseUrl}/v1beta/models?key=${this.apiKey}`;
      const data = await httpGet(url);
      const models = (data?.models || []).map(m => m.name).slice(0, 3).join(', ');
      return { success: true, message: `Connected. Models: ${models}`, model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}
```

**Other Google models:** `gemini-2.0-flash-thinking-exp`, `gemini-1.5-pro`, `gemini-1.5-flash`

---

## Provider 5: Local / Ollama

**Best for:** Private, air-gapped deployments. No API key or cost. Requires Ollama running locally.

| Property | Value |
|---|---|
| API Style | OpenAI-compatible (Ollama speaks this) |
| Base URL | `http://localhost:11434/v1` |
| Default Model | `llama3.1` |
| Auth | None (uses `'ollama'` as placeholder key) |
| Timeout | 10 minutes (600,000ms) — uses manual fetch, not httpPost |

```js
class LocalProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || 'ollama';
    this.model   = config.model   || 'llama3.1';
    this.baseUrl = config.baseUrl || 'http://localhost:11434/v1';
  }

  get name() { return 'Local (Ollama)'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    // Uses manual fetch (not httpPost) for the extended 10-minute timeout
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens:  options.maxTokens  || 8000,
        temperature: options.temperature !== undefined ? options.temperature : 0.3,
      }),
      signal: AbortSignal.timeout(600000),  // 10 minutes for slow local models
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
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
        message: `Ollama connected. Available: ${models.join(', ')}. ${hasModel ? 'Target model available.' : `Target model "${this.model}" not found.`}`,
        model: hasModel ? this.model : models[0],
      };
    } catch (err) {
      return { success: false, message: `Cannot reach Ollama at ${this.baseUrl}: ${err.message}`, model: this.model };
    }
  }
}
```

**Setup Ollama:** `brew install ollama` → `ollama serve` → `ollama pull llama3.1`

---

## Factory Function: `getProvider(config)`

```js
function getProvider(config = {}) {
  const providerName   = config.provider || 'perplexity';
  const providerConfig = (config.providers || {})[providerName] || {};

  switch (providerName) {
    case 'perplexity': return new PerplexityProvider(providerConfig);
    case 'openai':     return new OpenAIProvider(providerConfig);
    case 'anthropic':  return new AnthropicProvider(providerConfig);
    case 'google':     return new GoogleProvider(providerConfig);
    case 'local':      return new LocalProvider(providerConfig);
    default:
      console.warn(`[ai-providers] Unknown provider "${providerName}", falling back to Perplexity`);
      return new PerplexityProvider(providerConfig);
  }
}
```

---

## `listProviders()` — Metadata

```js
function listProviders() {
  return [
    { id: 'perplexity', name: 'Perplexity',      defaultModel: 'sonar-pro',               note: 'Has built-in web search (recommended)' },
    { id: 'openai',     name: 'OpenAI',           defaultModel: 'gpt-4o',                  note: 'Most capable general model' },
    { id: 'anthropic',  name: 'Anthropic Claude', defaultModel: 'claude-sonnet-4-20250514', note: 'Strong long-context analysis' },
    { id: 'google',     name: 'Google Gemini',    defaultModel: 'gemini-2.0-flash',        note: 'Fast and cost-effective' },
    { id: 'local',      name: 'Local (Ollama)',   defaultModel: 'llama3.1',                note: 'Private, no API key required' },
  ];
}
```

---

## `ai-config.json` Schema

```json
{
  "provider": "perplexity",
  "providers": {
    "perplexity": {
      "apiKey":  "pplx-abc123...",
      "model":   "sonar-pro",
      "baseUrl": "https://api.perplexity.ai"
    },
    "openai": {
      "apiKey":  "sk-...",
      "model":   "gpt-4o",
      "baseUrl": "https://api.openai.com/v1"
    },
    "anthropic": {
      "apiKey":  "sk-ant-...",
      "model":   "claude-sonnet-4-20250514",
      "baseUrl": "https://api.anthropic.com"
    },
    "google": {
      "apiKey":  "AIza...",
      "model":   "gemini-2.0-flash",
      "baseUrl": "https://generativelanguage.googleapis.com"
    },
    "local": {
      "apiKey":  "ollama",
      "model":   "llama3.1",
      "baseUrl": "http://localhost:11434/v1"
    }
  }
}
```

API keys are stored on disk. The server masks keys (shows first 4 + last 4 chars) when returning config via `GET /api/ai/config`.

---

## JSON Parser: `parseAIJson(rawText)`

The analysis generator calls this after every AI response. It handles three common failure modes from Perplexity responses:

```js
function parseAIJson(rawText) {
  let text = rawText.trim();

  // 1. Strip Perplexity citation markers: [1], [2][3], etc.
  text = text.replace(/\[\d+\](\[\d+\])*/g, '');

  // 2. Extract JSON from markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();

  // 3. Attempt parse; on failure, try to repair truncated JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    // Repair: find last complete top-level value and close any open structures
    console.warn('[parseAIJson] Initial parse failed, attempting repair:', e.message);
    const repaired = repairTruncatedJson(text);
    try {
      const result = JSON.parse(repaired);
      console.info('[parseAIJson] Repair succeeded');
      return result;
    } catch (e2) {
      console.error('[parseAIJson] Repair failed. Raw length:', text.length, '| Error:', e2.message);
      throw new Error(`AI response was not valid JSON: ${e2.message}`);
    }
  }
}

function repairTruncatedJson(text) {
  // Close any unclosed arrays and objects by counting open brackets
  let opens = 0;
  let inString = false;
  let escape = false;
  for (const ch of text) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') opens++;
    if (ch === '}' || ch === ']') opens--;
  }
  // Trim trailing comma before closing
  let fixed = text.trimEnd().replace(/,\s*$/, '');
  // Close open structures
  while (opens > 0) {
    // Heuristic: if more opens than closes, append }
    fixed += '}';
    opens--;
  }
  return fixed;
}
```

**Diagnostic logging:** Every parse attempt logs its outcome to the `[parseAIJson]` category so failures are visible in the admin LOGS tab.

---

## Analysis Generator Token Limits

The `lib/analysis-generator.js` uses these defaults when calling `provider.chat()`:

```js
// Global intelligence report
const globalOptions = { maxTokens: 16000, temperature: 0.3 };

// Per-country report
const countryOptions = { maxTokens: 16000, temperature: 0.3 };
```

---

## Testing Credentials Without Saving

`POST /api/ai/test` accepts credentials in the request body. If `apiKey` is provided, those are used directly — credentials are NOT saved to disk.

```bash
# Test a new Perplexity key before saving
curl -X POST http://localhost:5000/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "perplexity", "apiKey": "pplx-newkey...", "model": "sonar-pro"}'
```

---

## Error Handling

All providers throw on error. The caller (analysis generator) must catch:

| Error | Cause |
|---|---|
| `'No API key configured'` | `apiKey` is empty string |
| `'HTTP 401: ...'` | Invalid API key |
| `'HTTP 429: ...'` | Rate limited |
| `'HTTP 500: ...'` | Provider server error |
| `AbortError` | Timeout exceeded (Ollama only — 10 min) |
| `'... returned empty response'` | API returned success but no text content |

---

## Token Limits & Temperature Defaults

| Provider | Default maxTokens | Default temperature | Notes |
|---|---|---|---|
| Perplexity `sonar-pro` | 16000 | 0.3 | — |
| Perplexity `sonar-deep-research` | **not sent** | **not sent** | Omit both params or API errors |
| OpenAI | 8000 | 0.3 | gpt-4o supports 128k context |
| Anthropic | 8000 | not sent | Claude uses top_p internally |
| Google | 8000 | 0.3 | flash supports up to 8192 output |
| Local | 8000 | 0.3 | Depends on loaded model |

Temperature 0.3 is intentionally low for analysis tasks — consistent, factual output.

---

## Exports

```js
module.exports = {
  getProvider,
  listProviders,
  parseAIJson,
  PerplexityProvider,
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  LocalProvider,
};
```

---

## How to Add a New Provider (e.g., Mistral)

```js
class MistralProvider {
  constructor(config) {
    this.apiKey  = config.apiKey  || '';
    this.model   = config.model   || 'mistral-large-latest';
    this.baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
  }

  get name() { return 'Mistral'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) throw new Error('Mistral API key not configured');
    const data = await httpPost(
      `${this.baseUrl}/chat/completions`,
      { Authorization: `Bearer ${this.apiKey}` },
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens:  options.maxTokens  || 8000,
        temperature: options.temperature !== undefined ? options.temperature : 0.3,
      }
    );
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Mistral returned empty response');
    return content;
  }

  async testConnection() {
    if (!this.apiKey) return { success: false, message: 'No API key configured', model: this.model };
    try {
      const data = await httpGet(`${this.baseUrl}/models`, { Authorization: `Bearer ${this.apiKey}` });
      return { success: true, message: `Connected. Models: ${(data?.data || []).map(m => m.id).slice(0, 3).join(', ')}`, model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}

// Add to getProvider():
case 'mistral': return new MistralProvider(providerConfig);

// Add to listProviders():
{ id: 'mistral', name: 'Mistral', defaultModel: 'mistral-large-latest', note: 'European open-weight model' },
```
