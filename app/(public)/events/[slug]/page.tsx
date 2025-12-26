import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db"; // <- change to "@/lib/prisma" if that's your actual export
import EventActions from "./EventActions";

export const dynamic = "force-dynamic";

function formatDateTime(iso: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(iso);
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      locationName: true,
      address: true,
      organizerId: true,
      organizer: { select: { name: true } },
    },
  });

  if (!event) notFound();

  const canManage =
    session?.user?.role === "ORGANIZER" && session.user.id === event.organizerId;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
          >
            <span className="text-lg leading-none">←</span>
            Back to Events
          </Link>

          <h1 className="mt-3 truncate text-4xl font-semibold tracking-tight text-white">
            {event.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-400">
            {event.locationName ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {event.locationName}
              </span>
            ) : null}

            {event.organizer?.name ? (
              <span className="text-zinc-500">by {event.organizer.name}</span>
            ) : null}
          </div>
        </div>

        {/* Actions (download always; edit/delete only for owner organizer) */}
        <div className="shrink-0">
          <EventActions slug={event.slug} canManage={canManage} />
        </div>
      </div>

      {/* Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 shadow-2xl">
        {/* subtle glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative space-y-5 p-6 md:p-8">
          {/* Top info grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 transition hover:bg-white/[0.08]">
              <div className="text-sm font-semibold text-zinc-200">When</div>
              <div className="mt-1 text-sm text-zinc-100">
                {formatDateTime(event.startAt)}{" "}
                <span className="text-zinc-400">→</span>{" "}
                {formatDateTime(event.endAt)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 transition hover:bg-white/[0.08]">
              <div className="text-sm font-semibold text-zinc-200">Where</div>
              <div className="mt-1 text-sm text-zinc-100">
                {event.locationName || <span className="text-zinc-400">—</span>}
              </div>
              {event.address ? (
                <div className="mt-1 text-sm text-zinc-300">{event.address}</div>
              ) : null}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 transition hover:bg-white/[0.08]">
            <div className="text-sm font-semibold text-zinc-200">Description</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-100">
              {event.description?.trim()
                ? event.description
                : "No description provided."}
            </div>
          </div>

          {/* Optional: map link */}
          {event.address ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  event.address
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-auto items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                Open in Google Maps ↗
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
