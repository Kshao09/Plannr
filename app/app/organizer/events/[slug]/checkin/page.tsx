// app/organizer/events/[slug]/checkin/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl, absoluteUrl } from "@/lib/siteUrl";
import CheckInClient from "./CheckInClient";

export const dynamic = "force-dynamic";

export default async function OrganizerCheckInPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/signin");

  const viewerId = (session.user as any).id as string | undefined;
  if (!viewerId) redirect("/signin");

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      endAt: true,
      location: true,
      organizerId: true,
      checkInSecret: true,
      rsvps: {
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!event) notFound();
  if (event.organizerId !== viewerId) redirect("/organizer");

  const base = getBaseUrl();
  const shareUrl = absoluteUrl(`/public/events/${encodeURIComponent(event.slug)}`, base);
  const staffUrl = absoluteUrl(
    `/checkin/${encodeURIComponent(event.slug)}?secret=${encodeURIComponent(event.checkInSecret)}`,
    base
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Organizer check-in</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Manage check-ins for <span className="font-semibold">{event.title}</span>
          </p>
        </div>
        <Link
          href={`/organizer/events/${event.slug}/edit`}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Edit event
        </Link>
      </div>

      <CheckInClient event={event} shareUrl={shareUrl} staffUrl={staffUrl} />
    </main>
  );
}
