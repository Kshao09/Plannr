"use client";

import { useMemo, useState } from "react";
import QrImage from "@/components/QrImage";
import { useToast } from "@/components/ToastProvider";

export default function CheckInClient({ event }: { event: any }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : process.env.APP_URL ?? "";
  const shareUrl = `${origin}/events/${event.slug}`;
  const staffUrl = `${origin}/checkin/${event.slug}?secret=${event.checkInSecret}`;

  const confirmed = event.rsvps.filter((r: any) => r.attendanceState === "CONFIRMED");
  const waitlisted = event.rsvps.filter((r: any) => r.attendanceState === "WAITLISTED");

  async function onCheckIn() {
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }), // organizer logged-in can check in
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Check-in failed");
        return;
      }
      const name = data?.rsvp?.user?.name ?? data?.rsvp?.user?.email ?? "Attendee";
      toast.success(data.already ? `Already checked in: ${name}` : `Checked in: ${name}`);
      setCode("");
      // easiest refresh: let your page do router.refresh() if you want real-time
      location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
          <div>
            Confirmed: <b className="text-white">{confirmed.length}</b>
            {event.capacity != null ? (
              <>
                {" "}
                / Capacity: <b className="text-white">{event.capacity}</b>
              </>
            ) : null}
          </div>
          {event.waitlistEnabled ? (
            <div>
              Waitlist: <b className="text-white">{waitlisted.length}</b>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Scan attendee QR → paste code here"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
          />
          <button
            type="button"
            onClick={onCheckIn}
            disabled={busy}
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {busy ? "…" : "Check in"}
          </button>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-white">Confirmed attendees</h3>
          <div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
            {confirmed.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm text-white">{r.user?.name ?? r.user?.email}</div>
                  <div className="text-xs text-zinc-400">{r.user?.email}</div>
                  <div className="mt-1 text-xs text-zinc-500">Code: {r.checkInCode}</div>
                </div>
                <div className="text-xs">
                  {r.checkedInAt ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                      Checked in
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
                      Not yet
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {event.waitlistEnabled ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-white">Waitlist</h3>
            <div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
              {waitlisted.map((r: any) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="text-sm text-white">{r.user?.name ?? r.user?.email}</div>
                  <div className="text-xs text-zinc-400">{r.user?.email}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white">Share QR</div>
          <div className="mt-3">
            <QrImage text={shareUrl} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white">Staff check-in link</div>
          <div className="mt-2 text-xs text-zinc-400">
            Send this link to volunteers (no login needed). They’ll use it to check people in.
          </div>
          <div className="mt-3">
            <QrImage text={staffUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
