import Link from "next/link";
import MarketingNav from "@/components/MarketingNav";
import FeaturedCarousel, { CarouselEvent } from "@/components/FeaturedCarousel";
import LandingRecommended from "@/components/LandingRecommended";
import MarketingFooter from "@/components/MarketingFooter";
import LandingCalendarVisual from "@/components/LandingCalendarVisual";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function heroMetaLine(startAt: Date, locationName?: string | null) {
  const weekday = startAt.toLocaleDateString("en-US", { weekday: "short" });
  const date = startAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = startAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const place = locationName ?? "TBA";
  return `${weekday}, ${date} • ${time} • ${place}`;
}

const categories = [
  { label: "Music", accent: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800" },
  { label: "Food & Drink", accent: "border-amber-200 bg-amber-50 text-amber-900" },
  { label: "Tech", accent: "border-cyan-200 bg-cyan-50 text-cyan-900" },
  { label: "Sports", accent: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  { label: "Arts", accent: "border-indigo-200 bg-indigo-50 text-indigo-900" },
  { label: "Outdoors", accent: "border-sky-200 bg-sky-50 text-sky-900" },
];

export default async function HomePage() {
  const now = new Date();

  let featuredRaw: Array<{
    id: string;
    title: string;
    slug: string;
    startAt: Date;
    endAt: Date | null;
    locationName: string | null;
    organizer: { name: string | null } | null;
    category?: string | null;
  }> = [];

  let weekendRaw = featuredRaw;

  try {
    featuredRaw = await prisma.event.findMany({
      where: { startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      take: 12,
      select: {
        id: true,
        title: true,
        slug: true,
        startAt: true,
        endAt: true,
        locationName: true,
        category: true,
        organizer: { select: { name: true } },
      },
    });

    const day = now.getDay(); // 0 Sun ... 6 Sat
    const daysUntilSat = (6 - day + 7) % 7;

    const sat = new Date(now);
    sat.setDate(now.getDate() + daysUntilSat);
    sat.setHours(0, 0, 0, 0);

    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    sun.setHours(23, 59, 59, 999);

    weekendRaw = await prisma.event.findMany({
      where: { startAt: { gte: sat, lte: sun } },
      orderBy: { startAt: "asc" },
      take: 12,
      select: {
        id: true,
        title: true,
        slug: true,
        startAt: true,
        endAt: true,
        locationName: true,
        category: true,
        organizer: { select: { name: true } },
      },
    });
  } catch (err) {
    console.error("[HomePage] prisma failed (fallback content):", err);
  }

  const toLite = (e: (typeof featuredRaw)[number]): CarouselEvent => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    startAt: e.startAt,
    endAt: e.endAt,
    locationName: e.locationName,
    organizerName: e.organizer?.name ?? "Organizer",
    category: e.category ?? null,
    badge: "Open",
  });

  const featured: CarouselEvent[] = featuredRaw.map(toLite);
  const weekend: CarouselEvent[] = weekendRaw.map(toLite);

  const fallback: CarouselEvent[] = [
    {
      id: "f1",
      title: "Campus Meetup + Planning Sprint",
      slug: "campus-meetup-planning-sprint",
      startAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      locationName: "Miami",
      organizerName: "Plannr",
      category: "Tech",
      badge: "Open",
    },
    {
      id: "f2",
      title: "Food Truck Festival",
      slug: "food-truck-festival",
      startAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      locationName: "Wynwood",
      organizerName: "Plannr",
      category: "Food & Drink",
      badge: "Featured",
    },
    {
      id: "f3",
      title: "Sunset Walk + Outdoors Social",
      slug: "sunset-walk-outdoors-social",
      startAt: new Date(Date.now() + 1000 * 60 * 60 * 72),
      locationName: "South Beach",
      organizerName: "Plannr",
      category: "Outdoors",
      badge: "Open",
    },
  ];

  const heroList = (featured.length ? featured : fallback).slice(0, 3);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white text-zinc-900">
      <MarketingNav />

      {/* Light ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 top-[-140px] h-[520px] w-[620px] rounded-full bg-fuchsia-200/45 blur-[120px]" />
        <div className="absolute right-[-260px] top-[60px] h-[560px] w-[720px] rounded-full bg-cyan-200/45 blur-[130px]" />
        <div className="absolute left-[18%] top-[640px] h-[560px] w-[720px] rounded-full bg-amber-200/35 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#000000_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <main className="relative mx-auto w-full max-w-7xl px-6 pb-28 pt-14 md:px-10 lg:px-12">
        <section className="pt-6 md:pt-10">
          <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-16">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Schedule-first event planning
              </div>

              <h1 className="mt-8 text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                Find events that
                <span className="mt-3 block bg-gradient-to-r from-fuchsia-700 via-indigo-700 to-cyan-700 bg-clip-text text-transparent">
                  fit your calendar.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-700">
                Plannr is built around time blocks: discover by schedule, publish in minutes, and RSVP without conflicts.
              </p>

              {/* Search */}
              <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] md:p-6">
                <form className="grid gap-3 md:grid-cols-7" action="/public/events" method="GET">
                  <div className="md:col-span-3">
                    <label className="mb-2 block text-xs font-medium text-zinc-600">What</label>
                    <input
                      name="q"
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
                      placeholder="Try: chess, hackathon, live music..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-medium text-zinc-600">Where</label>
                    <input
                      name="city"
                      defaultValue="Miami"
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
                      placeholder="Miami"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="mb-2 block text-xs font-medium text-zinc-600">When</label>
                    <input
                      name="date"
                      type="date"
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="mb-2 block text-xs font-medium text-zinc-600">Go</label>
                    <button
                      type="submit"
                      className="flex h-[46px] w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-300"
                    >
                      Search
                    </button>
                  </div>
                </form>

                <div className="mt-5 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <Link
                      key={c.label}
                      href={`/public/events?category=${encodeURIComponent(c.label)}`}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition hover:bg-zinc-50 ${c.accent}`}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  href="/public/events"
                  className="rounded-2xl border border-zinc-200 bg-white px-6 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-50 hover:border-zinc-300"
                >
                  Browse schedule →
                </Link>

                <Link
                  href="/login"
                  className="rounded-2xl border border-zinc-200 bg-white px-6 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-50 hover:border-zinc-300"
                >
                  Create an event
                </Link>

                <Link href="/how-it-works" className="rounded-2xl border border-zinc-200 bg-white px-6 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-50 hover:border-zinc-300">
                  How it works
                </Link>
              </div>
            </div>

            {/* Right */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] md:p-7">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Your week at a glance</div>
                  <div className="mt-1 text-xs text-zinc-500">Hover to zoom • Move mouse to tilt</div>
                </div>
                <div className="text-xs text-zinc-500">Live preview</div>
              </div>

              <div className="mt-6">
                <LandingCalendarVisual />
              </div>

              <div className="mt-7 grid gap-3">
                {heroList.map((e) => (
                  <Link
                    key={e.id}
                    href={`/public/events/${e.slug}`}
                    className="group rounded-2xl border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50 hover:border-zinc-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-zinc-900">{e.title}</div>
                        <div className="mt-1 text-sm text-zinc-600">
                          {heroMetaLine(e.startAt instanceof Date ? e.startAt : new Date(e.startAt), e.locationName)}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">By {e.organizerName ?? "Organizer"}</div>
                      </div>
                      <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 transition group-hover:bg-zinc-100">
                        Open →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-6">
                <Link href="/public/events" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-700">
                  See full schedule <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-16 md:mt-20">
          <FeaturedCarousel
            title="Featured collection"
            subtitle="Popular upcoming events—organized by time so it’s easy to plan."
            events={(featured.length ? featured : fallback).map((e, idx) => ({
              ...e,
              badge: idx === 0 ? "Featured" : e.badge ?? "Open",
            }))}
          />
        </div>

        <div className="mt-14 md:mt-18">
          <FeaturedCarousel
            title="This weekend"
            subtitle="Saturday + Sunday picks for a clean weekend plan."
            events={weekend.length ? weekend : fallback}
          />
        </div>

        <div className="mt-16 md:mt-20">
          <LandingRecommended fallbackCity="Miami" />
        </div>

        <div className="mt-20">
          <MarketingFooter />
        </div>
      </main>
    </div>
  );
}
