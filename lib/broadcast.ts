// lib/broadcast.ts
export type RsvpBroadcast = {
  type: "rsvp:update";
  slug: string;
  status: "GOING" | "MAYBE" | "DECLINED" | null;
  attendanceState: "CONFIRMED" | "WAITLISTED" | null;
  sender: string;
  ts: number;
};

const KEY = "plannr:rsvp";
let _tabId: string | null = null;

export function getTabId() {
  if (_tabId) return _tabId;
  _tabId =
    (typeof crypto !== "undefined" && "randomUUID" in crypto && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return _tabId;
}

export function broadcastRsvpUpdate(msg: Omit<RsvpBroadcast, "type" | "ts" | "sender">) {
  const payload: RsvpBroadcast = { type: "rsvp:update", ...msg, sender: getTabId(), ts: Date.now() };

  // Prefer BroadcastChannel
  if (typeof BroadcastChannel !== "undefined") {
    const ch = new BroadcastChannel(KEY);
    ch.postMessage(payload);
    ch.close();
    return;
  }

  // Fallback: localStorage event
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function subscribeRsvpUpdates(handler: (msg: RsvpBroadcast) => void) {
  if (typeof window === "undefined") return () => {};

  if (typeof BroadcastChannel !== "undefined") {
    const ch = new BroadcastChannel(KEY);
    const onMsg = (ev: MessageEvent) => handler(ev.data as RsvpBroadcast);
    ch.addEventListener("message", onMsg);
    return () => {
      ch.removeEventListener("message", onMsg);
      ch.close();
    };
  }

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== KEY || !ev.newValue) return;
    try {
      handler(JSON.parse(ev.newValue) as RsvpBroadcast);
    } catch {
      // ignore
    }
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
