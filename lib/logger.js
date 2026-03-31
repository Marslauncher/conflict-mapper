/**
 * logger.js — Centralized server-side logging for Conflict Mapper
 *
 * Provides timestamped, categorized logging that:
 *   1. Stores the last 1000 entries in memory
 *   2. Appends to data/server.log on disk
 *   3. Exposes getLogs(filters) for retrieval via /api/logs
 *
 * Usage:
 *   const logger = require('./logger');
 *   logger.log('api', 'info', 'Request received', { method: 'GET', path: '/api/status' });
 *   logger.log('ai',  'error', 'Provider failed', { provider: 'openai', error: 'timeout' });
 *
 * Categories: 'api', 'rss', 'ai', 'analysis', 'system'
 * Levels:     'debug', 'info', 'warn', 'error'
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MAX_MEMORY_LOGS = 1000;
const LOG_FILE        = path.join(__dirname, '..', 'data', 'server.log');
const VALID_CATEGORIES = new Set(['api', 'rss', 'ai', 'analysis', 'system']);
const VALID_LEVELS     = new Set(['debug', 'info', 'warn', 'error']);
const LEVEL_ORDER      = { debug: 0, info: 1, warn: 2, error: 3 };

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY RING BUFFER
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Array<{timestamp:string, category:string, level:string, message:string, details:any}>} */
let logBuffer = [];

// ─────────────────────────────────────────────────────────────────────────────
// FILE WRITER
// Ensures the data/ directory exists and appends log lines.
// Non-fatal: file write errors are printed to stderr but never crash the server.
// ─────────────────────────────────────────────────────────────────────────────

let fileWriteReady = false;

function ensureLogFile() {
  if (fileWriteReady) return;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fileWriteReady = true;
  } catch (err) {
    process.stderr.write(`[logger] Cannot create log directory: ${err.message}\n`);
  }
}

function appendToFile(entry) {
  ensureLogFile();
  if (!fileWriteReady) return;
  try {
    // Format: ISO_TIMESTAMP [LEVEL] [CATEGORY] message | details_json
    const detailsStr = entry.details !== undefined && entry.details !== null
      ? ' | ' + JSON.stringify(entry.details)
      : '';
    const line = `${entry.timestamp} [${entry.level.toUpperCase().padEnd(5)}] [${entry.category.padEnd(8)}] ${entry.message}${detailsStr}\n`;
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (err) {
    process.stderr.write(`[logger] File write error: ${err.message}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE LOG FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * log(category, level, message, details)
 *
 * @param {string} category - One of: 'api', 'rss', 'ai', 'analysis', 'system'
 * @param {string} level    - One of: 'debug', 'info', 'warn', 'error'
 * @param {string} message  - Human-readable log message
 * @param {any}    [details] - Optional structured data (object, string, etc.)
 */
function log(category, level, message, details) {
  // Normalize and validate
  const cat = VALID_CATEGORIES.has(category) ? category : 'system';
  const lvl = VALID_LEVELS.has(level)        ? level    : 'info';

  const entry = {
    timestamp: new Date().toISOString(),
    category:  cat,
    level:     lvl,
    message:   String(message),
    details:   details !== undefined ? details : null,
  };

  // 1. Push to memory ring buffer (oldest dropped when full)
  logBuffer.push(entry);
  if (logBuffer.length > MAX_MEMORY_LOGS) {
    logBuffer.shift();
  }

  // 2. Write to disk
  appendToFile(entry);

  // 3. Mirror to console (always, using Node's native methods)
  const prefix = `[${cat}]`;
  const consoleLine = details !== undefined && details !== null
    ? `${prefix} ${message}`
    : `${prefix} ${message}`;

  if (lvl === 'error') {
    console.error(consoleLine, details !== undefined ? details : '');
  } else if (lvl === 'warn') {
    console.warn(consoleLine, details !== undefined ? details : '');
  } else {
    console.log(consoleLine, details !== undefined ? details : '');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

const info  = (category, message, details) => log(category, 'info',  message, details);
const warn  = (category, message, details) => log(category, 'warn',  message, details);
const error = (category, message, details) => log(category, 'error', message, details);
const debug = (category, message, details) => log(category, 'debug', message, details);

// ─────────────────────────────────────────────────────────────────────────────
// RETRIEVAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getLogs(filters)
 * Retrieve filtered log entries from the in-memory buffer.
 *
 * @param {object} filters
 *   category  {string}  - Filter by category (exact match)
 *   level     {string}  - Filter by minimum severity level
 *   limit     {number}  - Max entries to return (default: 200, max: 1000)
 *   since     {string}  - ISO timestamp — only return entries after this time
 *   search    {string}  - Text search in message field
 * @returns {Array} Matching log entries, newest first
 */
function getLogs(filters = {}) {
  let results = [...logBuffer];

  // Category filter
  if (filters.category && VALID_CATEGORIES.has(filters.category)) {
    results = results.filter(e => e.category === filters.category);
  }

  // Minimum level filter
  if (filters.level && VALID_LEVELS.has(filters.level)) {
    const minOrder = LEVEL_ORDER[filters.level];
    results = results.filter(e => LEVEL_ORDER[e.level] >= minOrder);
  }

  // Since filter
  if (filters.since) {
    const sinceTs = new Date(filters.since).getTime();
    if (!isNaN(sinceTs)) {
      results = results.filter(e => new Date(e.timestamp).getTime() > sinceTs);
    }
  }

  // Text search in message
  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(e => e.message.toLowerCase().includes(q));
  }

  // Sort newest first
  results.reverse();

  // Limit
  const limit = Math.min(filters.limit ? parseInt(filters.limit) : 200, MAX_MEMORY_LOGS);
  return results.slice(0, limit);
}

/**
 * clearLogs()
 * Clear the in-memory log buffer (does not truncate the log file).
 */
function clearLogs() {
  const count = logBuffer.length;
  logBuffer = [];
  log('system', 'info', `Log buffer cleared (${count} entries removed)`);
  return { cleared: count };
}

/**
 * getStats()
 * Return basic stats about the current log buffer.
 */
function getStats() {
  const counts = { debug: 0, info: 0, warn: 0, error: 0 };
  const byCat  = {};
  for (const e of logBuffer) {
    counts[e.level] = (counts[e.level] || 0) + 1;
    byCat[e.category] = (byCat[e.category] || 0) + 1;
  }
  return {
    total:      logBuffer.length,
    maxMemory:  MAX_MEMORY_LOGS,
    byLevel:    counts,
    byCategory: byCat,
    oldest:     logBuffer.length > 0 ? logBuffer[0].timestamp : null,
    newest:     logBuffer.length > 0 ? logBuffer[logBuffer.length - 1].timestamp : null,
    logFile:    LOG_FILE,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP LOG
// ─────────────────────────────────────────────────────────────────────────────

log('system', 'info', 'Logger initialized', { logFile: LOG_FILE, maxMemory: MAX_MEMORY_LOGS });

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  log,
  info,
  warn,
  error,
  debug,
  getLogs,
  clearLogs,
  getStats,
};
