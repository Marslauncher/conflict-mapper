# Logging System — System Prompt
## Conflict Mapper — `lib/logger.js`

You are an expert Node.js developer rebuilding the centralized logging module for Conflict Mapper. This document is the complete specification for `lib/logger.js` (236 lines, ~12KB). The module provides timestamped, categorized, leveled logging with an in-memory ring buffer and file persistence.

---

## Architecture

```
logger.log(category, level, message, details)
  ↓
Validate category + level
  ↓
Build entry: { timestamp, category, level, message, details }
  ↓
1. Push to memory ring buffer (max 1000 entries, oldest dropped)
2. Append to data/server.log (non-fatal on failure)
3. Mirror to console (console.log / .warn / .error)
```

---

## Constants

```js
const MAX_MEMORY_LOGS  = 1000;
const LOG_FILE         = path.join(__dirname, '..', 'data', 'server.log');
const VALID_CATEGORIES = new Set(['api', 'rss', 'ai', 'analysis', 'system']);
const VALID_LEVELS     = new Set(['debug', 'info', 'warn', 'error']);
const LEVEL_ORDER      = { debug: 0, info: 1, warn: 2, error: 3 };
```

---

## Log Entry Schema

```js
{
  timestamp: "2026-03-15T14:32:01.123Z",  // ISO 8601, always UTC
  category:  "api",                        // one of VALID_CATEGORIES
  level:     "info",                       // one of VALID_LEVELS
  message:   "GET /api/articles",          // human-readable string
  details:   { method: "GET", path: "..." } // any JSON-serializable value, or null
}
```

---

## Categories

| Category | Used For |
|----------|---------|
| `api`      | Every incoming HTTP request, route errors |
| `rss`      | Feed fetches, feed adds/removes, fetch completion |
| `ai`       | AI provider config saves, test calls, analysis calls |
| `analysis` | Report generation start/complete/error |
| `system`   | Server startup, settings changes, logger init |

Invalid categories are silently remapped to `'system'`.

---

## Levels

| Level   | Order | Usage |
|---------|-------|-------|
| `debug` | 0     | Verbose debugging (rarely used in production) |
| `info`  | 1     | Normal operations — most log lines are info |
| `warn`  | 2     | Non-fatal issues (feed error, retryable) |
| `error` | 3     | Failures that need attention |

Invalid levels are silently remapped to `'info'`.

---

## In-Memory Ring Buffer

```js
let logBuffer = [];  // module-level array

// In log():
logBuffer.push(entry);
if (logBuffer.length > MAX_MEMORY_LOGS) {
  logBuffer.shift();   // drop oldest entry
}
```

The buffer holds the most recent 1000 log entries. On server restart, the buffer starts empty. The log file (`data/server.log`) is the persistent record.

---

## File Writing

```js
function appendToFile(entry) {
  ensureLogFile();  // mkdir -p data/, sets fileWriteReady flag
  if (!fileWriteReady) return;  // silent skip if dir creation failed

  // Format: ISO_TIMESTAMP [LEVEL   ] [CATEGORY] message | {"details":"json"}
  const detailsStr = entry.details != null
    ? ' | ' + JSON.stringify(entry.details)
    : '';

  const line = `${entry.timestamp} [${entry.level.toUpperCase().padEnd(5)}] [${entry.category.padEnd(8)}] ${entry.message}${detailsStr}\\n`;

  fs.appendFileSync(LOG_FILE, line, 'utf8');
  // Errors are written to process.stderr but never crash the server
}
```

**Example log file line:**
```
2026-03-15T14:32:01.123Z [INFO ] [api     ] GET /api/articles | {"body":"..."}
2026-03-15T14:32:05.456Z [ERROR] [rss     ] Feed fetch failed: BBC World | {"error":"timeout"}
2026-03-15T14:32:10.789Z [INFO ] [analysis] Country analysis started: china
```

File writes are synchronous (`appendFileSync`) to guarantee ordering. Disk I/O failures are silently caught — logging never crashes the server.

---

## Core Function: `log()`

