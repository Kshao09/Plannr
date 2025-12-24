type EventDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  startAt: string;
  endAt: string;
  locationName: string;
  address: string;
};

export default async function EventDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/events/${params.slug}`, { cache: "no-store" });

  if (res.status === 404) return <div>Event not found.</div>;
  if (!res.ok) throw new Error("Failed to load event");
  const e: EventDetail = await res.json();

  return (
    <div>
      <h1>{e.title}</h1>
      <p className="small">
        {new Date(e.startAt).toLocaleString()} — {new Date(e.endAt).toLocaleString()}
      </p>
      <p className="small">{e.locationName} • {e.address}</p>
      <div className="card">{e.description}</div>
      <a className="small" href={`/api/events/${e.slug}/ics`}>Download calendar (.ics)</a>
    </div>
  );
}
