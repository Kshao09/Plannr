import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

import { getEventFilterOptions, getEvents } from "@/lib/events";
import EventsFilters from "@/components/EventFilters";
import Pagination from "@/components/Pagination";
import EventCard from "@/components/EventCard";
import type { EventLite } from "@/components/EventCard";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
type SavedIdRow = Prisma.SavedEventGetPayload<{ select: { eventId: true } }>;

function toArrayParam(v: string | string[] | undefined) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => x.split(",")).filter(Boolean);
  return v.split(",").filter(Boolean);
}

async function resolveUserContext(session: any): Promise<{ userId: string | null; role: "MEMBER" | "ORGANIZER" | null }> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const sessionEmail = (su as any)?.email as string | undefined;
  const sessionRole = (su as any)?.role as "MEMBER" | "ORGANIZER" | undefined;

  if (sessionId && sessionRole) return { userId: sessionId, role: sessionRole };

  if (sessionEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, role: true },
    });
    return { userId: dbUser?.id ?? sessionId ?? null, role: (sessionRole ?? dbUser?.role ?? null) as any };
  }

  return { userId: sessionId ?? null, role: sessionRole ?? null };
}

type EventsItem = {
  id: string;
  title: string;
  slug: string;
  startAt: string | Date;
  endAt?: string | Date | null;
  locationName?: string | null;
  category?: string | null;
  image?: string | null;
  organizer?: { name?: string | null } | null;
};

type EventsResponse = {
  page: number;
  totalPages: number;
  total: number;
  items: EventsItem[];
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<SP> | SP }) {
  const sp = await Promise.resolve(searchParams);

  const page = Number(sp.page ?? "1") || 1;
  const pageSize = Number(sp.pageSize ?? "8") || 8;

  const q = (sp.q as string) ?? "";
  const range = ((sp.range as string) ?? "upcoming") as any;
  const from = (sp.from as string) || undefined;
  const to = (sp.to as string) || undefined;

  const loc = toArrayParam(sp.loc);
  const category = toArrayParam(sp.category);

  // ✅ NEW: "By you"
  const mine = String(sp.mine ?? "") === "1";

  const session = await auth();
  const { userId, role } = session?.user ? await resolveUserContext(session) : { userId: null, role: null };
  const showMine = role === "ORGANIZER" && !!userId;

  const [data, options] = await Promise.all([
    getEvents({
      page,
      pageSize,
      q,
      range,
      from,
      to,
      loc,
      category,
      organizerId: mine && userId ? userId : undefined,
    }) as Promise<EventsResponse>,
    getEventFilterOptions(),
  ]);

  const ids = data.items.map((x) => x.id);

  const savedRows: SavedIdRow[] =
    userId && ids.length
      ? await prisma.savedEvent.findMany({
          where: { userId, eventId: { in: ids } },
          select: { eventId: true },
        })
      : [];

  const savedSet = new Set<string>(savedRows.map((r) => r.eventId));

  const cards: EventLite[] = data.items.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    startAt: new Date(e.startAt).toISOString(),
    endAt: e.endAt ? new Date(e.endAt).toISOString() : null,
    locationName: e.locationName ?? null,
    category: e.category ?? null,
    image: e.image ?? null,
    organizerName: e.organizer?.name ?? null,
    isSaved: savedSet.has(e.id),
  }));

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/app/dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50"
          >
            ←
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight">Events</h1>
        </div>

        <EventsFilters locations={options.locations} categories={options.categories} showMine={showMine} />

        {cards.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900">
            No events match your filters.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        )}

        <div className="mt-8">
          <Pagination page={data.page} totalPages={data.totalPages} />
          <div className="mt-3 text-xs text-zinc-700">
            Showing page {data.page} of {data.totalPages} • {data.total} results
          </div>
        </div>
      </div>
    </div>
  );
}
