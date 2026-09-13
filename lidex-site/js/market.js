/* ═══════════════════════════════════════════════════════════════
   LIDEX MARKET
   ─────────────────────────────────────────────────────────────
   Chart — two sources, one stage:
     • TradingView  → official Advanced Chart widget (default)
     • CoinGecko    → real OHLC candles rendered with TradingView
                      Lightweight Charts, powered by the CoinGecko
                      Demo API key below (this "unlocks" the chart
                      anywhere the TradingView CDN can't load)
   If the TradingView widget doesn't mount within 6 seconds the
   page automatically switches to the CoinGecko chart.

   Prices — CoinGecko public API (with key), refreshed every 15s.
   Clicking a coin in the 24h list loads it on the active chart.
   ═══════════════════════════════════════════════════════════════ */

/* CoinGecko Demo API key — https://www.coingecko.com/en/developers */
const CG_API_KEY = "CG-A7tV3GYWoXTGts1Gd3BNmu3E";
const CG_BASE = "https://api.coingecko.com/api/v3";
const CG_KEY_PARAM = `x_cg_demo_api_key=${CG_API_KEY}`;

/* CoinGecko OHLC granularity is fixed per day count:
   days=1 → 30m candles, days=7 → 4h candles, days≥30 → daily */
const CG_DAYS = { "1h": 1, "4h": 7, "1d": 90 };

const MARKET = {
  coins: [
    { symbol: "BTCUSDT",  base: "BTC",  name: "Bitcoin",  color: "#f7931a", cg: "bitcoin",     tv: "BINANCE:BTCUSDT" },
    { symbol: "ETHUSDT",  base: "ETH",  name: "Ethereum", color: "#627eea", cg: "ethereum",    tv: "BINANCE:ETHUSDT" },
    { symbol: "SOLUSDT",  base: "SOL",  name: "Solana",   color: "#9945ff", cg: "solana",      tv: "BINANCE:SOLUSDT" },
    { symbol: "BNBUSDT",  base: "BNB",  name: "BNB",      color: "#f3ba2f", cg: "binancecoin", tv: "BINANCE:BNBUSDT" },
    { symbol: "XRPUSDT",  base: "XRP",  name: "XRP",      color: "#5a6472", cg: "ripple",      tv: "BINANCE:XRPUSDT" },
    { symbol: "DOGEUSDT", base: "DOGE", name: "Dogecoin", color: "#c2a633", cg: "dogecoin",    tv: "BINANCE:DOGEUSDT" },
  ],
  current: "BTCUSDT",
  src: "cg",          // active chart source: "tv" | "cg" (unbranded candles by default)
  interval: "1h",
  cgChart: null,
  cgSeries: null,
  prices: {},
};

const $ = (s) => document.querySelector(s);
const coin = (sym) => MARKET.coins.find((c) => c.symbol === sym);

function fmtPrice(v) {
  if (v == null || isNaN(v)) return "—";
  if (v >= 1000)
    return v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function setBadge(text, live) {
  const b = $("#feed-badge");
  if (!b) return;
  b.textContent = text;
  b.classList.toggle("live", !!live);
}

/* ─────────────── Chart source switching ─────────────── */
function setChartSrc(src, reason) {
  MARKET.src = src;
  const isTv = src === "tv";

  document
    .querySelectorAll("#chart-src button")
    .forEach((b) => b.classList.toggle("active", b.dataset.src === src));
  $("#tv-widget").classList.toggle("hidden", !isTv);
  $("#cg-chart").classList.toggle("hidden", isTv);
  $("#mkt-intervals").classList.toggle("hidden", isTv);
  $("#feed-badge").classList.toggle("hidden", isTv);

  if (isTv) {
    mountWidget(coin(MARKET.current).tv);
  } else {
    ensureCgChart();
    loadCgCandles();
  }
}

/* ─────────────── TradingView Advanced Chart widget ─────────────── */
/* Official embed: https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/ */
function mountWidget(tvSymbol) {
  const holder = $("#tv-widget");
  if (!holder) return;
  holder.innerHTML = "";
  clearTimeout(holder._tvTimer);

  const container = document.createElement("div");
  container.className = "tradingview-widget-container";
  container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  script.src =
    "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  script.text = JSON.stringify(
    {
      autosize: true,
      symbol: tvSymbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "light",
      backgroundColor: "rgba(255, 255, 255, 1)",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      hide_side_toolbar: true,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    },
    null,
    2
  );

  container.appendChild(script);
  holder.appendChild(container);

  /* If the widget can't mount (blocked CDN / offline), switch to the
     candle chart instead of showing a dead box. */
  holder._tvTimer = setTimeout(() => {
    if (!holder.querySelector("iframe") && MARKET.src === "tv") {
      setChartSrc("cg");
    }
  }, 6000);
}

