#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GUIDE_PATH = path.join(ROOT, "datasources", "Global OSINT, News & Satellite Intelligence Resource Guide — Enhanced Edition.md");
const HUB_PATH = path.join(ROOT, "pages", "intel-tools.html");
const COUNTRIES_DIR = path.join(ROOT, "countries");

const DOMAIN_DEFS = [
  {
    title: "Satellite Imagery",
    matcher: /satellite|imagery|sentinel|landsat|worldview|gibs|firms|planet|maxar|sar|iceye|capella|blacksky|airbus|umbra|skyfi/i
  },
  {
    title: "Flight & Aircraft Tracking",
    matcher: /flight|aircraft|aviation|ads-b|adsb|opensky|flightradar|faa|tail|icao/i
  },
  {
    title: "Vessel Tracking",
    matcher: /vessel|maritime|marine|shipping|ais|ship|port|fishing|global fishing|chokepoint/i
  },
  {
    title: "Conflict & Geopolitical Mapping",
    matcher: /conflict|geopolitical|acled|liveuamap|event|frontline|violence|incident|mapping/i
  },
  {
    title: "General OSINT Frameworks",
    matcher: /osint|framework|shodan|maltego|overpass|socmint|social|graph|infrastructure|scada/i
  },
  {
    title: "Global Trade & Economic Intelligence",
    matcher: /trade|economic|sanction|finance|financial|spending|campaign|comtrade|world bank|ofac|opensanctions|sipri/i
  }
];

const PROMPT_TEXT_BLOCKLIST = [
  "This is the reusable page pattern",
  "future country Intel Tools pages",
  "Template Country",
  "Taiwan Template",
  "Preview cards show what each source family",
  "Every future Intel Tools page should preserve",
  "Country Intel Tools pages should",
  "Template Validation Notes",
  "Rollout Rule"
];

function fail(errors, message) {
  errors.push(message);
}

function escRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMarkdown(value) {
  return String(value ?? "")
    .replace(/\[\^.+?\]/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function extractLinks(value) {
  const text = String(value ?? "");
  const links = [];
  for (const match of text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)) {
    links.push({ label: stripMarkdown(match[1]), url: match[2] });
  }
  for (const match of text.matchAll(/(^|\s)(https?:\/\/[^\s)]+)/g)) {
    if (!links.some((link) => link.url === match[2])) links.push({ label: match[2], url: match[2] });
  }
  return links;
}

function normalizeRegion(region) {
  return String(region || "General").replace(/^\d+\.\s*/, "").trim();
}

function classifyCategory(category) {
  const clean = stripMarkdown(category).replace(/[^\w\s/&-]/g, "").trim();
  return clean || "General";
}

function resourceFromTable(headers, cells, context) {
  const row = {};
  headers.forEach((header, index) => {
    row[stripMarkdown(header).toLowerCase()] = cells[index] || "";
  });
  const nameCell = row.source || row.tool || row.provider || row.platform || cells[0] || "Unnamed Resource";
  const linkCells = [row.url, row.api, row["api url"], row.notes, row.focus, row.price, row.pricing, ...cells];
  const links = linkCells.flatMap(extractLinks);
  const url = links[0]?.url || "";
  const cost = stripMarkdown(row.cost || row.price || row.pricing || "");
  const notes = stripMarkdown(row.notes || row.focus || row.api || row["auth method"] || cells.slice(1).join(" "));
  return {
    name: stripMarkdown(nameCell),
    url,
    links,
    region: normalizeRegion(context.region),
    category: classifyCategory(context.category),
    kind: cost.toLowerCase().includes("paid") || cost.includes("$") || cost.toLowerCase().includes("enterprise") || context.category.toLowerCase().includes("paid") ? "Paid" : "Free",
    cost: cost || "Listed in guide",
    notes: notes || "Referenced in the resource guide."
  };
}

