import Link from "next/link";
import MarketingPageShell from "@/components/MarketingPageShell";

export default function HowItWorksPage() {
  return (
    <MarketingPageShell
      title="How it works"
      subtitle="Publish events fast, discover what’s nearby, and RSVP with confidence."
    >
      <div className="space-y-10 text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-white">Discover</h2>
          <p className="mt-2">Browse by time, city, and category. Share event links with friends.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Create</h2>
          <p className="mt-2">Organizers can publish an event with title, time, location, and image.</p>
          <Link
            href="../organizer/create"
            className="mt-4 inline-flex rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Create an event →
          </Link>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">RSVP</h2>
          <p className="mt-2">RSVP statuses help organizers plan, and attendees stay updated.</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-white/90 hover:text-white" href="/rsvp">
            Learn about RSVP &amp; email →
          </Link>
        </section>
      </div>
    </MarketingPageShell>
  );
}
