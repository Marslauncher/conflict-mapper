# Historical Reports Browser — System Prompt
## Conflict Mapper — `pages/historical.html`

You are an expert frontend developer rebuilding the historical analysis reports browser for Conflict Mapper. This document is the complete specification for `pages/historical.html` (771 lines, ~24KB). The page shows a searchable grid of past AI-generated analysis reports with an inline iframe viewer.

---

## Architecture

```
historical.html
├── <head>
│   ├── Fonts: Rajdhani, Share Tech Mono, Inter
│   └── Inline <style> (~400 lines)
├── .page-wrap (display: flex; height: 100vh; overflow: hidden)
│   ├── .report-viewer (hidden by default, flex: 1 when .open)
│   │   ├── .viewer-topbar (← Back button + report title)
│   │   └── #report-iframe (renders selected report)
│   └── .hist-sidebar (scrollable, full-width when viewer closed)
│       ├── Page header (flag + title + subtitle)
│       ├── Archive stats (3-cell: Total / Latest / Span)
│       ├── Action bar (label + Refresh button)
│       ├── Filter strip (All / Country Analysis / Global + search input)
│       └── #reports-container (reports-grid or empty/loading state)
└── <script> (inline JS)
```

---

## URL Parameter System

```js
const params      = new URLSearchParams(window.location.search);
const countrySlug = params.get('country') || '';     // e.g. 'china', 'usa'
const isGlobal    = params.get('type') === 'global'; // ?type=global
```

**Valid URL patterns:**
- `/pages/historical.html` — shows all reports (mixed country + global)
- `/pages/historical.html?country=china` — shows China reports only
- `/pages/historical.html?type=global` — shows global reports only

When `countrySlug` is set, the page fetches from `/api/analysis/history/country/:slug`.
When `isGlobal` is set, the page fetches from `/api/analysis/history/global`.
Without either, the page shows all available reports by fetching both endpoints.

---

## Initialization

```js
const COUNTRY_DATA = {
  usa:          { name: 'United States', flag: '🇺🇸' },
  china:        { name: 'China',         flag: '🇨🇳' },
  russia:       { name: 'Russia',        flag: '🇷🇺' },
  ukraine:      { name: 'Ukraine',       flag: '🇺🇦' },
  taiwan:       { name: 'Taiwan',        flag: '🇹🇼' },
  iran:         { name: 'Iran',          flag: '🇮🇷' },
  israel:       { name: 'Israel',        flag: '🇮🇱' },
  india:        { name: 'India',         flag: '🇮🇳' },
  pakistan:     { name: 'Pakistan',      flag: '🇵🇰' },
  'north-korea':{ name: 'North Korea',   flag: '🇰🇵' },
  nato:         { name: 'NATO',          flag: '🇪🇺' },
};

function init() {
  const meta = countrySlug ? COUNTRY_DATA[countrySlug] : null;

  if (isGlobal) {
    document.getElementById('page-flag').textContent = '🌍';
    document.getElementById('page-title').innerHTML = 'Global <span>Reports</span>';
    document.getElementById('page-subtitle').textContent = 'Worldwide intelligence analysis archive';
    document.title = 'Global Historical Reports — Conflict Mapper';
  } else if (meta) {
    document.getElementById('page-flag').textContent = meta.flag;
    document.getElementById('page-title').innerHTML = `${escHtml(meta.name)} <span>Reports</span>`;
    document.getElementById('page-subtitle').textContent = `Intelligence analysis archive — ${countrySlug.toUpperCase()}`;
    document.title = `${meta.name} Historical Reports — Conflict Mapper`;
  }

  loadReports();
}
```

---

## Report Fetching

