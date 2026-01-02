import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EventEditForm from "@/components/EventEditForm";

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

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login?next=/app/organizer");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/app/organizer");

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
      category: true,
      organizerId: true,

      image: true,
      images: true,

      capacity: true,
      waitlistEnabled: true,
      checkInSecret: true,
    },
  });

  if (!event) notFound();
  if (event.organizerId !== userId) redirect("/app/organizer");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit event</h1>
          <p className="mt-1 text-sm text-zinc-400">Update details and save changes.</p>
        </div>

        <Link
          href={`/public/events/${event.slug}`}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
        >
          View ↗
        </Link>
      </div>

      <EventEditForm
        slug={event.slug}
        initial={{
          title: event.title,
          description: event.description ?? "",
          startAt: event.startAt?.toISOString() ?? "",
          endAt: event.endAt?.toISOString() ?? "",
          locationName: event.locationName ?? "",
          address: event.address ?? "",
          category: event.category ?? "",
          image: event.image ?? "",
          images: Array.isArray(event.images) ? (event.images as string[]) : [],
          capacity: event.capacity ?? null,
          waitlistEnabled: event.waitlistEnabled ?? true,
          checkInSecret: event.checkInSecret,
        }}
      />
    </main>
  );
}
