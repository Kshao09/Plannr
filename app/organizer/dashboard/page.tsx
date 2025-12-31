// app/organizer/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  return { userId, role, name };
}

export default async function OrganizerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/organizer/dashboard");

  const { userId, role, name } = await getUserContext(session);
  if (!userId) redirect("/login?next=/organizer/dashboard");
  if (role !== "ORGANIZER") redirect("/app/dashboard");

  const events = await prisma.event.findMany({
    where: { organizerId: userId },
    orderBy: { startAt: "desc" },
    take: 30,
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      endAt: true,
      locationName: true,
      capacity: true,
      waitlistEnabled: true,
    },
  });

  // counts for confirmed/waitlist (simple + reliable)
  const countsByEventId = new Map<
    string,
    { confirmed: number; waitlisted: number; checkedIn: number }
  >();

  await Promise.all(
    events.map(async (e) => {
      const [confirmed, waitlisted, checkedIn] = await Promise.all([
        prisma.rSVP.count({
          where: {
            eventId: e.id,
            status: "GOING",
            attendanceState: "CONFIRMED",
          },
        }),
        prisma.rSVP.count({
          where: {
            eventId: e.id,
            status: "GOING",
            attendanceState: "WAITLISTED",
          },
        }),
        prisma.rSVP.count({
          where: {
            eventId: e.id,
            status: "GOING",
            attendanceState: "CONFIRMED",
            checkedInAt: { not: null },
          },
        }),
      ]);

      countsByEventId.set(e.id, { confirmed, waitlisted, checkedIn });
    })
  );

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Organizer dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Welcome{name ? `, ${name}` : ""}. Manage your events, capacity/waitlist, and check-ins.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/organizer/create"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            + Create event
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">My events</h2>
          <Link className="text-sm text-zinc-200 hover:underline" href="/public/events">
            Public events page →
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">You haven’t created any events yet.</p>
        ) : (
          <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {events.map((e) => {
              const c = countsByEventId.get(e.id) ?? { confirmed: 0, waitlisted: 0, checkedIn: 0 };
              const capText =
                e.capacity != null ? `${c.confirmed} / ${e.capacity}` : `${c.confirmed}`;

              return (
                <li
                  key={e.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-white">{e.title}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {fmt(e.startAt)}
                        {e.locationName ? ` • ${e.locationName}` : ""}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-200">
                          Confirmed: <b className="text-white">{capText}</b>
                        </span>

                        {e.waitlistEnabled ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-200">
                            Waitlist: <b className="text-white">{c.waitlisted}</b>
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-400">
                            Waitlist off
                          </span>
                        )}

                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                          Checked in: <b className="text-emerald-100">{c.checkedIn}</b>
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/public/events/${e.slug}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
                    >
                      View ↗
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/organizer/events/${e.slug}/edit`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
                    >
                      Edit
                    </Link>

                    <Link
                      href={`/organizer/events/${e.slug}/checkin`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
                    >
                      Check-in
                    </Link>

                    <Link
                      href={`/api/events/${e.slug}/attendees.csv`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
                    >
                      Download attendees CSV
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