```js
function log(category, level, message, details) {
  const cat = VALID_CATEGORIES.has(category) ? category : 'system';
  const lvl = VALID_LEVELS.has(level)        ? level    : 'info';

  const entry = {
    timestamp: new Date().toISOString(),
    category:  cat,
    level:     lvl,
    message:   String(message),
    details:   details !== undefined ? details : null,
  };

  // 1. Memory buffer
  logBuffer.push(entry);
  if (logBuffer.length > MAX_MEMORY_LOGS) logBuffer.shift();

  // 2. File
  appendToFile(entry);

  // 3. Console
  if (lvl === 'error') console.error(`[${cat}] ${message}`, details ?? '');
  else if (lvl === 'warn') console.warn(`[${cat}] ${message}`, details ?? '');
  else console.log(`[${cat}] ${message}`, details ?? '');
}
```

---

## Convenience Methods

```js
const info  = (category, message, details) => log(category, 'info',  message, details);
const warn  = (category, message, details) => log(category, 'warn',  message, details);
const error = (category, message, details) => log(category, 'error', message, details);
const debug = (category, message, details) => log(category, 'debug', message, details);
```

**Usage examples:**
```js
logger.info('api', 'GET /api/articles', { count: 42 });
logger.warn('rss', 'Feed returned 0 articles', { url: 'https://...' });
logger.error('ai', 'AI provider timeout', { provider: 'openai', elapsed: 91000 });
logger.debug('rss', 'Parsed Atom feed entry', { title: '...' });
```

---

## `getLogs(filters)` — Retrieval

```js
function getLogs(filters = {}) {
  let results = [...logBuffer];  // snapshot of buffer (newest entries at end)

  // 1. Category filter (exact match)
  if (filters.category && VALID_CATEGORIES.has(filters.category)) {
    results = results.filter(e => e.category === filters.category);
  }

  // 2. Minimum level filter (inclusive — 'warn' returns warn + error)
  if (filters.level && VALID_LEVELS.has(filters.level)) {
    const minOrder = LEVEL_ORDER[filters.level];
    results = results.filter(e => LEVEL_ORDER[e.level] >= minOrder);
  }

  // 3. Since filter (ISO timestamp)
  if (filters.since) {
    const sinceTs = new Date(filters.since).getTime();
    if (!isNaN(sinceTs)) {
      results = results.filter(e => new Date(e.timestamp).getTime() > sinceTs);
    }
  }

  // 4. Text search in message field (case-insensitive)
  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(e => e.message.toLowerCase().includes(q));
  }

  // 5. Sort newest first
  results.reverse();

  // 6. Limit (default 200, max 1000)
  const limit = Math.min(filters.limit ? parseInt(filters.limit) : 200, MAX_MEMORY_LOGS);
  return results.slice(0, limit);
}
```

---

## `clearLogs()`

Clears the in-memory buffer. Does NOT truncate the log file (file is append-only).

```js
function clearLogs() {
  const count = logBuffer.length;
  logBuffer = [];
  log('system', 'info', `Log buffer cleared (${count} entries removed)`);
  return { cleared: count };
}
```

---

## `getStats()`

Returns statistics about the current buffer:

```js
function getStats() {
  const counts = { debug: 0, info: 0, warn: 0, error: 0 };
  const byCat  = {};
  for (const e of logBuffer) {
    counts[e.level]     = (counts[e.level] || 0) + 1;
    byCat[e.category]   = (byCat[e.category] || 0) + 1;
  }
  return {
    total:      logBuffer.length,      // 0–1000
    maxMemory:  MAX_MEMORY_LOGS,       // 1000
    byLevel:    counts,                // { debug:0, info:120, warn:5, error:2 }
    byCategory: byCat,                 // { api:80, rss:30, ai:12, ... }
    oldest:     logBuffer[0]?.timestamp || null,
    newest:     logBuffer[logBuffer.length - 1]?.timestamp || null,
    logFile:    LOG_FILE,
  };
}
```

---

## API Endpoints

### `GET /api/logs`

