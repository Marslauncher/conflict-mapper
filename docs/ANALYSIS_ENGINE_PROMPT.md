# ANALYSIS ENGINE — System Prompt & Developer Guide
## Conflict Mapper Platform | `lib/analysis-generator.js`

> Use this document as a standalone system prompt when working on, extending, or debugging the AI-powered report generation pipeline. Paste the full contents into a new prompt window along with any specific code you want to modify.

---

## 1. Overview

The analysis engine (`lib/analysis-generator.js`) is the core intelligence production system. It orchestrates an end-to-end pipeline that converts raw RSS articles into styled HTML intelligence dossiers using an AI language model.

**Pipeline steps (in order):**

```
1. Gather articles  →  getArticles() + getFlaggedArticles()
2. Build prompt     →  formatArticleForPrompt() × N articles
3. Call AI          →  provider.chat(systemPrompt, userPrompt)
4. Parse JSON       →  parseAIJson(rawResponse)
5. Render HTML      →  renderGlobalHTML(data) / renderCountryHTML(data)
6. Archive          →  archiveCurrentReport(currentDir, historicalDir)
7. Save             →  fs.writeFileSync(reportPath, html)
```

**Exports:**

| Function | Description |
|---|---|
| `generateGlobalAnalysis(options)` | Run full global intelligence report |
| `generateCountryAnalysis(slug, options)` | Run report for one country |
| `generateAllCountries(options, cb)` | Run all 11 country reports sequentially |
| `generateAll(options, cb)` | Global + all countries in sequence |
| `listHistoricalReports(type, slug)` | List archived reports for index display |
| `COUNTRY_SLUGS` | Array of all supported country slugs |

---

## 2. Key Constants

```js
// lib/analysis-generator.js
const MAX_ARTICLES_FOR_PROMPT = 80;  // Max articles fed to AI (context budget)
const ARTICLE_SNIPPET_LEN    = 200;  // Characters of description per article

const COUNTRY_SLUGS = [
  'usa', 'russia', 'china', 'ukraine', 'taiwan',
  'iran', 'israel', 'india', 'pakistan', 'north-korea', 'nato',
];
```

To add a new country: append its slug to `COUNTRY_SLUGS` and add a `getCountryFromSlug()` entry in `lib/geocoder.js`.

---

## 3. The Global Analysis System Prompt

`GLOBAL_SYSTEM_PROMPT` instructs the AI to act as a "senior geopolitical intelligence analyst" producing a classified-style briefing. The required JSON schema:

```json
{
  "title": "Global Intelligence Report — [DATE]",
  "classification": "UNCLASSIFIED // FOR INFORMATIONAL PURPOSES",
  "generatedAt": "[ISO timestamp]",
  "executiveSummary": "2-3 sentence top-level summary",
  "globalTrends": [
    {
      "rank": 1,
      "title": "Trend title",
      "description": "100-200 word detailed description",
      "riskLevel": "CRITICAL|HIGH|MEDIUM|LOW",
      "regions": ["region1"],
      "coordinates": [{ "lat": 0, "lng": 0, "label": "location name" }],
      "trend": "ESCALATING|STABLE|DE-ESCALATING"
    }
  ],
  "areasOfConcern": [
    {
      "location": "Location name",
      "description": "What is happening and why it matters",
      "riskLevel": "CRITICAL|HIGH|MEDIUM|LOW",
      "coordinates": { "lat": 0, "lng": 0 }
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
    "middleEast": "...",
    "asiaPacific": "...",
    "africa": "...",
    "americas": "...",
    "arctic": "..."
  },
  "nearTermOutlook": "3-4 sentence 30-90 day forward assessment",
  "watchList": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"]
}
```

**Critical rule enforced in the prompt:** `Output ONLY the JSON object, no markdown code blocks, no preamble.`

The AI call uses `temperature: 0.3` and `maxTokens: 8000` for consistent, factual output.

---

## 4. The Country Analysis System Prompt

`COUNTRY_SYSTEM_PROMPT(countryName)` is a template function that customizes the prompt for the specific country. Required JSON schema:

