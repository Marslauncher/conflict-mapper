#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { refreshArticles, loadArticleSet } from '../cloudflare/lib/articles.js';
import { generateAndStoreReport } from '../cloudflare/lib/reports.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(repoRoot, 'generated-samples', `provider-comparison-${new Date().toISOString().slice(0, 10)}`);

const PROVIDERS = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    modelKey: 'OPENROUTER_MODEL',
    defaultModel: 'anthropic/claude-sonnet-4',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    envKey: 'PERPLEXITY_API_KEY',
    modelKey: 'PERPLEXITY_MODEL',
    defaultModel: 'sonar-pro',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    envKey: 'ANTHROPIC_API_KEY',
    modelKey: 'ANTHROPIC_MODEL',
    defaultModel: 'claude-sonnet-4-20250514',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    modelKey: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o',
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    envKey: 'NVIDIA_API_KEY',
    modelKey: 'NVIDIA_MODEL',
    defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    envKey: 'GOOGLE_API_KEY',
    modelKey: 'GOOGLE_MODEL',
    defaultModel: 'gemini-2.0-flash',
    validate: (value) => /^AIza/.test(value || ''),
  },
];

const JOBS = [
  { id: 'global-analysis', scope: 'global', slug: 'global', destination: 'reports/global/current/report.html' },
  { id: 'usa-country-analysis', scope: 'country', slug: 'usa', destination: 'reports/countries/usa/current/report.html' },
  { id: 'china-taiwan-threat-watch', scope: 'watch', slug: 'taiwan', destination: 'reports/watches/taiwan/current/report.html' },
];

main().catch((err) => {
  console.error(`[fatal] ${redact(err.message)}`);
  process.exit(1);
});

async function main() {
  await mkdir(outputRoot, { recursive: true });

  const sharedKv = new MemoryKV();
  const context = createContext({ kv: sharedKv });
  const feedLimit = Number(process.env.SAMPLE_FEED_LIMIT || 40);
  const skipFetch = process.argv.includes('--skip-fetch');
  let articleSet;

  if (!skipFetch) {
    console.log(`[feeds] fetching up to ${feedLimit} enabled RSS feeds`);
    try {
      const result = await refreshArticles(context, { limitFeeds: feedLimit, maxItemsPerFeed: 20 });
      console.log(`[feeds] added ${result.articlesAdded} articles; total cache ${result.totalArticles}`);
    } catch (err) {
      console.warn(`[feeds] live fetch failed; falling back to checked-in articles: ${redact(err.message)}`);
    }
  }

  articleSet = await loadArticleSet(context);
  console.log(`[articles] using ${articleSet.articles.length} articles from ${articleSet.source}`);

  const results = [];
  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.envKey] || '';
    if (!apiKey || provider.validate?.(apiKey) === false) {
      results.push({ provider: provider.id, status: 'skipped', reason: `${provider.envKey} is missing or invalid` });
      console.log(`[skip] ${provider.label}: missing or invalid API key`);
      continue;
    }

    for (const job of JOBS) {
      const label = `${provider.id}-${job.id}`;
      const env = createEnv({ provider, apiKey, kv: sharedKv });
      console.log(`[start] ${label}`);
      try {
        await generateAndStoreReport(env, {
          scope: job.scope,
          slug: job.slug,
          articles: articleSet.articles,
        });
        const html = await env.REPORTS_BUCKET.readText(job.destination);
        const outPath = path.join(outputRoot, `${label}.html`);
        await writeFile(outPath, html, 'utf8');
        results.push({ provider: provider.id, job: job.id, status: 'ok', path: outPath, bytes: Buffer.byteLength(html) });
        console.log(`[ok] ${label} -> ${path.relative(repoRoot, outPath)} (${Buffer.byteLength(html)} bytes)`);
      } catch (err) {
        results.push({ provider: provider.id, job: job.id, status: 'failed', error: redact(err.message) });
        console.error(`[fail] ${label}: ${redact(err.message)}`);
      }
    }
  }

  const manifestPath = path.join(outputRoot, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2), 'utf8');
  console.log(`[done] manifest -> ${path.relative(repoRoot, manifestPath)}`);
}

