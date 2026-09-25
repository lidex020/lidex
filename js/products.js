/* ═══════════════════════════════════════════════════════════════
   LIDEX PRODUCT REGISTRY
   ─────────────────────────────────────────────────────────────
   EASY WAY TO ADD A PRODUCT:

   1. Drop the product's icon (square PNG, 512px+ recommended)
      into the /assets folder of this site.
   2. Copy one of the objects below and edit the fields:
        id         unique kebab-case identifier
        name       product name shown on the card
        tagline    one-liner under the name
        description short 1–2 sentence pitch
        icon       path to the icon image (e.g. "assets/swap.png")
        url        where the "Open app" link goes ("#" if not live)
        status     "live"  → appears under "Live now"
                   "soon"  → appears under "Coming soon"
   3. Done. The grid re-renders automatically — no other code
      to touch.

   ═══════════════════════════════════════════════════════════════ */

const LIDEX_PRODUCTS = [
  {
    id: "perps",
    name: "Lidex Perps",
    tagline: "Perpetual futures, without the middlemen",
    description:
      "Trade 24/7 with deep liquidity, low fees, and non-custodial control of your funds. Long or short crypto the way it should feel.",
    icon: "assets/perps.png",
    url: "https://perp.lidex.tech",
    status: "live",
  },
  {
    id: "wallet",
    name: "Lidex Wallet",
    tagline: "Your keys. Your assets. Your rules.",
    description:
      "A fast, secure self-custody wallet for the Web3 era. Store, send, swap, and manage every chain and token in one place.",
    icon: "assets/wallet.png",
    url: "https://wallet.lidex.tech",
    status: "live",
  },
  {
    id: "appstore",
    name: "Lidex App Store",
    tagline: "The app store for onchain life",
    description:
      "Discover and launch the best dApps, games, and tools in the Lidex ecosystem. One tap from wallet to experience.",
    icon: "assets/appstore.png",
    url: "https://appstore.lidex.tech",
    status: "live",
  },
  {
    id: "token",
    name: "Lidex Token (LDX)",
    tagline: "The utility layer of the Lidex ecosystem",
    description:
      "Power the ecosystem with governance, rewards, and access across trading, wallet, and app experiences.",
    icon: "assets/lidex_logo.png",
    url: "https://token.lidex.tech",
    status: "live",
  },

  /* ── Example: how to add a product still in development ─────────
     {
       id: "swap",
       name: "Lidex Swap",
       tagline: "Swap any token, on any chain",
       description:
         "Best-price swaps across every major chain, built directly into your Lidex wallet.",
       icon: "assets/swap.png",
       url: "#",
       status: "soon",
     },
     ──────────────────────────────────────────────────────────── */
];