```json
{
  "country": "Russia",
  "generatedAt": "[ISO timestamp]",
  "classification": "UNCLASSIFIED // FOR INFORMATIONAL PURPOSES",
  "executiveSummary": "3-4 sentence overall assessment",
  "threatLevel": "CRITICAL|HIGH|ELEVATED|GUARDED|LOW",
  "sections": {
    "geopolitical": {
      "title": "Geopolitical News",
      "content": "200-400 word analysis",
      "keyDevelopments": ["Development 1", "Development 2", "Development 3"],
      "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
    },
    "breaking":     { ... },
    "military":     { ... },
    "political":    { ... },
    "economic":     { ... },
    "science":      { ... },
    "ai":           { ... },
    "robotics":     { ... }
  },
  "areasOfConcern": [
    {
      "title": "Concern title",
      "description": "Strategic importance",
      "riskLevel": "CRITICAL|HIGH|MEDIUM|LOW",
      "coordinates": { "lat": 0, "lng": 0 }
    }
  ],
  "nearTermOutlook": "3-4 sentence 30-90 day forecast",
  "mapMarkers": [
    { "lat": 0, "lng": 0, "label": "Location name", "type": "event|base|conflict|political" }
  ]
}
```

**All 8 sections are required.** The AI must fill in content even when articles are sparse — it draws on training data for baseline context.

---

## 5. How to Modify AI Prompts

### Change the tone or depth

Locate the `GLOBAL_SYSTEM_PROMPT` constant and modify the role description:

```js
// More aggressive / classified tone:
const GLOBAL_SYSTEM_PROMPT = `You are a DIA senior analyst writing TOP SECRET//SCI briefings...`

// More journalistic:
const GLOBAL_SYSTEM_PROMPT = `You are an investigative journalist specializing in geopolitics...`
```

### Change the time window for articles

In `gatherArticlesForPrompt()`:

```js
const filters = { timeRange: 72 };  // Change 72 to 24, 48, or 168 (1 week)
```

### Increase / decrease article context

```js
const MAX_ARTICLES_FOR_PROMPT = 80;   // Increase for deeper context (hits token limits)
const ARTICLE_SNIPPET_LEN    = 200;   // Increase for more article detail per item
```

### Add more sections to country reports

Add a new key to the `sections` object in `COUNTRY_SYSTEM_PROMPT`:

```js
"cyberwarfare": {
  "title": "Cyber Warfare",
  "content": "Offensive cyber operations, APT activity, infrastructure targeting (150-300 words)",
  "keyDevelopments": ["Item 1", "Item 2"],
  "trendDirection": "ESCALATING|STABLE|IMPROVING|MIXED"
}
```

Then add a matching entry in `renderCountryHTML()` section icon mapping:

```js
const sectionIcons = {
  // ...existing...
  cyberwarfare: '💻',
};
```

---

## 6. Adding a New Analysis Type

To add a **theater analysis** (e.g., Taiwan Strait daily brief):

### Step 1: Define the system prompt

```js
const THEATER_SYSTEM_PROMPT = (theaterName) => `You are a senior analyst specializing in ${theaterName}...
// JSON schema with theater-specific fields
`;
```

### Step 2: Add a generator function

```js
async function generateTheaterAnalysis(theaterSlug, options = {}) {
  const aiConfig   = getAIConfig(false);
  const provider   = getProvider(aiConfig);
  const theaterName = THEATER_NAMES[theaterSlug];

  const articles = gatherArticlesForPrompt(null, null);  // or filter by region
  const rawResponse = await provider.chat(
    THEATER_SYSTEM_PROMPT(theaterName),
    `Articles:\n${articles}`,
    { maxTokens: 8000, temperature: 0.3 }
  );
  const data = parseAIJson(rawResponse);
  const html = renderTheaterHTML(data);

  const currentDir = path.join(REPORTS_DIR, 'theaters', theaterSlug, 'current');
  archiveCurrentReport(currentDir, path.join(REPORTS_DIR, 'theaters', theaterSlug, 'historical'));
  ensureDir(currentDir);
  fs.writeFileSync(path.join(currentDir, 'report.html'), html, 'utf8');
  return { success: true, reportPath: `/reports/theaters/${theaterSlug}/current/report.html` };
}
```

### Step 3: Add the API route in `server.js`

```js
app.post('/api/analysis/theater/:slug', asyncRoute(async (req, res) => {
  // ... (same pattern as country route)
}));
```

---

## 7. HTML Template Engine

### `renderGlobalHTML(data)` — Global Report Renderer

Converts the AI JSON into a full standalone HTML page with:
- Classification bar
- Executive summary callout block
- Global trends cards (with risk badges and trend arrows)
- Breaking developments feed
- Areas of concern list
- Regional assessments by theater
- Near-term outlook box
- Watch list

### `renderCountryHTML(data)` — Country Report Renderer

Produces:
- Classification bar
- Threat level indicator bar
- Executive summary
- 8-section grid (content + key developments sidebar)
- Areas of concern panel
- Near-term outlook

### Risk Badge Colors

```js
const colors = {
  CRITICAL:   '#ff2244',   // Red
  HIGH:       '#ff6600',   // Orange
  ELEVATED:   '#ffaa00',   // Amber
  MEDIUM:     '#ffaa00',   // Amber
  GUARDED:    '#88cc00',   // Yellow-green
  LOW:        '#00cc88',   // Green
  ESCALATING: '#ff4444',   // Red
  STABLE:     '#aaaaaa',   // Gray
  IMPROVING:  '#00cc88',   // Green
  MIXED:      '#ffaa00',   // Amber
};
```

### Customizing HTML Output

To change the dark background color scheme, modify the `<style>` section within `renderGlobalHTML()`:

```js
// Find this in the CSS string inside renderGlobalHTML():
background: #0a0c10;    // Body background
background: #141820;    // Card backgrounds
background: #0f1117;    // Panel backgrounds
color: #00c8b4;         // Accent teal (report titles, labels)
```

---

## 8. Archival System

Reports follow a **two-directory pattern**:

```
reports/
├── global/
│   ├── current/
│   │   └── report.html          ← Live, loaded in iframe
│   └── historical/
│       ├── report-2026-03-28T10-00-00.html
│       └── report-2026-03-27T10-00-00.html
└── countries/
    └── russia/
        ├── current/
        │   └── report.html
        └── historical/
            └── report-2026-03-28T22-55-52.html
