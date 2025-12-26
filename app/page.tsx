import Link from "next/link";
import Image from "next/image";
import MarketingNav from "@/components/MarketingNav";

const events = [
  {
    title: "Sunset Rooftop Meetup",
    meta: "Fri • Miami • 7:30 PM",
    badge: "Open",
    image: "/images/img001_v0.png",
  },
  {
    title: "Chess Club @ Library",
    meta: "Sat • Miami • 3:00 PM",
    badge: "Open",
    image: "/images/img003_v3.png",
  },
  {
    title: "Food Truck Festival",
    meta: "Sun • Wynwood • 6:00 PM",
    badge: "Featured",
    image: "/images/img002_v0.png",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-[#050711] text-white">
      <MarketingNav />

      {/* Full-width padding, no max-w */}
      <main className="w-screen px-6 md:px-10 lg:px-16">
        <section className="pt-8 pb-16 md:pt-10 md:pb-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
                Plan events.
                <span className="block bg-gradient-to-r from-fuchsia-400 via-indigo-400 to-cyan-300 bg-clip-text text-transparent">
                  Publish. Discover. RSVP.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
                Plannr helps organizers publish events fast and helps everyone
                find what’s happening nearby — by time, place, and vibe.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Browse events →
                </Link>

                <Link
                  href="/login"
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Create an event
                </Link>

                <a
                  href="#about"
                  className="rounded-xl px-5 py-3 font-semibold text-zinc-300 transition hover:text-white"
                >
                  Learn more
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-indigo-500/10">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-200">
                  Trending near you
                </div>
                <div className="text-xs text-zinc-400">This week</div>
              </div>

              <div className="mt-5 grid gap-3">
                {events.map((e) => (
                  <div
                    key={e.title}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-black/30 transition hover:bg-black/40"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 sm:h-24 sm:w-24">
                        <Image
                          src={e.image}
                          alt={e.title}
                          width={400}
                          height={400}
                          sizes="(max-width: 640px) 80px, 96px"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="truncate font-semibold">{e.title}</div>
                          <div className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                            {e.badge}
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">{e.meta}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="py-14">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
            <h2 className="text-2xl font-semibold">About Plannr</h2>
            <p className="mt-3 max-w-4xl text-zinc-300">
              Plannr is an event planner + marketplace. Organizers publish events.
              Attendees discover events by time and location — then RSVP in one click.
            </p>
          </div>
        </section>

        <footer className="border-t border-white/10 py-10 text-sm text-zinc-400">
          <div>© {new Date().getFullYear()} Plannr</div>
        </footer>
      </main>
    </div>
  );
}
