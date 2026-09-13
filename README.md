# Lidex — Product Hub

A Google-About-style hub for Lidex: one clean page listing every Lidex product
(with icons, taglines and links), a **live market view** (official TradingView
chart widget + CoinGecko 24h prices), and **Connect Wallet** (Reown AppKit)
as the login.

## Run it

It's a static site — no build step, no npm install.

```bash
cd lidex-site
python3 -m http.server 8080
# → open http://localhost:8080
```

> Connect-wallet needs **HTTPS** (or localhost). Live integrations (AppKit,
> TradingView widget, CoinGecko, fonts) need internet access; offline the
> page degrades gracefully with clear fallback messages.

## Add a new product (the easy part)

Everything is driven by **`js/products.js`** — a single data array.

1. Drop the product's square icon into `assets/` (512px+ recommended).
2. Add an object to `LIDEX_PRODUCTS`:

```js
{
  id: "swap",
  name: "Lidex Swap",
  tagline: "Swap any token, on any chain",
  description: "Best-price swaps across every major chain, built into your wallet.",
  icon: "assets/swap.png",
  url: "https://swap.lidex.tech",   // "#" while not live
  status: "live",                    // "live" or "soon"
},
```

3. Refresh — the card appears automatically. A full worked example is
   commented out inside `products.js`.

## Login = Connect Wallet (Reown AppKit — official template)

`js/appkit.js` is the **standard AppKit setup from the official Reown docs**
(docs.reown.com → AppKit → JavaScript → Installation), adapted for a
no-build static site via an import map in `index.html`:

```js
import { createAppKit } from "@reown/appkit";
import { mainnet, arbitrum, base, polygon, bsc } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

const projectId = "d7719d74fdd4d2ea309eb12d6eddb430"; // dashboard.reown.com
const networks = [mainnet, arbitrum, base, polygon, bsc];
const wagmiAdapter = new WagmiAdapter({ projectId, networks });
const metadata = { name: "Lidex", ..., url: location.origin, icons: [...] };
const modal = createAppKit({ adapters: [wagmiAdapter], networks, metadata, projectId });
```

- Wallet list: WalletConnect + 100+ wallets (MetaMask, Phantom, Rabby, Ledger, …)
- After connecting: account chip with generated avatar + shortened address,
  dropdown to **copy address**, see the **current chain**, or **disconnect**
- `metadata.url` uses `location.origin` so it always matches the deployed
  domain (Reown requires the origin to match)
- To use a different project ID or change networks, edit `js/appkit.js`
  (manage projects at https://dashboard.reown.com)

`js/wallet.js` is a safety net: if the AppKit module can't load
(offline preview / CDN blocked), it falls back to the native injected
browser wallet so the Connect button never breaks.

## Market view (unbranded candle chart + live prices)

`js/market.js` renders:

- **Chart** — one stage, two sources (source tabs are hidden in the UI;
  `MARKET.src` picks the default, currently `"cg"`):
  - **Candles** (default) — real OHLC candlesticks rendered with
    TradingView's Lightweight Charts library, powered by the CoinGecko
    **Demo API key** (`CG_API_KEY` at the top of `js/market.js`) via
    `/api/v3/coins/{id}/ohlc` (1H → 30m candles, 4H → 4h, 1D → daily),
    with 1H/4H/1D interval buttons and a 60s refresh. No third-party
    branding is shown.
  - **Widget** — the official TradingView Advanced Chart widget (kept in
    code, hidden by default). If it can't mount it silently falls back
    to the candle chart. Re-enable by setting `MARKET.src = "tv"` and
    removing `hidden` from `#chart-src` in `index.html`.
- **24h market list** — BTC, ETH, SOL, BNB, XRP, DOGE with live price and
  24h change from the **CoinGecko** API (with key), refreshing every 15s.
- Clicking a coin loads it on the active chart
  (TradingView e.g. `BINANCE:ETHUSDT`, CoinGecko e.g. `ethereum`).

> **API key note:** the key works on `https://api.coingecko.com` with the
> `x_cg_demo_api_key` parameter (verified). If you later upgrade to a
> CoinGecko Cloud *Pro* key, switch `CG_BASE` to
> `https://pro-api.coingecko.com` and the parameter to `x_cg_pro_api_key`.

Add a coin by extending `MARKET.coins` in `js/market.js`
(`cg` = CoinGecko id, `tv` = TradingView symbol).

## Social & token links

- X → https://x.com/lidexOfficial and Telegram → https://t.me/lidexOfficial,
  rendered as icon-only links in the nav and footer (`index.html`).
- **LDX (Lidex Token)** → https://token.lidex.tech, linked from the footer
  bottom bar ("Powered by Lidex Token (LDX)").

## Deploy

Any static host works: Vercel / Netlify / Cloudflare Pages / GitHub Pages.
Deploy the contents of this folder as-is, e.g. at `lidex.tech` or
`about.lidex.tech`.

## Files

```
lidex-site/
├── index.html        # page + import map for AppKit (official template)
├── css/style.css     # all styling (Lidex green theme)
├── js/products.js    # ← product registry (edit this to add products)
├── js/main.js        # product rendering + wallet chip UI
├── js/appkit.js      # Reown AppKit (official createAppKit template)
├── js/wallet.js      # native wallet fallback if AppKit can't load
├── js/market.js      # TradingView widget + CoinGecko live prices
└── assets/           # logo, favicon, product icons
```
