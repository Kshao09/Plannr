import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EventRSVP from "@/components/EventRSVP";
import EventAttendees from "@/components/EventAttendees";
import EventImageCarousel from "@/components/EventImageCarousel";

export const dynamic = "force-dynamic";

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Google Calendar needs UTC timestamps like: 20250101T130000Z
function gcalDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function buildGoogleCalendarUrl(e: {
  title: string;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  description?: string | null;
}) {
  const u = new URL("https://calendar.google.com/calendar/render");
  u.searchParams.set("action", "TEMPLATE");
  u.searchParams.set("text", e.title);
  u.searchParams.set("dates", `${gcalDate(e.startAt)}/${gcalDate(e.endAt)}`);
  if (e.location) u.searchParams.set("location", e.location);
  if (e.description) u.searchParams.set("details", e.description);
  return u.toString();
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  const userId = session?.user ? (session.user as any).id : null;
  const role = session?.user ? (session.user as any).role : null;

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

      // ✅ add images support
      image: true,
      images: true,
    },
  });

  if (!event) notFound();

  const canManage = role === "ORGANIZER" && userId === event.organizerId;

  // ✅ Load initial RSVP status (only if logged in)
  let initialStatus: "GOING" | "MAYBE" | "DECLINED" | null = null;
  if (userId) {
    const existing = await prisma.rSVP.findUnique({
      where: { userId_eventId: { userId, eventId: event.id } },
      select: { status: true },
    });
    initialStatus = existing?.status ?? null;
  }

  const locationForCalendar =
    (event.address?.trim() ? event.address : null) ??
    (event.locationName?.trim() ? event.locationName : null);

  const gcalUrl = buildGoogleCalendarUrl({
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    location: locationForCalendar,
    description: event.description ?? null,
  });

  // ✅ Prefer uploaded images; fallback to cover image
  const imagesToShow =
    Array.isArray(event.images) && (event.images as string[]).length > 0
      ? (event.images as string[])
      : event.image
      ? [event.image]
      : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/public/events"
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

        {/* Top-right actions */}
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <a
            href={`/api/events/${event.slug}/ics`}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
          >
            Download .ics
          </a>

          <a
            href={gcalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
          >
            Add to Google ↗
          </a>

          {canManage ? (
            <Link
              href={`/app/organizer/events/${event.slug}/edit`}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Edit
            </Link>
          ) : null}
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

          {/* ✅ Image carousel */}
          <EventImageCarousel images={imagesToShow} title={event.title} />

          {/* ✅ RSVP */}
          {userId ? (
            <EventRSVP
              slug={event.slug}
              initialStatus={initialStatus}
              disabled={role === "ORGANIZER" && userId === event.organizerId}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm text-zinc-200">
              Log in to RSVP.
            </div>
          )}

          {/* ✅ Organizer-only attendee list + CSV */}
          <EventAttendees eventId={event.id} slug={event.slug} canManage={canManage} />

          {/* Description */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 transition hover:bg-white/[0.08]">
            <div className="text-sm font-semibold text-zinc-200">Description</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-100">
              {event.description?.trim()
                ? event.description
                : "No description provided."}
            </div>
          </div>

          {/* Map link */}
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
