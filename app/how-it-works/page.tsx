import Link from "next/link";
import MarketingPageShell from "@/components/MarketingPageShell";

export default function HowItWorksPage() {
  return (
    <MarketingPageShell
      title="How it works"
      subtitle="Publish events fast, discover what’s nearby, and RSVP with confidence."
    >
      <div className="space-y-10 text-zinc-900">
        <section>
          <h2 className="text-lg font-semibold text-black">Discover</h2>
          <p className="mt-2">Browse by time, city, and category. Share event links with friends.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black">Create</h2>
          <p className="mt-2">Organizers can publish an event with title, time, location, and image.</p>
          <Link
            href="../login"
            className="mt-4 inline-flex text-sm font-semibold text-black hover:text-zinc-800"
          >
            Create an event →
          </Link>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black">RSVP</h2>
          <p className="mt-2">RSVP statuses help organizers plan, and attendees stay updated.</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-black hover:text-zinc-800" href="/rsvp">
            Learn about RSVP &amp; email →
          </Link>
        </section>
      </div>
    </MarketingPageShell>
  );
}
