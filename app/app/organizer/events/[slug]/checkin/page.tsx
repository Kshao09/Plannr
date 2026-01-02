import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CheckInClient from "./CheckInClient";
import { getBaseUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

async function resolveUserId(session: any) {
  const su = session?.user ?? {};
  const sessionId = su?.id as string | undefined;
  const sessionEmail = su?.email as string | undefined;

  if (sessionId) return sessionId;

  if (sessionEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true },
    });
    return dbUser?.id ?? null;
  }

  return null;
}

export default async function OrganizerCheckInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/login?next=/organizer/events/${encodeURIComponent(slug)}/checkin`);

  const userId = await resolveUserId(session);
  if (!userId) redirect(`/login?next=/organizer/events/${encodeURIComponent(slug)}/checkin`);

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      organizerId: true,
      capacity: true,
      waitlistEnabled: true,
      checkInSecret: true,
      rsvps: {
        where: { status: "GOING" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          attendanceState: true,
          checkInCode: true,
          checkedInAt: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!event) notFound();
  if (event.organizerId !== userId) redirect("/organizer/dashboard");

  const base = getBaseUrl();
  const shareUrl = new URL(`/public/events/${encodeURIComponent(event.slug)}`, await base).toString();
  const staffUrl = new URL(
    `/checkin/${encodeURIComponent(event.slug)}?secret=${encodeURIComponent(event.checkInSecret)}`,
    await base
  ).toString();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Check-in dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">{event.title}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/public/events/${event.slug}`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10"
          >
            View event ↗
          </Link>
        </div>
      </div>

      <CheckInClient event={event} shareUrl={shareUrl} staffUrl={staffUrl} />
    </main>
  );
}
