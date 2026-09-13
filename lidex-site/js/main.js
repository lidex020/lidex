/* ═══════════════════════════════════════════════════════════════
   LIDEX — main.js
   Renders the product sections from js/products.js and draws the
   wallet chip UI. Wallet connection itself is handled by
   js/wallet.js (Reown AppKit) which emits "lidex-account" events.
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────── Section config ─────────────── */
const LIDEX_SECTIONS = [
  { id: "live", status: "live", grid: "#products-grid" },
];

/* products UI state (search + view; view is remembered) */
const productsState = {
  query: "",
  view: localStorage.getItem("lidex_view") === "list" ? "list" : "grid",
};

const CHAIN_NAMES = {
  "0x1": "Ethereum",
  "0x2a": "Optimism",
  "0x89": "Polygon",
  "0x38": "BNB Chain",
  "0xa4b1": "Arbitrum One",
  "0x2105": "Base",
  "0xa4ba": "Avalanche",
  "0x64": "Gnosis",
  "0x1388": "Mantle",
  "0x2106": "Berachain",
  "0xea": "Flare",
  "0x14a": "X Layer",
};

/* ─────────────── Icons (inline SVG) ─────────────── */
const ICONS = {
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  wallet:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1"/><circle cx="16.5" cy="14" r="1.4" fill="currentColor" stroke="none"/></svg>',
  copy:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  disconnect:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  reconnect:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  chain:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  chev:
    '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
};

/* ─────────────── Product cards ─────────────── */
function cardHTML(p) {
  if (p.status === "soon") {
    return `
      <article class="card" aria-label="${p.name} (coming soon)">
        <img class="card-icon" src="${p.icon}" alt="${p.name} icon" loading="lazy" />
        <div class="card-main">
          <div class="card-row">
            <h3>${p.name}</h3>
            <span class="badge badge-soon">Soon</span>
          </div>
          <p class="tagline">${p.tagline}</p>
          <p class="desc">${p.description}</p>
        </div>
        <span class="card-cta"><span class="soon">In development</span></span>
      </article>`;
  }
  return `
    <a class="card" href="${p.url}" target="_blank" rel="noopener" aria-label="Open ${p.name}">
      <img class="card-icon" src="${p.icon}" alt="${p.name} icon" loading="lazy" />
      <div class="card-main">
        <div class="card-row">
          <h3>${p.name}</h3>
          <span class="badge badge-live">Live</span>
        </div>
        <p class="tagline">${p.tagline}</p>
        <p class="desc">${p.description}</p>
      </div>
      <span class="card-cta">Open app ${ICONS.arrow}</span>
    </a>`;
}

