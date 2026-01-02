import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EventRSVP from "@/components/EventRSVP";
import EventAttendees from "@/components/EventAttendees";
import EventImageCarousel from "@/components/EventImageCarousel";
import QrImage from "@/components/QrImage";
import { getBaseUrl } from "@/lib/siteUrl";

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

      // images
      image: true,
      images: true,

      // capacity / waitlist
      capacity: true,
      waitlistEnabled: true,

      // check-in secret (organizer-only UI uses it)
      checkInSecret: true,
    },
  });

  if (!event) notFound();

  const canManage = role === "ORGANIZER" && userId && userId === event.organizerId;

  // Load initial RSVP (only if logged in)
  let initial = { status: null as any, attendanceState: null as any };
  if (userId) {
    const existing = await prisma.rSVP.findUnique({
      where: { userId_eventId: { userId, eventId: event.id } },
      select: { status: true, attendanceState: true },
    });
    initial = {
      status: existing?.status ?? null,
      attendanceState: existing?.attendanceState ?? null,
    };
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

  const imagesToShow =
    Array.isArray(event.images) && (event.images as string[]).length > 0
      ? (event.images as string[])
      : event.image
      ? [event.image]
      : [];

  // ✅ Canonical URLs (uses NEXT_PUBLIC_APP_URL if set, even when running locally)
  const base = getBaseUrl();
  const shareUrl = new URL(`/public/events/${encodeURIComponent(event.slug)}`, await base).toString();
  const staffUrl = new URL(
    `/checkin/${encodeURIComponent(event.slug)}?secret=${encodeURIComponent(event.checkInSecret)}`,
    await base
  ).toString();

  const disabledReason = canManage ? "Organizers can’t RSVP to their own event." : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
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

            {typeof event.capacity === "number" ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
                Capacity: <b className="text-white">{event.capacity}</b>
                {event.waitlistEnabled ? (
                  <span className="text-zinc-400"> • waitlist on</span>
                ) : (
                  <span className="text-zinc-500"> • waitlist off</span>
                )}
              </span>
            ) : null}
          </div>
        </div>

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

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 shadow-2xl">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative space-y-5 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 transition hover:bg-white/[0.08]">
              <div className="text-sm font-semibold text-zinc-200">When</div>
              <div className="mt-1 text-sm text-zinc-100">
                {formatDateTime(event.startAt)} <span className="text-zinc-400">→</span>{" "}
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

          <EventImageCarousel images={imagesToShow} title={event.title} />

          {/* ✅ Share (shows for everyone) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Share</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Scan the QR code or copy the link to share this event.
                </div>
              </div>
            </div>
            <QrImage
              text={shareUrl}
              openHref={`/app/organizer/events/${event.slug}/checkin`}
              openLabel="Check in ↗"
              openDisabled={!canManage}   // ✅ disable for non-organizer
              showText={false}
            />
          </div>

          {/* ✅ Staff check-in (organizer-only) */}
          {canManage ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Staff check-in</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Send this QR/link to volunteers (no login). Keep the secret private.
                  </div>
                </div>
              </div>

              <div className="mb-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                Secret: <span className="font-mono text-zinc-200">{event.checkInSecret}</span>
              </div>

              <QrImage
                text={shareUrl}
                openHref={`/checkin/${event.slug}?secret=${encodeURIComponent(event.checkInSecret)}`}
                showText={false}
              />
            </div>
          ) : null}

          {/* ✅ RSVP */}
          {userId ? (
            <EventRSVP
              slug={event.slug}
              initial={initial}
              disabled={!!canManage}
              disabledReason={disabledReason}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm text-zinc-200">
              Log in to RSVP.
            </div>
          )}

          {/* ✅ Organizer-only attendee list + CSV */}
          <EventAttendees eventId={event.id} slug={event.slug} canManage={!!canManage} />

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 transition hover:bg-white/[0.08]">
            <div className="text-sm font-semibold text-zinc-200">Description</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-100">
              {event.description?.trim() ? event.description : "No description provided."}
            </div>
          </div>

          {event.address ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
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
