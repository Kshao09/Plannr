"use client";

import { useState } from "react";

export default function StaffCheckInClient({ slug, secret }: { slug: string; secret: string }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(null);
    const c = code.trim();
    if (!c) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/events/${slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, secret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? "Check-in failed");
        return;
      }
      const name = data?.rsvp?.user?.name ?? data?.rsvp?.user?.email ?? "Attendee";
      setMsg(data.already ? `Already checked in: ${name}` : `Checked in: ${name}`);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Attendee code"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
      >
        {busy ? "…" : "Check in"}
      </button>

      {msg ? <div className="mt-3 text-sm text-zinc-200">{msg}</div> : null}
    </div>
  );
}
