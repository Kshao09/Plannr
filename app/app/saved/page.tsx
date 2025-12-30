import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EventCard from "@/components/EventCard";
import type { EventLite } from "@/components/EventCard";

export const dynamic = "force-dynamic";

async function resolveUserId(session: any) {
  const sessionUser = session?.user ?? {};
  const sessionId = sessionUser?.id as string | undefined;
  const sessionEmail = sessionUser?.email as string | undefined;

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

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/saved");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/saved");

  const saved = await prisma.savedEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          startAt: true,
          endAt: true,
          locationName: true,
          category: true,
          image: true,
          organizer: { select: { name: true } },
        },
      },
    },
  });

  const events: EventLite[] = saved.map((r) => ({
    id: r.event.id,
    slug: r.event.slug,
    title: r.event.title,
    startAt: r.event.startAt.toISOString(),
    endAt: r.event.endAt?.toISOString() ?? null,
    locationName: r.event.locationName ?? null,
    category: r.event.category ?? null,
    image: r.event.image ?? null,
    organizerName: r.event.organizer?.name ?? null,
    isSaved: true,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Saved</h1>
          <p className="mt-2 text-sm text-zinc-400">Your bookmarked events.</p>
        </div>
        <div className="text-sm text-zinc-300">{events.length} events</div>
      </div>

      {events.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-300">
          You haven’t saved any events yet.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      )}
    </main>
  );
}
