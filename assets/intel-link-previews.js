(function () {
  const INTERNAL_HOSTS = new Set([
    "conflictmapper.com",
    "www.conflictmapper.com",
    "127.0.0.1",
    "localhost",
    "::1"
  ]);

  let previewEl = null;
  let activeLink = null;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function isExternalLink(anchor) {
    if (!anchor || !anchor.href) return false;
    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return false;
    }
    if (!/^https?:$/.test(url.protocol)) return false;
    if (INTERNAL_HOSTS.has(url.hostname)) return false;
    return true;
  }

  function getContextText(anchor) {
    if (anchor.dataset.previewSummary) return clean(anchor.dataset.previewSummary);

    const card = anchor.closest(".tool-card, .modal-resource-card, .resource-card, .region-card, .domain-card, .source-card, .contract-card, .preview-card, .panel, .output-card");
    if (card) {
      const paragraphs = Array.from(card.querySelectorAll("p"))
        .map((node) => clean(node.textContent))
        .filter(Boolean);
      if (paragraphs.length) return paragraphs.slice(0, 2).join(" ");
    }

    const row = anchor.closest("tr");
    if (row) {
      const cells = Array.from(row.children)
        .map((node) => clean(node.textContent))
        .filter(Boolean);
      if (cells.length > 1) return cells.slice(1, 4).join(" ");
    }

    const section = anchor.closest("section");
    const sectionCopy = section ? clean(section.querySelector(".section-head p, header p")?.textContent) : "";
    return sectionCopy || "External OSINT reference. Open in a separate tab and corroborate with an independent source before using in assessment language.";
  }

  function getTitle(anchor) {
    if (anchor.dataset.previewTitle) return clean(anchor.dataset.previewTitle);
    const card = anchor.closest(".tool-card, .modal-resource-card, .resource-card, .region-card, .domain-card, .source-card, .contract-card, .preview-card, .panel, .output-card");
    const cardTitle = card?.querySelector("h2, h3, h4")?.textContent;
    const text = clean(anchor.textContent);
    if (cardTitle && text && text.toLowerCase() !== "open") return `${clean(cardTitle)} / ${text}`;
    if (cardTitle) return clean(cardTitle);
    return text || anchor.href;
  }

  function ensurePreviewEl() {
    if (previewEl) return previewEl;
    previewEl = document.createElement("div");
    previewEl.className = "external-link-preview";
    previewEl.setAttribute("role", "tooltip");
    previewEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(previewEl);
    return previewEl;
  }

  function positionPreview(anchor) {
    const box = previewEl.getBoundingClientRect();
    const rect = anchor.getBoundingClientRect();
    const margin = 12;
    const gap = 10;
    let left = rect.left;
    if (rect.left + box.width > window.innerWidth - margin) {
      left = rect.right - box.width;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - box.width - margin));

    let top = rect.bottom + gap;
    if (top + box.height > window.innerHeight - margin) {
      top = rect.top - box.height - gap;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - box.height - margin));

    previewEl.style.left = `${left}px`;
    previewEl.style.top = `${top}px`;
  }

  function showPreview(anchor) {
    activeLink = anchor;
    const url = new URL(anchor.href, window.location.href);
    const host = url.hostname.replace(/^www\./, "");
    const title = getTitle(anchor);
    const summary = getContextText(anchor);
    const el = ensurePreviewEl();

    el.innerHTML = `
      <div class="external-link-preview__eyebrow">External Source Preview / ${esc(host)}</div>
      <h4>${esc(title)}</h4>
      <p>${esc(summary)}</p>
      <span class="external-link-preview__url">${esc(url.href)}</span>
    `;
    el.dataset.visible = "true";
    el.setAttribute("aria-hidden", "false");
    positionPreview(anchor);
  }

  function hidePreview() {
    activeLink = null;
    if (!previewEl) return;
    previewEl.dataset.visible = "false";
    previewEl.setAttribute("aria-hidden", "true");
  }

  function bind(anchor) {
    if (!isExternalLink(anchor) || anchor.dataset.externalPreviewBound === "true") return;
    anchor.dataset.externalPreviewBound = "true";
    anchor.classList.add("external-preview-link");
    anchor.addEventListener("mouseenter", () => showPreview(anchor));
    anchor.addEventListener("focus", () => showPreview(anchor));
    anchor.addEventListener("mouseleave", hidePreview);
    anchor.addEventListener("blur", hidePreview);
  }

  function enhanceExternalLinkPreviews(root) {
    const scope = root || document;
    scope.querySelectorAll("a[href]").forEach(bind);
  }

  window.enhanceExternalLinkPreviews = enhanceExternalLinkPreviews;

  document.addEventListener("scroll", () => {
    if (activeLink && previewEl?.dataset.visible === "true") positionPreview(activeLink);
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (activeLink && previewEl?.dataset.visible === "true") positionPreview(activeLink);
  });

  document.addEventListener("DOMContentLoaded", () => enhanceExternalLinkPreviews(document));
})();
