"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ToastProvider";

const QrImage = dynamic(() => import("@/components/QrImage"), { ssr: false });

function getClientOrigin() {
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (env) {
    const withProto = /^https?:\/\//i.test(env) ? env : `https://${env}`;
    try {
      const u = new URL(withProto);
      return `${u.protocol}//${u.host}`; // ✅ origin only (no /app path)
    } catch {
      // fall through
    }
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export default function CheckInClient({
  event,
  shareUrl,
  staffUrl,
}: {
  event: any;
  shareUrl?: string;
  staffUrl?: string;
}) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const base = getClientOrigin();

  const resolvedShareUrl = useMemo(() => {
    if (shareUrl) return shareUrl;
    return new URL(`/public/events/${event.slug}`, base).toString();
  }, [shareUrl, event.slug, base]);

  const resolvedStaffUrl = useMemo(() => {
    if (staffUrl) return staffUrl;
    return new URL(
      `/checkin/${event.slug}?secret=${encodeURIComponent(event.checkInSecret ?? "")}`,
      base
    ).toString();
  }, [staffUrl, event.slug, event.checkInSecret, base]);

  const rsvps = Array.isArray(event?.rsvps) ? event.rsvps : [];
  const confirmed = rsvps.filter((r: any) => r.attendanceState === "CONFIRMED");
  const waitlisted = rsvps.filter((r: any) => r.attendanceState === "WAITLISTED");

  async function onCheckIn() {
    const c = code.trim();
    if (!c) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(event.slug)}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Check-in failed");
        return;
      }

      const name = data?.rsvp?.user?.name ?? data?.rsvp?.user?.email ?? "Attendee";
      toast.success(data.already ? `Already checked in: ${name}` : `Checked in: ${name}`);
      setCode("");
      location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[1200px] rounded-2xl border border-white/10 bg-white/5 p-6">
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

        {/* Example QR usage (keep your existing layout) */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold text-white">Event page (share)</div>
            <div className="mt-2 break-all text-xs text-zinc-400">{resolvedShareUrl}</div>
            <div className="mt-3">
              <QrImage text={resolvedShareUrl} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold text-white">Staff check-in link</div>
            <div className="mt-2 break-all text-xs text-zinc-400">{resolvedStaffUrl}</div>
            <div className="mt-3">
              <QrImage text={resolvedStaffUrl} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-stretch gap-2">
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
            className="whitespace-nowrap rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black disabled:opacity-60"
          >
            {busy ? "…" : "Check in"}
          </button>
        </div>

        {/* your attendee lists stay the same */}
        {/* ... */}
      </div>
    </div>
  );
}
