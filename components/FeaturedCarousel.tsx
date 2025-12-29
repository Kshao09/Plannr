"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type CarouselEvent = {
  id: string;
  title: string;
  slug: string;
  startAt: Date | string;
  endAt?: Date | string | null;
  locationName?: string | null;
  organizerName?: string | null;
  image?: string; // "/images/xxx.png"
  badge?: string; // "Open" | "Featured" | etc
  category?: string | null;
};

function toDate(d: Date | string) {
  return d instanceof Date ? d : new Date(d);
}

function formatWhen(startAt: Date | string) {
  const d = toDate(startAt);
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

function badgeClass(badge?: string) {
  const b = (badge ?? "").toLowerCase();
  if (b.includes("feature"))
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  if (b.includes("open"))
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  return "border-white/15 bg-white/5 text-zinc-200";
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

    // scroll ~ one viewport width (nice feel)
    const amount = Math.round(el.clientWidth * 0.9);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  if (!events?.length) return null;

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-300/90">{subtitle}</p>
          ) : null}
        </div>

        <Link
          href={viewAllHref}
          className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/20 md:inline-flex"
        >
          View all <span aria-hidden>→</span>
        </Link>
      </div>

      {/* Carousel wrapper */}
      <div className="relative mt-6">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-black/60 via-black/20 to-transparent" />

        {/* Left arrow */}
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByDir(-1)}
          className={[
            "absolute left-2 top-1/2 z-20 -translate-y-1/2",
            "h-10 w-10 rounded-full border border-white/15 bg-black/45 backdrop-blur",
            "text-white transition hover:bg-black/65 hover:border-white/25",
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
            "h-10 w-10 rounded-full border border-white/15 bg-black/45 backdrop-blur",
            "text-white transition hover:bg-black/65 hover:border-white/25",
            "grid place-items-center",
            canRight ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
        >
          <span className="text-lg leading-none">›</span>
        </button>

        {/* Scroll row */}
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
            const img = e.image ?? "/images/rooftop001.png";
            const badge = e.badge ?? "Open";

            return (
              <Link
                key={e.id}
                href={`/public/events/${e.slug}`}
                className="group relative w-[min(420px,86vw)] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]
                         shadow-[0_30px_80px_rgba(0,0,0,0.45)] transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={img}
                    alt={e.title}
                    fill
                    sizes="(max-width: 768px) 86vw, 420px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    priority={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(
                        badge
                      )}`}
                    >
                      {badge}
                    </span>
                    {e.category ? (
                      <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-zinc-200">
                        {e.category}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 truncate text-base font-semibold text-white">
                      {e.title}
                    </h3>
                    <span className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      Open →
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-zinc-300/90">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-zinc-200">{when}</span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-300">{where}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">By {org}</div>
                  </div>

                  <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-fuchsia-300/70 via-indigo-300/50 to-cyan-300/60 opacity-80 transition group-hover:w-3/5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile “View all” */}
      <div className="mt-4 md:hidden">
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/20"
        >
          View all <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