function parseGuide(md) {
  const lines = md.split(/\r?\n/);
  let region = "Universal / Cross-Regional Tools";
  let category = "General";
  let currentTool = null;
  let inCode = false;
  const resources = [];

  function pushCurrentTool() {
    if (!currentTool) return;
    if (currentTool.name && (currentTool.url || currentTool.notes)) resources.push(currentTool);
    currentTool = null;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (line.startsWith("## ")) {
      pushCurrentTool();
      region = line.replace(/^##\s+/, "").trim();
      category = "General";
      continue;
    }
    if (line.startsWith("### ")) {
      pushCurrentTool();
      category = line.replace(/^###\s+/, "").trim();
      continue;
    }
    if (line.startsWith("#### ")) {
      pushCurrentTool();
      currentTool = {
        name: stripMarkdown(line.replace(/^####\s+/, "")),
        url: "",
        links: [],
        region: normalizeRegion(region),
        category: classifyCategory(category),
        kind: category.toLowerCase().includes("paid") ? "Paid" : "Free",
        cost: category.toLowerCase().includes("paid") ? "Paid/commercial" : "Listed in guide",
        notes: ""
      };
      continue;
    }
    if (currentTool && /^-\s+\*\*/.test(line)) {
      const clean = line.replace(/^-\s+/, "");
      const [label, ...rest] = clean.split(":");
      const key = stripMarkdown(label).toLowerCase();
      const value = rest.join(":").trim();
      const links = extractLinks(value);
      currentTool.links.push(...links);
      if ((key === "url" || key === "browser" || key === "api docs" || key === "api") && !currentTool.url) {
        currentTool.url = links[0]?.url || stripMarkdown(value);
      }
      if (key === "cost" || key === "pricing") {
        currentTool.cost = stripMarkdown(value);
        if (/paid|enterprise|\$|€|contact/i.test(currentTool.cost)) currentTool.kind = "Paid";
      }
      if (key === "notes" || key === "data") currentTool.notes = stripMarkdown(value);
    }
    if (line.trim().startsWith("|") && index + 1 < lines.length && /^\|\s*-+/.test(lines[index + 1].trim())) {
      pushCurrentTool();
      const headers = splitTableRow(line);
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const cells = splitTableRow(lines[index]);
        if (cells.length && cells.some(Boolean)) resources.push(resourceFromTable(headers, cells, { region, category }));
        index += 1;
      }
      index -= 1;
    }
  }
  pushCurrentTool();
  return resources.filter((resource) => resource.name && !/^[-]+$/.test(resource.name));
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function validatePromptText(file, html, errors) {
  PROMPT_TEXT_BLOCKLIST.forEach((blocked) => {
    if (html.includes(blocked)) fail(errors, `${file}: prompt/template text is present: "${blocked}"`);
  });
}

function validateLinks(filePath, html, errors) {
  const ids = new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]));
  for (const match of html.matchAll(/\shref=["']([^"']+)["']/g)) {
    const href = match[1].trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (href.includes("${")) continue;
    if (href.startsWith("#")) {
      const anchor = href.slice(1);
      if (anchor && !ids.has(anchor)) fail(errors, `${path.relative(ROOT, filePath)}: missing in-page anchor ${href}`);
      continue;
    }
    if (/^https?:\/\//i.test(href)) {
      try {
        new URL(href);
      } catch {
        fail(errors, `${path.relative(ROOT, filePath)}: invalid external URL ${href}`);
      }
      continue;
    }
    if (href.startsWith("javascript:")) {
      fail(errors, `${path.relative(ROOT, filePath)}: javascript href is not allowed`);
      continue;
    }
    const cleanHref = href.split("#")[0].split("?")[0];
    if (!cleanHref) continue;
    const resolved = path.resolve(path.dirname(filePath), cleanHref);
    if (!fs.existsSync(resolved)) fail(errors, `${path.relative(ROOT, filePath)}: internal link target missing: ${href}`);
  }
}

function validateHub(resources, errors) {
  const html = fs.readFileSync(HUB_PATH, "utf8");
  validatePromptText("pages/intel-tools.html", html, errors);
  validateLinks(HUB_PATH, html, errors);

  [
    "renderCountChip",
    "renderResourceOverlay",
    "renderSitePreview",
    "wireNavigableCards",
    "data-filter-domain",
    "data-external-href",
    "currentFilters = { region: \"all\", category: \"all\", query: \"\", domain: \"all\" }"
  ].forEach((required) => {
    if (!html.includes(required)) fail(errors, `pages/intel-tools.html: missing hub behavior hook: ${required}`);
  });

  if (!/renderResourceCard[\s\S]+class="tool-card nav-card"[\s\S]+renderSitePreview/.test(html)) {
    fail(errors, "pages/intel-tools.html: resource cards must be navigable and include inline previews");
  }
  if (!/renderRegions[\s\S]+renderCountChip\(items, "resources"[\s\S]+wireNavigableCards/.test(html)) {
    fail(errors, "pages/intel-tools.html: region cards must expose resource overlays and be navigable");
  }

  const domainResults = DOMAIN_DEFS.map((domain) => {
    const items = resources.filter((resource) => domain.matcher.test(`${resource.name} ${resource.region} ${resource.category} ${resource.notes} ${resource.url}`));
    if (items.length === 0) fail(errors, `pages/intel-tools.html: ${domain.title} domain resolved to 0 resources`);
    return `${domain.title}: ${items.length}`;
  });

  return { domainResults };
}

function validateCountryPages(errors) {
  const files = fs.readdirSync(COUNTRIES_DIR)
    .filter((name) => name.endsWith("-intel-tools.html"))
    .sort();
  if (files.length < 10) fail(errors, `countries/: expected generated Intel Tools pages, found ${files.length}`);

  files.forEach((file) => {
    const filePath = path.join(COUNTRIES_DIR, file);
    const html = fs.readFileSync(filePath, "utf8");
    validatePromptText(`countries/${file}`, html, errors);
    validateLinks(filePath, html, errors);
    if (!html.includes("../assets/intel-link-previews.css") || !html.includes("../assets/intel-link-previews.js")) {
      fail(errors, `countries/${file}: missing external link preview assets`);
    }

    const previewCards = countMatches(html, /class="preview-card"/g);
    if (previewCards < 3) fail(errors, `countries/${file}: expected at least 3 website preview cards, found ${previewCards}`);

    const toolCards = countMatches(html, /class="tool-card"/g);
    const inlinePreviews = countMatches(html, /class="inline-preview"/g);
    const isGeneratedCountry = file !== "taiwan-intel-tools.html";
    if (isGeneratedCountry && toolCards !== inlinePreviews) {
      fail(errors, `countries/${file}: generated tool cards require one inline preview each (${inlinePreviews}/${toolCards})`);
    }

    const infoButtons = countMatches(html, /class="info-button"/g);
    if (toolCards && infoButtons < toolCards) {
      fail(errors, `countries/${file}: each tool card needs an info overlay (${infoButtons}/${toolCards})`);
    }

    if (file !== "taiwan-intel-tools.html" && !html.includes("<pre>")) {
      fail(errors, `countries/${file}: generated deep-dive page is missing code/output examples`);
    }
  });

  return { countryPageCount: files.length };
}

function validatePackageScript(errors) {
  const packagePath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  if (pkg.scripts?.["validate:intel-tools"] !== "node scripts/validate-intel-tools-pages.mjs") {
    fail(errors, "package.json: missing validate:intel-tools script");
  }
}

function main() {
  const errors = [];
  const resources = parseGuide(fs.readFileSync(GUIDE_PATH, "utf8"));
  if (resources.length < 250) fail(errors, `resource guide parse count is unexpectedly low: ${resources.length}`);

  const hub = validateHub(resources, errors);
  const countries = validateCountryPages(errors);
  validatePackageScript(errors);

  if (errors.length) {
    console.error("Intel Tools validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log("Intel Tools validation passed.");
  console.log(`Resources parsed: ${resources.length}`);
  console.log(`Domain counts: ${hub.domainResults.join("; ")}`);
  console.log(`Country pages checked: ${countries.countryPageCount}`);
}

main();
