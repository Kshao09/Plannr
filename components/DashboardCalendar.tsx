"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";

type CalendarItem = {
  id: string; // unique per occurrence
  title: string;
  slug: string;
  startAt: string; // ISO
  endAt: string; // ISO
  locationName: string | null;
  category: string | null;
  image: string | null;
  kind: "organized" | "attending";
  rsvpStatus?: string;
};

type DaySpan = {
  it: CalendarItem;
  startMin: number; // minutes from day start (clamped)
  endMin: number; // minutes from day start (clamped)
  lane: number; // 0..laneCount-1
};

type LaneLayout = {
  spans: DaySpan[];
  laneCount: number;
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
  const e = new Date(endIso);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(s);
  const t1 = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(s);
  const t2 = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(e);
  return `${date} • ${t1} – ${t2}`;
}

// Treat end as EXCLUSIVE for day bucketing by subtracting 1ms.
function endExclusiveForBucketing(end: Date) {
  const x = new Date(end);
  x.setMilliseconds(x.getMilliseconds() - 1);
  return x;
}

function clampDaysForMultiDaySpan(startInclusive: Date, endInclusive: Date, maxDays = 42) {
  const days: string[] = [];
  let cur = startOfDay(startInclusive);
  const endDay = startOfDay(endInclusive);

  for (let i = 0; i < maxDays; i++) {
    days.push(ymd(cur));
    if (ymd(cur) === ymd(endDay)) break;
    cur = addDays(cur, 1);
  }
  return days;
}

