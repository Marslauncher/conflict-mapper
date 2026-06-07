import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const GUIDE_PATH = path.join(ROOT, "datasources", "Global OSINT, News & Satellite Intelligence Resource Guide — Enhanced Edition.md");
const COUNTRIES_DIR = path.join(ROOT, "countries");

const PAGE_CONFIGS = [
  {
    slug: "usa",
    label: "United States",
    regions: ["United States"],
    focus: "domestic institutions, defense posture, infrastructure, legal records, accountability reporting, trade data, and public geospatial sources.",
    questions: ["What official record changed?", "Which infrastructure layer is exposed?", "Which agency or court source confirms it?", "What economic or cyber context changes the assessment?"]
  },
  {
    slug: "china",
    label: "China",
    regions: ["China"],
    focus: "CCP narratives, PLA activity, technology policy, maritime pressure, censorship signals, and China-focused research sources.",
    questions: ["What is the official or party narrative?", "Which independent outlet or research source checks it?", "Does the event affect PLA, maritime, tech, or economic posture?", "Which source family supplies non-state corroboration?"]
  },
  {
    slug: "russia",
    label: "Russia",
    regions: ["Russia"],
    focus: "independent Russian reporting, sanctions evasion, military posture, occupied-territory analysis, cyber activity, and infrastructure mapping.",
    questions: ["Is the claim from official Russia, exile media, or external analysis?", "Does it change force generation or sanctions risk?", "Which map or satellite layer verifies location?", "Which source family checks propaganda or censorship effects?"]
  },
  {
    slug: "ukraine",
    label: "Ukraine",
    regions: ["Ukraine"],
    focus: "frontline reporting, war-crimes documentation, geolocation, Russian force movements, equipment losses, and event databases.",
    questions: ["What happened on the battlefield or in civil infrastructure?", "Which local or geolocation source confirms it?", "Does it affect logistics, fires, air defense, or maritime access?", "Which event database preserves the incident trail?"]
  },
  {
    slug: "iran",
    label: "Iran",
    regions: ["Middle East"],
    include: /iran|gulf|hormuz|tehran|sanction|shipping|centcom|middle east|parseek|maritime|chokepoint|yemen|hezbollah|lebanon/i,
    focus: "Iranian state messaging, Gulf shipping, sanctions, nuclear and missile context, regional proxies, and chokepoint monitoring.",
    questions: ["Does the report affect Gulf maritime risk?", "Is the source state-linked, opposition-linked, or independent?", "Which sanctions or shipping source corroborates it?", "Does the event change proxy, missile, nuclear, or cyber posture?"]
  },
  {
    slug: "israel",
    label: "Israel",
    regions: ["Middle East"],
    include: /israel|gaza|haaretz|jerusalem|times of israel|itic|hamas|hezbollah|palestin|lebanon|middle east|security|conflict/i,
    focus: "Israeli security reporting, Gaza/Lebanon conflict indicators, Hamas and Hezbollah research, regional diplomacy, and conflict-event corroboration.",
    questions: ["Which Israeli or regional source first reports the event?", "Does it involve Gaza, Lebanon, Iran, or wider regional escalation?", "Which think tank or conflict map confirms the frame?", "Does the event affect military, civil, or diplomatic risk?"]
  },
  {
    slug: "india",
    label: "India",
    regions: ["India"],
    focus: "Indian media, strategic research, cyber reporting, border monitoring, Kashmir, Northeast India, and India-Pakistan dynamics.",
    questions: ["Which Indian source establishes the baseline?", "Does the event affect border, cyber, political violence, or strategic policy?", "Which data source tracks the incident family?", "Does Pakistan or China context alter the assessment?"]
  },
  {
    slug: "pakistan",
    label: "Pakistan",
    regions: ["Pakistan"],
    focus: "Pakistani media, terrorism databases, Balochistan and TTP monitoring, India-Pakistan dynamics, and Pakistan-linked cyber activity.",
    questions: ["Which Pakistani outlet establishes the event?", "Is this terrorism, political violence, military, or cyber activity?", "Which incident database validates the pattern?", "Does the event affect India, Afghanistan, China, or Gulf equities?"]
  },
  {
    slug: "north-korea",
    label: "North Korea",
    regions: ["North Korea / Korean Peninsula"],
    focus: "DPRK specialist reporting, regime messaging, sanctions, satellite analysis, internal economy, missile activity, and Korean Peninsula escalation indicators.",
    questions: ["Is the item regime messaging, specialist reporting, or external analysis?", "Does it affect missile, nuclear, artillery, cyber, or sanctions posture?", "Which satellite or think tank source corroborates it?", "Does it change ROK/US/Japan readiness context?"]
  },
  {
    slug: "nato",
    label: "NATO",
    regions: ["Universal / Cross-Regional Tools", "United States", "Ukraine", "Russia"],
    include: /nato|europe|russia|ukraine|defense|military|sanction|infrastructure|satellite|aircraft|vessel|maritime|trade|iiss|cnas|chatham|isw|rand|acled|undersea|pipeline|cable/i,
    focus: "alliance readiness, Russia-Ukraine spillover, European infrastructure risk, sanctions, defense policy, and maritime or air-domain monitoring.",
    questions: ["Does the event affect alliance readiness or infrastructure?", "Which European, US, or Russia-Ukraine source family confirms it?", "Is the signal military, cyber, maritime, economic, or diplomatic?", "Which map or data source makes the risk visible?"]
  }
];