```

**How archiving works:**

```js
function archiveCurrentReport(currentDir, historicalDir) {
  const currentFile = path.join(currentDir, 'report.html');
  if (!fs.existsSync(currentFile)) return;          // Nothing to archive

  ensureDir(historicalDir);
  // Timestamp format: 2026-03-28T22-55-52 (colons replaced with dashes)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archivePath = path.join(historicalDir, `report-${timestamp}.html`);
  fs.copyFileSync(currentFile, archivePath);
}
```

The historical page (`pages/historical.html`) queries `/api/analysis/history/global` and `/api/analysis/history/country/:slug` to list archived reports for user selection.

**Retention:** By default, no automatic pruning. To enable, add a cleanup step to remove archives older than `settings.reportRetentionDays` (default: 30).

---

## 9. Supported AI Providers

Configured in `data/ai-config.json`. The active provider is selected by the `provider` key:

| Provider ID | Class | Default Model | Notes |
|---|---|---|---|
| `perplexity` | `PerplexityProvider` | `sonar-pro` | Has web search capability — **recommended** |
| `openai` | `OpenAIProvider` | `gpt-4o` | Standard chat completions |
| `anthropic` | `AnthropicProvider` | `claude-sonnet-4-20250514` | Strong long-context analysis |
| `google` | `GoogleProvider` | `gemini-2.0-flash` | Fast and cost-effective |
| `local` | `LocalProvider` | `llama3.1` | Ollama — private, no API key needed |

### Adding a New Provider

1. Create a new class in `lib/ai-providers.js`:

```js
class MyProvider {
  constructor(config) {
    this.apiKey  = config.apiKey || '';
    this.model   = config.model  || 'my-model-v1';
    this.baseUrl = config.baseUrl || 'https://api.myprovider.com';
  }
  get name() { return 'MyProvider'; }

  async chat(systemPrompt, userPrompt, options = {}) {
    const data = await httpPost(
      `${this.baseUrl}/v1/chat`,
      { Authorization: `Bearer ${this.apiKey}` },
      {
        model: this.model,
        system: systemPrompt,
        prompt: userPrompt,
        max_tokens: options.maxTokens || 8000,
        temperature: options.temperature ?? 0.3,
      }
    );
    const content = data?.response;
    if (!content) throw new Error('MyProvider returned empty response');
    return content;
  }

