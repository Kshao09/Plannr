"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { broadcastRsvpUpdate, getTabId, subscribeRsvpUpdates } from "@/lib/broadcast";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED" | null;
type AttendanceState = "CONFIRMED" | "WAITLISTED" | null;

type Conflict = {
  slug: string;
  title: string;
  startAt: string | Date;
  endAt: string | Date;
  kind?: "rsvp" | "organized";
};

function toDate(d: string | Date) {
  return d instanceof Date ? d : new Date(d);
}

function fmt(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function ConflictModal({
  open,
  loading,
  message,
  conflicts,
  onClose,
  onDecline,
}: {
  open: boolean;
  loading: boolean;
  message?: string;
  conflicts: Conflict[];
  onClose: () => void;
  onDecline: () => void;
}) {
  if (!open) return null;

  const title = "Schedule conflict";
  const desc =
    message?.trim() ||
    "You can’t RSVP “Going” or “Maybe” to overlapping events. Decline this event or update your other RSVP.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        disabled={loading}
      />

      {/* Panel */}
      <div className="relative w-[92vw] max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="space-y-2">
          <h3 id="conflict-title" className="text-lg font-semibold text-white">
            {title}
          </h3>
          <p className="text-sm text-zinc-300">{desc}</p>
        </div>

        {conflicts?.length ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Conflicts
            </div>
            <ul className="space-y-2">
              {conflicts.slice(0, 5).map((c) => {
                const s = fmt(toDate(c.startAt));
                const e = fmt(toDate(c.endAt));
                const tag =
                  c.kind === "organized" ? "Organizing" : c.kind === "rsvp" ? "RSVP" : "Busy";
                return (
                  <li key={`${c.slug}-${s}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{c.title}</div>
                        <div className="mt-1 text-xs text-zinc-300">
                          {s} → {e}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-200">
                        {tag}
                      </span>
                    </div>

                    <div className="mt-2">
                      <Link
                        href={`/public/events/${encodeURIComponent(c.slug)}`}
                        className="text-xs font-semibold text-blue-200 hover:underline"
                      >
                        View event
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/app/dashboard"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10"
          >
            Open calendar
          </Link>

          <button
            type="button"
            onClick={onDecline}
            disabled={loading}
            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
          >
            Decline this event
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventRSVP({
  slug,
  initial,
  disabled,
  disabledReason,
}: {
  slug: string;
  initial: { status: RSVPStatus; attendanceState: AttendanceState };
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [status, setStatus] = useState<RSVPStatus>(initial.status);
  const [attendanceState, setAttendanceState] = useState<AttendanceState>(initial.attendanceState);
  const [pending, startTransition] = useTransition();

  // conflict modal state
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | undefined>(undefined);
  const [conflictList, setConflictList] = useState<Conflict[]>([]);
  const [_attempted, setAttempted] = useState<RSVPStatus>(null);

  // sync across tabs/windows
  useEffect(() => {
    const unsub = subscribeRsvpUpdates((msg) => {
      if (msg?.type !== "rsvp:update") return;
      if (msg.slug !== slug) return;
      if (msg.sender === getTabId()) return;

      setStatus(msg.status);
      setAttendanceState(msg.attendanceState);
      router.refresh();
    });
    return unsub;
  }, [slug, router]);

  function label(s: RSVPStatus) {
    return s ?? "Not set";
  }

  function makeIdempotencyKey() {
    // one key per click attempt
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function update(next: Exclude<RSVPStatus, null>) {
    startTransition(async () => {
      const prevStatus = status;
      const prevState = attendanceState;

      setAttempted(next);

      // optimistic
      setStatus(next);
      setAttendanceState(next === "GOING" ? "CONFIRMED" : null);

      try {
        const res = await fetch(`/api/events/${slug}/rsvp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": makeIdempotencyKey(),
          },
          body: JSON.stringify({ status: next }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus(prevStatus);
          setAttendanceState(prevState);

          // rate limit
          if (res.status === 429) {
            toast.error(data?.message ?? "Too many requests. Try again shortly.");
            return;
          }

          // conflict / inflight / capacity full
          if (res.status === 409) {
            const conflicts = Array.isArray(data?.conflicts) ? (data.conflicts as Conflict[]) : [];
            if (conflicts.length) {
              setConflictMessage(data?.message);
              setConflictList(conflicts);
              setConflictOpen(true);
              return;
            }
            toast.error(data?.message ?? "Conflict. Please try again.");
            return;
          }

          toast.error(data?.message ?? "Failed to update RSVP.");
          return;
        }

        const nextStatus = (data?.rsvp?.status ?? next) as RSVPStatus;
        const nextState = (data?.rsvp?.attendanceState ?? null) as AttendanceState;

        setStatus(nextStatus);
        setAttendanceState(nextState);

        // sync other tabs
        broadcastRsvpUpdate({ slug, status: nextStatus, attendanceState: nextState });

        if (nextStatus === "GOING" && nextState === "WAITLISTED") {
          toast.success("You’re on the waitlist ✅");
        } else {
          toast.success(
            nextStatus === "GOING"
              ? "RSVP set to Going ✅"
              : nextStatus === "MAYBE"
              ? "RSVP set to Maybe 🤔"
              : "RSVP set to Declined 🚫"
          );
        }

        router.refresh();
      } catch (e: any) {
        setStatus(prevStatus);
        setAttendanceState(prevState);
        toast.error(e?.message ?? "Network error.");
      }
    });
  }

  const base =
    "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:opacity-60 disabled:hover:bg-white/5";
  const active = "border-white/20 bg-white/10 ring-2 ring-white/10";

  const computedDisabled = !!disabled || pending;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-white">RSVP</div>
          {status === "GOING" && attendanceState === "WAITLISTED" ? (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
              Waitlisted
            </span>
          ) : null}
        </div>

        <div className="text-xs text-zinc-400">
          {pending ? "Saving..." : `Current: ${label(status)}`}
        </div>
      </div>

      {disabledReason ? (
        <div className="mb-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
          {disabledReason}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={computedDisabled}
          onClick={() => update("GOING")}
          className={`${base} ${status === "GOING" ? active : ""}`}
        >
          Going
        </button>

        <button
          type="button"
          disabled={computedDisabled}
          onClick={() => update("MAYBE")}
          className={`${base} ${status === "MAYBE" ? active : ""}`}
        >
          Maybe
        </button>

        <button
          type="button"
          disabled={computedDisabled}
          onClick={() => update("DECLINED")}
          className={`${base} ${status === "DECLINED" ? active : ""}`}
        >
          Decline
        </button>
      </div>

      <ConflictModal
        open={conflictOpen}
        loading={pending}
        message={conflictMessage}
        conflicts={conflictList}
        onClose={() => {
          if (!pending) setConflictOpen(false);
        }}
        onDecline={() => {
          if (pending) return;
          setConflictOpen(false);
          update("DECLINED");
        }}
      />
    </div>
  );
}