function minsFromDayStart(dayStart: Date, t: Date) {
  return Math.floor((t.getTime() - dayStart.getTime()) / 60000);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Assign lanes so overlapping events don't collide.
 * Greedy: keep track of lane end times; reuse the earliest lane that is free.
 */
function layoutDaySpans(spans: Omit<DaySpan, "lane">[]): LaneLayout {
  const sorted = [...spans].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const laneEnds: number[] = []; // endMin for each lane
  const out: DaySpan[] = [];

  for (const s of sorted) {
    // Find first lane that is free (end <= start)
    let lane = laneEnds.findIndex((end) => end <= s.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(s.endMin);
    } else {
      laneEnds[lane] = s.endMin;
    }
    out.push({ ...s, lane });
  }

  return { spans: out, laneCount: Math.max(1, laneEnds.length) };
}

export default function DashboardCalendar() {
  const [month, setMonth] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarItem | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const { gridStart, gridEnd, cells } = useMemo(() => {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const gs = startOfWeekSunday(firstOfMonth);
    const ce: Date[] = [];
    for (let i = 0; i < 42; i++) ce.push(addDays(gs, i));
    const ge = addDays(gs, 42); // exclusive end
    return { gridStart: gs, gridEnd: ge, cells: ce };
  }, [month]);

  const cellKeySet = useMemo(() => new Set(cells.map(ymd)), [cells]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    const qs = `?start=${gridStart.toISOString()}&end=${gridEnd.toISOString()}`;

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

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    for (const it of items) {
      const s = new Date(it.startAt);
      const e0 = new Date(it.endAt);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e0.getTime())) continue;
      if (e0.getTime() <= s.getTime()) continue;

      const e = endExclusiveForBucketing(e0);
      const keys = clampDaysForMultiDaySpan(s, e, 42);

      for (const k of keys) {
        if (!cellKeySet.has(k)) continue;
        const arr = map.get(k) ?? [];
        arr.push(it);
        map.set(k, arr);
      }
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      map.set(k, arr);
    }

    return map;
  }, [items, cellKeySet]);

  // Day timeline lane layout (this is what fixes your `.spans/.laneCount/.lane` errors)
  const activeDayLaneLayout: LaneLayout | null = useMemo(() => {
    if (!activeDay) return null;

    const dayStart = new Date(`${activeDay}T00:00:00`);
    const dayEnd = new Date(`${activeDay}T23:59:59.999`);
    const dayItems = itemsByDay.get(activeDay) ?? [];

    const rawSpans: Omit<DaySpan, "lane">[] = [];

    for (const it of dayItems) {
      const s = new Date(it.startAt);
      const e = new Date(it.endAt);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) continue;
      if (e.getTime() <= s.getTime()) continue;

      // intersect [dayStart, dayEnd]
      const start = s < dayStart ? dayStart : s;
      const end = e > dayEnd ? dayEnd : e;

      const startMin = clamp(minsFromDayStart(dayStart, start), 0, 1440);
      const endMin = clamp(minsFromDayStart(dayStart, end), 0, 1440);

      if (endMin <= startMin) continue;

      rawSpans.push({ it, startMin, endMin });
    }

    return layoutDaySpans(rawSpans);
  }, [activeDay, itemsByDay]);

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
    const t = new Date();
    setMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    setActiveDay(ymd(t));
  }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-6">
        <div className="text-sm text-zinc-600">Loading calendar…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="text-sm text-red-700">
          <span className="font-semibold">Calendar error:</span> {error}
        </div>
      </section>
    );
  }

  // Timeline sizing
  const viewStartMin = 6 * 60; // 6am
  const viewEndMin = 22 * 60; // 10pm
  const pxPerMin = 1.2;
  const timelineHeight = (viewEndMin - viewStartMin) * pxPerMin;

  return (
    <>
      <section className="rounded-3xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Schedule</h2>
            <div className="mt-1 text-sm text-zinc-600">{prettyMonth(month)}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              aria-label="Previous month"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              aria-label="Next month"
            >
              →
            </button>
          </div>
        </div>

        {/* Month grid */}
        <div className="mt-5 grid grid-cols-7 gap-2 text-xs text-zinc-500">
          {weekdayLabels.map((w) => (
            <div key={w} className="px-2">
              {w}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((d) => {
            const key = ymd(d);
            const inMonth = d.getMonth() === month.getMonth();
            const dayItems = itemsByDay.get(key) ?? [];
            const isActive = activeDay === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDay(key)}
                className={[
                  "min-h-[110px] rounded-2xl border p-3 text-left transition",
                  "focus:outline-none focus:ring-2 focus:ring-zinc-300",
                  inMonth
                    ? "border-zinc-200 bg-white hover:bg-zinc-50"
                    : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:bg-white",
                  isActive ? "ring-2 ring-zinc-200" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <div className={inMonth ? "text-sm text-zinc-900" : "text-sm text-zinc-500"}>{d.getDate()}</div>
                  {dayItems.length ? (
                    <div className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700">
                      {dayItems.length}
                    </div>
                  ) : null}
                </div>

                <div className="mt-2 space-y-1">
                  {dayItems.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setActiveEvent(e);
                      }}
                      className={[
                        "cursor-pointer truncate rounded-lg border px-2 py-1 text-xs",
                        e.kind === "organized"
                          ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100"
                          : "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100",
                      ].join(" ")}
                      title={e.title}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayItems.length > 2 ? <div className="text-xs text-zinc-500">+ {dayItems.length - 2} more</div> : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Day details + timeline */}
        {activeDay ? (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Agenda list */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-900">
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(`${activeDay}T12:00:00`))}
                </div>
                <button type="button" onClick={() => setActiveDay(null)} className="text-sm text-zinc-600 hover:text-zinc-900">
                  Close
                </button>
              </div>

              <div className="mt-4">
                {(itemsByDay.get(activeDay) ?? []).length === 0 ? (
                  <div className="text-sm text-zinc-600">No events scheduled.</div>
                ) : (
                  <ul className="space-y-2">
                    {(itemsByDay.get(activeDay) ?? []).map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setActiveEvent(e)}
                            className="block w-full truncate text-left text-sm font-semibold text-zinc-900 hover:underline"
                          >
                            {e.title}
                          </button>
                          <div className="mt-1 text-xs text-zinc-600">
                            {prettyTimeRange(e.startAt, e.endAt)}
                            {e.locationName ? ` • ${e.locationName}` : ""}
                            {e.kind === "organized" ? " • Organized" : ` • ${e.rsvpStatus ?? "Attending"}`}
                          </div>
                        </div>

                        <span
                          className={[
                            "shrink-0 rounded-lg border px-2 py-1 text-[11px]",
                            e.kind === "organized" ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900" : "border-sky-200 bg-sky-50 text-sky-900",
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

            {/* Timeline */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Day timeline</div>
                  <div className="mt-1 text-xs text-zinc-600">Overlaps are auto-stacked into lanes.</div>
                </div>
                <Link href="/public/events" className="text-sm font-semibold text-zinc-900 hover:underline">
                  Find events →
                </Link>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="relative flex">
                  {/* time labels */}
                  <div className="w-16 border-r border-zinc-200 bg-zinc-50">
                    <div style={{ height: timelineHeight }} className="relative">
                      {Array.from({ length: (viewEndMin - viewStartMin) / 60 + 1 }).map((_, i) => {
                        const m = viewStartMin + i * 60;
                        const hour = Math.floor(m / 60);
                        const label = new Date(2020, 1, 1, hour, 0).toLocaleTimeString("en-US", { hour: "numeric" });
                        const top = (m - viewStartMin) * pxPerMin;
                        return (
                          <div key={m} className="absolute left-0 right-0 pr-2 text-right text-[11px] text-zinc-500" style={{ top: top - 6 }}>
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* timeline canvas */}
                  <div className="relative flex-1">
                    <div style={{ height: timelineHeight }} className="relative">
                      {/* hour lines */}
                      {Array.from({ length: (viewEndMin - viewStartMin) / 60 + 1 }).map((_, i) => {
                        const m = viewStartMin + i * 60;
                        const top = (m - viewStartMin) * pxPerMin;
                        return <div key={m} className="absolute left-0 right-0 border-t border-zinc-100" style={{ top }} />;
                      })}

                      {/* event blocks */}
                      {activeDayLaneLayout
                        ? activeDayLaneLayout.spans.map((x) => {
                            const { it, startMin, endMin, lane } = x;

                            const laneCount = activeDayLaneLayout.laneCount;
                            const leftPct = (lane / laneCount) * 100;
                            const widthPct = 100 / laneCount;

                            const top = (startMin - viewStartMin) * pxPerMin;
                            const height = Math.max(18, (endMin - startMin) * pxPerMin);

                            // Skip blocks outside view window
                            if (endMin <= viewStartMin || startMin >= viewEndMin) return null;

                            return (
                              <button
                                key={`${it.id}-${it.startAt}-${it.endAt}-${lane}`}
                                type="button"
                                onClick={() => setActiveEvent(it)}
                                className={[
                                  "absolute rounded-xl border p-2 text-left shadow-sm transition hover:shadow",
                                  it.kind === "organized"
                                    ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900"
                                    : "border-sky-200 bg-sky-50 text-sky-900",
                                ].join(" ")}
                                style={{
                                  top,
                                  height,
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                }}
                                title={it.title}
                              >
                                <div className="truncate text-xs font-semibold">{it.title}</div>
                                <div className="mt-1 truncate text-[11px] opacity-80">
                                  {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(it.startAt))}
                                </div>
                              </button>
                            );
                          })
                        : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-zinc-600">
                Tip: Click a day above to populate this timeline, then click a block for details.
              </div>
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
          rounded-3xl border border-zinc-200 bg-white p-0 text-zinc-900 outline-none
          shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_30px_120px_rgba(0,0,0,0.22)]
          backdrop:bg-black/40 backdrop:backdrop-blur-md
        "
      >
        {activeEvent ? (
          <div className="p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-2xl font-semibold">{activeEvent.title}</h3>
                <div className="mt-2 text-sm text-zinc-600">
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
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/public/events/${activeEvent.slug}`}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                View event
              </Link>

              {activeEvent.kind === "organized" ? (
                <Link
                  href={`/app/organizer/events/${activeEvent.slug}/edit`}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-gradient-to-r from-fuchsia-100 via-indigo-50 to-sky-50 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Edit event
                </Link>
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              Tip: Use the timeline lanes to spot overlaps quickly.
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
