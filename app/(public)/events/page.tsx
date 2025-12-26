import Link from "next/link";
import { auth } from "@/auth";

import EventSearch from "@/components/EventSearch";
import EventList, { type EventCard } from "@/components/EventList";
import { getEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string | string[];
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const q =
    typeof sp.q === "string" ? sp.q : Array.isArray(sp.q) ? sp.q[0] ?? "" : "";

  const session = await auth();
  const viewerRole = session?.user?.role ?? null;

  const events = await getEvents({ q });

  // ✅ must include organizerId so EventList can show organizer-only edit button
  const cards: EventCard[] = events.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description ?? "",
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    locationName: e.locationName ?? "",
    address: e.address ?? "",
    organizerId: e.organizerId,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header row with back arrow */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* ✅ Back arrow to dashboard (change href if needed) */}
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10"
            aria-label="Back to dashboard"
            title="Back"
          >
            ←
          </Link>

          <h1 className="text-4xl font-bold tracking-tight text-white">Events</h1>
        </div>
      </div>

      {/* Search + Create CTA row */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          <EventSearch />
        </div>
      </div>

      {q ? (
        <p className="mb-3 text-sm text-zinc-400">
          Showing results for:{" "}
          <span className="font-medium text-zinc-200">{q}</span>
        </p>
      ) : null}

      {cards.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-zinc-200">
          No events found.
        </div>
      ) : (
        <EventList events={cards} viewerRole={viewerRole} />
      )}
    </div>
  );
}
