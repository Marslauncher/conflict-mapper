# ADMIN SETTINGS SYSTEM — System Prompt & Developer Guide
## Conflict Mapper Platform | `index.html` (Admin Panel section)

> Use this document as a standalone system prompt when working on the admin panel, authentication system, or any settings-related functionality. The admin panel is embedded directly inside `index.html` — it is not a separate file.

---

## 1. Admin Panel Architecture

The admin panel is a **sliding overlay** rendered entirely within `index.html`. It is not a separate page or iframe — it is a `<div id="admin-panel">` that becomes visible by toggling the `visible` CSS class.

### State Machine

```
App states (mutually exclusive):
  ┌─────────────────┐
  │  Welcome Screen │ ← default on load
  │  #welcome-screen│
  └────────┬────────┘
           │ loadContent(target)
           ▼
  ┌─────────────────┐
  │  Content iframe │ ← shows dossiers, reports, maps
  │  #content-iframe│
  └────────┬────────┘
           │ openAdmin()
           ▼
  ┌─────────────────┐
  │  Admin Panel    │ ← slides in from right
  │  #admin-panel   │
  └─────────────────┘
```

### Opening / Closing Admin

```js
function openAdmin() {
  closeAllDropdowns();
  welcome.classList.add('hidden');
  iframe.style.display = 'none';
  adminPanel.classList.add('visible');

  // Auth check
  if (authed || adminAuthenticated) {
    // Show content
    updateConfigPreview();
    renderNavEditor();
    loadFeedsConfig();
    loadFlaggedArticles();
  } else {
    // Show auth form
  }
}

function closeAdmin() {
  adminPanel.classList.remove('visible');
  showWelcome();
}
```

Admin is accessible from:
1. The gear icon button (`#nav-settings-btn`) in the nav bar
2. Mobile drawer "Settings / Admin" button
3. Pressing the gear icon anywhere in the interface

---

## 2. Password Authentication

Authentication is **client-side only** using `sessionStorage`. This is appropriate for a self-hosted tool where the primary threat model is casual access, not adversarial attackers.

### How It Works

```js
const SESSION_KEY = 'cm_admin_auth';
const CORRECT_PASSWORD = navConfig.password;  // From assets/nav-config.json

function authenticate(password) {
  if (password === CORRECT_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    adminAuthenticated = true;
    // Show admin content...
  } else {
    showToast('Incorrect password', true);
  }
}

function getSessionAuth() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}
```

The password is stored in `assets/nav-config.json` under the `"password"` key (default: `"admin123"`).

### Changing the Password

Edit `assets/nav-config.json`:

```json
{
  "password": "your-secure-password",
  ...
}
```

**Security note:** Since the password is in a client-served JSON file, this authentication provides convenience-level access control only. For stronger security on a networked deployment, add HTTP Basic Auth at the server level (nginx or Express middleware).

### Adding Server-Side Auth (recommended for production)

In `server.js`, add a middleware:

```js
const AUTH_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use('/api', (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Conflict Mapper Admin"');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const decoded = Buffer.from(auth.slice(6), 'base64').toString();
  if (decoded !== `admin:${AUTH_PASSWORD}`) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  next();
});
```

---

## 3. Admin Panel Sections

The admin content area (`#admin-content`) is organized into accordion-style sections. Each section has a header button that toggles the body open/closed.

### Section List (in order)

The admin panel uses a sidebar-nav layout (not accordion). Each nav button shows a section via `showAdminSection(sectionId)`.

| Section ID | Nav Button | Purpose |
|---|---|---|
| `section-ai` | AI Config | Provider selection, API keys, test connection |
| `section-feeds` | RSS Feeds | Add/remove/enable feeds, trigger fetch |
| `section-countries` | Countries | Add/edit/remove monitored countries, assign topics |
| `section-topics` | Topics | Add/remove analysis topic tags |
| `section-reports` | Reports | Trigger global/country/all analysis with progress tracking |
| `section-flagged` | Flagged Articles | Review flagged articles with paginated audit log |
| `section-nav` | Navigation | Edit nav-config.json entries |
| `section-config` | Config Export/Import | Download/upload full config backup |
| `section-diagnostics` | Diagnostics | Run full system health check |
| `section-logs` | Logs | Terminal-style log viewer with filters |

---