```js
let allReports      = [];
let filteredReports = [];
let activeFilter    = 'all';

async function loadReports() {
  const container = document.getElementById('reports-container');
  container.innerHTML = renderLoadingGrid(4);

  try {
    let endpoint;
    if (isGlobal) {
      endpoint = '/api/analysis/history/global';
    } else if (countrySlug) {
      endpoint = `/api/analysis/history/country/${countrySlug}`;
    } else {
      // No filter: fetch all (API doesn't have a combined endpoint yet)
      endpoint = '/api/analysis/history/global';
    }

    const res  = await fetch(endpoint);
    if (!res.ok) throw new Error('API unavailable');
    const data = await res.json();
    allReports = Array.isArray(data) ? data : (data?.data?.reports || data?.reports || []);
  } catch (e) {
    // Graceful fallback: generate mock data for demo
    allReports = generateMockReports();
  }

  updateStats();
  applyFilter();
}
```

---

## Report Object Schema

The API returns report objects from `lib/analysis-generator.js`'s `listHistoricalReports()`:

```js
{
  id:          "report_20260315_143200",
  type:        "country",   // or "global"
  country:     "china",     // null for global reports
  generatedAt: "2026-03-15T14:32:00.000Z",
  size:        45231,       // bytes
  path:        "reports/countries/china/historical/report_20260315_143200.html",
  tags:        ["AI Generated", "Strategic"],
}
```

---

## Archive Statistics

```js
function updateStats() {
  document.getElementById('stat-total').textContent = allReports.length;

  if (!allReports.length) {
    document.getElementById('stat-latest').textContent = '—';
    document.getElementById('stat-span').textContent   = '—';
    return;
  }

  const sorted = [...allReports].sort((a, b) =>
    new Date(b.generatedAt || b.date) - new Date(a.generatedAt || a.date)
  );
  const latest = sorted[0];
  const latestDate = new Date(latest.generatedAt || latest.date);
  document.getElementById('stat-latest').textContent =
    latestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (allReports.length > 1) {
    const oldest = sorted[sorted.length - 1];
    const oldestDate = new Date(oldest.generatedAt || oldest.date);
    const days = Math.ceil((latestDate - oldestDate) / 86400000);
    document.getElementById('stat-span').textContent = `${days}d`;
  } else {
    document.getElementById('stat-span').textContent = '1d';
  }
}
```

---

## Filter Strip

```html
<div class="filter-strip">
  <button class="filter-btn active" onclick="setFilter('all', this)">All</button>
  <button class="filter-btn" onclick="setFilter('country', this)">Country Analysis</button>
  <button class="filter-btn" onclick="setFilter('global', this)">Global</button>
  <input class="search-input" type="search" placeholder="Search reports..."
         id="search-input" oninput="applySearch()">
</div>
```

```js
function setFilter(type, btn) {
  activeFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyFilter();
}

function applyFilter() {
  const search = document.getElementById('search-input')?.value?.toLowerCase() || '';

  filteredReports = allReports.filter(r => {
    if (activeFilter === 'country' && r.type !== 'country') return false;
    if (activeFilter === 'global'  && r.type !== 'global')  return false;
    if (search) {
      const searchable = `${r.title || ''} ${r.country || ''} ${r.type || ''}`.toLowerCase();
      if (!searchable.includes(search)) return false;
    }
    return true;
  });

  renderReports();
}

function applySearch() { applyFilter(); }
```

---

## Report Card Rendering

```js
function renderReportCard(report) {
  const date        = new Date(report.generatedAt || report.date || Date.now());
  const dateStr     = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr     = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const size        = report.size ? formatBytes(report.size) : '—';
  const isGlobalType = report.type === 'global';
  const countryMeta = report.country ? COUNTRY_DATA[report.country] : null;
  const typeIcon    = isGlobalType ? '🌍' : (countryMeta ? countryMeta.flag : '📄');

  return `
    <div class="report-card" onclick="openReport(${JSON.stringify(report).replace(/"/g, '&quot;')})">
      <div class="report-card-header">
        <div class="report-type-icon">${typeIcon}</div>
        <div class="report-meta-top">
          <div class="report-date">${escHtml(dateStr)}</div>
          <div class="report-time">${escHtml(timeStr)} UTC</div>
        </div>
      </div>
      <div class="report-tags">
        ${isGlobalType
          ? '<span class="report-tag global">Global Analysis</span>'
          : `<span class="report-tag country">${escHtml(countryMeta?.name || report.country || 'Unknown')}</span>`
        }
        ${(report.tags || []).map(t => `<span class="report-tag">${escHtml(t)}</span>`).join('')}
        <span class="report-tag">Intelligence Report</span>
      </div>
      <div class="report-footer">
        <span class="report-size">${escHtml(size)}</span>
        <span class="report-open-arrow">Open →</span>
      </div>
    </div>
  `;
}
```

