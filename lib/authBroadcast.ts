"use client";

type AuthMsg = { type: "signout" | "signin"; ts: number };

const STORAGE_KEY = "plannr:auth";
const CHANNEL_KEY = "plannr:auth";

export function broadcastAuth(type: AuthMsg["type"]) {
  const msg: AuthMsg = { type, ts: Date.now() };

  // BroadcastChannel (best)
  if (typeof BroadcastChannel !== "undefined") {
    const ch = new BroadcastChannel(CHANNEL_KEY);
    ch.postMessage(msg);
    ch.close();
  }

  // localStorage fallback: don't remove immediately (more reliable)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msg));
  } catch {
    // ignore
  }
}

export function subscribeAuth(handler: (msg: AuthMsg) => void) {
  let ch: BroadcastChannel | null = null;

  if (typeof BroadcastChannel !== "undefined") {
    ch = new BroadcastChannel(CHANNEL_KEY);
    ch.addEventListener("message", (ev) => {
      const msg = ev.data as AuthMsg;
      if (!msg?.type) return;
      handler(msg);
    });
  }

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== STORAGE_KEY || !ev.newValue) return;
    try {
      handler(JSON.parse(ev.newValue) as AuthMsg);
    } catch {
      // ignore
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    if (ch) ch.close();
    window.removeEventListener("storage", onStorage);
  };
}