## 4. AI Configuration Section

Allows switching active AI provider and entering API keys.

### Provider Selection

A `<select>` dropdown lists all 5 providers: `perplexity`, `openai`, `anthropic`, `google`, `local`.

When a provider is selected:
- The corresponding API key field becomes visible
- The model field auto-populates with the default model for that provider
- The "Test Connection" button pings `/api/ai/test` with `{ provider: selectedProvider }`

### API Key Entry

API keys are entered per-provider. The UI does not show existing keys — it shows masked values from `GET /api/ai/config` (format: `pplx****XXXX`).

Saving sends:

```js
// POST /api/ai/config
{
  "provider": "perplexity",
  "providers": {
    "perplexity": {
      "apiKey": "pplx-...",
      "model": "sonar-pro"
    }
  }
}
```

### Test Connection Button

```js
async function testAIConnection() {
  const result = await fetch('/api/ai/test', { method: 'POST', ... });
  const data = await result.json();
  // Shows: "Connected. Model: sonar-pro. Response: OK" or error message
}
```

### Default Models by Provider

| Provider | Default Model | Notes |
|---|---|---|
| perplexity | `sonar-pro` | Has real-time web search |
| openai | `gpt-4o` | Can swap for `gpt-4o-mini` (cheaper) |
| anthropic | `claude-sonnet-4-20250514` | Or `claude-opus-4` for more depth |
| google | `gemini-2.0-flash` | Or `gemini-1.5-pro` for longer context |
| local | `llama3.1` | Must match model loaded in Ollama |

---

## 5. RSS Feed Management Section

### Feed List Display

On section open, `loadFeedsConfig()` is called:

```js
async function loadFeedsConfig() {
  const res = await fetch('/api/feeds');
  const data = await res.json();
  // Renders each feed as a feed-row with:
  //   - Name, URL
  //   - Category badge
  //   - Country badge
  //   - Enable/disable toggle
  //   - Delete button
}
```

### Enable/Disable Toggle

```js
async function toggleFeed(feedId, enabled) {
  // There is no dedicated toggle endpoint — uses a workaround:
  // 1. Fetch current config
  // 2. Find feed by ID
  // 3. Update enabled field
  // 4. POST full config back via /api/feeds/import pattern
  // (Admin UI handles this in the toggle event handler)
}
```

**Improvement opportunity:** Add `PATCH /api/feeds/:id` endpoint to update a single feed's enabled state without rewriting the full config.

### Add New Feed Form

Fields:
- URL (required)
- Name (optional, defaults to URL)
- Category (select from categories list)
- Country (text input, e.g., "Russia", "global")
- Enabled checkbox

On submit:

```js
async function addFeed(formData) {
  const res = await fetch('/api/feeds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
}
```

### Bulk Import Feeds

The admin panel has a textarea for pasting a JSON array of feeds. On submit:

```js
const feeds = JSON.parse(textareaValue);
await fetch('/api/feeds/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ feeds }),
});
```

### Trigger Feed Fetch

The "Fetch All Feeds Now" button calls `POST /api/feeds/fetch` and polls `GET /api/feeds/fetch-status` every 2 seconds to show progress.

---

## 6. Report Generation Controls Section

### The 4 Generation Buttons

| Button Label | Function Called | API Endpoint |
|---|---|---|
| Generate Global Report | `runAnalysis('/api/analysis/global', ...)` | `POST /api/analysis/global` |
| Generate Country Report | `runCountryAnalysis()` | `POST /api/analysis/country/:slug` |
| Generate All Countries | `runAnalysis('/api/analysis/all-countries', ...)` | `POST /api/analysis/all-countries` |
| Generate Full Suite | `runAnalysis('/api/analysis/all', ...)` | `POST /api/analysis/all` |

### Country Report Selection

A `<select id="country-analysis-select">` is populated with all 11 country slugs. The user selects a country then clicks "Generate Country Report":

```js
async function runCountryAnalysis() {
  const sel = document.getElementById('country-analysis-select');
  const slug = sel.value;
  if (!slug) { showToast('Select a country first', true); return; }
  await runAnalysis('/api/analysis/country/' + slug, 'Country Analysis: ' + slug.toUpperCase());
}
```

### Progress Tracking

