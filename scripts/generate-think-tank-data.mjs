import { readFile, writeFile } from 'node:fs/promises';

const CSV_PATH = new URL('../datasources/ThinkTanksP.csv', import.meta.url);
const OUTPUT_PATH = new URL('../data/think-tanks.json', import.meta.url);

const csv = await readFile(CSV_PATH, 'utf8');
const [header, ...rows] = parseCsv(csv.trim());
const records = rows
  .filter((row) => row.some((value) => value.trim()))
  .map((row, index) => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])))
  .map((item, index) => ({
    id: slugify(item.Name || `think-tank-${index + 1}`),
    name: item.Name || '',
    url: item.URL || '',
    country: item.Country || '',
    regionFocus: item.Region_Focus || '',
    biasPerspective: item.Bias_Perspective || '',
    expertise: splitList(item.Subject_Matter_Expertise),
    expertiseText: item.Subject_Matter_Expertise || '',
    topicsUrl: item.Topics_URL || '',
    latestAnalysisUrl: item.Latest_Analysis_URL || '',
    expertsUrl: item.Experts_URL || '',
  }));

await writeFile(OUTPUT_PATH, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'datasources/ThinkTanksP.csv',
  total: records.length,
  thinkTanks: records,
}, null, 2) + '\n');

console.log(`Wrote ${records.length} think tanks to data/think-tanks.json`);

function parseCsv(input) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];
    if (ch === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += ch;
    }
  }
  row.push(value);
  rows.push(row);
  return rows;
}

function splitList(value) {
  return String(value || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