  async testConnection() {
    try {
      await this.chat('', 'Reply with OK only.', { maxTokens: 5 });
      return { success: true, message: 'Connected', model: this.model };
    } catch (err) {
      return { success: false, message: err.message, model: this.model };
    }
  }
}
```

2. Register it in `getProvider()`:

```js
case 'myprovider':
  return new MyProvider(providerConfig);
```

3. Add to `listProviders()` for admin panel discovery.

---

## 10. API Endpoints for Triggering Generation

All generation endpoints are **non-blocking** — they respond immediately with `{ success: true }` and run in the background. Poll `/api/analysis/status` for progress.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analysis/global` | Generate global intelligence report |
| `POST` | `/api/analysis/country/:slug` | Generate report for `slug` (e.g., `russia`) |
| `POST` | `/api/analysis/all-countries` | Generate all 11 country reports sequentially |
| `POST` | `/api/analysis/all` | Generate global + all countries |
| `GET` | `/api/analysis/status` | Poll generation progress |
| `GET` | `/api/analysis/history/global` | List historical global reports |
| `GET` | `/api/analysis/history/country/:slug` | List historical country reports |

### Progress polling response schema

```json
{
  "success": true,
  "data": {
    "running": true,
    "phase": "countries",
    "current": 4,
    "total": 12,
    "message": "Generating iran (4/11)...",
    "lastRun": "2026-03-28T22:54:00.000Z",
    "lastResult": null
  }
}
```

---

## 11. The JSON Parse Safety Net

AI models occasionally wrap JSON in markdown code fences or add preamble text. `parseAIJson()` handles three cases:

```js
function parseAIJson(text) {
  // Attempt 1: Direct JSON.parse
  try { return JSON.parse(text); } catch (_) {}

  // Attempt 2: Extract from ```json ... ``` code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1]); } catch (_) {}
  }

  // Attempt 3: Find outermost { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace  = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch (_) {}
  }

  throw new Error('Could not extract valid JSON from AI response');
}
```

---

## 12. Troubleshooting

### Timeout / AI call never returns
- Default AI timeout is 90 seconds (`AbortSignal.timeout(90000)`)
- Local Ollama has a 3-minute timeout (`AbortSignal.timeout(180000)`)
- **Fix:** Switch to a faster provider (Gemini Flash) or reduce `MAX_ARTICLES_FOR_PROMPT` to lower token count

### Bad JSON parse error
- The AI returned markdown or prose instead of raw JSON
- Check logs for `[analysis-generator] Global analysis error: Could not extract valid JSON`
- **Fix 1:** Add "do not wrap in code blocks" to the system prompt (already there, but emphasize it)
- **Fix 2:** Lower `temperature` to `0.1` for more deterministic output
- **Fix 3:** Try a different provider — some models are more JSON-compliant

### Report shows "No recent articles available"
- `gatherArticlesForPrompt()` found zero articles in the 72-hour window
- **Check:** `GET /api/articles?timeRange=72` — is it returning articles?
- **Fix:** Run `POST /api/feeds/fetch` first to populate the article store

### Country analysis always shows UNKNOWN threat level
- The AI omitted `threatLevel` from its JSON
- **Fix:** Strengthen the system prompt: `"You MUST include threatLevel. Valid values: CRITICAL, HIGH, ELEVATED, GUARDED, LOW"`

### Rate limiting errors on "Generate All"
- The `generateAllCountries()` function adds a 2-second pause between country calls
- **Fix:** Increase the pause: `await new Promise(r => setTimeout(r, 5000))`
- Perplexity sonar-pro has generous rate limits; OpenAI gpt-4o is more restrictive at free tiers

### Reports not showing up in Historical tab
- Historical reports are named `report-YYYY-MM-DDTHH-MM-SS.html`
- **Check:** Does `reports/countries/[slug]/historical/` directory exist?
- **Fix:** The directory is auto-created on first archive; ensure the server has write permissions to the `reports/` directory

---

*This prompt covers `lib/analysis-generator.js`, `lib/ai-providers.js`, and the report generation API routes in `server.js`. Cross-reference `MAP_AND_FEED_PROMPT.md` for article sourcing, `ADMIN_SETTINGS_PROMPT.md` for the generation UI, and `SITE_ARCHITECTURE_PROMPT.md` for the full system overview.*