The `runAnalysis()` function:
1. Fires `POST` to the endpoint (non-blocking — returns immediately)
2. Shows a progress bar (`#analysis-progress-bar`) that fills to 90%
3. Polls `GET /api/analysis/status` every 2 seconds
4. When `status.running === false`, fills bar to 100% and shows result message

```js
async function runAnalysis(endpoint, label) {
  analysisRunning = true;
  disableAnalysisButtons(true);

  // Start
  await fetch(endpoint, { method: 'POST' });

  // Poll
  pollInterval = setInterval(async () => {
    const status = await fetch('/api/analysis/status').then(r => r.json());
    progBar.style.width = status.data.current / status.data.total * 100 + '%';
    progText.textContent = status.data.message;
    if (!status.data.running) {
      clearInterval(pollInterval);
      finishAnalysis(true, status.data.message);
    }
  }, 2000);
}
```

---

## 7. Flagged Articles Review Section

`loadFlaggedArticles()` calls `GET /api/articles/flagged` and renders each flag:

```html
<div class="flagged-article-row">
  <div class="flag-article-title">{article.title}</div>
  <div class="flag-meta">
    {article.source} · {date} · Country: {flag.country}
  </div>
  <div class="flag-notes">{flag.notes}</div>
  <button onclick="unflagArticle('{flag.id}')">Remove Flag</button>
</div>
```

Unflagging calls `DELETE /api/articles/flag/:flagId` and refreshes the list.

---

## 8. Navigation Editor Section

The nav editor allows modifying `assets/nav-config.json` without file system access. It reads the current nav structure and renders editable fields.

### What Can Be Edited

- Site name and tagline
- Password
- Top-level nav items (add, remove, reorder)
- Country list within the nested dropdown (add, remove countries)
- Theater dropdown items (add, remove theaters)

### How Changes Are Saved

Changes save back to `assets/nav-config.json` via `POST /api/settings`:

```js
async function saveNavConfig(newConfig) {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ navConfig: newConfig }),
  });
  // Then reload nav
  location.reload();
}
```

**Note:** Saving nav config requires a page reload to re-render the nav from the new JSON.

---

## 9. Config Export / Import System

### Export

The "Export Config" button creates a JSON object combining:

```js
const exportData = {
  navConfig:    navConfig,              // From assets/nav-config.json
  feedsConfig:  await loadFeedsConfig(),// From data/feeds-config.json
  aiConfig:     await loadAIConfig(),   // From data/ai-config.json (keys masked)
  exportedAt:   new Date().toISOString(),
  version:      '2.0.0',
};

// Download as JSON file
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
const url  = URL.createObjectURL(blob);
const a    = document.createElement('a');
a.href     = url;
a.download = `conflict-mapper-config-${Date.now()}.json`;
a.click();
```

### Import

The "Import Config" file picker accepts a `.json` file matching the export schema. On import:

1. Parse the JSON
2. Validate required fields exist
3. `POST /api/settings` with navConfig
4. `POST /api/feeds/import` with feedsConfig.feeds
5. `POST /api/ai/config` with aiConfig
6. Show success toast and reload

**Important:** Imported AI config has masked API keys from the export — keys are NOT transferred. Users must re-enter API keys after import.

---

## 10. Adding a New Admin Section

To add a new section to the admin panel:

### Step 1: Add the HTML section in `index.html`

Find the `#admin-content` div and add:

```html
<div class="admin-section" id="admin-section-myfeature">
  <button class="admin-section-header" onclick="toggleAdminSection('admin-section-myfeature')">
    <span class="admin-section-title">My New Feature</span>
    <svg class="admin-chevron">...</svg>
  </button>
  <div class="admin-section-body">
    <!-- Section content here -->
    <div class="admin-field-group">
      <label class="admin-label">Setting Label</label>
      <input class="admin-input" id="my-setting" type="text">
    </div>
    <button class="btn btn-primary" onclick="saveMyFeature()">Save</button>
  </div>
</div>
```

### Step 2: Add the toggle function (if not already present)

```js
function toggleAdminSection(sectionId) {
  const section = document.getElementById(sectionId);
  section.classList.toggle('open');
}
```

### Step 3: Add the API endpoint in `server.js`

```js
app.post('/api/my-feature', asyncRoute(async (req, res) => {
  // Handle the feature logic
  res.json({ success: true, data: { saved: true } });
}));
```

