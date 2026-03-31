# Article Flagging System — System Prompt
## Conflict Mapper — End-to-End Flagging Pipeline

You are an expert Node.js and frontend developer rebuilding the article flagging system for Conflict Mapper. This document covers the complete flagging pipeline — from the UI modal to storage to AI analysis inclusion — across `pages/map-feed.html`, `pages/news-map.html`, `lib/feed-store.js`, and `server.js`.

---

## System Overview

```
User clicks ⚑ flag button on an article
      ↓
Flag modal opens (country selector + notes textarea)
      ↓
POST /api/articles/flag { articleId, country, notes }
      ↓
feedStore.flagArticle() writes to data/flagged-articles.json
      ↓
Admin panel shows flagged articles in review panel
      ↓
Next analysis generation: flagged articles included in AI prompt
      ↓
analysis-generator.js reads flagged articles for target country
      ↓
AI report explicitly references analyst-flagged items
```

---

## Flag Data Schema

Stored in `data/flagged-articles.json`:

```json
{
  "flagged": [
    {
      "id": "flag_1710512000000_abc12345",
      "articleId": "abc123def456abcd",
      "country": "china",
      "notes": "PLA exercise timing coincides with RIMPAC cancellation",
      "createdAt": "2026-03-15T14:13:20.000Z",
      "updatedAt": "2026-03-15T14:13:20.000Z",
      "article": {
        "id": "abc123def456abcd",
        "title": "PLA Announces Major Naval Exercise Near Taiwan",
        "description": "China's People's Liberation Army announced...",
        "link": "https://example.com/article",
        "pubDate": "2026-03-15T12:00:00.000Z",
        "source": "Reuters",
        "category": "military"
      }
    }
  ]
}
```

**Key design decision:** The article snapshot is stored inline in the flag entry. This means flagged articles are preserved even if `data/articles.json` is cleared or expires. Reports can always reference the flagged content.

**Flag ID format:** `flag_{timestamp}_{articleId.slice(0,8)}`

---

## Frontend Flagging UI

Both `pages/map-feed.html` and `pages/news-map.html` implement identical flagging UI:

### Flag Button (appears on hover)

```html
<!-- On each article item in sidebar feed -->
<div class="article-item" onclick="focusArticle(article)">
  <button class="flag-btn"
    onclick="event.stopPropagation(); openFlagModal({ id: article.id, title: article.title })">
    ⚑
  </button>
  <!-- article content -->
</div>

<!-- CSS: only visible on hover -->
.flag-btn {
  position: absolute;
  right: 10px;
  top: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}
.article-item:hover .flag-btn { opacity: 1; }
```

### Map Popup Flag Button

```html
<!-- Inside Leaflet popup HTML -->
<button
  onclick="openFlagModal({ id: '${article.id}', title: '${escHtml(article.title)}' })"
  class="popup-btn">
  ⚑ Flag
</button>
```

### Flag Modal HTML

```html
<div class="modal-overlay" id="flag-modal">
  <div class="modal-card">
    <div class="modal-title">Flag for Analysis</div>
    <div class="modal-subtitle" id="flag-article-title"></div>

    <div class="form-group">
      <label class="form-label">Country Association</label>
      <select class="form-select" id="flag-country">
        <option value="">Global (no specific country)</option>
        <option value="usa">🇺🇸 United States</option>
        <option value="china">🇨🇳 China</option>
        <option value="russia">🇷🇺 Russia</option>
        <option value="ukraine">🇺🇦 Ukraine</option>
        <option value="taiwan">🇹🇼 Taiwan</option>
        <option value="iran">🇮🇷 Iran</option>
        <option value="israel">🇮🇱 Israel</option>
        <option value="india">🇮🇳 India</option>
        <option value="pakistan">🇵🇰 Pakistan</option>
        <option value="north-korea">🇰🇵 North Korea</option>
        <option value="nato">🇪🇺 NATO/Europe</option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Notes (optional)</label>
      <textarea class="form-textarea" id="flag-notes"
        placeholder="Why is this article relevant? What should the AI highlight?"></textarea>
    </div>

    <div class="modal-actions">
      <button class="btn btn-secondary btn-sm" onclick="closeFlagModal()">Cancel</button>
      <button class="btn btn-primary btn-sm"   onclick="submitFlag()">Flag Article</button>
    </div>
  </div>
</div>
```

