"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type EventLite = {
  id: string;
  title: string;
  slug?: string | null;
  startAt: string; // ISO or ISO w/ offset
  locationName?: string | null;
  organizerName?: string | null;
  image?: string | null;
};

const TZ = "America/New_York";

// ✅ Deterministic fallback dates (NO Date.now)
const FALLBACK: EventLite[] = [
  {
    id: "f1",
    title: "AI Club Meetup",
    slug: null,
    startAt: "2025-12-29T15:24:00-05:00",
    locationName: "FIU Engineering Center",
    organizerName: "Plannr Picks",
    image: "/images/ai001.png",
  },
  {
    id: "f2",
    title: "Food Truck Festival",
    slug: null,
    startAt: "2025-12-30T15:24:00-05:00",
    locationName: "Wynwood Marketplace",
    organizerName: "Plannr Picks",
    image: "/images/food001.png",
  },
  {
    id: "f3",
    title: "Rock Concert",
    slug: null,
    startAt: "2025-12-31T15:24:00-05:00",
    locationName: "Hollow Park",
    organizerName: "Plannr Picks",
    image: "/images/rockConcert001.png",
  },
  {
    id: "f4",
    title: "Chess Club @ Library",
    slug: null,
    startAt: "2026-01-01T15:24:00-05:00",
    locationName: "Downtown Library",
    organizerName: "Plannr Picks",
    image: "/images/chess001.png",
  },
];

const fmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TZ,
});

function formatWhen(iso: string) {
  return fmt.format(new Date(iso));
}

function padToFour(primary: EventLite[]) {
  const out: EventLite[] = [];
  const seen = new Set<string>();

  for (const e of primary) {
    if (!e?.id) continue;
    if (!seen.has(e.id)) {
      out.push(e);
      seen.add(e.id);
    }
    if (out.length >= 4) return out;
  }

  for (const e of FALLBACK) {
    if (!seen.has(e.id)) {
      out.push(e);
      seen.add(e.id);
    }
    if (out.length >= 4) return out;
  }

  return out;
}

export default function LandingRecommended({ fallbackCity = "Miami" }: { fallbackCity?: string }) {
  const [city, setCity] = useState(fallbackCity);
  const [input, setInput] = useState(fallbackCity);
  const [loading, setLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "ok" | "denied" | "error">("idle");

  // prove 4 cards always exist, even before fetch
  const [events, setEvents] = useState<EventLite[]>(padToFour([]));

  async function load(nextCity: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?city=${encodeURIComponent(nextCity)}&take=12`, {
        cache: "no-store",
      });
      const data = await res.json();

      const mapped: EventLite[] = (Array.isArray(data) ? data : []).map((x: any) => ({
        id: x.id,
        title: x.title,
        slug: x.slug,
        startAt: new Date(x.startAt).toISOString(),
        locationName: x.locationName ?? null,
        organizerName: x.organizerName ?? null,
        image: x.image ?? null,
      }));

      setEvents(padToFour(mapped));
    } catch {
      setEvents(padToFour([]));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          const r = await fetch(`/api/geo/reverse?lat=${lat}&lon=${lon}`, { cache: "no-store" });
          const data = await r.json();

          const nextCity = (data?.city || fallbackCity).trim() || fallbackCity;
          setCity(nextCity);
          setInput(nextCity);
          setGeoStatus("ok");
        } catch {
          setGeoStatus("error");
          setLoading(false);
        }
      },
      () => {
        setGeoStatus("denied");
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }

  const helperText = useMemo(() => {
    if (geoStatus === "denied") return "Location permission denied — search manually or use the fallback city.";
    if (geoStatus === "error") return "Couldn’t detect location — search manually or use the fallback city.";
    if (geoStatus === "ok") return "Using your detected location.";
    return "Use your location or search a city for better recommendations.";
  }, [geoStatus]);

  return (
    <section className="mt-14">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Recommended in{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
              {city}
            </span>
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{helperText}</p>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search city (e.g., Miami)"
            className="w-full md:w-[260px] rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
          />

          <button
            onClick={() => setCity(input.trim() || fallbackCity)}
            className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/60 hover:border-white/25"
            disabled={loading}
          >
            Search
          </button>

          <button
            onClick={useMyLocation}
            className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/60 hover:border-white/25"
            disabled={loading}
          >
            {loading ? "Detecting..." : "Use my location"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {events.slice(0, 4).map((e) => {
          const href = e.slug ? `/public/events/${e.slug}` : "/login";
          const when = formatWhen(e.startAt);
          const img = e.image ?? "/images/ai001.png";

          return (
            <Link
              key={e.id}
              href={href}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/7"
            >
              <div className="relative h-40 w-full">
                <Image
                  src={img}
                  alt={e.title}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              </div>

              <div className="p-4">
                <div className="text-base font-semibold line-clamp-2">{e.title}</div>

                {/* Extra safety: suppress hydration warning just for this line */}
                <div className="mt-2 text-sm text-zinc-400" suppressHydrationWarning>
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
    </section>
  );
}
