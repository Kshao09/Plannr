import MarketingPageShell from "@/components/MarketingPageShell";

export default function RSVPPage() {
  return (
    <MarketingPageShell
      title="RSVP & email"
      subtitle="How RSVPs work, what organizers see, and what attendees receive."
    >
      <div className="space-y-8 text-zinc-900">
        <section>
          <h2 className="text-lg font-semibold text-black">RSVP statuses</h2>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li><span className="text-black font-semibold">Going</span> — you plan to attend</li>
            <li><span className="text-black font-semibold">Maybe</span> — you’re interested but not sure</li>
            <li><span className="text-black font-semibold">Declined</span> — you’re not attending</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black">Email confirmations</h2>
          <p className="mt-3">
            After you RSVP, you’ll receive a confirmation email. If details change, you’ll get a follow-up.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black">Privacy</h2>
          <p className="mt-3">
            Attendee lists should be visible only to organizers for their own events.
          </p>
        </section>
      </div>
    </MarketingPageShell>
  );
}
