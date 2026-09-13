/* jsdom smoke test for the Lidex hub (run: node test.js [offline|live]) */
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");

const ROOT = "/home/user/lidex-site";
const mode = process.argv[2] || "offline"; // offline | live

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const errors = [];
const vc = new VirtualConsole();
/* jsdom-environment artifacts (missing performance.mark / reconnect APIs used
   by third-party embeds) — never present in real browsers */
const jsdomArtifact = (m) =>
  /performance\.mark|onReconnect|HTMLCanvasElement/.test(m);
vc.on("jsdomError", (e) => {
  if (!jsdomArtifact(e.message)) errors.push("jsdomError: " + e.message);
});
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

let dom;
try {
  dom = new JSDOM(html, {
    url: "http://localhost:8080/",
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      // browser APIs missing in jsdom (always present in real browsers)
      window.matchMedia =
        window.matchMedia ||
        ((q) => ({
          matches: false,
          media: q,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }));
      window.ResizeObserver =
        window.ResizeObserver ||
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
        };
      window.addEventListener("error", (e) => {
        if (!jsdomArtifact(e.message))
          errors.push("window.onerror: " + e.message);
      });
      if (mode === "offline") {
        window.fetch = () => Promise.reject(new Error("offline sim"));
      } else {
        window.fetch = (url, opts) =>
          fetch(url, opts).catch((e) => Promise.reject(e));
      }
    },
  });
} catch (e) {
  console.error("JSDOM failed to construct:", e.message);
  process.exit(1);
}

