import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CheckInClient from "./CheckInClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OrganizerCheckInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  // robust user id resolution (prod sometimes doesn't include session.user.id)
  let viewerId = (session.user as any)?.id as string | undefined;
  if (!viewerId && session.user.email) {
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    viewerId = me?.id ?? undefined;
  }
  if (!viewerId) redirect("/login");

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      organizerId: true,
      checkInSecret: true,

      capacity: true,         // ✅ used by client UI
      waitlistEnabled: true,  // ✅ used by client UI

      rsvps: {
        select: {
          id: true,
          status: true,
          attendanceState: true, // ✅ used for confirmed/waitlist lists
          checkInCode: true,     // ✅ displayed in UI
          checkedInAt: true,     // Date -> must serialize
          createdAt: true,       // Date -> must serialize
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!event) return notFound();
  if (event.organizerId !== viewerId) redirect("/organizer");

  // ✅ IMPORTANT: convert Dates to strings before passing to client component
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Organizer check-in</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Manage check-ins for <span className="font-semibold">{safeEvent.title}</span>
          </p>
        </div>

        <Link
          href={`/organizer/events/${safeEvent.slug}/edit`}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Edit event
        </Link>
      </div>

      {/* ✅ Let client compute shareUrl/staffUrl (your QrImage already does it safely) */}
      <CheckInClient event={safeEvent} />
    </main>
  );
}
