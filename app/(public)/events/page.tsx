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
  const isOrganizer = session?.user?.role === "ORGANIZER";
  const viewerRole = session?.user?.role ?? null;

  const events = await getEvents({ q });

  const cards: EventCard[] = events.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    locationName: e.locationName,
    address: e.address,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-4xl font-bold tracking-tight text-white">
        Events
      </h1>

      {/* ✅ Search + Create CTA row */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          {/* If your EventSearch supports it, pass initialQuery={q} */}
          <EventSearch />
        </div>

        {isOrganizer ? (
          <Link
            href="/create"
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90"
          >
            Create event
          </Link>
        ) : null}
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
        // ✅ pass viewerRole so EventList can show RSVP buttons for members
        <EventList events={cards} viewerRole={viewerRole} />
      )}
    </div>
  );
}
