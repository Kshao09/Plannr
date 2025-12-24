import Link from "next/link";
import { headers } from "next/headers";
import EventDate from "./eventDate";

type EventSummary = {
  id: string;
  title: string;
  slug: string;
  startAt: string;
  locationName: string;
};

export const dynamic = "force-dynamic"; // never cache this page

async function getBaseUrl() {
  const h = await headers();

  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export default async function EventsPage() {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/events`, { cache: "no-store" });

  if (!res.ok) throw new Error("Failed to load events");
  const events: EventSummary[] = await res.json();

  return (
    <div>
      <h1>Events</h1>

      {events.length === 0 ? (
        <p className="small">No events yet.</p>
      ) : (
        events.map((e) => (
          <div className="card" key={e.id}>
            <Link href={`/events/${e.slug}`}>
              <b>{e.title}</b>
            </Link>

            <div className="small">
              <EventDate iso={e.startAt} />
            </div>

            <div className="small">{e.locationName}</div>
          </div>
        ))
      )}
    </div>
  );
}
