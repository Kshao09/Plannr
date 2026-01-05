"use client";

type AuthMsg = { type: "signout" | "signin"; ts: number };

const STORAGE_KEY = "plannr:auth";
const CHANNEL_KEY = "plannr:auth";

export function broadcastAuth(type: AuthMsg["type"]) {
  const msg: AuthMsg = { type, ts: Date.now() };

  // Prefer BroadcastChannel
  if (typeof BroadcastChannel !== "undefined") {
    const ch = new BroadcastChannel(CHANNEL_KEY);
    ch.postMessage(msg);
    ch.close();
  }

  // Fallback: localStorage event
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msg));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function subscribeAuth(handler: (msg: AuthMsg) => void) {
  // BroadcastChannel
  let ch: BroadcastChannel | null = null;

  if (typeof BroadcastChannel !== "undefined") {
    ch = new BroadcastChannel(CHANNEL_KEY);
    const onMsg = (ev: MessageEvent) => handler(ev.data as AuthMsg);
    ch.addEventListener("message", onMsg);
  }

  // localStorage
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