### Step 4: Add the frontend function in `index.html`

```js
async function saveMyFeature() {
  const value = document.getElementById('my-setting').value;
  const res = await fetch('/api/my-feature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  const data = await res.json();
  showToast(data.success ? 'Saved!' : 'Error: ' + data.error, !data.success);
}
```

---

## 11. API Endpoints Used by the Admin Panel

| Method | Endpoint | Admin Section |
|---|---|---|
| `GET` | `/api/ai/config` | AI Configuration |
| `POST` | `/api/ai/config` | AI Configuration |
| `POST` | `/api/ai/test` | AI Configuration |
| `GET` | `/api/feeds` | RSS Feed Management |
| `POST` | `/api/feeds` | RSS Feed Management |
| `DELETE` | `/api/feeds/:id` | RSS Feed Management |
| `POST` | `/api/feeds/import` | RSS Feed Management |
| `POST` | `/api/feeds/fetch` | RSS Feed Management |
| `GET` | `/api/feeds/fetch-status` | RSS Feed Management |
| `POST` | `/api/analysis/global` | Report Generation |
| `POST` | `/api/analysis/country/:slug` | Report Generation |
| `POST` | `/api/analysis/all-countries` | Report Generation |
| `POST` | `/api/analysis/all` | Report Generation |
| `GET` | `/api/analysis/status` | Report Generation |
| `GET` | `/api/articles/flagged` | Flagged Articles |
| `DELETE` | `/api/articles/flag/:id` | Flagged Articles |
| `GET` | `/api/settings` | Config Export/Import |
| `POST` | `/api/settings` | Config Export/Import |
| `GET` | `/api/status` | Status/Health |

---

## 12. Admin Panel Styling Notes

The admin panel uses the same CSS custom properties as the main `index.html`. Key classes:

```css
.admin-panel           { position: fixed; inset: 0; z-index: 8000; background: var(--color-surface); transform: translateX(100%); transition: transform 0.3s ease; }
.admin-panel.visible   { transform: translateX(0); }
.admin-section         { border-bottom: 1px solid var(--color-border); }
.admin-section-header  { width: 100%; padding: 14px 20px; display: flex; justify-content: space-between; }
.admin-section-body    { padding: 0 20px 20px; display: none; }
.admin-section.open .admin-section-body { display: block; }
.admin-input           { background: var(--color-surface-2); border: 1px solid var(--color-border); color: var(--color-text); }
```

---

*This prompt covers the admin panel embedded in `index.html`. Cross-reference `NAVIGATION_SYSTEM_PROMPT.md` for the nav editor, `ANALYSIS_ENGINE_PROMPT.md` for how report generation works, `MAP_AND_FEED_PROMPT.md` for feed management internals, and `SITE_ARCHITECTURE_PROMPT.md` for the full system overview.*

---

## 13. Bug Fix: Duplicate `testAIConnection` Function

A critical bug existed in earlier versions of `index.html` where `testAIConnection` was defined twice — once near the AI config section and once further down in the admin panel JS block. This caused the second definition to silently override the first, making the test button call the wrong version (which lacked the `body` payload).

**The fix:** Remove the duplicate definition entirely. Only one `testAIConnection` function should exist:

```js
// CORRECT — single definition with credentials in the body:
async function testAIConnection() {
  const provider = document.getElementById('ai-provider-select').value;
  const apiKey   = document.getElementById('ai-api-key-input').value.trim();
  const model    = document.getElementById('ai-model-input').value.trim();

  const res = await fetch('/api/ai/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, model }),  // credentials in body
  });
  const data = await res.json();
  showToast(
    data.success
      ? `Connected. Model: ${data.data.model}. Response: OK`
      : `Error: ${data.data?.message || data.error}`,
    !data.success
  );
}
```

**Why credentials must be in the body:** The `/api/ai/test` endpoint needs to test the credentials the user has *currently entered in the form*, not necessarily what is already saved in `data/ai-config.json`. Sending credentials in the request body allows testing before saving.

**DOM element IDs that must match this function:**
| ID | Element |
|---|---|
| `ai-provider-select` | Provider `<select>` dropdown |
| `ai-api-key-input` | API key text input |
| `ai-model-input` | Model name input |

---

## 14. LOGS Tab

