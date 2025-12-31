"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

export type EventLite = {
  id: string;
  title: string;
  slug: string;
  startAt: string; // ISO
  endAt?: string | null;
  locationName?: string | null;
  organizerName?: string | null;
  category?: string | null;
  image?: string | null;
  isSaved?: boolean;
};

function formatDatePill(iso: string) {
  const d = new Date(iso);
  const month = d.toLocaleString(undefined, { month: "short" });
  const day = d.getDate();
  return { month, day };
}

function formatMeta(iso: string, location?: string | null) {
  const d = new Date(iso);
  const weekday = d.toLocaleString(undefined, { weekday: "short" });
  const time = d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
  const loc = location ? ` • ${location}` : "";
  return `${weekday} • ${time}${loc}`;
}

function fallbackImage(category?: string | null) {
  if (!category) return "/images/img001_v0.png";
  if (category === "Food & Drink") return "/images/img002_v0.png";
  if (category === "Tech") return "/images/img001_v0.png";
  if (category === "Music") return "/images/img001_v0.png";
  if (category === "Outdoors") return "/images/img003_v3.png";
  return "/images/img003_v3.png";
}

export default function EventCard({
  e,
  showRemove = false, // ✅ NEW
}: {
  e: EventLite;
  showRemove?: boolean;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!e.isSaved);

  const { month, day } = useMemo(() => formatDatePill(e.startAt), [e.startAt]);
  const meta = useMemo(() => formatMeta(e.startAt, e.locationName ?? ""), [e.startAt, e.locationName]);
  const img = e.image ?? fallbackImage(e.category);

  async function onRSVP() {
    if (status !== "authenticated" || !session?.user) {
      router.push("/login");
      return;
    }
    router.push(`/public/events/${e.slug}`);
  }

  async function onToggleSave() {
    if (status !== "authenticated" || !session?.user) {
      router.push("/login");
      return;
    }

    if (saving) return;
    setSaving(true);

    const prev = saved;
    setSaved(!prev);

    try {
      const res = await fetch("/api/saved/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: e.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? res.statusText);
      }

      const data = await res.json();
      const nowSaved = !!data.saved;
      setSaved(nowSaved);

      // ✅ if we're on the Saved page and user removed it, refresh list
      if (showRemove && prev === true && nowSaved === false) {
        router.refresh();
      }
    } catch {
      setSaved(prev);
    } finally {
      setSaving(false);
    }
  }

  // ✅ Remove button uses same toggle endpoint, but only acts when currently saved
  async function onRemove() {
    if (!saved) return;
    await onToggleSave();
  }

  return (
    <div className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/7">
      <Link href={`/public/events/${e.slug}`} className="block">
        <div className="relative h-44 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt={e.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="absolute left-3 top-3 rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-center backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-200">{month}</div>
            <div className="text-lg font-bold leading-none">{day}</div>
          </div>

          {e.category && (
            <div className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              {e.category}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">{e.title}</div>
              <div className="mt-1 text-sm text-zinc-400">{meta}</div>
              {e.organizerName && (
                <div className="mt-2 text-xs text-zinc-500">
                  By <span className="text-zinc-300">{e.organizerName}</span>
                </div>
              )}
            </div>

            <div className="shrink-0">
              <div className="rounded-full bg-emerald-500/12 px-2 py-1 text-xs text-emerald-200 border border-emerald-400/20">
                Open
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <div className="text-xs text-zinc-500">One-click RSVP</div>

        <div className="flex items-center gap-2">
          {showRemove ? (
            <button
              onClick={onRemove}
              disabled={saving || !saved}
              className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-60"
              title="Remove from saved"
            >
              Remove
            </button>
          ) : (
            <button
              onClick={onToggleSave}
              disabled={saving}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition
                ${
                  saved
                    ? "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                    : "border-white/15 bg-black/40 text-white hover:bg-black/60 hover:border-white/25"
                }`}
            >
              {saved ? "Saved ★" : "Save ☆"}
            </button>
          )}

          <button
            onClick={onRSVP}
            className="rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/60 hover:border-white/25"
          >
            RSVP →
          </button>
        </div>
      </div>
    </div>
  );
}
