import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="mt-20 border-t border-zinc-200/70 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Left */}
          <div className="md:col-span-4">
            <Link href="/" className="text-lg font-semibold">
              <span className="bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                Plannr
              </span>
            </Link>

            <p className="mt-3 max-w-sm text-sm text-zinc-600">
              A schedule-first event planner + marketplace. Publish events, discover what fits your calendar, and RSVP
              fast.
            </p>
          </div>

          {/* Right columns */}
          <div className="md:col-span-8">
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Product</div>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/public/events">
                  Browse
                </Link>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/login">
                  Create an event
                </Link>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/rsvp">
                  RSVP &amp; email
                </Link>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/how-it-works">
                  How it works
                </Link>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Company</div>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/careers">
                  Careers
                </Link>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/press">
                  Press
                </Link>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/contact">
                  Contact
                </Link>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Resources</div>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/safety">
                  Safety
                </Link>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/community">
                  Community
                </Link>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Legal</div>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/terms">
                  Terms
                </Link>
                <Link className="block text-zinc-600 hover:text-zinc-900" href="/cookies">
                  Cookie policy
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-200/70 pt-8 text-sm text-zinc-500">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>© {new Date().getFullYear()} Plannr. All rights reserved.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