const UNIVERSAL_PICK = /firms|sentinel|worldview|earth|opensky|ads-b|global fishing|acled|shodan|overpass|trade|sanctions|marine/i;
const URL_OVERRIDES = new Map([
  ["https://chinadefenseuniversities.com", "https://unitracker.aspi.org.au/"],
  ["https://www.claws.in", "https://claws.co.in/"],
  ["https://registry.faa.gov", "https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry"],
  ["https://www.terrorism-info.org.il/en", "https://www.terrorism-info.org.il/en/"],
  ["https://iagency.media", "https://www.agents.media/"],
  ["http://naenara.com.kp", "https://kcnawatch.org/"],
  ["https://www.mnd.gov.tw", "https://x.com/MoNDefense"],
  ["https://api.adsb.lol", "https://adsb.lol/"]
]);
const URL_HINTS = new Map([
  ["marinetraffic", "https://www.marinetraffic.com"],
  ["vesselfinder", "https://www.vesselfinder.com"],
  ["global fishing watch", "https://globalfishingwatch.org"],
  ["parseek + translation plugins", "https://www.parseek.com"],
  ["parseek", "https://www.parseek.com"],
  ["iran monitor", "https://www.iranintl.com"],
  ["signalcockpit", "https://signalcockpit.com"],
  ["centcom us-vs-iran", "https://www.centcom.mil"],
  ["centcom", "https://www.centcom.mil"]
]);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
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

function normalizeUrlCandidate(value) {
  const candidate = String(value ?? "")
    .replace(/[<>"'`]/g, "")
    .replace(/[),.;:]+$/g, "")
    .trim();
  if (!candidate) return "";
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (/^(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z][a-z0-9-]{1,})+(?:\/[^\s]*)?$/i.test(candidate)) {
    return `https://${candidate.replace(/^www\./i, "")}`;
  }
  return "";
}

function extractLinks(value) {
  const text = String(value ?? "");
  const links = [];
  for (const match of text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)) {
    links.push({ label: stripMarkdown(match[1]), url: match[2] });
  }
  for (const match of text.matchAll(/(^|\s)(https?:\/\/[^\s)]+)/g)) {
    const url = match[2].replace(/[.,;]+$/, "");
    if (!links.some((link) => link.url === url)) links.push({ label: url, url });
  }
  const unlinkedText = text.replace(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g, " ");
  for (const match of unlinkedText.matchAll(/(?:^|[\s(—-])((?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z][a-z0-9-]{1,})+(?:\/[^\s),;]*)?)/gi)) {
    const url = normalizeUrlCandidate(match[1]);
    if (url && !links.some((link) => link.url === url)) links.push({ label: match[1], url });
  }
  return links;
}

function normalizeRegion(region) {
  return String(region || "General").replace(/^\d+\.\s*/, "").trim();
}

