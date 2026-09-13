/* ═══════════════════════════════════════════════════════════════
   LIDEX — Reown AppKit (official template)
   ─────────────────────────────────────────────────────────────
   This is the standard AppKit setup from the official Reown docs
   (docs.reown.com → AppKit → JavaScript → Installation), adapted
   for a no-build static site via an import map (see index.html).

   1. Get a project ID at https://dashboard.reown.com
   2. Set up the Wagmi adapter
   3. Configure the metadata
   4. Create the modal with createAppKit
   5. Open the modal programmatically from your UI

   The bottom half wires AppKit into the Lidex site (wallet chip,
   account events). js/wallet.js takes over with the native
   browser wallet if this module can't load (offline preview).
   ═══════════════════════════════════════════════════════════════ */

import { createAppKit } from "@reown/appkit";
import { mainnet, arbitrum, base, polygon, bsc } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

// 1. Project ID from https://dashboard.reown.com
const projectId = "d7719d74fdd4d2ea309eb12d6eddb430";

const networks = [mainnet, arbitrum, base, polygon, bsc];

// 2. Set up the Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

// 3. Configure the metadata
//    (url must match your deployed domain; location.origin keeps it
//     correct on every environment, including previews)
const metadata = {
  name: "Lidex",
  description: "The essential suite of Web3 products",
  url: location.origin,
  icons: [new URL("../assets/favicon.png", location.href).href],
};

// 4. Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  metadata,
  projectId,
  themeMode: "light",
  features: {
    analytics: false,
  },
});

/* ─────────────── Wire AppKit into the Lidex site ─────────────── */
const LS_KEY = "lidex_wallet";
const state = { address: null, verified: false, chainId: null };

const emitAccount = (s) =>
  document.dispatchEvent(new CustomEvent("lidex-account", { detail: s }));

/* Accepts: number (1), CAIP-2 ("eip155:1"), or hex ("0x1") → hex string */
function parseChainId(c) {
  if (c == null) return null;
  if (typeof c === "number") return "0x" + c.toString(16);
  const m = String(c).match(/eip155:(\d+)/i);
  if (m) return "0x" + Number(m[1]).toString(16);
  const s = String(c).toLowerCase();
  return /^0x[0-9a-f]+$/.test(s) ? s : null;
}

/* v1 emits a string address; newer builds may emit an object —
   handle both so a version bump never breaks the chip. */
const handleAccount = (res) => {
  const a =
    typeof res === "string"
      ? { address: res, chainId: null, isConnected: true }
      : res || {};
  state.address = a.address || null;
  state.verified = !!state.address;
  if (a.chainId != null) state.chainId = parseChainId(a.chainId);
  if (state.address) localStorage.setItem(LS_KEY, state.address);
  else localStorage.removeItem(LS_KEY);
  emitAccount({ ...state });
};

modal.subscribeAccount(handleAccount);

modal.subscribeChainId &&
  modal.subscribeChainId((cid) => {
    state.chainId = parseChainId(cid);
    if (state.address) emitAccount({ ...state });
  });

/* 5. Expose the modal to the site UI (js/main.js opens it on click) */
window.LidexWallet = {
  provider: "appkit",
  open: () => {
    try {
      modal.open();
    } catch (e) {
      console.warn("[Lidex] AppKit open failed:", e);
    }
  },
  disconnect: async () => {
    try {
      await modal.disconnect();
    } catch (e) {
      /* ignore — we clear local state below */
    }
    state.address = null;
    state.verified = false;
    localStorage.removeItem(LS_KEY);
    emitAccount({ ...state });
  },
};

/* Restore an existing session without prompting the user */
try {
  if (modal.is_connected()) {
    const snap = modal.getSnapshot ? modal.getSnapshot() : null;
    if (snap && snap.address) {
      handleAccount({
        address: snap.address,
        chainId: snap.chainId,
        isConnected: true,
      });
    }
  }
} catch (e) {
  /* snapshot is best-effort */
}

console.info("[Lidex] Reown AppKit ready");
