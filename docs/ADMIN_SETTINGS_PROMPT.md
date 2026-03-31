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

| Section ID | Section Title | Purpose |
|---|---|---|
| `admin-section-ai` | AI Configuration | Provider selection, API keys |
| `admin-section-feeds` | RSS Feed Management | Add/remove/enable feeds |
| `admin-section-reports` | Report Generation | Trigger analysis buttons |
| `admin-section-flagged` | Flagged Articles | Review analyst-flagged articles |
| `admin-section-nav` | Navigation Editor | Edit nav-config.json entries |
| `admin-section-config` | Config Export/Import | Download/upload full config |

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
