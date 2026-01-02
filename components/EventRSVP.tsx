"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED" | null;
type AttendanceState = "CONFIRMED" | "WAITLISTED" | null;

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

  function label(s: RSVPStatus) {
    return s ?? "Not set";
  }

  async function update(next: Exclude<RSVPStatus, null>) {
    startTransition(async () => {
      const prevStatus = status;
      const prevState = attendanceState;

      setStatus(next);
      // optimistic default
      setAttendanceState(next === "GOING" ? "CONFIRMED" : null);

      try {
        const res = await fetch(`/api/events/${slug}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus(prevStatus);
          setAttendanceState(prevState);

          toast.error(data?.message ?? "Failed to update RSVP.");
          return;
        }

        setStatus(data?.rsvp?.status ?? next);
        setAttendanceState(data?.rsvp?.attendanceState ?? null);

        if (data?.rsvp?.status === "GOING" && data?.rsvp?.attendanceState === "WAITLISTED") {
          toast.success("You’re on the waitlist ✅");
        } else {
          toast.success(
            next === "GOING"
              ? "RSVP set to Going ✅"
              : next === "MAYBE"
              ? "RSVP set to Maybe 🤔"
              : "RSVP set to Declined 🚫"
          );
        }

        // so attendee list / counts update
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
    </div>
  );
}
