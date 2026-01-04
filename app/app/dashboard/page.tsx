import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import DashboardCalendar from "@/components/DashboardCalendar";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

async function getUserContext(session: any) {
  const sessionUser = session?.user ?? {};
  const sessionId = sessionUser?.id as string | undefined;
  const sessionEmail = sessionUser?.email as string | undefined;
  const sessionRole = (sessionUser as any)?.role as string | undefined;

  let dbUser:
    | { id: string; role: "MEMBER" | "ORGANIZER"; name: string | null; email: string | null }
    | null = null;

  if (!sessionId && sessionEmail) {
    dbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, role: true, name: true, email: true },
    });
  }

  const userId = sessionId ?? dbUser?.id;
  const role = (sessionRole ?? dbUser?.role ?? "MEMBER") as "MEMBER" | "ORGANIZER";
  const name = (sessionUser?.name as string | undefined) ?? dbUser?.name ?? null;
  const email = (sessionEmail ?? dbUser?.email ?? null) as string | null;

  return { userId, role, name, email };
}

type UpcomingEventRow = Prisma.EventGetPayload<{
  select: {
    id: true;
    slug: true;
    title: true;
    startAt: true;
    locationName: true;
    organizer: { select: { name: true } };
  };
}>;

type MyRsvpRow = Prisma.RSVPGetPayload<{
  select: {
    status: true;
    updatedAt: true;
    event: {
      select: {
        slug: true;
        title: true;
        startAt: true;
        locationName: true;
      };
    };
  };
}>;

type MyEventRow = Prisma.EventGetPayload<{
  select: { slug: true; title: true; startAt: true };
}>;

type SavedPreviewRow = Prisma.SavedEventGetPayload<{
  select: {
    createdAt: true;
    event: {
      select: {
        slug: true;
        title: true;
        startAt: true;
        locationName: true;
      };
    };
  };
}>;

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?next=/app/dashboard");
  }

  const { userId, role, name } = await getUserContext(session);

  if (!userId) {
    redirect("/login?next=/app/dashboard");
  }

  const now = new Date();

  // ✅ Strongly type each promise so arrays don't become `any[]`
  const upcomingEventsPromise: Promise<UpcomingEventRow[]> = prisma.event.findMany({
    where: { startAt: { gte: now } },
    orderBy: { startAt: "asc" },
    take: 6,
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      locationName: true,
      organizer: { select: { name: true } },
    },
  });

  const myRsvpsPromise: Promise<MyRsvpRow[]> = prisma.rSVP.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: {
      status: true,
      updatedAt: true,
      event: {
        select: { slug: true, title: true, startAt: true, locationName: true },
      },
    },
  });

  const myEventsPromise: Promise<MyEventRow[]> =
    role === "ORGANIZER"
      ? prisma.event.findMany({
          where: { organizerId: userId },
          orderBy: { startAt: "desc" },
          take: 6,
          select: { slug: true, title: true, startAt: true },
        })
      : Promise.resolve([] as MyEventRow[]);

  const savedCountPromise: Promise<number> = prisma.savedEvent.count({
    where: { userId },
  });

  const savedPreviewPromise: Promise<SavedPreviewRow[]> = prisma.savedEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      createdAt: true,
      event: {
        select: {
          slug: true,
          title: true,
          startAt: true,
          locationName: true,
        },
      },
    },
  });

  const [upcomingEvents, myRsvps, myEvents, savedCount, savedPreview] = await Promise.all([
    upcomingEventsPromise,
    myRsvpsPromise,
    myEventsPromise,
    savedCountPromise,
    savedPreviewPromise,
  ]);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const isOrganizer = role === "ORGANIZER";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Welcome{name ? `, ${name}` : ""}. •{" "}
            <span className="text-zinc-200">{isOrganizer ? "Organizer" : "Member"}</span>
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ✅ Calendar */}
        <div className="lg:col-span-3">
          <DashboardCalendar />
        </div>

        {/* Upcoming events */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Upcoming events</h2>
            <Link className="text-sm text-zinc-200 hover:underline" href="/public/events">
              View all
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">No upcoming events yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link className="text-zinc-100 hover:underline" href={`/public/events/${e.slug}`}>
                        {e.title}
                      </Link>
                      <div className="mt-1 text-xs text-zinc-400">
                        {fmt(e.startAt)}
                        {e.locationName ? ` • ${e.locationName}` : ""}
                        {e.organizer?.name ? ` • by ${e.organizer.name}` : ""}
                      </div>
                    </div>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-200">
                      Upcoming
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* My RSVPs */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">My RSVPs</h2>

          {myRsvps.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">You haven’t RSVP’d to anything yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myRsvps.map((r) => (
                <li
                  key={`${r.event.slug}-${r.updatedAt.toISOString()}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <Link className="text-zinc-100 hover:underline" href={`/public/events/${r.event.slug}`}>
                    {r.event.title}
                  </Link>
                  <div className="mt-1 text-xs text-zinc-400">
                    {fmt(r.event.startAt)}
                    {r.event.locationName ? ` • ${r.event.locationName}` : ""}
                  </div>
                  <div className="mt-2 text-xs">
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-200">
                      {r.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ✅ My Saved Events */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">My Saved Events</h2>
              <p className="mt-1 text-xs text-zinc-400">Quick access to your bookmarks.</p>
            </div>
            <Link className="text-sm text-zinc-200 hover:underline" href="/app/saved">
              View saved ({savedCount})
            </Link>
          </div>

          {savedPreview.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">You haven’t saved any events yet.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {savedPreview.map((s) => (
                <li
                  key={`${s.event.slug}-${s.createdAt.toISOString()}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <Link className="text-zinc-100 hover:underline" href={`/public/events/${s.event.slug}`}>
                    {s.event.title}
                  </Link>
                  <div className="mt-1 text-xs text-zinc-400">
                    {fmt(s.event.startAt)}
                    {s.event.locationName ? ` • ${s.event.locationName}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Organizer: My events */}
        {isOrganizer ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-3">
            <h2 className="text-lg font-semibold text-white">My events</h2>

            {myEvents.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-400">You haven’t created any events yet.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {myEvents.map((e) => (
                  <li key={e.slug} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <Link className="text-zinc-100 hover:underline" href={`/public/events/${e.slug}`}>
                      {e.title}
                    </Link>
                    <div className="mt-1 text-xs text-zinc-400">{fmt(e.startAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
