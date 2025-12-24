import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EventActions from "./EventActions"

export const dynamic = "force-dynamic";

export default async function EventDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
  });

  if (!event) notFound();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1>{event.title}</h1>
          <Link className="small" href="/events">
            ← Back to Events
          </Link>
        </div>

        {/* Icons (Download / Edit / Delete) */}
        <EventActions slug={event.slug} />
      </div>

      <div className="card">
        <div className="small">
          <b>When:</b>{" "}
          {new Date(event.startAt).toLocaleString()} —{" "}
          {new Date(event.endAt).toLocaleString()}
        </div>
        <div className="small">
          <b>Where:</b> {event.locationName} • {event.address}
        </div>
        <div style={{ marginTop: 10 }}>{event.description}</div>
      </div>
    </div>
  );
}
