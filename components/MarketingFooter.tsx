import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Left */}
          <div className="md:col-span-4">
            <Link href="/" className="text-lg font-semibold">
              <span className="bg-gradient-to-r from-fuchsia-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                Plannr
              </span>
            </Link>

            <p className="mt-3 max-w-sm text-sm text-zinc-400">
              An event planner + marketplace. Publish events, discover what’s nearby, and RSVP in one click.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {["Music", "Tech", "Food", "Arts", "Outdoors"].map((t) => {
                const cat = t === "Food" ? "Food & Drink" : t;
                return (
                  <Link
                    key={t}
                    href={`/public/events?category=${encodeURIComponent(cat)}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
                  >
                    {t}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right columns */}
          <div className="md:col-span-8">
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300/90">
                  Product
                </div>
                <Link className="block text-zinc-400 hover:text-white" href="/public/events">
                  Browse
                </Link>
                <Link className="block text-zinc-400 hover:text-white" href="../login">
                  Create an event
                </Link>
                <Link className="block text-zinc-400 hover:text-white" href="/rsvp">
                  RSVP &amp; email
                </Link>
                <Link className="block text-zinc-400 hover:text-white" href="/how-it-works">
                  How it works
                </Link>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300/90">
                  Company
                </div>
                <Link className="block text-zinc-400 hover:text-white" href="/careers">
                  Careers
                </Link>
                <Link className="block text-zinc-400 hover:text-white" href="/press">
                  Press
                </Link>
                <Link className="block text-zinc-400 hover:text-white" href="/contact">
                  Contact
                </Link>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300/90">
                  Resources
                </div>
                <Link className="block text-zinc-400 hover:text-white" href="/safety">
                  Safety
                </Link>
                <Link className="block text-zinc-400 hover:text-white" href="/community">
                  Community
                </Link>
                <Link className="block text-zinc-400 hover:text-white" href="/developers">
                  Developers
                </Link>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300/90">
                  Legal
                </div>
                <Link className="block text-zinc-400 hover:text-white" href="/terms">
                  Terms
                </Link>
                <Link className="block text-zinc-400 hover:text-white" href="/cookies">
                  Cookie policy
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/10 pt-8 text-sm text-zinc-500">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>© {new Date().getFullYear()} Plannr. All rights reserved.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