/* ─────────────── CoinGecko candle chart (Lightweight Charts) ─────────────── */
function ensureCgChart() {
  if (MARKET.cgSeries || !window.LightweightCharts) return MARKET.cgSeries;
  const el = $("#cg-chart");
  try {
    const chart = LightweightCharts.createChart(el, {
      autoSize: true,
      layout: {
        background: { type: "solid", color: "transparent" },
        textColor: "#5f6368",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#eef1ee" },
        horzLines: { color: "#eef1ee" },
      },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#e3e8e5" },
      rightPriceScale: { borderColor: "#e3e8e5" },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    });

    const opts = {
      upColor: "#0d9455",
      downColor: "#e5484d",
      borderUpColor: "#0d9455",
      borderDownColor: "#e5484d",
      wickUpColor: "#0d9455",
      wickDownColor: "#e5484d",
    };

    /* works with v4 (addCandlestickSeries) and v5 (addSeries) */
    const series =
      typeof chart.addCandlestickSeries === "function"
        ? chart.addCandlestickSeries(opts)
        : chart.addSeries(LightweightCharts.CandlestickSeries, opts);

    MARKET.cgChart = chart;
    MARKET.cgSeries = series;
    return series;
  } catch (e) {
    console.warn("[Lidex] chart init failed:", e && e.message);
    el.innerHTML =
      '<p class="chart-fallback">The chart could not start in this browser.</p>';
    return null;
  }
}

/* Clearly-labeled sample candles as a last resort */
function syntheticCandles(sym) {
  const c = coin(sym);
  const step = { "1h": 3600, "4h": 14400, "1d": 86400 }[MARKET.interval];
  const now = Math.floor(Date.now() / 1000 / 60) * 60;
  let p =
    (MARKET.prices[sym] ? MARKET.prices[sym].price : c.sample) *
    (0.96 + Math.random() * 0.05);
  const out = [];
  for (let i = 179; i >= 0; i--) {
    const vol = p * (0.004 + Math.random() * 0.006);
    const o = p;
    const close = o + (Math.random() - 0.495) * 2 * vol;
    const high = Math.max(o, close) + Math.random() * vol;
    const low = Math.min(o, close) - Math.random() * vol;
    out.push({ time: now - i * step, open: o, high, low, close });
    p = close;
  }
  return out;
}

async function loadCgCandles() {
  if (MARKET.src !== "cg") return;
  const meta = coin(MARKET.current);
  try {
    const r = await fetch(
      `${CG_BASE}/coins/${meta.cg}/ohlc?vs_currency=usd&days=${CG_DAYS[MARKET.interval]}&${CG_KEY_PARAM}`
    );
    if (!r.ok) throw new Error("coingecko");
    const k = await r.json();
    if (!Array.isArray(k) || k.length < 2) throw new Error("empty");
    ensureCgChart();
    if (!MARKET.cgSeries) return;
    MARKET.cgSeries.setData(
      k.map((c) => ({
        time: Math.floor(c[0] / 1000),
        open: +c[1],
        high: +c[2],
        low: +c[3],
        close: +c[4],
      }))
    );
    MARKET.cgChart.timeScale().fitContent();
    setBadge("Live", true);
  } catch (e) {
    ensureCgChart();
    if (MARKET.cgSeries) {
      MARKET.cgSeries.setData(syntheticCandles(MARKET.current));
      MARKET.cgChart.timeScale().fitContent();
    }
    setBadge("Sample data");
  }
}

