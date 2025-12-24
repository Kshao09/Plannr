import Link from "next/link";

type EventSummary = {
  id: string;
  title: string;
  slug: string;
  startAt: string;
  locationName: string;
};

export default async function EventsPage() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
            <Link href={`/events/${e.slug}`}><b>{e.title}</b></Link>
            <div className="small">{new Date(e.startAt).toLocaleString()}</div>
            <div className="small">{e.locationName}</div>
          </div>
        ))
      )}
    </div>
  );
}
