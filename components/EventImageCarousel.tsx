"use client";

import { useEffect, useMemo, useState } from "react";

export default function EventImageCarousel({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const clean = useMemo(() => (Array.isArray(images) ? images.filter(Boolean) : []), [images]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const count = clean.length;
  if (count === 0) return null;

  function prev() {
    setIndex((i) => (i - 1 + count) % count);
  }
  function next() {
    setIndex((i) => (i + 1) % count);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open && count > 1) {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }
      if (open) {
        if (e.key === "Escape") setOpen(false);
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, count]);

  const src = clean[index];

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">Photos</div>
        {count > 1 ? (
          <div className="text-xs text-zinc-600">
            {index + 1} / {count}
          </div>
        ) : null}
      </div>

      {/* Main carousel (smaller) */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full"
          aria-label="Open image"
        >
          {/* smaller height */}
          <div className="relative h-[220px] w-full md:h-[280px] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${title} photo ${index + 1}`}
              className="h-full w-full object-contain"
            />
          </div>
        </button>

        {/* Arrows */}
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-zinc-200 bg-white/90 px-3 py-2 text-zinc-900 shadow hover:bg-white"
            >
              ←
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-zinc-200 bg-white/90 px-3 py-2 text-zinc-900 shadow hover:bg-white"
            >
              →
            </button>
          </>
        ) : null}
      </div>

      {/* Thumbnails (small) */}
      {count > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {clean.map((s, i) => (
            <button
              key={`${s}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={[
                "h-14 w-20 shrink-0 overflow-hidden rounded-xl border bg-white",
                i === index ? "border-amber-400 ring-2 ring-amber-200" : "border-zinc-200",
              ].join(" ")}
              aria-label={`Go to image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s} alt={`${title} thumb ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {/* Lightbox */}
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <div className="relative z-[101] w-[min(1100px,95vw)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm text-zinc-200">
                {index + 1} / {count}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                Close ✕
              </button>
            </div>

            <div className="relative h-[70vh] w-full bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={clean[index]} alt={`${title} large ${index + 1}`} className="h-full w-full object-contain" />
            </div>

            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white hover:bg-white/15"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white hover:bg-white/15"
                >
                  →
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
