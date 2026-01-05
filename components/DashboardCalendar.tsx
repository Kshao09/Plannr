"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";

type RSVPStatusLite = "GOING" | "MAYBE" | "DECLINED";

type CalendarItem = {
  id: string; // unique per occurrence (server sends eventId:occurrenceStart)
  title: string;
  slug: string;
  startAt: string; // ISO
  endAt: string; // ISO
  locationName: string | null;
  category: string | null;
  image: string | null;
  kind: "organized" | "attending";
  rsvpStatus?: RSVPStatusLite;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfWeekSunday(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  return addDays(x, -day);
}

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyMonth(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
}

function prettyTimeRange(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e0 = new Date(endIso);

  // If an event ends exactly at midnight, show it as ending at 12:00 AM but do NOT spill into next day indexing.
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(s);

  const t1 = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(s);
  const t2 = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(e0);
  return `${date} • ${t1} – ${t2}`;
}

// Treat end as exclusive for day-bucketing if it lands exactly on midnight
function normalizeEndForDayBucketing(start: Date, end: Date) {
  const e = new Date(end);
  const s = new Date(start);
  if (e.getTime() > s.getTime()) {
    const isMidnight =
      e.getHours() === 0 && e.getMinutes() === 0 && e.getSeconds() === 0 && e.getMilliseconds() === 0;
    if (isMidnight) return new Date(e.getTime() - 1);
  }
  return e;
}

function clampDaysForMultiDaySpan(start: Date, end: Date, maxDays = 10) {
  const days: string[] = [];
  let cur = startOfDay(start);

  const normEnd = normalizeEndForDayBucketing(start, end);
  const endDay = startOfDay(normEnd);

  for (let i = 0; i < maxDays; i++) {
    days.push(ymd(cur));
    if (ymd(cur) === ymd(endDay)) break;
    cur = addDays(cur, 1);
  }
  return days;
}

export default function DashboardCalendar() {
  const [month, setMonth] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // day drawer + event modal
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarItem | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Compute the 6-week grid range (42 cells)
  const { gridStart, gridEnd, cells } = useMemo(() => {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const gs = startOfWeekSunday(firstOfMonth);
    const ce: Date[] = [];
    for (let i = 0; i < 42; i++) ce.push(addDays(gs, i));
    const ge = addDays(gs, 42); // exclusive end
    return { gridStart: gs, gridEnd: ge, cells: ce };
  }, [month]);

  // Fetch events for the visible grid range
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    const qs =
      `?start=${encodeURIComponent(gridStart.toISOString())}` +
      `&end=${encodeURIComponent(gridEnd.toISOString())}`;

    fetch(`/api/dashboard/calendar${qs}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? res.statusText);
        }
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        setItems(Array.isArray(data?.events) ? data.events : []);
      })
      .catch((err: Error) => {
        if (ignore) return;
        setError(err.message);
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [gridStart, gridEnd]);

  // Index items by day (supports multi-day spans)
  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const s = new Date(it.startAt);
      const e = new Date(it.endAt);
      const keys = clampDaysForMultiDaySpan(s, e, 10);
      for (const k of keys) {
        const arr = map.get(k) ?? [];
        arr.push(it);
        map.set(k, arr);
      }
    }
    // sort within each day
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      map.set(k, arr);
    }
    return map;
  }, [items]);

  // Open/close dialog when activeEvent changes
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (activeEvent && !d.open) d.showModal();
    if (!activeEvent && d.open) d.close();
  }, [activeEvent]);

  function prevMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setActiveDay(null);
  }
  function nextMonth() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setActiveDay(null);
  }
  function goToday() {
    setMonth(new Date());
    setActiveDay(ymd(new Date()));
  }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-zinc-300">Loading calendar…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-600/30 bg-red-900/10 p-6">
        <div className="text-sm text-red-200">
          <span className="font-semibold">Calendar error:</span> {error}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Schedule</h2>
            <div className="mt-1 text-sm text-zinc-400">{prettyMonth(month)}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
            >
              Today
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
            >
              →
            </button>
          </div>
        </div>

        {/* Weekday labels */}
        <div className="mt-5 grid grid-cols-7 gap-2 text-xs text-zinc-400">
          {weekdayLabels.map((w) => (
            <div key={w} className="px-2">
              {w}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((d) => {
            const key = ymd(d);
            const inMonth = d.getMonth() === month.getMonth();
            const dayItems = itemsByDay.get(key) ?? [];
            const isActive = activeDay === key;

            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => setActiveDay(key)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setActiveDay(key);
                  }
                }}
                className={[
                  "min-h-[110px] rounded-2xl border p-3 text-left transition",
                  "focus:outline-none focus:ring-2 focus:ring-white/20",
                  inMonth
                    ? "border-white/10 bg-black/20 hover:bg-white/5"
                    : "border-white/5 bg-black/10 opacity-80 hover:opacity-100",
                  isActive ? "ring-2 ring-white/10" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <div className={inMonth ? "text-sm text-zinc-100" : "text-sm text-zinc-500"}>
                    {d.getDate()}
                  </div>
                  {dayItems.length ? (
                    <div className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-200">
                      {dayItems.length}
                    </div>
                  ) : null}
                </div>

                {/* Show up to 2 event “chips” */}
                <div className="mt-2 space-y-1">
                  {dayItems.slice(0, 2).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setActiveEvent(e);
                      }}
                      className={[
                        "w-full cursor-pointer truncate rounded-lg border px-2 py-1 text-left text-xs",
                        e.kind === "organized"
                          ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/15"
                          : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
                      ].join(" ")}
                      title={e.title}
                    >
                      {e.title}
                    </button>
                  ))}
                  {dayItems.length > 2 ? (
                    <div className="text-xs text-zinc-500">+ {dayItems.length - 2} more</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Day drawer */}
        {activeDay ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(`${activeDay}T12:00:00`))}
              </div>
              <button
                type="button"
                onClick={() => setActiveDay(null)}
                className="text-sm text-zinc-300 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {(itemsByDay.get(activeDay) ?? []).length === 0 ? (
                <div className="text-sm text-zinc-400">No events scheduled.</div>
              ) : (
                <ul className="space-y-2">
                  {(itemsByDay.get(activeDay) ?? []).map((e) => (
                    <li
                      key={e.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => setActiveEvent(e)}
                          className="text-left text-sm font-semibold text-zinc-100 hover:underline"
                        >
                          {e.title}
                        </button>
                        <div className="mt-1 text-xs text-zinc-400">
                          {prettyTimeRange(e.startAt, e.endAt)}
                          {e.locationName ? ` • ${e.locationName}` : ""}
                          {e.kind === "organized" ? " • Organized" : ` • ${e.rsvpStatus ?? "Attending"}`}
                        </div>
                      </div>

                      <span
                        className={[
                          "shrink-0 rounded-lg border px-2 py-1 text-[11px]",
                          e.kind === "organized"
                            ? "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100"
                            : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
                        ].join(" ")}
                      >
                        {e.kind === "organized" ? "Organizing" : "Attending"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* Event modal */}
      <dialog
        ref={dialogRef}
        onClose={() => setActiveEvent(null)}
        className="
          fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          m-0 w-[min(96vw,44rem)] max-h-[90vh] overflow-hidden
          rounded-3xl border border-white/10 bg-zinc-950 p-0 text-zinc-100 outline-none
          shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_30px_120px_rgba(0,0,0,0.8)]
          backdrop:bg-black/70 backdrop:backdrop-blur-md
        "
      >
        {activeEvent ? (
          <div className="p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-white">{activeEvent.title}</h3>
                <div className="mt-2 text-sm text-zinc-400">
                  {prettyTimeRange(activeEvent.startAt, activeEvent.endAt)}
                  {activeEvent.locationName ? ` • ${activeEvent.locationName}` : ""}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {activeEvent.kind === "organized"
                    ? "You’re organizing this event."
                    : `You’re attending (${activeEvent.rsvpStatus ?? "GOING"}).`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/public/events/${activeEvent.slug}`}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                View event
              </Link>

              {activeEvent.kind === "organized" ? (
                <Link
                  href={`/app/organizer/events/${activeEvent.slug}/edit`}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/15 to-cyan-500/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/25"
                >
                  Edit event
                </Link>
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              Tip: Click a day on the calendar to see all events for that date.
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