function noResultsHTML(q) {
  return `
    <div class="no-results">
      <h3>No products found</h3>
      <p>No products match &ldquo;<b>${escapeHtml(q)}</b>&rdquo;. Try a different search.</p>
      <button class="btn btn-ghost" id="clear-search">Clear search</button>
    </div>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderProducts() {
  for (const section of LIDEX_SECTIONS) {
    const grid = document.querySelector(section.grid);
    if (!grid) continue;

    const q = productsState.query.trim().toLowerCase();
    const products = LIDEX_PRODUCTS.filter((p) => {
      if (p.status !== section.status) return false;
      if (!q) return true;
      return `${p.name} ${p.tagline} ${p.description}`.toLowerCase().includes(q);
    });

    grid.classList.toggle("list", productsState.view === "list");
    grid.innerHTML = products.length
      ? products.map(cardHTML).join("")
      : noResultsHTML(productsState.query);
  }
}

/* ─────────────── Search + view toggle ─────────────── */
function wireProductsToolbar() {
  const input = document.getElementById("product-search");
  const clearBtn = document.getElementById("search-clear");

  const syncClear = () => {
    if (clearBtn) clearBtn.hidden = !input.value;
  };

  if (input) {
    input.addEventListener("input", () => {
      productsState.query = input.value;
      syncClear();
      renderProducts();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        input.value = "";
        productsState.query = "";
        syncClear();
        renderProducts();
      }
    });
  }

  const clearAll = () => {
    if (!input) return;
    input.value = "";
    productsState.query = "";
    syncClear();
    renderProducts();
    input.focus();
  };
  if (clearBtn) clearBtn.addEventListener("click", clearAll);

  /* "Clear search" button inside the no-results card */
  document.addEventListener("click", (e) => {
    if (e.target.closest("#clear-search")) clearAll();
  });

  /* view toggle (grid is the default; choice is remembered) */
  const toggle = document.querySelector(".view-toggle");
  if (toggle) {
    const syncButtons = () => {
      toggle.querySelectorAll("button").forEach((b) => {
        const active = b.dataset.view === productsState.view;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
    };
    syncButtons();
    toggle.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view]");
      if (!btn) return;
      productsState.view = btn.dataset.view;
      localStorage.setItem("lidex_view", productsState.view);
      syncButtons();
      renderProducts();
    });
  }
}

/* ─────────────── Wallet chip UI (state pushed by js/wallet.js) ─────────────── */
const wallet = { address: null, verified: false, chainId: null };

function shortAddress(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function avatarFor(address) {
  let h = 0;
  for (const c of address) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const h1 = h % 360;
  const h2 = (h1 + 80) % 360;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${h1},65%,48%)'/>` +
    `<stop offset='1' stop-color='hsl(${h2},65%,38%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='56' height='56' fill='url(#g)'/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function chainName() {
  return (wallet.chainId && CHAIN_NAMES[wallet.chainId]) || null;
}

function renderWallet() {
  const slots = document.querySelectorAll("[data-wallet-slot]");
  if (!slots.length) return;

  if (!wallet.address) {
    slots.forEach((slot) => {
      slot.innerHTML = `
        <button class="btn btn-primary" data-connect>
          ${ICONS.wallet} Connect wallet
        </button>`;
    });
    return;
  }

  const addr = shortAddress(wallet.address);
  const chain = chainName();
  slots.forEach((slot) => {
    slot.innerHTML = `
      <span class="wallet-wrap">
        <button class="wallet-chip ${wallet.verified ? "" : "pending"}" data-wallet-toggle>
          <img class="avatar" src="${avatarFor(wallet.address)}" alt="Account avatar" />
          <span>${addr}</span>
          ${ICONS.chev}
        </button>
        <div class="wallet-menu" data-wallet-menu>
          <div class="menu-head">
            ${
              wallet.verified
                ? `Wallet connected${chain ? ` · ${chain}` : ""}`
                : "Saved from a previous session. Reconnect to verify."
            }
          </div>
          <button class="menu-item" data-copy-address>
            ${ICONS.copy} <span>${addr}</span>
          </button>
          ${
            chain
              ? `<div class="menu-item" style="cursor:default">${ICONS.chain} <span>${chain}</span></div>`
              : ""
          }
          <div class="menu-sep"></div>
          ${
            wallet.verified
              ? `<button class="menu-item danger" data-disconnect>${ICONS.disconnect} <span>Disconnect</span></button>`
              : `<button class="menu-item" data-reconnect>${ICONS.reconnect} <span>Reconnect</span></button>`
          }
        </div>
      </span>`;
  });
}

function connectWallet() {
  if (!window.LidexWallet) {
    toast("Wallet is still loading — try again in a second.");
    return;
  }
  window.LidexWallet.open();
}

function disconnectWallet() {
  closeMenus();
  if (window.LidexWallet && window.LidexWallet.disconnect) window.LidexWallet.disconnect();
}

/* events from js/wallet.js */
document.addEventListener("lidex-account", (e) => {
  const d = e.detail || {};
  wallet.address = d.address || null;
  wallet.verified = !!d.verified;
  wallet.chainId = d.chainId || null;
  closeMenus();
  renderWallet();
});

/* ── menu + event wiring ── */
function closeMenus() {
  document.querySelectorAll(".wallet-menu.open").forEach((m) => m.classList.remove("open"));
}

document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-connect]")) {
    e.preventDefault();
    connectWallet();
    return;
  }
  if (e.target.closest("[data-reconnect]")) {
    e.preventDefault();
    closeMenus();
    connectWallet();
    return;
  }
  if (e.target.closest("[data-disconnect]")) {
    e.preventDefault();
    disconnectWallet();
    return;
  }
  if (e.target.closest("[data-copy-address]")) {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(wallet.address);
      toast("Address copied to clipboard.");
    } catch (err) {
      toast("Couldn't copy — clipboard unavailable.");
    }
    return;
  }
  const toggle = e.target.closest("[data-wallet-toggle]");
  if (toggle) {
    const menu = toggle.parentElement.querySelector("[data-wallet-menu]");
    const wasOpen = menu.classList.contains("open");
    closeMenus();
    if (!wasOpen) menu.classList.add("open");
    return;
  }
  if (!e.target.closest(".wallet-wrap")) closeMenus();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenus();
});

/* ─────────────── Toast ─────────────── */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}
window.lidexToast = toast; // exposed for js/wallet.js

/* ─────────────── Boot ─────────────── */
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  wireProductsToolbar();
  renderWallet();
});