function classifyCategory(category) {
  return stripMarkdown(category).replace(/[^\w\s/&-]/g, "").trim() || "General";
}

function resourceFromTable(headers, cells, context) {
  const row = {};
  headers.forEach((header, index) => {
    row[stripMarkdown(header).toLowerCase()] = cells[index] || "";
  });
  const nameCell = row.source || row.tool || row.provider || row.platform || cells[0] || "Unnamed Resource";
  const linkCells = [row.url, row.api, row["api url"], row.notes, row.focus, row.price, row.pricing, ...cells];
  const links = linkCells.flatMap(extractLinks);
  const name = stripMarkdown(nameCell);
  const hintedUrl = URL_HINTS.get(name.toLowerCase());
  if (hintedUrl && !links.some((link) => link.url === hintedUrl)) links.unshift({ label: name, url: hintedUrl });
  const url = normalizeUrl(links[0]?.url || "");
  const cost = stripMarkdown(row.cost || row.price || row.pricing || "");
  const notes = stripMarkdown(row.notes || row.focus || row.api || row["auth method"] || cells.slice(1).join(" "));
  return {
    name,
    url,
    links: links.map((link) => ({ ...link, url: normalizeUrl(link.url) })),
    region: normalizeRegion(context.region),
    category: classifyCategory(context.category),
    kind: cost.toLowerCase().includes("paid") || cost.includes("$") || cost.toLowerCase().includes("enterprise") || context.category.toLowerCase().includes("paid") ? "Paid" : "Free",
    cost: cost || "Listed in guide",
    notes: notes || "Referenced in the resource guide.",
    source: "table"
  };
}

function normalizeUrl(url) {
  if (!url) return "";
  const clean = String(url).trim().replace(/[.,;]+$/, "");
  return URL_OVERRIDES.get(clean) || clean;
}

