import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EventRSVP from "@/components/EventRSVP";
import EventAttendees from "@/components/EventAttendees";
import EventImageCarousel from "@/components/EventImageCarousel";
import QrImage from "@/components/QrImage";
import DeleteEventButton from "@/components/DeleteEventButton";
import { getBaseUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function buildImagesToShow(event: { image: string | null; images: unknown }) {
  const cover = (event.image ?? "").trim();
  const arr = Array.isArray(event.images) ? (event.images as string[]) : [];
  const cleaned = arr.map((s) => (s ?? "").trim()).filter(Boolean);

  const out: string[] = [];
  if (cover) out.push(cover);
  for (const url of cleaned) if (!out.includes(url)) out.push(url);
  return out;
}

export default async function EventDetailPage({
  params,
}: {
  // ✅ Next 16: params can be a Promise
  params: Promise<{ slug: string }>;
}) {
  noStore();

  // ✅ unwrap params
  const { slug } = await params;
  if (!slug) notFound();

  const session = await auth();

  // --- Resolve viewer from session (fallback to DB by email if needed) ---
  const su = session?.user ?? {};
  let userId: string | null = (su as any)?.id ?? null;
  let role: string | null = (su as any)?.role ?? null;
  const email: string | null = (su as any)?.email ?? null;

  if ((!userId || !role) && email) {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    userId = userId ?? dbUser?.id ?? null;
    role = role ?? (dbUser?.role as any) ?? null;
  }

  // ✅ If slug is not @unique in schema, use findFirst (but keep where filter!)
  const event = await prisma.event.findFirst({
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

      image: true,
      images: true,

      capacity: true,
      waitlistEnabled: true,

      checkInSecret: true,
    },
  });

  if (!event) notFound();

  const canManage = role === "ORGANIZER" && !!userId && userId === event.organizerId;

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

  const imagesToShow = buildImagesToShow({ image: event.image, images: event.images });

  const base = await getBaseUrl();
  const shareUrl = new URL(`/public/events/${encodeURIComponent(event.slug)}`, base).toString();
  const staffUrl = new URL(
    `/checkin/${encodeURIComponent(event.slug)}?secret=${encodeURIComponent(event.checkInSecret)}`,
    base
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
            <>
              <Link
                href={`/app/organizer/events/${event.slug}/edit`}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
              >
                Edit
              </Link>

              {/* ✅ NEW: Delete button next to Edit */}
              <DeleteEventButton slug={event.slug} />
            </>
          ) : null}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 shadow-2xl">
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

          {imagesToShow.length > 0 ? (
            <EventImageCarousel images={imagesToShow} title={event.title} />
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
            <div className="mb-3">
              <div className="text-sm font-semibold text-white">Share</div>
              <div className="mt-1 text-xs text-zinc-400">
                Scan the QR code or copy the link to share this event.
              </div>
            </div>
            <QrImage
              text={shareUrl}
              openHref={`/app/organizer/events/${event.slug}/checkin`}
              openLabel="Check in ↗"
              openDisabled={!canManage}
              showText={false}
            />
          </div>

          {canManage ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <div className="mb-3">
                <div className="text-sm font-semibold text-white">Staff check-in</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Send this QR/link to volunteers (no login). Keep the secret private.
                </div>
              </div>

              <QrImage
                text={staffUrl}
                openHref={`/checkin/${event.slug}?secret=${encodeURIComponent(event.checkInSecret)}`}
                showText={false}
              />
            </div>
          ) : null}

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

          <EventAttendees eventId={event.id} slug={event.slug} canManage={!!canManage} />

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 transition hover:bg-white/[0.08]">
            <div className="text-sm font-semibold text-zinc-200">Description</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-100">
              {event.description?.trim() ? event.description : "No description provided."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
