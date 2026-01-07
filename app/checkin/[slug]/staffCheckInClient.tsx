"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

export default function StaffCheckInClient({
  slug,
  secret,
  expectedSecret,
}: {
  slug: string;
  secret: string;
  expectedSecret: string;
}) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const secretOk = secret && secret === expectedSecret;

  async function submit() {
    if (!secretOk) {
      toast.error("Invalid or missing secret. Ask the organizer for the correct link.");
      return;
    }

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
        toast.error(data?.error ?? "Check-in failed");
        return;
      }
      const name = data?.rsvp?.user?.name ?? data?.rsvp?.user?.email ?? "Attendee";
      toast.success(data.already ? `Already checked in: ${name}` : `Checked in: ${name}`);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black bg-white/5 p-6">
      {!secretOk ? (
        <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-zinc-700">
          This check-in link is missing a valid secret. Ask the organizer for a fresh staff link.
        </div>
      ) : null}

      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Attendee code"
        className="w-full rounded-xl border border-black bg-black/30 px-4 py-3 text-black outline-none focus:border-black/20"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !secretOk}
        className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
      >
        {busy ? "…" : "Check in"}
      </button>
    </div>
  );
}