The admin panel has a **LOGS** section (7th admin section) providing a terminal-style log viewer for all server activity.

### Section Entry

```html
<div class="admin-section" id="admin-section-logs">
  <button class="admin-section-header" onclick="toggleAdminSection('admin-section-logs')">
    <span class="admin-section-title">System Logs</span>
    <svg class="admin-chevron">...</svg>
  </button>
  <div class="admin-section-body">
    <!-- Log viewer -->
  </div>
</div>
```

### Log Viewer Layout

```html
<div class="log-controls">
  <!-- Category filter buttons -->
  <button class="log-filter-btn active" data-filter="">All</button>
  <button class="log-filter-btn" data-filter="api">API</button>
  <button class="log-filter-btn" data-filter="rss">RSS</button>
  <button class="log-filter-btn" data-filter="ai">AI</button>
  <button class="log-filter-btn" data-filter="analysis">Analysis</button>
  <button class="log-filter-btn" data-filter="system">System</button>

  <!-- Level filter -->
  <select id="log-level-filter">
    <option value="">All Levels</option>
    <option value="warn">Warn+</option>
    <option value="error">Errors Only</option>
  </select>

  <!-- Search -->
  <input id="log-search" type="text" placeholder="Search logs..." class="admin-input">

  <!-- Actions -->
  <button class="btn btn-secondary btn-sm" onclick="clearLogs()">Clear</button>
  <button class="btn btn-primary btn-sm"   onclick="refreshLogs()">Refresh</button>
</div>

<!-- Stats summary -->
<div id="log-stats"><!-- Populated by JS --></div>

<!-- Terminal-style log display -->
<div id="log-terminal" style="
  font-family: 'Share Tech Mono', monospace;
  font-size: 12px;
  background: #060810;
  color: #c8d0e0;
  padding: 12px;
  max-height: 400px;
  overflow-y: auto;
  border-radius: 4px;
"><!-- Log entries --></div>
```

### Log Entry Rendering

```js
function renderLogEntry(entry) {
  const levelColors = {
    info:  '#60a5fa',  // blue
    warn:  '#f59e0b',  // amber
    error: '#f87171',  // red
    debug: '#6b7280',  // gray
  };
  const color = levelColors[entry.level] || '#c8d0e0';
  return `<div class="log-line">
    <span class="log-ts"  style="color:#4b5568">${entry.timestamp.slice(11,23)}</span>
    <span class="log-lvl" style="color:${color};font-weight:bold">[${entry.level.toUpperCase().padEnd(5)}]</span>
    <span class="log-cat" style="color:#7c9cbf">[${entry.category.padEnd(8)}]</span>
    <span class="log-msg">${escHtml(entry.message)}</span>
  </div>`;
}
```

### Auto-Refresh Logic

The log viewer refreshes every 30 seconds while the LOGS section is open:

```js
let logRefreshInterval = null;

function startLogAutoRefresh() {
  refreshLogs();
  logRefreshInterval = setInterval(refreshLogs, 30000);
}

function stopLogAutoRefresh() {
  if (logRefreshInterval) {
    clearInterval(logRefreshInterval);
    logRefreshInterval = null;
  }
}

// Call startLogAutoRefresh() when section opens, stopLogAutoRefresh() when it closes
```

### API Calls

```js
async function refreshLogs() {
  const category = activeLogFilter || '';
  const level    = document.getElementById('log-level-filter').value;
  const search   = document.getElementById('log-search').value.trim();

  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (level)    params.set('level', level);
  if (search)   params.set('search', search);
  params.set('limit', '200');

  const res  = await fetch('/api/logs?' + params.toString());
  const data = await res.json();
  renderLogs(data.data.logs);
  renderLogStats(data.data.stats);
}

async function clearLogs() {
  await fetch('/api/logs', { method: 'DELETE' });
  refreshLogs();
}
```

---

## 15. Expanded RSS Feed Management (153 Feeds)

The RSS feed section now manages **153 pre-configured feeds**. The admin UI has been updated to support inline editing and health status tracking.

### Inline Editing

Each feed row now supports inline editing of three fields without opening a separate modal:

