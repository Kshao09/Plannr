"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type CarouselEvent = {
  id: string;
  title: string;
  slug: string;
  startAt: Date | string;
  endAt?: Date | string | null;
  locationName?: string | null;
  organizerName?: string | null;
  image?: string; // compatibility only; not used
  badge?: string;
  category?: string | null;
};

function toDate(d: Date | string) {
  return d instanceof Date ? d : new Date(d);
}

function formatWhen(startAt: Date | string) {
  const d = toDate(startAt);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function monthDay(startAt: Date | string) {
  const d = toDate(startAt);
  const mo = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();
  return { mo, day };
}

function badgeClassLight(badge?: string) {
  const b = (badge ?? "").toLowerCase();
  if (b.includes("feature")) return "border-amber-200 bg-amber-50 text-amber-800";
  if (b.includes("open")) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function categoryAccentLight(cat?: string | null) {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("food")) return "from-amber-200/70 via-rose-200/40 to-transparent";
  if (c.includes("tech")) return "from-cyan-200/70 via-indigo-200/40 to-transparent";
  if (c.includes("music")) return "from-fuchsia-200/70 via-indigo-200/40 to-transparent";
  if (c.includes("sport")) return "from-emerald-200/70 via-cyan-200/40 to-transparent";
  if (c.includes("art")) return "from-indigo-200/70 via-fuchsia-200/40 to-transparent";
  return "from-zinc-200/70 via-zinc-100/40 to-transparent";
}

export default function FeaturedCarousel({
  title,
  subtitle,
  events,
  viewAllHref = "/public/events",
}: {
  title: string;
  subtitle?: string;
  events: CarouselEvent[];
  viewAllHref?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateArrows();

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.9);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  if (!events?.length) return null;

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
        </div>

        <Link
          href={viewAllHref}
          className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 hover:border-zinc-300 md:inline-flex"
        >
          View all <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="relative mt-6">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-white via-white/70 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-white via-white/70 to-transparent" />

        {/* Left arrow */}
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByDir(-1)}
          className={[
            "absolute left-2 top-1/2 z-20 -translate-y-1/2",
            "h-10 w-10 rounded-full border border-zinc-200 bg-white",
            "text-zinc-900 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300",
            "grid place-items-center",
            canLeft ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <span className="text-lg leading-none">‹</span>
        </button>

        {/* Right arrow */}
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByDir(1)}
          className={[
            "absolute right-2 top-1/2 z-20 -translate-y-1/2",
            "h-10 w-10 rounded-full border border-zinc-200 bg-white",
            "text-zinc-900 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300",
            "grid place-items-center",
            canRight ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <span className="text-lg leading-none">›</span>
        </button>

        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="flex gap-5 overflow-x-auto pb-2 pr-2 snap-x snap-mandatory
                   [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {events.map((e) => {
            const when = formatWhen(e.startAt);
            const where = e.locationName ?? "TBA";
            const org = e.organizerName ?? "Organizer";
            const badge = e.badge ?? "Open";
            const { mo, day } = monthDay(e.startAt);

            return (
              <Link
                key={e.id}
                href={`/public/events/${e.slug}`}
                className="group relative w-[min(420px,86vw)] shrink-0 snap-start overflow-hidden rounded-3xl border border-zinc-200 bg-white
                         shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition hover:-translate-y-[1px] hover:border-zinc-300 hover:shadow-[0_26px_70px_rgba(0,0,0,0.10)]"
              >
                {/* Accent wash */}
                <div className={`absolute inset-0 bg-gradient-to-br ${categoryAccentLight(e.category)} opacity-90`} />
                <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#000000_1px,transparent_1px)] [background-size:24px_24px]" />

                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClassLight(badge)}`}>
                        {badge}
                      </span>
                      {e.category ? (
                        <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700">
                          {e.category}
                        </span>
                      ) : null}
                    </div>

                    <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 transition group-hover:bg-zinc-50">
                      Details →
                    </span>
                  </div>

                  <div className="mt-5 flex gap-4">
                    {/* Date tile */}
                    <div className="shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                      <div className="px-3 py-2 text-center text-[10px] font-semibold tracking-wide text-zinc-700">
                        {mo}
                      </div>
                      <div className="px-3 pb-3 text-center text-3xl font-semibold leading-none text-zinc-900">
                        {day}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-zinc-900">{e.title}</h3>

                      <div className="mt-2 text-sm text-zinc-700">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-zinc-900">{when}</span>
                          <span className="text-zinc-400">•</span>
                          <span className="text-zinc-700">{where}</span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-600">Hosted by {org}</div>
                      </div>

                      {/* timeline bar */}
                      <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-zinc-200">
                        <div className="h-full w-2/5 rounded-full bg-zinc-900/70 transition group-hover:w-3/5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 md:hidden">
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 hover:border-zinc-300"
        >
          View all <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