/* ─────────────── CoinGecko live prices (24h) ─────────────── */
async function loadPrices() {
  try {
    const ids = MARKET.coins.map((c) => c.cg).join(",");
    const r = await fetch(
      `${CG_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&${CG_KEY_PARAM}`
    );
    if (!r.ok) throw new Error("coingecko");
    const t = await r.json();
    const m = {};
    MARKET.coins.forEach((c) => {
      if (t[c.cg])
        m[c.symbol] = {
          price: t[c.cg].usd,
          change: t[c.cg].usd_24h_change || 0,
        };
    });
    if (!Object.keys(m).length) throw new Error("empty");
    MARKET.prices = m;
    setPricesFoot(`Market prices · updated ${new Date().toLocaleTimeString()}`);
  } catch (e) {
    setPricesFoot(
      Object.keys(MARKET.prices).length
        ? "Live feed temporarily unavailable — showing last known prices."
        : "Live feed unavailable in this preview — prices show in a regular browser."
    );
  }
  renderRows();
}

function setPricesFoot(text) {
  const f = $("#mkt-foot");
  if (f) f.textContent = text;
}

function renderRows() {
  const box = $("#mkt-rows");
  if (!box) return;
  box.innerHTML = MARKET.coins
    .map((c) => {
      const p = MARKET.prices[c.symbol];
      const chg = p ? p.change : null;
      const cls = chg == null ? "" : chg >= 0 ? "up" : "down";
      const txt = chg == null ? "…" : `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`;
      return `
        <button class="mkt-row ${c.symbol === MARKET.current ? "active" : ""}" data-symbol="${c.symbol}">
          <span class="mkt-ico" style="background:${c.color}">${c.base}</span>
          <span class="mkt-name">${c.name}<small>${c.base}/USDT</small></span>
          <span class="mkt-price">${p ? "$" + fmtPrice(p.price) : "—"}</span>
          <span class="mkt-chg ${cls}">${txt}</span>
        </button>`;
    })
    .join("");
}

/* ─────────────── Controls ─────────────── */
document.addEventListener("click", (e) => {
  /* chart source tabs */
  const srcBtn = e.target.closest("#chart-src [data-src]");
  if (srcBtn) {
    setChartSrc(srcBtn.dataset.src);
    return;
  }
  /* candle interval (CoinGecko chart) */
  const iv = e.target.closest("#mkt-intervals [data-interval]");
  if (iv) {
    MARKET.interval = iv.dataset.interval;
    document
      .querySelectorAll("#mkt-intervals button")
      .forEach((b) => b.classList.toggle("active", b === iv));
    loadCgCandles();
    return;
  }
  /* coin rows → load on the active chart */
  const row = e.target.closest(".mkt-row");
  if (row) {
    MARKET.current = row.dataset.symbol;
    renderRows();
    const c = coin(MARKET.current);
    if (MARKET.src === "tv") mountWidget(c.tv);
    else loadCgCandles();
  }
});

/* ─────────────── Boot ─────────────── */
document.addEventListener("DOMContentLoaded", () => {
  /* default: unbranded candle chart (silent fallback from the widget
     if it is ever re-enabled and can't load) */
  setChartSrc("cg");
  renderRows();
  loadPrices();
  setInterval(loadPrices, 15000); // live price refresh
  setInterval(loadCgCandles, 60000); // candle refresh (active tab only)
});
