"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export type EventCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  startAt: string; // ISO
  endAt: string; // ISO
  locationName: string;
  address: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function DetailInline({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 transition hover:bg-white/[0.08]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
        <div className="text-sm font-semibold text-zinc-200">{label}:</div>
        <div className="text-sm text-zinc-100 break-words">{value}</div>
      </div>
    </div>
  );
}

export default function EventList({ events }: { events: EventCard[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const selected = useMemo(
    () => events.find((e) => e.id === openId) ?? null,
    [events, openId]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  function onClose() {
    setOpenId(null);
  }

  return (
    <>
      {/* Title-only list */}
      <div className="mt-4 space-y-4">
        {events.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setOpenId(e.id)}
            className="group w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left
                       transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-zinc-50">{e.title}</div>
              <div className="text-sm text-zinc-400 transition group-hover:text-zinc-200">
                View →
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      <dialog
        ref={dialogRef}
        onClose={onClose}
        className="
          w-[min(96vw,64rem)]
          rounded-3xl border border-white/10
          bg-gradient-to-b from-zinc-950 via-zinc-950 to-black
          p-0 text-zinc-100
          shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_30px_120px_rgba(0,0,0,0.8)]
          backdrop:bg-black/70 backdrop:backdrop-blur-md
        "
      >
        {selected ? (
          <div className="relative">
            {/* glow */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl">
              <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
            </div>

            {/* content */}
            <div className="relative p-8">
              {/* header */}
              <div className="mb-6">
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  {selected.title}
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {selected.locationName}
                </p>
              </div>

              {/* details */}
              <div className="mt-2 space-y-4">
                {/* Description (full width) */}
                <DetailInline label="Description" value={selected.description} />

                {/* 2-column grid for the rest */}
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailInline
                    label="When"
                    value={
                      <>
                        {formatDateTime(selected.startAt)}{" "}
                        <span className="text-zinc-400">→</span>{" "}
                        {formatDateTime(selected.endAt)}
                      </>
                    }
                  />

                  <DetailInline label="Location" value={selected.locationName} />

                  {/* Address full width (usually long) */}
                  <div className="md:col-span-2">
                    <DetailInline label="Address" value={selected.address} />
                  </div>
                </div>
              </div>

              {/* actions */}
              <div className="mt-6 space-y-3">
                <Link
                  href={`/events/${selected.slug}`}
                  className="block w-full rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3
                             text-center text-sm font-semibold text-indigo-100
                             transition hover:bg-indigo-500/15 hover:border-indigo-400/30
                             focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                >
                  Open full page →
                </Link>

                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3
                             text-sm font-semibold text-zinc-100
                             transition hover:bg-white/[0.10]
                             focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
