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

  // localStorage fallback: DO NOT remove immediately (more reliable)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msg));
  } catch {
    // ignore
  }
}

export function subscribeAuth(handler: (msg: AuthMsg) => void) {
  // BroadcastChannel subscription
  let ch: BroadcastChannel | null = null;

  if (typeof BroadcastChannel !== "undefined") {
    ch = new BroadcastChannel(CHANNEL_KEY);
    const onMsg = (ev: MessageEvent) => {
      const msg = ev.data as AuthMsg;
      if (!msg || (msg.type !== "signout" && msg.type !== "signin")) return;
      handler(msg);
    };
    ch.addEventListener("message", onMsg);
  }

  // localStorage subscription
  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== STORAGE_KEY || !ev.newValue) return;
    try {
      const msg = JSON.parse(ev.newValue) as AuthMsg;
      if (!msg || (msg.type !== "signout" && msg.type !== "signin")) return;
      handler(msg);
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