Modal opens/closes via `.modal-overlay.open` class (CSS `opacity: 0` → `opacity: 1`, `pointer-events: none` → `pointer-events: all`).

Clicking outside the modal card (on the overlay) also closes it:
```js
document.getElementById('flag-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeFlagModal();
});
```

### Flag Submission

```js
let pendingFlag = null;  // { id, title }

function openFlagModal(articleInfo) {
  pendingFlag = articleInfo;
  document.getElementById('flag-article-title').textContent = articleInfo.title || 'Article';
  document.getElementById('flag-notes').value = '';
  document.getElementById('flag-modal').classList.add('open');
}

function closeFlagModal() {
  document.getElementById('flag-modal').classList.remove('open');
  pendingFlag = null;
}

async function submitFlag() {
  if (!pendingFlag) return;

  const country = document.getElementById('flag-country').value || 'global';
  const notes   = document.getElementById('flag-notes').value.trim();

  try {
    const res = await fetch('/api/articles/flag', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        articleId: pendingFlag.id,
        country,
        notes,
      }),
    });

    if (res.ok) {
      showToast('Article flagged for analysis');
    } else {
      const err = await res.json();
      showToast(`Flag failed: ${err.error || 'Unknown error'}`, true);
    }
  } catch (e) {
    showToast('Could not connect to server', true);
  }

  closeFlagModal();
}
```

---

## API Endpoints

### `POST /api/articles/flag`

**Request body:**
```json
{
  "articleId": "abc123def456abcd",
  "country":   "china",
  "notes":     "Analyst comment here"
}
```

**Validation:**
```js
if (!articleId) {
  return res.status(400).json({ success: false, error: 'articleId is required' });
}
```

**Success response:**
```json
{
  "success": true,
  "data": {
    "flag": {
      "id": "flag_1710512000000_abc12345",
      "articleId": "abc123def456abcd",
      "country": "china",
      "notes": "Analyst comment",
      "createdAt": "2026-03-15T14:13:20.000Z",
      "updatedAt": "2026-03-15T14:13:20.000Z",
      "article": { ... }
    }
  }
}
```

If the article is already flagged for the same country, the `notes` field is updated (upsert behavior).

---

### `GET /api/articles/flagged`

**Query params:**
- `country` (optional) — filter by country slug

**Response:**
```json
{
  "success": true,
  "data": {
    "flagged": [
      {
        "id": "flag_...",
        "articleId": "...",
        "country": "china",
        "notes": "...",
        "createdAt": "...",
        "article": { "title": "...", "source": "...", "link": "..." }
      }
    ],
    "total": 3
  }
}
```

Results are sorted newest first.

---

### `DELETE /api/articles/flag/:id`

Removes a flag by its flag ID (not the article ID).

**Response:**
```json
{ "success": true, "data": { "removed": true, "id": "flag_1710512000000_abc12345" } }
```

Returns 404 if flag not found.

---

## Backend Implementation (`lib/feed-store.js`)

### `flagArticle(articleId, country, notes)`

```js
function flagArticle(articleId, country = 'global', notes = '') {
  const data    = readJson(FLAGGED_FILE, { flagged: [] });
  const flagged = Array.isArray(data.flagged) ? data.flagged : [];

  // Upsert: if already flagged for same country, update notes
  const existing = flagged.find(f => f.articleId === articleId && f.country === country);
  if (existing) {
    existing.notes     = notes;
    existing.updatedAt = new Date().toISOString();
    writeJson(FLAGGED_FILE, { flagged });
    return existing;
  }

  // Fetch article snapshot from articles.json
  const article = getArticleById(articleId);

  const flagEntry = {
    id:        `flag_${Date.now()}_${articleId.slice(0, 8)}`,
    articleId,
    country,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Inline snapshot — survives articles.json clear
    article: article ? {
      id:          article.id,
      title:       article.title,
      description: article.description,
      link:        article.link,
      pubDate:     article.pubDate,
      source:      article.source,
      category:    article.category,
    } : null,
  };

  flagged.push(flagEntry);
  writeJson(FLAGGED_FILE, { flagged });
  return flagEntry;
}
```

