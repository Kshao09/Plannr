import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import DashboardCalendar from "@/components/DashboardCalendar";
import DashboardInteractive from "@/components/DashboardInteractive";
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
    category: true;
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
        category: true;
      };
    };
  };
}>;

type MyEventRow = Prisma.EventGetPayload<{
  select: { slug: true; title: true; startAt: true; category: true };
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
        category: true;
      };
    };
  };
}>;

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/login?next=/app/dashboard");

  const { userId, role, name } = await getUserContext(session);
  if (!userId) redirect("/login?next=/app/dashboard");

  const isOrganizer = role === "ORGANIZER";
  const now = new Date();

  const upcomingEventsPromise: Promise<UpcomingEventRow[]> = prisma.event.findMany({
    where: { startAt: { gte: now } },
    orderBy: { startAt: "asc" },
    take: 12,
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      locationName: true,
      category: true,
      organizer: { select: { name: true } },
    },
  });

  const upcomingCountPromise = prisma.event.count({
    where: { startAt: { gte: now } },
  });

  const myRsvpsPromise: Promise<MyRsvpRow[]> = prisma.rSVP.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      status: true,
      updatedAt: true,
      event: {
        select: { slug: true, title: true, startAt: true, locationName: true, category: true },
      },
    },
  });

  const myRsvpCountPromise = prisma.rSVP.count({ where: { userId } });

  const myEventsPromise: Promise<MyEventRow[]> =
    isOrganizer
      ? prisma.event.findMany({
          where: { organizerId: userId },
          orderBy: { startAt: "desc" },
          take: 20,
          select: { slug: true, title: true, startAt: true, category: true },
        })
      : Promise.resolve([] as MyEventRow[]);

  const myEventsCountPromise = isOrganizer
    ? prisma.event.count({ where: { organizerId: userId } })
    : Promise.resolve(0);

  const savedCountPromise: Promise<number> = prisma.savedEvent.count({ where: { userId } });

  const savedPreviewPromise: Promise<SavedPreviewRow[]> = prisma.savedEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      createdAt: true,
      event: {
        select: { slug: true, title: true, startAt: true, locationName: true, category: true },
      },
    },
  });

  const [
    upcomingEvents,
    upcomingCount,
    myRsvps,
    myRsvpCount,
    myEvents,
    myEventsCount,
    savedCount,
    savedPreview,
  ] = await Promise.all([
    upcomingEventsPromise,
    upcomingCountPromise,
    myRsvpsPromise,
    myRsvpCountPromise,
    myEventsPromise,
    myEventsCountPromise,
    savedCountPromise,
    savedPreviewPromise,
  ]);

  // Pass plain JSON-safe data to the client (Dates => ISO strings)
  const upcomingForClient = upcomingEvents.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    startAt: e.startAt.toISOString(),
    locationName: e.locationName,
    category: e.category ?? null,
    organizerName: e.organizer?.name ?? null,
  }));

  const rsvpsForClient = myRsvps.map((r) => ({
    status: r.status,
    updatedAt: r.updatedAt.toISOString(),
    event: {
      slug: r.event.slug,
      title: r.event.title,
      startAt: r.event.startAt.toISOString(),
      locationName: r.event.locationName,
      category: r.event.category ?? null,
    },
  }));

  const myEventsForClient = myEvents.map((e) => ({
    slug: e.slug,
    title: e.title,
    startAt: e.startAt.toISOString(),
    category: e.category ?? null,
  }));

  const savedForClient = savedPreview.map((s) => ({
    createdAt: s.createdAt.toISOString(),
    event: {
      slug: s.event.slug,
      title: s.event.title,
      startAt: s.event.startAt.toISOString(),
      locationName: s.event.locationName,
      category: s.event.category ?? null,
    },
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-zinc-50 text-zinc-900">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-[-120px] h-[420px] w-[520px] rounded-full bg-fuchsia-500/10 blur-[90px]" />
        <div className="absolute right-[-240px] top-[80px] h-[440px] w-[560px] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute left-[20%] top-[620px] h-[520px] w-[680px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#111827_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Planner dashboard
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
              Welcome{name ? `, ${name}` : ""}.
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Role:{" "}
              <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-800">
                {isOrganizer ? "Organizer" : "Member"}
              </span>
              <span className="text-zinc-400"> • </span>
              Updated {fmt(new Date())}
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              href="/public/events"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
            >
              Browse events
            </Link>

            {isOrganizer ? (
              <Link
                href="/app/organizer/create"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-50"
              >
                Create event
              </Link>
            ) : (
              <Link
                href="/signup"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
              >
                Become an organizer
              </Link>
            )}

            <Link
              href="/app/saved"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
            >
              Saved ({savedCount})
            </Link>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50">
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Upcoming events"
            value={String(upcomingCount)}
            hint="Across the platform"
            tone="cyan"
          />
          <StatCard
            title="My RSVPs"
            value={String(myRsvpCount)}
            hint="Your commitments"
            tone="emerald"
          />
          <StatCard
            title="Saved"
            value={String(savedCount)}
            hint="Bookmarks to revisit"
            tone="amber"
          />
          <StatCard
            title="My events"
            value={isOrganizer ? String(myEventsCount) : "—"}
            hint={isOrganizer ? "You published" : "Organizer-only"}
            tone="fuchsia"
          />
        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Calendar (big) */}
          <section className="lg:col-span-8">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Calendar</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    See your week and plan around time blocks.
                  </p>
                </div>
                <Link
                  href="/public/events"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Find events →
                </Link>
              </div>

              <div className="mt-5">
                {/* If DashboardCalendar is still dark internally, you’ll need to update its classes too. */}
                <DashboardCalendar />
              </div>
            </div>
          </section>

          {/* Interactive panels */}
          <section className="lg:col-span-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
              <h2 className="text-lg font-semibold text-zinc-900">Planner</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Search, sort, and jump between your lists.
              </p>

              <div className="mt-5">
                <DashboardInteractive
                  isOrganizer={isOrganizer}
                  upcoming={upcomingForClient}
                  rsvps={rsvpsForClient}
                  saved={savedForClient}
                  myEvents={myEventsForClient}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Bottom “next steps” */}
        <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Next best actions</h3>
              <p className="mt-1 text-sm text-zinc-600">
                Keep your schedule clean: RSVP without conflicts and save ideas for later.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/public/events"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Explore by time
              </Link>
              <Link
                href="/app/saved"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Review saved
              </Link>
              {isOrganizer ? (
                <Link
                  href="/app/organizer/create"
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-50"
                >
                  Publish an event
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string;
  hint?: string;
  tone: "cyan" | "emerald" | "amber" | "fuchsia";
}) {
  const toneClass =
    tone === "cyan"
      ? "bg-cyan-50 border-cyan-200"
      : tone === "emerald"
      ? "bg-emerald-50 border-emerald-200"
      : tone === "amber"
      ? "bg-amber-50 border-amber-200"
      : "bg-fuchsia-50 border-fuchsia-200";

  return (
    <div className={`rounded-3xl border ${toneClass} p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)]`}>
      <div className="text-sm font-medium text-zinc-700">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-zinc-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-600">{hint}</div> : null}
    </div>
  );
}