const { window } = dom;
const { document } = window;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await sleep(mode === "live" ? 9000 : 4000);

  const results = [];
  const check = (label, cond) => results.push(`${cond ? "PASS" : "FAIL"}  ${label}`);

  // 1) products rendered
  const cards = document.querySelectorAll("#products-grid .card");
  check(`product cards rendered (3, got ${cards.length})`, cards.length === 3);
  const names = [...cards].map((c) => c.querySelector("h3")?.textContent?.trim());
  check(
    `card names: ${names.join(", ")}`,
    JSON.stringify(names) ===
      JSON.stringify(["Lidex Perps", "Lidex Wallet", "Lidex App Store"])
  );
  const perpsHref = cards[0]?.getAttribute("href");
  check(`perps links to https://perp.lidex.tech (got ${perpsHref})`, perpsHref === "https://perp.lidex.tech");

  // 1b) products: search + view toggle (grid default)
  const search = document.getElementById("product-search");
  const clearBtn = document.getElementById("search-clear");
  const grid = document.getElementById("products-grid");
  const viewBtns = document.querySelectorAll(".view-toggle [data-view]");
  check(`search box + 2 view buttons present (got ${viewBtns.length})`, !!search && viewBtns.length === 2);
  check(`grid view is the default (active: ${document.querySelector(".view-toggle .active")?.dataset.view})`, document.querySelector(".view-toggle .active")?.dataset.view === "grid" && !grid.classList.contains("list"));

  const typeSearch = (v) => {
    search.value = v;
    search.dispatchEvent(new window.Event("input", { bubbles: true }));
  };
  const visibleCards = () => grid.querySelectorAll(".card").length;

  typeSearch("perps");
  check(`search "perps" → 1 card (got ${visibleCards()})`, visibleCards() === 1 && grid.querySelector("h3")?.textContent === "Lidex Perps");
  check("clear button visible while typing", !clearBtn.hidden);
  typeSearch("perpetual");
  check(`search matches description text ("perpetual" → 1, got ${visibleCards()})`, visibleCards() === 1);
  typeSearch("zzz-nothing");
  check(`no match → 0 cards + no-results (got ${visibleCards()} cards, nores: ${!!grid.querySelector(".no-results")})`, visibleCards() === 0 && !!grid.querySelector(".no-results"));
  grid.querySelector("#clear-search")?.click();
  check(`clear from no-results → 3 cards (got ${visibleCards()})`, visibleCards() === 3);
  typeSearch("app store");
  check(`multi-word search "app store" → 1 (got ${visibleCards()})`, visibleCards() === 1);
  typeSearch("");
  check(`empty search → all 3 (got ${visibleCards()})`, visibleCards() === 3);
  check("clear button hidden when empty", clearBtn.hidden);

  document.querySelector('.view-toggle [data-view="list"]')?.click();
  check(`list view applied (class: ${grid.className})`, grid.classList.contains("list"));
  check(`view choice persisted (got ${window.localStorage.getItem("lidex_view")})`, window.localStorage.getItem("lidex_view") === "list");
  check("list button active after toggle", document.querySelector('.view-toggle [data-view="list"]').classList.contains("active"));
  check(`list view keeps all ${visibleCards()} cards`, visibleCards() === 3);
  document.querySelector('.view-toggle [data-view="grid"]')?.click();
  check("grid view restored", !grid.classList.contains("list"));

  // 2) market: unbranded candle chart + 24h price list
  const rows = document.querySelectorAll("#mkt-rows .mkt-row");
  check(`market rows rendered (6, got ${rows.length})`, rows.length === 6);
  const foot = (document.querySelector("#mkt-foot")?.textContent || "").trim();
  check(`price foot text present: "${foot.slice(0, 60)}"`, foot.length > 0);
  const domText = document.body.textContent.toLowerCase();
  check("no 'coingecko' text in DOM", !domText.includes("coingecko"));
  check("no 'tradingview' text in DOM", !domText.includes("tradingview"));
  check("source tabs hidden", document.querySelector("#chart-src").classList.contains("hidden"));
  await sleep(mode === "live" ? 4500 : 2500);
  const activeSrc = document.querySelector("#chart-src button.active")?.dataset.src;
  const cgCanvas = document.querySelector("#cg-chart canvas");
  check(`default chart is the unbranded candle chart (src=${activeSrc}, canvas=${!!cgCanvas})`, activeSrc === "cg" && !!cgCanvas);
  check("interval buttons visible", !document.querySelector("#mkt-intervals").classList.contains("hidden"));
  if (mode === "live") {
    const firstPrice = rows[0]?.querySelector(".mkt-price")?.textContent || "";
    check(`BTC price is live (got "${firstPrice}")`, /\$[\d,]+\.\d+/.test(firstPrice));
    const badge = document.querySelector("#feed-badge")?.textContent || "";
    check(`badge says just "Live" (got "${badge}")`, badge === "Live");
    const foot2 = (document.querySelector("#mkt-foot")?.textContent || "");
    check(`footer is unbranded (got "${foot2.slice(0, 40)}")`, /Market prices · updated/.test(foot2) && !/coingecko|tradingview/i.test(foot2));
    document.querySelector('#mkt-intervals [data-interval="4h"]')?.click();
    await sleep(3500);
    check(`interval switch keeps live chart (got "${document.querySelector("#feed-badge")?.textContent}")`, /Live|Sample/.test(document.querySelector("#feed-badge")?.textContent || ""));
    document.querySelector('.mkt-row[data-symbol="SOLUSDT"]')?.click();
    await sleep(3500);
    check("row click keeps canvas + badge", !!document.querySelector("#cg-chart canvas") && /Live|Sample/.test(document.querySelector("#feed-badge")?.textContent || ""));
  } else {
    check(`offline → price fallback note (got "${foot.slice(0, 50)}")`, /unavailable|preview/.test(foot));
  }

  // 3) wallet UI
  const connectBtns = document.querySelectorAll('[data-wallet-slot] [data-connect]');
  check(`connect-wallet buttons rendered (2, got ${connectBtns.length})`, connectBtns.length === 2);

  if (mode === "live") {
    window.LidexWallet = {
      provider: "appkit",
      open: () => {},
      disconnect: () =>
        document.dispatchEvent(
          new window.CustomEvent("lidex-account", {
            detail: { address: null, verified: false, chainId: null },
          })
        ),
    };
    document.dispatchEvent(
      new window.CustomEvent("lidex-account", {
        detail: {
          address: "0x1234567890abcdef1234567890abcdef12345678",
          verified: true,
          chainId: "0x1",
        },
      })
    );
    await sleep(300);
    const chips = document.querySelectorAll(".wallet-chip");
    check(`account chips rendered after connect (2, got ${chips.length})`, chips.length === 2);
    const chipText = chips[0]?.textContent || "";
    check(`chip shows short address (got "${chipText.replace(/\s+/g, " ").trim()}")`, chipText.includes("0x1234") && chipText.includes("5678"));
    check("chip head shows Ethereum", (document.querySelector(".wallet-menu .menu-head")?.textContent || "").includes("Ethereum"));
    let copied = null;
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText: async (t) => (copied = t) },
      configurable: true,
    });
    document.querySelector("[data-copy-address]")?.click();
    await sleep(200);
    check("copy-address works", copied === "0x1234567890abcdef1234567890abcdef12345678");
    document.querySelector("[data-disconnect]")?.click();
    await sleep(200);
    const after = document.querySelectorAll('[data-wallet-slot] [data-connect]');
    check(`disconnect restores connect buttons (2, got ${after.length})`, after.length === 2);
  }

  // 4) socials
  const xLink = document.querySelector('a[href="https://x.com/lidexOfficial"]');
  const tgLink = document.querySelector('a[href="https://t.me/lidexOfficial"]');
  check("X icon link in nav", !!document.querySelector(".nav .socials a[href='https://x.com/lidexOfficial']"));
  check("Telegram icon link in nav", !!document.querySelector(".nav .socials a[href='https://t.me/lidexOfficial']"));
  check("social icons in footer", !!xLink && !!tgLink && document.querySelectorAll("footer .socials a").length === 2);

  // 5) LDX token link (footer only; removed from header)
  check("no LDX link in header", !document.querySelector(".nav .brand-ldx"));
  const footLdx = document.querySelector(".foot-bottom a");
  check("footer 'Powered by' LDX link", !!footLdx && footLdx.getAttribute("href") === "https://token.lidex.tech" && /Lidex Token \(LDX\)/.test(footLdx.textContent));
  const footText = document.querySelector(".foot-bottom").textContent;
  check(`footer bottom clean (got "${footText.replace(/\s+/g, " ").trim()}")`, !/Built onchain/i.test(footText) && !/perp\.lidex\.tech/.test(footText));
  check("copyright kept", /© 2026 Lidex/.test(footText));

  console.log(`\n=== SMOKE TEST (${mode}) ===`);
  results.forEach((r) => console.log(r));
  if (errors.length) {
    console.log("\n--- runtime errors ---");
    errors.slice(0, 15).forEach((e) => console.log(e));
  } else {
    console.log("\n--- no runtime errors ---");
  }
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(`\n${failed === 0 && errors.length === 0 ? "ALL GREEN" : `${failed} FAILURES`}`);
  process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
