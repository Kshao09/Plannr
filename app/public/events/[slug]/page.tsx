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

function tierLabel(raw: any) {
  const t = String(raw ?? "FREE").toUpperCase();
  return t === "PREMIUM" ? "Premium" : "Free";
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  noStore();

  const { slug } = await params;
  if (!slug) notFound();

  const session = await auth();

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
      city: true,
      state: true,
      organizerId: true,
      organizer: { select: { name: true } },
      image: true,
      images: true,
      capacity: true,
      waitlistEnabled: true,
      ticketTier: true, // ✅ NEW
      checkInSecret: true,
    } as any,
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

  const addressLine = [event.address, event.city, event.state].map((x) => (x ?? "").trim()).filter(Boolean).join(", ");
  const locationForCalendar =
    (event.locationName?.trim() ? event.locationName : null) ?? (addressLine ? addressLine : null);

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

  const pill =
    "inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-900 shadow-sm";

  const tierPill =
    tierLabel((event as any).ticketTier) === "Premium"
      ? "inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900 shadow-sm"
      : "inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900 shadow-sm";

  const card =
    "rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_18px_60px_rgba(0,0,0,0.06)]";

  const subtleCard = "rounded-3xl border border-zinc-200 bg-zinc-50 p-5";

  const btn =
    "inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50";

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-zinc-50 text-zinc-900">
      <div className="relative mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/public/events"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800 hover:text-zinc-900"
            >
              <span className="text-lg leading-none">←</span>
              Back to Events
            </Link>

            <h1 className="mt-3 truncate text-4xl font-semibold tracking-tight text-zinc-900">
              {event.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {event.locationName ? <span className={pill}>{event.locationName}</span> : null}

              <span className={tierPill}>{tierLabel((event as any).ticketTier)}</span>

              {event.organizer?.name ? (
                <span className="text-zinc-700">
                  by <span className="font-medium text-zinc-900">{event.organizer.name}</span>
                </span>
              ) : null}

              <span className={pill}>
                Capacity:{" "}
                <span className="font-semibold text-zinc-900">
                  {typeof event.capacity === "number" ? event.capacity : "—"}
                </span>
                <span className="text-zinc-400">•</span>
                <span className="text-zinc-700">{event.waitlistEnabled ? "waitlist on" : "waitlist off"}</span>
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <a href={`/api/events/${event.slug}/ics`} className={btn}>
              Download .ics
            </a>
            <a href={gcalUrl} target="_blank" rel="noreferrer" className={btn}>
              Add to Google ↗
            </a>

            {canManage ? (
              <>
                <Link href={`/app/organizer/events/${event.slug}/edit`} className={btn}>
                  Edit
                </Link>
                <DeleteEventButton slug={event.slug} />
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="lg:col-span-8 space-y-6">
            <div className={card}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={subtleCard}>
                  <div className="text-sm font-semibold text-zinc-900">When</div>
                  <div className="mt-2 text-sm text-zinc-800">
                    {formatDateTime(event.startAt)} <span className="text-zinc-500">→</span>{" "}
                    {formatDateTime(event.endAt)}
                  </div>
                </div>

                <div className={subtleCard}>
                  <div className="text-sm font-semibold text-zinc-900">Where</div>
                  <div className="mt-2 text-sm text-zinc-800">{event.locationName ? event.locationName : "—"}</div>
                  {addressLine ? <div className="mt-1 text-sm text-zinc-700">{addressLine}</div> : null}
                </div>
              </div>
            </div>

            {imagesToShow.length > 0 ? (
              <div className={card}>
                <EventImageCarousel images={imagesToShow} title={event.title} />
              </div>
            ) : null}

            <div className={card}>
              <div className="text-sm font-semibold text-zinc-900">Description</div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                {event.description?.trim() ? event.description : "No description provided."}
              </div>
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-6">
            <div className={card}>
              {userId ? (
                <EventRSVP slug={event.slug} initial={initial} disabled={!!canManage} disabledReason={disabledReason} />
              ) : (
                <div className="text-sm text-zinc-900">
                  Log in to RSVP.{" "}
                  <Link href="/login" className="font-semibold text-zinc-900 underline">
                    Login
                  </Link>
                </div>
              )}
            </div>

            <div className={card}>
              <div className="mb-2">
                <div className="text-sm font-semibold text-zinc-900">Share</div>
                <div className="mt-1 text-xs text-zinc-700">Scan the QR code or copy the link to share this event.</div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-3">
                <QrImage
                  text={shareUrl}
                  openHref={shareUrl} // ✅ FIXED: was pointing to organizer checkin route
                  openLabel="Open event ↗"
                  openDisabled={false}
                  showText={false}
                />
              </div>
            </div>

            {canManage ? (
              <div className={card}>
                <div className="mb-2">
                  <div className="text-sm font-semibold text-zinc-900">Staff check-in</div>
                  <div className="mt-1 text-xs text-zinc-700">
                    Send this QR/link to volunteers (no login). Keep the secret private.
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-3">
                  <QrImage text={staffUrl} openHref={staffUrl} showText={false} />
                </div>
              </div>
            ) : null}

            {/* ✅ Hide attendees for members */}
            {canManage ? (
              <div className={card}>
                <EventAttendees eventId={event.id} slug={event.slug} canManage={!!canManage} />
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