The `.report-open-arrow` is `opacity: 0` by default, `opacity: 1` on `.report-card:hover`.

---

## Inline Viewer

```js
function openReport(report) {
  const url = report.path || report.url || buildReportPath(report);
  const date = new Date(report.generatedAt || report.date || Date.now());
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const title   = report.type === 'global'
    ? `Global Analysis — ${dateStr}`
    : `${COUNTRY_DATA[report.country]?.name || report.country} — ${dateStr}`;

  document.getElementById('viewer-title').textContent = title;
  document.getElementById('report-iframe').src = url;
  document.getElementById('report-viewer').classList.add('open');
  document.getElementById('hist-sidebar').style.display = 'none';
}

function closeViewer() {
  document.getElementById('report-viewer').classList.remove('open');
  document.getElementById('report-iframe').src = '';  // unload content
  document.getElementById('hist-sidebar').style.display = '';
}
```

**Iframe sandbox:** `sandbox="allow-scripts allow-same-origin allow-popups"` — allows in-page scripts and links but no top-level navigation.

---

## Report Path Construction

```js
function buildReportPath(report) {
  if (report.type === 'global') {
    return `../reports/global/${report.id || formatDatePath(report.date)}/report.html`;
  } else {
    return `../reports/countries/${report.country}/${report.id || formatDatePath(report.date)}/report.html`;
  }
}

function formatDatePath(dateStr) {
  if (!dateStr) return 'latest';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
```

---

## Folder Structure for Reports

```
conflict-mapper/
└── reports/
    ├── global/
    │   ├── current/
    │   │   └── report.html          ← current global report
    │   └── historical/
    │       ├── report_20260315_143200.html
    │       └── report_20260312_091500.html
    └── countries/
        ├── china/
        │   ├── current/
        │   │   └── report.html
        │   └── historical/
        │       ├── report_20260315_144500.html
        │       └── report_20260312_093000.html
        ├── usa/
        │   ├── current/
        │   └── historical/
        └── ... (one folder per slug)
```

Reports are HTML files generated by `lib/analysis-generator.js`. They are self-contained pages (no external dependencies).

---

## Auto-Archiving

When `lib/analysis-generator.js` generates a report:
1. Writes to `reports/countries/{slug}/current/report.html` (overwrites)
2. Also copies to `reports/countries/{slug}/historical/report_{timestamp}.html`
3. The `listHistoricalReports()` function scans the `historical/` folder and returns file metadata

---

## Loading State

```js
function renderLoadingGrid(count) {
  return `<div class="loading-grid">
    ${Array(count).fill('<div class="loading-card"></div>').join('')}
  </div>`;
}
```

Loading cards animate with CSS `@keyframes shimmer` (opacity 1→0.5→1, 1.5s).

---

## Empty State

```html
<div class="reports-grid">
  <div class="empty-state">
    <div class="empty-icon">📄</div>
    <div class="empty-title">No reports found</div>
    <div class="empty-desc">
      No historical reports match your criteria.<br>
      Run a new analysis from the Admin panel to generate reports.
    </div>
  </div>
</div>
```

---

## Utilities

```js
function formatBytes(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

---

## API Endpoints Used

| Method | URL | Response |
|--------|-----|----------|
| GET | `/api/analysis/history/global` | `{ success, data: { reports: [...] } }` |
| GET | `/api/analysis/history/country/:slug` | `{ success, data: { reports: [...], slug } }` |

The reports array contains objects with `{ id, type, country, generatedAt, size, path }`.