```html
<div class="feed-row" data-id="{feed.id}">
  <div class="feed-main">
    <!-- Inline-editable fields -->
    <input class="feed-name-edit"     value="{feed.name}"     onchange="saveFeedField('{feed.id}', 'name', this.value)">
    <input class="feed-category-edit" value="{feed.category}" onchange="saveFeedField('{feed.id}', 'category', this.value)">
    <input class="feed-country-edit"  value="{feed.country}"  onchange="saveFeedField('{feed.id}', 'country', this.value)">
  </div>
  <div class="feed-actions">
    <label class="toggle">
      <input type="checkbox" {feed.enabled ? 'checked' : ''} onchange="toggleFeed('{feed.id}', this.checked)">
      <span class="toggle-slider"></span>
    </label>
    <button onclick="deleteFeed('{feed.id}')">✕</button>
  </div>
</div>
```

### Feed Health Status Tracking

After each `POST /api/feeds/fetch` run, the server records per-feed health results. The feed list displays a health indicator:

| Indicator | Meaning |
|---|---|
| 🟢 (green dot) | Last fetch succeeded — articles retrieved |
| 🟡 (amber dot) | Last fetch succeeded but returned 0 articles |
| 🔴 (red dot) | Last fetch failed (timeout, 404, parse error) |
| ⚪ (gray dot) | Never fetched, or server just started |

Health status is read from the `fetchStatus.lastResult.feedResults[]` array returned by `GET /api/feeds/fetch-status`.

```js
function getFeedHealth(feedId, feedResults) {
  const result = feedResults?.find(r => r.feedId === feedId);
  if (!result) return 'unknown';
  if (result.error)          return 'error';
  if (result.articles === 0) return 'empty';
  return 'ok';
}
```

### Category Distribution (153 feeds)

| Category | Count |
|---|---|
| breaking | ~35 |
| geopolitics | ~25 |
| military | ~20 |
| ai | ~15 |
| technology | ~15 |
| science | ~12 |
| spaceflight | ~12 |
| robotics | ~8 |
| engineering | ~6 |
| research | ~5 |

---

## 15. Countries Section

Allows managing the `data/countries-config.json` file via the admin UI.

### What It Does
- Lists all monitored countries with name, slug, flag emoji, accent color, and assigned topics
- **Add Country**: form with name, slug (auto-generated from name), flag, accent color hex, and multi-select topic checkboxes
- **Edit Country**: inline edit row for name, flag, accent, topics
- **Remove Country**: DELETE with confirmation dialog

### API Calls
```js
// Load
fetch('/api/countries')               // GET → { countries: [...], topics: [...] }

// Add
fetch('/api/countries', {
  method: 'POST',
  body: JSON.stringify({ name, slug, flag, accent, topics })
})

// Update
fetch(`/api/countries/${slug}`, {
  method: 'PUT',
  body: JSON.stringify({ name, flag, accent, topics })
})

// Remove
fetch(`/api/countries/${slug}`, { method: 'DELETE' })
```

### Important Notes
- Adding a country here does **not** automatically add it to `COUNTRY_SLUGS` in `lib/analysis-generator.js` — that requires a code change
- The countries list here controls what appears in the Countries section UI and in the per-country analysis trigger buttons
- Slug must be URL-safe (lowercase, hyphens): `'north-korea'`, `'usa'`, `'china'`

---

## 16. Topics Section

Manages analysis topic tags. Topics are referenced by country entries (countries have a `topics[]` array of topic IDs).

### What It Does
- Lists all topics with ID and display name
- **Add Topic**: form with `id` (snake_case) and `name` (display)
- **Remove Topic**: DELETE with confirmation

### API Calls
```js
// Add
fetch('/api/topics', { method: 'POST', body: JSON.stringify({ id, name }) })

// Remove
fetch(`/api/topics/${id}`, { method: 'DELETE' })

// Load (via countries endpoint which returns both)
fetch('/api/countries')  // → { countries: [...], topics: [...] }
```

---

## 17. Diagnostics Section

The **Diagnostics** tab runs a full system health check when the user clicks "Run Full Diagnostics".

### What Gets Checked
1. **AI Config** — Is a provider configured? Is an API key present? Can it connect?
2. **RSS Feeds** — How many feeds are configured? How many are enabled? How many returned articles on the last fetch?
3. **Article Store** — Total cached articles, geotagged count, oldest/newest timestamps
4. **Reports** — Are global and country reports present? When were they last generated?
5. **Server Health** — Memory usage, uptime, log count