function parseGuide(md) {
  const lines = md.split(/\r?\n/);
  let region = "Universal / Cross-Regional Tools";
  let category = "General";
  let inCode = false;
  let codeTitle = "";
  let code = [];
  let currentTool = null;
  const resources = [];
  const examples = [];

  function pushCurrentTool() {
    if (!currentTool) return;
    if (currentTool.name && (currentTool.url || currentTool.notes)) resources.push(currentTool);
    currentTool = null;
  }

  function pushCode() {
    if (!code.length) return;
    examples.push({ title: codeTitle || category, region: normalizeRegion(region), category: classifyCategory(category), code: code.join("\n") });
    code = [];
    codeTitle = "";
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("```")) {
      if (inCode) {
        inCode = false;
        pushCode();
      } else {
        inCode = true;
        code = [];
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (/Example/.test(line)) codeTitle = stripMarkdown(line).replace(/:$/, "");
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
        notes: "",
        source: "heading"
      };
      continue;
    }
    if (currentTool && /^-\s+\*\*/.test(line)) {
      const clean = line.replace(/^-\s+/, "");
      const [label, ...rest] = clean.split(":");
      const key = stripMarkdown(label).toLowerCase();
      const value = rest.join(":").trim();
      const links = extractLinks(value);
      currentTool.links.push(...links.map((link) => ({ ...link, url: normalizeUrl(link.url) })));
      if ((key === "url" || key === "browser" || key === "api docs" || key === "api") && !currentTool.url) {
        currentTool.url = normalizeUrl(links[0]?.url || normalizeUrlCandidate(stripMarkdown(value)));
      }
      if (key === "cost" || key === "pricing") {
        currentTool.cost = stripMarkdown(value);
        if (/paid|enterprise|\$|contact/i.test(currentTool.cost)) currentTool.kind = "Paid";
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
  return {
    resources: resources.filter((resource) => resource.name && !/^[-]+$/.test(resource.name)),
    examples: examples.filter((example) => example.code.trim().length > 20)
  };
}

function uniqueResources(resources) {
  const seen = new Set();
  return resources.filter((resource) => {
    const key = `${resource.name}|${resource.url}|${resource.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectResources(allResources, config) {
  const regional = allResources.filter((resource) => {
    if (!config.regions.includes(resource.region)) return false;
    if (config.include && !config.include.test(`${resource.name} ${resource.category} ${resource.notes} ${resource.url}`)) return false;
    return true;
  });
  const universal = allResources
    .filter((resource) => resource.region === "Universal / Cross-Regional Tools")
    .filter((resource) => UNIVERSAL_PICK.test(`${resource.name} ${resource.category} ${resource.notes}`))
    .slice(0, 12);
  return uniqueResources([...regional, ...universal]);
}

function pickExamples(allExamples, config) {
  const selected = allExamples.filter((example) => {
    const text = `${example.title} ${example.region} ${example.category} ${example.code}`;
    return config.regions.some((region) => example.region === region) || /sentinel|ads-b|opensky|acled|overpass|global fishing|firms|shodan/i.test(text);
  });
  return selected.slice(0, 4);
}

function hostFor(url) {
  if (!url) return "Reference only";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Reference only";
  }
}

function useCaseFor(resource, config) {
  const text = `${resource.category} ${resource.notes} ${resource.name}`.toLowerCase();
  if (text.includes("satellite") || text.includes("imagery") || text.includes("geospatial")) return `Use for map evidence, imagery checks, and ${config.label} location context.`;
  if (text.includes("air") || text.includes("ads-b") || text.includes("flight")) return `Use for aircraft activity leads near ${config.label}; corroborate sensitive military claims before publication.`;
  if (text.includes("vessel") || text.includes("maritime") || text.includes("shipping")) return `Use for maritime, port, shipping, and grey-zone activity relevant to ${config.label}.`;
  if (text.includes("think") || text.includes("analysis") || text.includes("research")) return `Use for interpretation and strategic context after current reporting establishes the event baseline.`;
  if (text.includes("news") || text.includes("media") || text.includes("journalism")) return `Use for current reporting, local framing, and early leads before source-family corroboration.`;
  if (text.includes("api") || text.includes("data")) return `Use for repeatable collection, dashboards, and scheduled checks.`;
  return `Use for source discovery, corroboration, and ${config.label} collection planning.`;
}

function renderToolCard(resource, config) {
  const host = hostFor(resource.url);
  const link = resource.url
    ? `<a class="source-link" href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer">Open</a>`
    : `<span class="source-link disabled">No direct URL</span>`;
  const extraLinks = resource.links.filter((item) => item.url !== resource.url).slice(0, 3);
  const useCase = useCaseFor(resource, config);
  return `<article class="tool-card">
    <div class="info">
      <button class="info-button" type="button" aria-label="More about ${esc(resource.name)}">i</button>
      <div class="popover">
        <h4>${esc(resource.name)}</h4>
        <p><strong>Operational use:</strong> ${esc(useCase)}</p>
        <p><strong>Source context:</strong> ${esc(resource.notes || "Referenced in the Global OSINT resource guide.")}</p>
        <ul>
          <li>Region: ${esc(resource.region)}</li>
          <li>Topic: ${esc(resource.category)}</li>
          <li>Access: ${esc(resource.cost || resource.kind)}</li>
          ${extraLinks.map((item) => `<li><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.label || item.url)}</a></li>`).join("")}
        </ul>
      </div>
    </div>
    <h3>${esc(resource.name)}</h3>
    <p>${esc(resource.notes || useCase)}</p>
    <div class="inline-preview" aria-label="${esc(resource.name)} website preview">
      <div class="browser-bar"><span></span><span></span><span></span>${esc(host)}</div>
      <div class="preview-body">
        <h4>${esc(resource.name)}</h4>
        <div class="preview-line mid"></div>
        <div class="preview-line short"></div>
        <p>${esc(useCase)}</p>
      </div>
    </div>
    <div class="card-meta">
      <span class="tag">${esc(resource.kind)}</span>
      <span class="tag blue">${esc(resource.category.split("(")[0].trim())}</span>
    </div>
    <div class="source-row">
      <span class="domain">${esc(host)}</span>
      ${link}
    </div>
  </article>`;
}

function renderGroupedResources(resources, config) {
  const byCategory = new Map();
  resources.forEach((resource) => {
    const key = resource.category;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(resource);
  });
  return [...byCategory.entries()].map(([category, items]) => `
    <section class="section" aria-labelledby="${esc(slugify(category))}-title">
      <div class="section-head">
        <h2 id="${esc(slugify(category))}-title">${esc(category)}</h2>
        <p>${esc(categoryIntro(category, config))}</p>
      </div>
      <div class="tool-grid">${items.map((resource) => renderToolCard(resource, config)).join("\n")}</div>
    </section>
  `).join("\n");
}

function categoryIntro(category, config) {
  const text = category.toLowerCase();
  if (text.includes("news") || text.includes("media")) return `Current reporting sources for ${config.label}; use them to establish the event baseline before assessment language changes.`;
  if (text.includes("think") || text.includes("research")) return `Research and analysis sources that help decide whether ${config.label} reporting is routine, anomalous, or strategically meaningful.`;
  if (text.includes("satellite") || text.includes("geospatial")) return `Visual and geospatial sources for confirming locations, infrastructure, damage, environmental context, or operational access.`;
  if (text.includes("paid")) return `Commercial platforms from the guide that may add scale, resolution, language coverage, or enterprise support.`;
  if (text.includes("cyber")) return `Cyber and technical-intelligence sources for exposed infrastructure, threat actor reporting, and campaign context.`;
  return `Guide-derived resources for ${config.label} monitoring and corroboration.`;
}

function renderExamples(examples, config) {
  if (!examples.length) return "";
  return `<section class="section" aria-labelledby="examples-title">
    <div class="section-head">
      <h2 id="examples-title">Example Collection Code</h2>
      <p>Credential-safe snippets from the resource guide. Replace placeholders with environment variables and preserve source timestamps in downstream reports.</p>
    </div>
    <div class="code-grid">
      ${examples.map((example) => `<article class="code-panel">
        <header><h3>${esc(example.title.slice(0, 76))}</h3><span class="tag">${esc(example.region)}</span></header>
        <pre><code>${esc(example.code)}</code></pre>
      </article>`).join("\n")}
    </div>
  </section>`;
}

function renderWorkflow(config) {
  return `<section class="section" aria-labelledby="workflow-title">
    <div class="section-head">
      <h2 id="workflow-title">Analyst Workflow</h2>
      <p>${esc(config.label)} assessments should move from current reporting to corroborating source layers before final analysis language is published.</p>
    </div>
    <div class="workflow-grid">
      ${config.questions.map((question, index) => `<article class="workflow-card">
        <span class="step">0${index + 1}</span>
        <h3>${esc(question)}</h3>
        <p>${esc(workflowText(index, config))}</p>
      </article>`).join("\n")}
    </div>
  </section>`;
}

function workflowText(index, config) {
  const copy = [
    `Start with local, official, or specialist reporting so the ${config.label} event baseline is not imported from a detached global headline.`,
    "Cross-check with a second source family such as official records, satellite imagery, aircraft or maritime data, conflict-event databases, or research analysis.",
    "Preserve source URLs, timestamps, and topic tags so later watch-page updates can cite the specific evidence trail.",
    "Escalate language only when multiple independent indicators converge or when a primary source directly changes the operational picture."
  ];
  return copy[index] || copy[0];
}

function renderPreviewModules(resources, config) {
  const picks = resources.filter((resource) => resource.url).slice(0, 3);
  return `<section class="section" aria-labelledby="previews-title">
    <div class="section-head">
      <h2 id="previews-title">Website Preview Modules</h2>
      <p>Preview cards summarize what each source family should provide without embedding third-party pages that may block iframes or break production rendering.</p>
    </div>
    <div class="preview-grid">
      ${picks.map((resource) => `<article class="preview-card">
        <div class="browser-bar"><span></span><span></span><span></span><b>${esc(hostFor(resource.url))}</b></div>
        <div class="preview-body">
          <h3>${esc(resource.name)}</h3>
          <div class="preview-line"></div>
          <div class="preview-line short"></div>
          <div class="preview-line mid"></div>
          <p>${esc(useCaseFor(resource, config))}</p>
          <a href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer">Open Source</a>
        </div>
      </article>`).join("\n")}
    </div>
  </section>`;
}

function renderOutputExamples(config) {
  return `<section class="section" aria-labelledby="outputs-title">
    <div class="section-head">
      <h2 id="outputs-title">Expected Output</h2>
      <p>These panels show what usable output should look like after sources are converted into a repeatable ${esc(config.label)} workflow.</p>
    </div>
    <div class="output-grid">
      <article class="output-card">
        <h3>Source Table</h3>
        <pre>{
  "region": "${esc(config.label)}",
  "source": "Primary reporting",
  "url": "https://example-source.invalid",
  "confidence": "corroboration required"
}</pre>
      </article>
      <article class="output-card">
        <h3>Map Layer</h3>
        <div class="mini-map" aria-label="${esc(config.label)} example map layer"></div>
        <p>Expected artifact: plotted incidents, infrastructure, route, or observation points with source URLs retained in feature properties.</p>
      </article>
      <article class="output-card">
        <h3>Assessment Note</h3>
        <p><strong>Analyst rule:</strong> a single source should not drive ${esc(config.label)} assessment language unless it is a primary source that directly changes the status picture.</p>
      </article>
    </div>
  </section>`;
}

function renderPage(config, resources, examples) {
  const paidCount = resources.filter((resource) => resource.kind === "Paid").length;
  const apiCount = resources.filter((resource) => /api|docs|developer|endpoint|data/i.test(`${resource.category} ${resource.notes} ${resource.url}`)).length;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(config.label)} Intel Tools | Conflict Mapper</title>
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/intel-link-previews.css">
  <script src="../assets/user-style.js"></script>
  <style>
    :root{--bg:#061014;--panel:#10232c;--panel-2:#0c1c24;--line:rgba(103,232,221,.18);--line-strong:rgba(103,232,221,.38);--text:#e7f2f4;--muted:#9eb4bd;--faint:#617a85;--accent:#5eead4;--blue:#79a7ff;--amber:#f4b03a;--red:#f87171;--font-display:"Rajdhani",sans-serif;--font-mono:"Share Tech Mono",monospace;--font-body:"Inter",system-ui,sans-serif}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:var(--font-body);overflow-x:hidden}body{background:radial-gradient(circle at 15% 0,rgba(121,167,255,.1),transparent 34rem),radial-gradient(circle at 88% 4%,rgba(94,234,212,.12),transparent 34rem),linear-gradient(180deg,#07151b 0%,#041014 100%)}a{color:inherit}.page{width:100%;max-width:1440px;margin:0 auto;padding:26px clamp(12px,2vw,22px) 78px}.nav{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--line);font-family:var(--font-mono);letter-spacing:.16em;text-transform:uppercase}.brand{color:var(--red);font-size:.78rem}.nav-links{display:flex;flex-wrap:wrap;gap:8px}.nav-links a,.source-link,.preview-body a{border:1px solid var(--line);border-radius:6px;padding:8px 10px;background:rgba(16,35,44,.62);color:var(--muted);text-decoration:none;font-family:var(--font-mono);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase}.nav-links a:hover,.source-link:hover,.preview-body a:hover{border-color:var(--line-strong);color:var(--accent)}.hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.72fr);gap:18px;align-items:stretch;padding:54px 0 36px}.hero-main,.hero-card,.tool-card,.workflow-card,.preview-card,.code-panel,.output-card{border:1px solid var(--line);border-radius:8px;background:linear-gradient(135deg,rgba(18,41,51,.9),rgba(6,19,25,.78));box-shadow:0 18px 60px rgba(0,0,0,.22)}.hero-main{padding:30px}.kicker{font-family:var(--font-mono);color:var(--accent);letter-spacing:.18em;text-transform:uppercase;font-size:.72rem;margin-bottom:12px}h1{margin:0 0 16px;font-family:var(--font-display);font-size:clamp(3.2rem,8vw,7.5rem);letter-spacing:.13em;line-height:.86;text-transform:uppercase;color:#111827}h2{margin:0;font-family:var(--font-display);font-size:clamp(1.9rem,4vw,3rem);letter-spacing:.16em;text-transform:uppercase}h3{margin:0;font-family:var(--font-display);font-size:1.25rem;letter-spacing:.1em;text-transform:uppercase}.lead{max-width:880px;color:var(--muted);font-size:1.04rem;line-height:1.7}.hero-card{padding:20px;display:grid;gap:10px}.metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.metric{border:1px solid var(--line);border-radius:6px;padding:14px;background:rgba(255,255,255,.04)}.metric strong{display:block;color:var(--accent);font-family:var(--font-display);font-size:2rem;line-height:1}.metric span{font-family:var(--font-mono);color:var(--muted);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase}.focus-box{border:1px solid var(--line);border-radius:6px;padding:14px;color:var(--muted);line-height:1.65}.section{padding:26px 0}.section-head{display:grid;grid-template-columns:minmax(0,.7fr) minmax(280px,.45fr);gap:18px;align-items:end;margin-bottom:16px;border-bottom:1px solid var(--line);padding:0 0 12px 18px}.section-head p{margin:0;color:var(--muted);line-height:1.65}.tool-grid,.workflow-grid,.preview-grid,.code-grid,.output-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}.tool-card{position:relative;min-height:255px;padding:18px;display:grid;grid-template-rows:auto auto 1fr auto}.tool-card p,.workflow-card p,.output-card p{color:var(--muted);line-height:1.62}.card-meta{display:flex;flex-wrap:wrap;gap:6px}.tag{display:inline-flex;border:1px solid var(--line-strong);border-radius:999px;padding:4px 7px;color:var(--accent);font-family:var(--font-mono);font-size:.62rem;letter-spacing:.1em;text-transform:uppercase}.tag.blue{color:var(--blue)}.source-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;min-width:0}.domain{min-width:0;color:var(--faint);font-family:var(--font-mono);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;overflow-wrap:anywhere}.source-link.disabled{opacity:.6}.info{position:absolute;top:12px;right:12px;z-index:8}.info-button{width:24px;height:24px;border:1px solid var(--line-strong);border-radius:999px;background:rgba(94,234,212,.08);color:var(--accent);font-family:var(--font-mono);cursor:pointer}.popover{position:absolute;right:0;top:32px;width:min(390px,calc(100vw - 38px));max-height:310px;overflow:auto;padding:16px;border:1px solid var(--line-strong);border-radius:8px;background:#061014;box-shadow:0 18px 60px rgba(0,0,0,.42);opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .12s ease,transform .12s ease}.info:hover .popover,.info:focus-within .popover,.info[data-open=true] .popover{opacity:1;pointer-events:auto;transform:translateY(0)}.popover h4{margin:0 0 8px;font-family:var(--font-display);letter-spacing:.1em;text-transform:uppercase}.popover p,.popover li{color:var(--muted);font-size:.86rem;line-height:1.55}.workflow-card,.output-card{padding:18px}.step{display:inline-flex;margin-bottom:12px;color:var(--accent);font-family:var(--font-mono);letter-spacing:.18em}.preview-card{overflow:hidden}.inline-preview{margin:12px 0;border:1px solid var(--line);border-radius:7px;overflow:hidden;background:rgba(4,13,17,.42)}.inline-preview .preview-body{padding:14px}.inline-preview h4{margin:0;color:var(--text);font-family:var(--font-display);font-size:1rem;letter-spacing:.1em;text-transform:uppercase}.inline-preview p{margin:12px 0 0;font-size:.84rem}.browser-bar{display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--line);padding:10px 14px;font-family:var(--font-mono);color:var(--faint);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase}.browser-bar span{width:9px;height:9px;border-radius:50%;background:var(--red);flex:0 0 auto}.browser-bar span:nth-child(2){background:var(--amber)}.browser-bar span:nth-child(3){background:#6bd37b}.preview-body{padding:20px}.preview-line{height:10px;border-radius:999px;background:rgba(159,178,191,.22);margin:14px 0}.preview-line.short{width:54%}.preview-line.mid{width:78%}.code-panel{overflow:hidden}.code-panel header{display:flex;justify-content:space-between;gap:10px;padding:14px;border-bottom:1px solid var(--line)}pre{margin:0;max-height:420px;overflow:auto;padding:16px;background:rgba(0,0,0,.28);color:#cdebf0;font-family:var(--font-mono);font-size:.78rem;line-height:1.58}.mini-map{height:190px;border:1px solid var(--line);border-radius:6px;background:linear-gradient(135deg,rgba(94,234,212,.13),transparent 45%),repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 22px),repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 22px)}@media(max-width:860px){.hero,.section-head{grid-template-columns:1fr}.nav{align-items:flex-start;flex-direction:column}.hero-main{padding:22px}h1{font-size:3rem}.metric-grid{grid-template-columns:1fr}.section-head{padding-left:8px}.popover{right:-10px}}
  </style>
</head>
<body>
  <main class="page">
    <nav class="nav" aria-label="${esc(config.label)} intel tools navigation">
      <div class="brand">Conflict Mapper / ${esc(config.label)} Intel Tools</div>
      <div class="nav-links">
        <a href="../index.html">Dashboard</a>
        <a href="../pages/intel-tools.html">Intel Tools Hub</a>
        <a href="../countries/${esc(config.slug)}-dossier.html">${esc(config.label)} Dossier</a>
      </div>
    </nav>

    <section class="hero" aria-labelledby="page-title">
      <div class="hero-main">
        <div class="kicker">Country dossier module / Source-backed collection guide</div>
        <h1 id="page-title">${esc(config.label)} Intel Tools</h1>
        <p class="lead">A focused OSINT reference for ${esc(config.label)} monitoring. The page down-selects from the Global OSINT resource guide and organizes sources by topic, use case, expected output, and corroboration workflow.</p>
      </div>
      <aside class="hero-card" aria-label="${esc(config.label)} source summary">
        <div class="metric-grid">
          <div class="metric"><strong>${resources.length}</strong><span>Guide sources</span></div>
          <div class="metric"><strong>${new Set(resources.map((resource) => resource.category)).size}</strong><span>Source topics</span></div>
          <div class="metric"><strong>${apiCount}</strong><span>API/data refs</span></div>
          <div class="metric"><strong>${paidCount}</strong><span>Paid tools</span></div>
        </div>
        <div class="focus-box"><strong>Collection focus:</strong> ${esc(config.focus)}</div>
      </aside>
    </section>

    ${renderWorkflow(config)}
    ${renderPreviewModules(resources, config)}
    ${renderGroupedResources(resources, config)}
    ${renderExamples(examples, config)}
    ${renderOutputExamples(config)}
  </main>
  <script src="../assets/intel-link-previews.js"></script>
  <script>
    document.querySelectorAll(".info").forEach((info) => {
      const button = info.querySelector(".info-button");
      if (!button) return;
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const isOpen = info.dataset.open === "true";
        document.querySelectorAll(".info[data-open='true']").forEach((openInfo) => {
          openInfo.dataset.open = "false";
          openInfo.querySelector(".info-button")?.setAttribute("aria-expanded", "false");
        });
        info.dataset.open = String(!isOpen);
        button.setAttribute("aria-expanded", String(!isOpen));
      });
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest(".info")) return;
      document.querySelectorAll(".info[data-open='true']").forEach((openInfo) => {
        openInfo.dataset.open = "false";
        openInfo.querySelector(".info-button")?.setAttribute("aria-expanded", "false");
      });
    });
  </script>
</body>
</html>
`;
}

function main() {
  const md = fs.readFileSync(GUIDE_PATH, "utf8");
  const parsed = parseGuide(md);
  fs.mkdirSync(COUNTRIES_DIR, { recursive: true });
  PAGE_CONFIGS.forEach((config) => {
    const resources = selectResources(parsed.resources, config);
    const examples = pickExamples(parsed.examples, config);
    const html = renderPage(config, resources, examples);
    fs.writeFileSync(path.join(COUNTRIES_DIR, `${config.slug}-intel-tools.html`), html);
    console.log(`${config.slug}: ${resources.length} resources, ${examples.length} examples`);
  });
}

main();
