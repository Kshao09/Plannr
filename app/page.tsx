import Link from "next/link";
import Image from "next/image";
import MarketingNav from "@/components/MarketingNav";
import LandingRecommended from "@/components/LandingRecommended";
import FeaturedCarousel, { CarouselEvent } from "@/components/FeaturedCarousel";
import MarketingFooter from "@/components/MarketingFooter";
import { prisma } from "@/lib/prisma";

const IMG = {
  ai: "/images/ai001.png",
  basketball: "/images/basketball001.png",
  chess: "/images/chess001.png",
  food: "/images/food001.png",
  rooftop: "/images/rooftop001.png",
  soccer: "/images/soccer001.png",
  arts: "/images/arts001.png",
  music: "/images/music001.png",
  concert: "/images/rockConcert001.png",
} as const;

function pickImageForTitle(title: string) {
  const t = title.toLowerCase();

  if (t.includes("ai") || t.includes("robot") || t.includes("ml") || t.includes("tech")) return IMG.ai;
  if (t.includes("chess")) return IMG.chess;
  if (t.includes("food") || t.includes("truck") || t.includes("drink")) return IMG.food;

  if (t.includes("soccer") || t.includes("football")) return IMG.soccer;
  if (t.includes("basket") || t.includes("nba")) return IMG.basketball;

  if (t.includes("roof") || t.includes("sunset") || t.includes("meetup")) return IMG.rooftop;

  if (t.includes("music") || t.includes("concert") || t.includes("band")) return IMG.concert;
  if (t.includes("art") || t.includes("gallery") || t.includes("exhibit")) return IMG.arts;

  return IMG.rooftop;
}

function toneFromImage(src: string) {
  if (src.includes("food")) return "orange";
  if (src.includes("chess")) return "fuchsia";
  if (src.includes("soccer") || src.includes("basketball")) return "emerald";
  if (src.includes("ai")) return "cyan";
  return "cyan";
}

function heroMetaLine(startAt: Date, locationName?: string | null) {
  const weekday = startAt.toLocaleDateString("en-US", { weekday: "short" });
  const time = startAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const place = locationName ?? "TBA";
  return `${weekday} • ${place} • ${time}`;
}

const categories = [
  { label: "Music", accent: "bg-fuchsia-500/15" },
  { label: "Food & Drink", accent: "bg-amber-500/15" },
  { label: "Tech", accent: "bg-cyan-500/15" },
  { label: "Sports", accent: "bg-emerald-500/15" },
  { label: "Arts", accent: "bg-indigo-500/15" },
  { label: "Outdoors", accent: "bg-sky-500/15" },
];

