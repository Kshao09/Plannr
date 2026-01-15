// app/app/organizer/events/[slug]/checkin/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CheckInClient from "./CheckInClient";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EventRow = Prisma.EventGetPayload<{
  select: {
    id: true;
    slug: true;
    title: true;
    organizerId: true;
    checkInSecret: true;
    capacity: true;
    waitlistEnabled: true;
    rsvps: {
      select: {
        id: true;
        status: true;
        attendanceState: true;
        checkInCode: true;
        checkedInAt: true;
        createdAt: true;
        user: { select: { id: true; name: true; email: true } };
      };
    };
  };
}>;

export default async function OrganizerCheckInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  // Resolve viewerId robustly
  let viewerId = (session.user as any)?.id as string | undefined;
  if (!viewerId && session.user.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    viewerId = me?.id ?? undefined;
  }
  if (!viewerId) redirect("/login");

  const event: EventRow | null = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      organizerId: true,
      checkInSecret: true,
      capacity: true,
      waitlistEnabled: true,
      rsvps: {
        select: {
          id: true,
          status: true,
          attendanceState: true,
          checkInCode: true,
          checkedInAt: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!event) return notFound();
  if (event.organizerId !== viewerId) redirect("/organizer");

  // ✅ Dates -> strings before passing to client
  const safeEvent = {
    id: event.id,
    slug: event.slug,
    title: event.title,
    organizerId: event.organizerId,
    checkInSecret: event.checkInSecret,
    capacity: event.capacity,
    waitlistEnabled: event.waitlistEnabled,
    rsvps: event.rsvps.map((r) => ({
      id: r.id,
      status: r.status,
      attendanceState: r.attendanceState,
      checkInCode: r.checkInCode,
      checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
  };

  // ✅ PASS PATHS (not absolute)
  // Event details page (for back arrow + sharing)
  const eventDetailsPath = `/public/events/${encodeURIComponent(event.slug)}`;

  // If you want CheckInClient to show a "share event" QR/link, this should be the event details.
  const sharePath = eventDetailsPath;

  // Staff check-in (no login)
  const staffPath = `/checkin/${encodeURIComponent(event.slug)}?secret=${encodeURIComponent(
    event.checkInSecret
  )}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* ✅ Back arrow (same window) */}
      <Link
        href={eventDetailsPath}
        className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
        aria-label="Back to event"
        title="Back to event"
      >
        ←
      </Link>

      <div className="mb-6 mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Organizer check-in</h1>
          <p className="mt-1 text-sm text-zinc-700">
            Manage check-ins for <span className="font-semibold">{safeEvent.title}</span>
          </p>
        </div>

        <Link
          href={`/app/organizer/events/${safeEvent.slug}/edit`}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Edit event
        </Link>
      </div>

      <CheckInClient event={safeEvent} shareUrl={sharePath} staffUrl={staffPath} />
    </main>
  );
}
