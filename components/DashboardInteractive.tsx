"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type UpcomingLite = {
  id: string;
  slug: string;
  title: string;
  startAt: string; // ISO
  locationName: string | null;
  category: string | null;
  organizerName: string | null;
};

type RsvpLite = {
  status: string;
  updatedAt: string; // ISO
  event: {
    slug: string;
    title: string;
    startAt: string; // ISO
    locationName: string | null;
    category: string | null;
  };
};

type SavedLite = {
  createdAt: string; // ISO
  event: {
    slug: string;
    title: string;
    startAt: string; // ISO
    locationName: string | null;
    category: string | null;
  };
};

type MyEventLite = {
  slug: string;
  title: string;
  startAt: string; // ISO
  category: string | null;
};

function fmtWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s.includes("going")
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : s.includes("maybe")
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-zinc-200 bg-zinc-50 text-zinc-800";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
}

export default function DashboardInteractive({
  isOrganizer,
  upcoming,
  rsvps,
  saved,
  myEvents,
}: {
  isOrganizer: boolean;
  upcoming: UpcomingLite[];
  rsvps: RsvpLite[];
  saved: SavedLite[];
  myEvents: MyEventLite[];
}) {
  const tabs = useMemo(() => {
    const base = [
      { key: "upcoming", label: "Agenda" },
      { key: "rsvps", label: "RSVPs" },
      { key: "saved", label: "Saved" },
    ] as const;
    return isOrganizer ? [...base, { key: "mine", label: "My events" } as const] : base;
  }, [isOrganizer]);

  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("upcoming");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"soon" | "recent">("soon");

  const query = q.trim().toLowerCase();

  const filteredUpcoming = useMemo(() => {
    const list = upcoming.filter((e) => {
      if (!query) return true;
      return (
        e.title.toLowerCase().includes(query) ||
        (e.locationName ?? "").toLowerCase().includes(query) ||
        (e.category ?? "").toLowerCase().includes(query) ||
        (e.organizerName ?? "").toLowerCase().includes(query)
      );
    });

    return list.sort((a, b) => {
      const da = +new Date(a.startAt);
      const db = +new Date(b.startAt);
      return sort === "soon" ? da - db : db - da;
    });
  }, [upcoming, query, sort]);

  const filteredRsvps = useMemo(() => {
    const list = rsvps.filter((r) => {
      if (!query) return true;
      return (
        r.event.title.toLowerCase().includes(query) ||
        (r.event.locationName ?? "").toLowerCase().includes(query) ||
        (r.event.category ?? "").toLowerCase().includes(query) ||
        r.status.toLowerCase().includes(query)
      );
    });

    return list.sort((a, b) => {
      const da = sort === "soon" ? +new Date(a.event.startAt) : +new Date(a.updatedAt);
      const db = sort === "soon" ? +new Date(b.event.startAt) : +new Date(b.updatedAt);
      return db - da; // “recent” feels best for rsvps; keep descending
    });
  }, [rsvps, query, sort]);

  const filteredSaved = useMemo(() => {
    const list = saved.filter((s) => {
      if (!query) return true;
      return (
        s.event.title.toLowerCase().includes(query) ||
        (s.event.locationName ?? "").toLowerCase().includes(query) ||
        (s.event.category ?? "").toLowerCase().includes(query)
      );
    });

    return list.sort((a, b) => {
      const da = sort === "soon" ? +new Date(a.event.startAt) : +new Date(a.createdAt);
      const db = sort === "soon" ? +new Date(b.event.startAt) : +new Date(b.createdAt);
      return da - db;
    });
  }, [saved, query, sort]);

  const filteredMine = useMemo(() => {
    const list = myEvents.filter((e) => {
      if (!query) return true;
      return e.title.toLowerCase().includes(query) || (e.category ?? "").toLowerCase().includes(query);
    });

    return list.sort((a, b) => {
      const da = +new Date(a.startAt);
      const db = +new Date(b.startAt);
      return sort === "soon" ? da - db : db - da;
    });
  }, [myEvents, query, sort]);

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                tab === t.key
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, category, location…"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
          >
            <option value="soon">Soonest</option>
            <option value="recent">Recent</option>
          </select>
        </div>
      </div>

      {/* content */}
      <div className="space-y-3">
        {tab === "upcoming" ? (
          <>
            {filteredUpcoming.length === 0 ? (
              <Empty text="No upcoming events match your search." />
            ) : (
              <ul className="space-y-2">
                {filteredUpcoming.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/public/events/${e.slug}`}
                      className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:bg-zinc-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-zinc-900">{e.title}</div>
                          <div className="mt-1 text-sm text-zinc-600">
                            {fmtWhen(e.startAt)}
                            {e.locationName ? ` • ${e.locationName}` : ""}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {e.category ? <Chip>{e.category}</Chip> : null}
                            {e.organizerName ? <Chip>By {e.organizerName}</Chip> : null}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
                          Open →
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/public/events" className="inline-flex text-sm font-semibold text-zinc-900 hover:underline">
              See all events →
            </Link>
          </>
        ) : null}

        {tab === "rsvps" ? (
          <>
            {filteredRsvps.length === 0 ? (
              <Empty text="No RSVPs match your search." />
            ) : (
              <ul className="space-y-2">
                {filteredRsvps.slice(0, 10).map((r) => (
                  <li key={`${r.event.slug}-${r.updatedAt}`}>
                    <Link
                      href={`/public/events/${r.event.slug}`}
                      className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:bg-zinc-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-zinc-900">{r.event.title}</div>
                          <div className="mt-1 text-sm text-zinc-600">
                            {fmtWhen(r.event.startAt)}
                            {r.event.locationName ? ` • ${r.event.locationName}` : ""}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusPill status={r.status} />
                            {r.event.category ? <Chip>{r.event.category}</Chip> : null}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-zinc-500">
                          Updated {new Date(r.updatedAt).toLocaleDateString("en-US")}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        {tab === "saved" ? (
          <>
            {filteredSaved.length === 0 ? (
              <Empty text="No saved events match your search." />
            ) : (
              <ul className="space-y-2">
                {filteredSaved.slice(0, 10).map((s) => (
                  <li key={`${s.event.slug}-${s.createdAt}`}>
                    <Link
                      href={`/public/events/${s.event.slug}`}
                      className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:bg-zinc-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-zinc-900">{s.event.title}</div>
                          <div className="mt-1 text-sm text-zinc-600">
                            {fmtWhen(s.event.startAt)}
                            {s.event.locationName ? ` • ${s.event.locationName}` : ""}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {s.event.category ? <Chip>{s.event.category}</Chip> : null}
                            <Chip>Saved</Chip>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
                          Open →
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link href="/app/saved" className="inline-flex text-sm font-semibold text-zinc-900 hover:underline">
              Manage saved →
            </Link>
          </>
        ) : null}

        {tab === "mine" ? (
          <>
            {filteredMine.length === 0 ? (
              <Empty text="No events match your search." />
            ) : (
              <ul className="space-y-2">
                {filteredMine.slice(0, 10).map((e) => (
                  <li key={e.slug}>
                    <Link
                      href={`/public/events/${e.slug}`}
                      className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:bg-zinc-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-zinc-900">{e.title}</div>
                          <div className="mt-1 text-sm text-zinc-600">{fmtWhen(e.startAt)}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {e.category ? <Chip>{e.category}</Chip> : null}
                            <Chip>Organizer</Chip>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
                          View →
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link href="/app/organizer/create" className="inline-flex text-sm font-semibold text-zinc-900 hover:underline">
              Create a new event →
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
      {text}
    </div>
  );
}