export default async function HomePage() {
  const now = new Date();

  const featuredRaw = await prisma.event.findMany({
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

  const weekendRaw = await prisma.event.findMany({
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
      organizer: { select: { name: true } },
    },
  });

  const toLite = (e: (typeof featuredRaw)[number]): CarouselEvent => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    startAt: e.startAt,
    endAt: e.endAt,
    locationName: e.locationName,
    organizerName: e.organizer?.name ?? "Organizer",
    image: pickImageForTitle(e.title),
    badge: "Open",
  });

  const featured = featuredRaw.map(toLite);
  const weekend = weekendRaw.map(toLite);

  const fallbackTrending = [
    {
      id: "t1",
      title: "Sunset Rooftop Meetup",
      slug: "sunset-rooftop-meetup",
      startAt: new Date(),
      locationName: "Miami",
      organizerName: "Plannr",
      image: IMG.rooftop,
      badge: "Open",
    },
    {
      id: "t2",
      title: "Chess Club @ Library",
      slug: "chess-club-library",
      startAt: new Date(),
      locationName: "Miami",
      organizerName: "Plannr",
      image: IMG.chess,
      badge: "Open",
    },
    {
      id: "t3",
      title: "Food Truck Festival",
      slug: "food-truck-festival",
      startAt: new Date(),
      locationName: "Wynwood",
      organizerName: "Plannr",
      image: IMG.food,
      badge: "Featured",
    },
  ] satisfies CarouselEvent[];

  const heroTrending = (featured.length ? featured : fallbackTrending).slice(0, 3).map((e, idx) => {
    const badge = idx === 2 ? "Featured" : "Open";
    return { ...e, badge };
  });

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050711] text-white">
      <MarketingNav />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-[-120px] h-[380px] w-[520px] rounded-full bg-fuchsia-500/20 blur-[90px]" />
        <div className="absolute right-[-220px] top-[120px] h-[420px] w-[560px] rounded-full bg-cyan-500/15 blur-[90px]" />
        <div className="absolute left-[20%] top-[520px] h-[420px] w-[520px] rounded-full bg-amber-500/10 blur-[110px]" />
      </div>

      <main className="relative mx-auto w-full max-w-7xl px-6 pb-24 pt-8 md:px-10">
        <section className="pt-6 md:pt-8">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                Discover events by time, place, and vibe
              </div>

              <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                Plan events.
                <span className="mt-3 block bg-gradient-to-r from-fuchsia-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                  Publish. Discover. RSVP.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300">
                Plannr helps organizers publish events fast and helps everyone find what’s happening nearby — by time,
                place, and vibe.
              </p>

              {/* Search bar */}
              <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                <form className="grid gap-3 md:grid-cols-6" action="/public/events" method="GET">
                  <div className="md:col-span-3">
                    <input
                      name="q"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                      placeholder="Search events (e.g., music, chess, tech)..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <input
                      name="city"
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                      placeholder="Miami"
                      defaultValue="Miami"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <button
                      type="submit"
                      className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/60 hover:border-white/25"
                    >
                      Search
                    </button>
                  </div>
                </form>

                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <Link
                      key={c.label}
                      href={`/public/events?category=${encodeURIComponent(c.label)}`}
                      className={`rounded-full border border-white/10 ${c.accent} px-3 py-1 text-xs text-zinc-100 hover:border-white/20`}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/public/events"
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Browse events →
                </Link>

                <Link
                  href="../organizer/create"
                  className="rounded-xl border border-white/15 bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/15 to-cyan-500/20 px-5 py-3 font-semibold text-white transition hover:border-white/25"
                >
                  Create an event
                </Link>

                <Link
                  href="/how-it-works"
                  className="rounded-xl px-2 py-3 font-semibold text-zinc-300 hover:text-white"
                >
                  Learn more
                </Link>
              </div>
            </div>

            {/* Right: Trending panel */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">Trending near you</div>
                <div className="text-xs text-zinc-400">This week</div>
              </div>

              <div className="mt-5 grid gap-3">
                {heroTrending.map((e) => {
                  const img = e.image ?? IMG.rooftop;
                  const tone = toneFromImage(img);
                  const meta = heroMetaLine(
                    e.startAt instanceof Date ? e.startAt : new Date(e.startAt),
                    e.locationName
                  );

                  return (
                    <Link
                      key={e.id}
                      href={`/public/events/${e.slug}`}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-black/25 transition hover:bg-black/35 hover:border-white/20"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10 sm:h-24 sm:w-24">
                          <Image
                            src={img}
                            alt={e.title}
                            fill
                            sizes="(max-width: 640px) 80px, 96px"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="truncate font-semibold">{e.title}</div>
                            <div
                              className={`shrink-0 rounded-full border px-2 py-1 text-xs ${
                                (e.badge ?? "").toLowerCase().includes("feature")
                                  ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                                  : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                              }`}
                            >
                              {e.badge ?? "Open"}
                            </div>
                          </div>

                          <div className="mt-1 text-sm text-zinc-400">{meta}</div>
                          <div className="mt-1 text-xs text-zinc-500">By {e.organizerName ?? "Organizer"}</div>

                          <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full w-2/5 rounded-full opacity-80 transition group-hover:w-3/5 ${
                                tone === "orange"
                                  ? "bg-gradient-to-r from-amber-300/70 to-rose-300/40"
                                  : tone === "fuchsia"
                                  ? "bg-gradient-to-r from-fuchsia-300/70 to-indigo-300/40"
                                  : tone === "emerald"
                                  ? "bg-gradient-to-r from-emerald-300/70 to-cyan-300/40"
                                  : "bg-gradient-to-r from-cyan-300/70 to-indigo-300/40"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4">
                <Link
                  href="/public/events"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"
                >
                  See all trending <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <FeaturedCarousel
          title="Featured collection"
          subtitle="Popular upcoming events curated from what’s trending."
          events={featured.map((e, idx) => ({
            ...e,
            badge: idx === 0 ? "Featured" : "Open",
          }))}
        />

        <FeaturedCarousel
          title="This weekend"
          subtitle="Plans for Saturday and Sunday — don’t miss out."
          events={weekend}
        />

        <LandingRecommended fallbackCity="Miami" />

        <MarketingFooter />
      </main>
    </div>
  );
}
