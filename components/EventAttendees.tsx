import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Props = {
  eventId: string;
  slug: string;
  canManage: boolean;
};

type RSVPRow = Prisma.RSVPGetPayload<{
  select: {
    status: true;
    createdAt: true;
    user: { select: { id: true; name: true; email: true } };
  };
}>;

export default async function EventAttendees({ eventId, slug, canManage }: Props) {
  if (!canManage) return null;

  const rsvps: RSVPRow[] = await prisma.rSVP.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: {
      status: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const counts = {
    GOING: 0,
    MAYBE: 0,
    DECLINED: 0,
  };

  for (const r of rsvps) {
    if (r.status === "GOING") counts.GOING++;
    else if (r.status === "MAYBE") counts.MAYBE++;
    else if (r.status === "DECLINED") counts.DECLINED++;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Attendees</div>
          <div className="mt-1 text-xs text-zinc-400">
            Going <span className="text-zinc-200">{counts.GOING}</span> • Maybe{" "}
            <span className="text-zinc-200">{counts.MAYBE}</span> • Declined{" "}
            <span className="text-zinc-200">{counts.DECLINED}</span>
          </div>
        </div>

        <Link
          href={`/api/events/${slug}/attendees.csv`}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
        >
          Download CSV
        </Link>
      </div>

      {rsvps.length === 0 ? (
        <div className="mt-4 text-sm text-zinc-400">No RSVPs yet.</div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rsvps.map((r, i) => (
            <li
              key={`${r.user.id}-${r.createdAt.toISOString()}-${i}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-100">
                  {r.user.name || "Unnamed user"}
                </div>
                <div className="truncate text-xs text-zinc-400">
                  {r.user.email ? (
                    <a className="hover:underline" href={`mailto:${r.user.email}`}>
                      {r.user.email}
                    </a>
                  ) : (
                    "No email"
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-200">
                  {r.status}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