Query parameters:
| Param    | Type   | Description |
|----------|--------|-------------|
| category | string | Filter by category (api/rss/ai/analysis/system) |
| level    | string | Minimum level (debug/info/warn/error) |
| limit    | number | Max results (default 200, max 1000) |
| since    | string | ISO timestamp — only return entries after this |
| search   | string | Text search in message field |

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2026-03-15T14:32:01.123Z",
        "category": "api",
        "level": "info",
        "message": "GET /api/articles",
        "details": null
      }
    ],
    "total": 42,
    "stats": {
      "total": 150,
      "maxMemory": 1000,
      "byLevel": { "info": 130, "warn": 15, "error": 5, "debug": 0 },
      "byCategory": { "api": 80, "rss": 30, "ai": 20, "analysis": 15, "system": 5 }
    },
    "filters": { "category": "api", "limit": 200 }
  }
}
```

### `DELETE /api/logs`

Clears the in-memory buffer.

**Response:**
```json
{ "success": true, "data": { "cleared": 150 } }
```

---

## Admin Panel Integration

The admin panel LOGS tab:
- Fetches `GET /api/logs` on load and every 30 seconds (auto-refresh)
- Renders logs in a terminal-style monospace font (Share Tech Mono)
- Color-coded level badges: INFO=blue, WARN=amber, ERROR=red, DEBUG=gray
- Category filter buttons across the top
- Level filter dropdown
- Search input for text filtering
- "Clear" button triggers `DELETE /api/logs`
- Shows `getStats()` summary at top (total, by level, by category)

---

## Where Logging Is Instrumented in `server.js`

| Event | Call |
|-------|------|
| Every API request | `logger.log('api', 'info', 'METHOD /path', { body })` |
| Feed added | `logger.log('rss', 'info', 'Feed added: name', { id, url })` |
| Feed removed | `logger.log('rss', 'info', 'Feed removed: id')` |
| RSS fetch start | `logger.log('rss', 'info', 'RSS fetch started for N feeds')` |
| RSS fetch complete | `logger.log('rss', 'info', 'RSS fetch complete', { totalFetched, newArticles, feedErrors })` |
| RSS fetch error | `logger.log('rss', 'error', 'RSS fetch failed: msg', { stack })` |
| AI config saved | `logger.log('ai', 'info', 'AI config saved', { provider })` |
| AI test | `logger.log('ai', 'info'|'warn', 'AI test succeeded/failed', { provider, model, elapsed })` |
| Analysis started | `logger.log('analysis', 'info', 'Country/Global analysis started: slug')` |
| Analysis complete | `logger.log('analysis', 'info'|'error', 'Analysis complete', { success, error })` |
| Settings changed | `logger.log('system', 'info', 'Settings updated', settings)` |
| Server start | `logger.log('system', 'info', 'Server started on port N')` |
| API route error | `logger.log('api', 'error', 'API error on /path: msg', { stack })` |

---

## Exports

```js
module.exports = {
  log,       // full log(category, level, message, details)
  info,      // convenience: info(category, message, details)
  warn,      // convenience: warn(category, message, details)
  error,     // convenience: error(category, message, details)
  debug,     // convenience: debug(category, message, details)
  getLogs,   // getLogs(filters) → array
  clearLogs, // clearLogs() → { cleared: number }
  getStats,  // getStats() → stats object
};
```

---

## How to Add Logging to a New Feature

```js
// In your new module:
const logger = require('./logger');

// At the start of an operation:
logger.info('system', 'Starting my new feature', { param1: value1 });

// On success:
logger.info('system', 'Feature completed', { result: 'ok', duration: elapsed });

// On error:
logger.error('system', `Feature failed: ${err.message}`, { stack: err.stack });

// For verbose details (only shown if log level filter includes debug):
logger.debug('system', 'Intermediate state', { data: someObject });
```

**Choosing the right category for new features:**
- Network calls to external services → `'api'`
- Feed-related operations → `'rss'`
- AI-related operations → `'ai'`
- Report generation → `'analysis'`
- Everything else → `'system'`

---

## Startup Log

On module load (before any routes register), the logger emits:
```js
log('system', 'info', 'Logger initialized', { logFile: LOG_FILE, maxMemory: MAX_MEMORY_LOGS });
```

This means `data/server.log` is created on first server start if it doesn't exist.