### `unflagArticle(flagId)`

```js
function unflagArticle(flagId) {
  const data    = readJson(FLAGGED_FILE, { flagged: [] });
  const flagged = Array.isArray(data.flagged) ? data.flagged : [];
  const before  = flagged.length;
  const updated = flagged.filter(f => f.id !== flagId);

  if (updated.length === before) return false;  // not found
  writeJson(FLAGGED_FILE, { flagged: updated });
  return true;
}
```

### `getFlaggedArticles(country)`

```js
function getFlaggedArticles(country = null) {
  const data    = readJson(FLAGGED_FILE, { flagged: [] });
  let flagged   = Array.isArray(data.flagged) ? data.flagged : [];

  if (country && country !== 'global') {
    // Return flags for this country + global flags (always relevant)
    flagged = flagged.filter(f => f.country === country || f.country === 'global');
  }

  return flagged.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}
```

---

## Admin Panel Integration

The Admin panel has a **Flagged Articles** review section:

```html
<!-- Admin panel flagged section (in admin.html) -->
<div class="admin-section">
  <h3>Flagged Articles for Analysis</h3>
  <div id="flagged-list"><!-- loaded via JS --></div>
</div>
```

```js
// Admin panel JS
async function loadFlaggedArticles() {
  const res  = await fetch('/api/articles/flagged');
  const data = await res.json();
  const flagged = data?.data?.flagged || [];

  document.getElementById('flagged-list').innerHTML = flagged.map(f => `
    <div class="flagged-item">
      <div class="flagged-title">${escHtml(f.article?.title || f.articleId)}</div>
      <div class="flagged-meta">
        Country: ${f.country} |
        Source: ${escHtml(f.article?.source || '—')} |
        Flagged: ${new Date(f.createdAt).toLocaleString()}
      </div>
      ${f.notes ? `<div class="flagged-notes">Notes: ${escHtml(f.notes)}</div>` : ''}
      <button onclick="removeFlaggedArticle('${f.id}')">Remove</button>
    </div>
  `).join('') || '<p>No flagged articles.</p>';
}

async function removeFlaggedArticle(flagId) {
  await fetch(`/api/articles/flag/${flagId}`, { method: 'DELETE' });
  loadFlaggedArticles();
}
```

---

## How Flagged Articles Are Used in Analysis Generation

In `lib/analysis-generator.js`, when building the AI prompt for a country report:

```js
async function generateCountryAnalysis(slug) {
  const articles = feedStore.getArticles({ country: slug, limit: 30 });
  const flagged  = feedStore.getFlaggedArticles(slug);  // includes global flags

  const flaggedSection = flagged.length > 0
    ? `\n\n## ANALYST-FLAGGED ARTICLES (HIGH PRIORITY)\n` +
      flagged.map(f => {
        const a = f.article || {};
        return `- [FLAGGED] ${a.title || f.articleId}` +
               (a.source ? ` (${a.source})` : '') +
               (f.notes ? `\n  Analyst note: ${f.notes}` : '');
      }).join('\n')
    : '';

  const userPrompt = `
Analyze the following intelligence for ${slug.toUpperCase()}:

## RECENT ARTICLES
${articles.map(a => `- ${a.title} (${a.source}, ${a.pubDate})`).join('\n')}

${flaggedSection}

Generate a comprehensive intelligence report...
  `;

  const provider = getProvider(aiConfig);
  const html = await provider.chat(systemPrompt, userPrompt);
  // save report...
}
```

Flagged articles appear as a separate section in the AI prompt with higher priority, and the analyst's `notes` field provides additional context that guides the AI's analysis.

---

## How to Extend Flagging

### Add Priority Levels

1. Add `priority` field to the flag modal:
```html
<div class="form-group">
  <label class="form-label">Priority</label>
  <select class="form-select" id="flag-priority">
    <option value="normal">Normal</option>
    <option value="high">High</option>
    <option value="critical">Critical</option>
  </select>
