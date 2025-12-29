"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type EventLite = {
  id: string;
  title: string;
  slug?: string | null;
  startAt: string;
  locationName?: string | null;
  organizerName?: string | null;
  image?: string | null;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CategoriesClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const category = (sp.get("c") || "Category").toString();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventLite[]>([]);

  function close() {
    router.push("/");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // We query by category as a search term (safe even if no DB category field)
        const res = await fetch(`/api/events?category=${encodeURIComponent(category)}&take=12`, {
          cache: "no-store",
        });
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];

        const mapped: EventLite[] = arr.map((x: any) => ({
          id: String(x.id),
          title: String(x.title),
          slug: x.slug ?? null,
          startAt: new Date(x.startAt).toISOString(),
          locationName: x.locationName ?? null,
          organizerName: x.organizerName ?? x.organizer?.name ?? null,
          image: x.image ?? null,
        }));

        setEvents(mapped);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [category]);

  const title = useMemo(() => {
    return category.length > 24 ? category.slice(0, 24) + "…" : category;
  }, [category]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close categories modal"
        onClick={close}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative z-10 w-[min(980px,96vw)] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Category</div>
            <h1 className="mt-1 text-xl font-semibold text-white">{title}</h1>
            <p className="mt-1 text-sm text-zinc-400">Showing upcoming events matching “{category}”.</p>
          </div>

          <button
            onClick={close}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[260px] rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : events.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => {
                const href = e.slug ? `/public/events/${e.slug}` : "/public/events";
                const when = formatWhen(e.startAt);
                const img = e.image ?? "/images/rooftop001.png";

                return (
                  <Link
                    key={e.id}
                    href={href}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/7"
                  >
                    <div className="relative h-36 w-full">
                      <Image src={img} alt={e.title} fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    </div>
                    <div className="p-4">
                      <div className="text-base font-semibold line-clamp-2">{e.title}</div>
                      <div className="mt-2 text-sm text-zinc-400">
                        {when}
                        {e.locationName ? ` • ${e.locationName}` : ""}
                      </div>
                      {e.organizerName && (
                        <div className="mt-2 text-xs text-zinc-500">
                          By <span className="text-zinc-300">{e.organizerName}</span>
                        </div>
                      )}
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs text-zinc-100">
                        Open <span aria-hidden>→</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
              No events found for <span className="text-white font-semibold">{category}</span>.
              <div className="mt-4">
                <button
                  onClick={close}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Back to home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
