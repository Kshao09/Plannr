"use client";

import { useEffect, useState } from "react";

type Status = "GOING" | "MAYBE" | "DECLINED";

export default function RsvpButtons({ eventId }: { eventId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);

  // Optional: fetch my current RSVP for this event (lightweight but per-card)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        // You can add a dedicated endpoint later for list optimization
        // For now, we don’t fetch. (Keeps it simple + fast.)
      } catch {}
      if (!ignore) {}
    })();
    return () => {
      ignore = true;
    };
  }, [eventId]);

  async function setRsvp(next: Status) {
    setSaving(true);
    try {
      const res = await fetch("/api/rsvps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, status: next }),
      });

      if (!res.ok) {
        // could toast later
        setSaving(false);
        return;
      }

      setStatus(next);
    } finally {
      setSaving(false);
    }
  }

  const base =
    "rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60";
  const on = "border-white/20 bg-white/15 text-white";
  const off = "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10";

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        disabled={saving}
        onClick={() => setRsvp("GOING")}
        className={`${base} ${status === "GOING" ? on : off}`}
      >
        Going
      </button>
      <button
        disabled={saving}
        onClick={() => setRsvp("MAYBE")}
        className={`${base} ${status === "MAYBE" ? on : off}`}
      >
        Maybe
      </button>
      <button
        disabled={saving}
        onClick={() => setRsvp("DECLINED")}
        className={`${base} ${status === "DECLINED" ? on : off}`}
      >
        Declined
      </button>
    </div>
  );
}
