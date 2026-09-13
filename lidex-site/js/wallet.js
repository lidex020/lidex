/* ═══════════════════════════════════════════════════════════════
   LIDEX — wallet fallback
   ─────────────────────────────────────────────────────────────
   The official Reown AppKit template lives in js/appkit.js
   (a module loaded via import map in index.html) and sets
   window.LidexWallet when it's up.

   If that module can't run — offline preview, CDN blocked —
   this file takes over with the native injected provider
   (window.ethereum) so the Connect button never breaks.
   ═══════════════════════════════════════════════════════════════ */

const LS_KEY = "lidex_wallet";

const notify = (m) => window.lidexToast && window.lidexToast(m);
const emitAccount = (s) =>
  document.dispatchEvent(new CustomEvent("lidex-account", { detail: s }));

function short(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function initNative() {
  const eth = window.ethereum;

  if (!eth) {
    window.LidexWallet = {
      provider: "none",
      open: () =>
        notify("No Web3 wallet found. Install MetaMask, Phantom or Rabby."),
      disconnect: () =>
        emitAccount({ address: null, verified: false, chainId: null }),
    };
    return;
  }

  const state = { address: null, verified: false, chainId: null };
  const emit = () => emitAccount({ ...state });
  const getChain = async () => {
    try {
      state.chainId = String(
        await eth.request({ method: "eth_chainId" })
      ).toLowerCase();
    } catch (e) {
      /* ignore */
    }
  };

  window.LidexWallet = {
    provider: "native",
    open: async () => {
      try {
        const accounts = await eth.request({ method: "eth_requestAccounts" });
        if (!accounts || !accounts.length) return;
        state.address = accounts[0];
        state.verified = true;
        localStorage.setItem(LS_KEY, state.address);
        await getChain();
        emit();
        notify(`Wallet connected — ${short(state.address)}`);
      } catch (e) {
        notify(
          e && e.code === 4001
            ? "Connection request was rejected."
            : "Couldn't connect to your wallet."
        );
      }
    },
    disconnect: () => {
      state.address = null;
      state.verified = false;
      state.chainId = null;
      localStorage.removeItem(LS_KEY);
      emit();
      notify("Wallet disconnected.");
    },
  };

  eth.on &&
    eth.on("accountsChanged", (accounts) => {
      if (!accounts || !accounts.length) {
        state.address = null;
        state.verified = false;
        localStorage.removeItem(LS_KEY);
        emit();
        notify("Wallet disconnected.");
      } else {
        state.address = accounts[0];
        state.verified = true;
        localStorage.setItem(LS_KEY, state.address);
        getChain().then(emit);
      }
    });
  eth.on && eth.on("chainChanged", () => getChain().then(emit));

  /* remember last account; show as pending until reconnected */
  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    state.address = saved;
    state.verified = false;
    getChain().then(emit);
  }
}

/* Give AppKit a grace period to initialize; if it didn't, fall back. */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (window.LidexWallet) return; // AppKit is up
    console.info("[Lidex] AppKit not available — using native wallet fallback.");
    initNative();
  }, 4000);
});
