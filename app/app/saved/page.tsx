import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EventCard from "@/components/EventCard";
import type { EventLite } from "@/components/EventCard";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

async function resolveUserId(session: any): Promise<string | null> {
  const sessionUser = session?.user ?? {};
  const sessionId = (sessionUser as any)?.id as string | undefined;
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

type SavedRow = Prisma.SavedEventGetPayload<{
  select: {
    event: {
      select: {
        id: true;
        slug: true;
        title: true;
        startAt: true;
        endAt: true;
        locationName: true;
        category: true;
        image: true;
        organizer: { select: { name: true } };
      };
    };
  };
}>;

export default async function SavedPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }> | { page?: string };
}) {
  const sp = await Promise.resolve(searchParams ?? {});
  const pageParam = Array.isArray((sp as any).page) ? (sp as any).page[0] : (sp as any).page;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const session = await auth();
  if (!session?.user) redirect("/login?next=/app/saved");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/app/saved");

  const PER_PAGE = 9;

  const total = await prisma.savedEvent.count({ where: { userId } });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const saved: SavedRow[] = await prisma.savedEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PER_PAGE,
    take: PER_PAGE,
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

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Back arrow */}
          <Link
            href="/app/dashboard"
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            ←
          </Link>

          <div>
            <h1 className="text-3xl font-semibold text-white">Saved</h1>
            <p className="mt-2 text-sm text-zinc-400">Your bookmarked events.</p>
          </div>
        </div>

        <div className="text-sm text-zinc-300">
          {total} event{total === 1 ? "" : "s"}
        </div>
      </div>

      {/* Content */}
      {total === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-300">
          You haven’t saved any events yet.
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} e={e} showRemove />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-sm text-zinc-300">
              Page <span className="text-white">{currentPage}</span> of{" "}
              <span className="text-white">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              {hasPrev ? (
                <Link
                  href={`/app/saved?page=${currentPage - 1}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10"
                >
                  ← Prev
                </Link>
              ) : (
                <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-500 opacity-60">
                  ← Prev
                </span>
              )}

              {hasNext ? (
                <Link
                  href={`/app/saved?page=${currentPage + 1}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10"
                >
                  Next →
                </Link>
              ) : (
                <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-500 opacity-60">
                  Next →
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