### HTML Structure
```html
<div class="admin-section" id="section-diagnostics">
  <h2 class="admin-section-title">System Diagnostics</h2>
  <button class="btn btn-primary" onclick="runDiagnostics()" id="diag-run-btn">
    Run Full Diagnostics
  </button>
  <div id="diag-results"></div>
</div>
```

### JavaScript Pattern
```js
async function runDiagnostics() {
  const btn = document.getElementById('diag-run-btn');
  btn.disabled = true;
  btn.textContent = 'Running...';

  try {
    const [status, feeds, articles] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/feeds').then(r => r.json()),
      fetch('/api/articles?limit=1').then(r => r.json()),
    ]);
    // Render results into #diag-results
    document.getElementById('diag-results').innerHTML = renderDiagResults({ status, feeds, articles });
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run Full Diagnostics';
  }
}
```

---

## 18. Flagged Articles Audit Log Pagination

The **Flagged Articles** section includes a collapsible **Article Audit Log** panel that shows all cached articles (not just flagged ones) with pagination.

### State Variables
```js
let auditPage       = 1;
let auditPageSize   = 50;
let auditTotalPages = 1;
let auditData       = [];   // full loaded dataset
let auditFiltered   = [];   // after search filter
```

### Pagination Controls
```html
<div id="audit-pagination">
  <button id="audit-prev-btn" onclick="auditChangePage(-1)" disabled>← Prev</button>
  <span id="audit-page-label">Page 1 of 1</span>
  <button id="audit-next-btn" onclick="auditChangePage(1)" disabled>Next →</button>
</div>
```

### Load Pattern
```js
async function loadAuditLog() {
  const res = await fetch(`/api/articles?limit=0&language=all&page=${auditPage}&pageSize=${auditPageSize}`);
  const json = await res.json();
  auditData       = json.data.articles;
  auditTotalPages = json.data.totalPages;
  auditPage       = json.data.page;
  document.getElementById('audit-total-count').textContent = json.data.total;
  document.getElementById('audit-page-info').textContent = `Page ${auditPage}/${auditTotalPages}`;
  renderAuditTable(auditData);
  updateAuditPaginationButtons();
}

function auditChangePage(delta) {
  auditPage = Math.max(1, Math.min(auditTotalPages, auditPage + delta));
  loadAuditLog();
}
```

---

## 19. Updated API Endpoints (Full List)

All admin panel API endpoints:

| Method | Endpoint | Admin Section |
|---|---|---|
| `GET` | `/api/ai/config` | AI Configuration |
| `POST` | `/api/ai/config` | AI Configuration |
| `POST` | `/api/ai/test` | AI Configuration |
| `GET` | `/api/feeds` | RSS Feed Management |
| `POST` | `/api/feeds` | RSS Feed Management |
| `DELETE` | `/api/feeds/:id` | RSS Feed Management |
| `POST` | `/api/feeds/import` | RSS Feed Management |
| `POST` | `/api/feeds/fetch` | RSS Feed Management |
| `GET` | `/api/feeds/fetch-status` | RSS Feed Management |
| `GET` | `/api/countries` | Countries & Topics |
| `POST` | `/api/countries` | Countries |
| `PUT` | `/api/countries/:slug` | Countries |
| `DELETE` | `/api/countries/:slug` | Countries |
| `POST` | `/api/topics` | Topics |
| `DELETE` | `/api/topics/:id` | Topics |
| `POST` | `/api/analysis/global` | Report Generation |
| `POST` | `/api/analysis/country/:slug` | Report Generation |
| `POST` | `/api/analysis/all-countries` | Report Generation |
| `POST` | `/api/analysis/all` | Report Generation |
| `GET` | `/api/analysis/status` | Report Generation |
| `GET` | `/api/articles` | Flagged Articles (Audit Log) |
| `GET` | `/api/articles/flagged` | Flagged Articles |
| `DELETE` | `/api/articles/flag/:id` | Flagged Articles |
| `GET` | `/api/settings` | Config Export/Import |
| `POST` | `/api/settings` | Config Export/Import |
| `GET` | `/api/status` | Diagnostics / Status |
| `GET` | `/api/logs` | System Logs |
| `DELETE` | `/api/logs` | System Logs |