function createEnv({ provider, apiKey, kv }) {
  const env = {
    AI_PROVIDER: provider.id,
    CONFIG_KV: kv,
    REPORTS_BUCKET: new LocalR2(outputRoot),
    DB: new MemoryD1(),
    OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
    PERPLEXITY_BASE_URL: 'https://api.perplexity.ai',
    ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    GOOGLE_BASE_URL: 'https://generativelanguage.googleapis.com',
    NVIDIA_BASE_URL: 'https://integrate.api.nvidia.com/v1',
    OPENROUTER_APP_TITLE: 'Conflict Mapper Provider Comparison',
  };

  env[provider.envKey] = apiKey;
  env[provider.modelKey] = process.env[provider.modelKey] || provider.defaultModel;
  return env;
}

function createContext({ kv }) {
  return {
    request: new Request('https://local.example/'),
    env: {
      CONFIG_KV: kv,
      ASSETS: createAssetBinding(),
    },
  };
}

function createAssetBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const localPath = path.join(repoRoot, decodeURIComponent(url.pathname.replace(/^\/+/, '')));
      try {
        const info = await stat(localPath);
        if (request.method === 'HEAD') {
          return new Response(null, { status: 200, headers: { 'content-length': String(info.size) } });
        }
        const body = await readFile(localPath);
        return new Response(body, { status: 200, headers: { 'content-length': String(info.size) } });
      } catch (_) {
        return new Response('Not found', { status: 404 });
      }
    },
  };
}

class MemoryKV {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async put(key, value) {
    this.store.set(key, String(value));
  }
}

class LocalR2 {
  constructor(root) {
    this.root = path.join(root, '.r2');
  }

  async put(key, value) {
    const filePath = path.join(this.root, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, typeof value === 'string' ? value : Buffer.from(value));
  }

  async get(key) {
    const filePath = path.join(this.root, key);
    try {
      const text = await readFile(filePath, 'utf8');
      return { text: async () => text };
    } catch (_) {
      return null;
    }
  }

  async readText(key) {
    return readFile(path.join(this.root, key), 'utf8');
  }
}

class MemoryD1 {
  constructor() {
    this.reports = [];
  }

  prepare(sql) {
    return new MemoryStatement(this, sql);
  }
}

class MemoryStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async all() {
    const [scope, slug, limit = 50] = this.params;
    return {
      results: this.db.reports
        .filter((report) => report.scope === scope && report.slug === slug)
        .sort((a, b) => Number(b.is_current) - Number(a.is_current) || new Date(b.generated_at) - new Date(a.generated_at))
        .slice(0, limit)
        .map(toD1Row),
    };
  }

  async first() {
    const [scope, slug] = this.params;
    const report = this.db.reports
      .filter((item) => item.scope === scope && item.slug === slug && item.is_current)
      .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))[0];
    return report ? toD1Row(report) : null;
  }

  async run() {
    if (/UPDATE reports SET is_current = 0/i.test(this.sql)) {
      const [scope, slug] = this.params;
      for (const report of this.db.reports) {
        if (report.scope === scope && report.slug === slug && report.is_current) report.is_current = 0;
      }
      return { success: true };
    }

    if (/UPDATE reports\s+SET storage_key/i.test(this.sql)) {
      const [storageKey, publicPath, id] = this.params;
      const report = this.db.reports.find((item) => item.id === id);
      if (report) {
        report.storage_key = storageKey;
        report.public_path = publicPath;
        report.is_current = 0;
      }
      return { success: true };
    }

    if (/INSERT INTO reports/i.test(this.sql)) {
      const [
        id,
        scope,
        slug,
        title,
        storageKey,
        publicPath,
        generatedAt,
        reportDate,
        provider,
        model,
        metadata,
      ] = this.params;
      this.db.reports.push({
        id,
        scope,
        slug,
        title,
        storage_key: storageKey,
        public_path: publicPath,
        generated_at: generatedAt,
        report_date: reportDate,
        is_current: 1,
        provider,
        model,
        status: 'ready',
        metadata,
      });
      return { success: true };
    }

    return { success: true };
  }
}

function toD1Row(report) {
  return {
    id: report.id,
    scope: report.scope,
    slug: report.slug,
    title: report.title,
    storageKey: report.storage_key,
    publicPath: report.public_path,
    generatedAt: report.generated_at,
    reportDate: report.report_date,
    isCurrent: report.is_current,
    provider: report.provider,
    model: report.model,
    status: report.status,
  };
}

function redact(value) {
  return String(value || '')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-...[redacted]')
    .replace(/pplx-[A-Za-z0-9_-]{8,}/g, 'pplx-...[redacted]')
    .replace(/nvapi-[A-Za-z0-9_-]{8,}/g, 'nvapi-...[redacted]')
    .replace(/AIza[A-Za-z0-9_-]{8,}/g, 'AIza...[redacted]');
}