</div>
```

2. Include in `submitFlag()`:
```js
priority: document.getElementById('flag-priority').value,
```

3. In `flagArticle()`, store `priority` in the flag entry.

4. In `generateCountryAnalysis()`, sort flagged articles by priority when building prompt.

### Add Auto-Flag Rules

Auto-flag articles matching certain patterns:

```js
// In rss-engine.js parseRssChannel(), after creating article:
const AUTO_FLAG_KEYWORDS = ['DEFCON', 'nuclear', 'invasion', 'war declared', 'blockade declared'];
const titleLower = title.toLowerCase();
if (AUTO_FLAG_KEYWORDS.some(kw => titleLower.includes(kw))) {
  // Auto-flag this article
  feedStore.flagArticle(id, geo?.country?.toLowerCase() || 'global', 'AUTO: High-priority keyword detected');
}
```

### Add Flag Categories

For distinguishing why an article was flagged:
- `type: 'manual'` — user flagged via UI
- `type: 'auto'` — auto-flagged by keyword rule
- `type: 'ai-recommended'` — flagged based on previous AI analysis recommendation

---

## Article Audit Log (Paginated, March 2026)

The **Flagged Articles** admin section also contains a collapsible **Article Audit Log** that shows ALL cached articles (not just flagged ones) with search and pagination support. This is distinct from the flagged articles review panel above.

### Purpose
Allows analysts to review the full article store, check geo-coding rates, search for specific articles, and audit what is being ingested before flagging items for analysis.

### State Variables
```js
let auditPage       = 1;
let auditPageSize   = 50;    // articles per page
let auditTotalPages = 1;
let auditData       = [];    // current page's articles
let auditFiltered   = [];    // after client-side search filter
```

### API Usage
The audit log uses the paginated `GET /api/articles` endpoint:
```js
async function loadAuditLog() {
  // ?language=all includes non-English articles in the count
  const url = `/api/articles?language=all&page=${auditPage}&pageSize=${auditPageSize}`;
  const res  = await fetch(url);
  const json = await res.json();

  auditData       = json.data.articles;
  auditTotalPages = json.data.totalPages;
  auditPage       = json.data.page;

  // Update stats display
  document.getElementById('audit-total-count').textContent = json.data.total;
  document.getElementById('audit-page-info').textContent   = `Page ${auditPage}/${auditTotalPages}`;
  document.getElementById('audit-last-fetch').textContent  = json.data.lastFetch
    ? new Date(json.data.lastFetch).toLocaleString() : '—';

  renderAuditTable(auditData);
  updateAuditPaginationButtons();
}
```

### Pagination Controls
```html
<div id="audit-pagination">
  <button id="audit-prev-btn" onclick="auditChangePage(-1)" disabled>← Prev</button>
  <span id="audit-page-label">Page 1 of 1</span>
  <button id="audit-next-btn" onclick="auditChangePage(1)" disabled>Next →</button>
</div>
```

```js
function auditChangePage(delta) {
  const newPage = auditPage + delta;
  if (newPage < 1 || newPage > auditTotalPages) return;
  auditPage = newPage;
  loadAuditLog();
}

function updateAuditPaginationButtons() {
  document.getElementById('audit-prev-btn').disabled = (auditPage <= 1);
  document.getElementById('audit-next-btn').disabled = (auditPage >= auditTotalPages);
  document.getElementById('audit-page-label').textContent = `Page ${auditPage} of ${auditTotalPages}`;

  // Show/hide pagination bar
  const bar = document.getElementById('audit-pagination');
  bar.style.display = auditTotalPages > 1 ? 'flex' : 'none';
}
```

### Search Filter
Client-side search filters the current page:
```js
function filterAuditLog() {
  const query = document.getElementById('audit-search').value.toLowerCase();
  auditFiltered = auditData.filter(a =>
    (a.title  || '').toLowerCase().includes(query) ||
    (a.source || '').toLowerCase().includes(query) ||
    (a.country || a.geo?.country || '').toLowerCase().includes(query)
  );
  renderAuditTable(auditFiltered);
}
```

### Audit Table Columns
| Column | Field | Notes |
|--------|-------|-------|
| Title | `article.title` | Truncated to ~80 chars |
| Source | `article.source` | Feed name |
| Country | `article.country \| article.geo?.country` | May be empty |
| Category | `article.category` | Category badge |
| Geo | `article.geo?.place` | Place name from geocoder |
| Date | `article.pubDate` | Localized date string |
| Language | `article.language` | `en` or `xx` |
