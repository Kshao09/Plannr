"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED" | null;

export default function EventRSVP({
  slug,
  initialStatus,
  disabled,
}: {
  slug: string;
  initialStatus: RSVPStatus;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<RSVPStatus>(initialStatus);
  const [pending, startTransition] = useTransition();

  function label(s: RSVPStatus) {
    return s ?? "Not set";
  }

  async function update(next: Exclude<RSVPStatus, null>) {
    startTransition(async () => {
      const prev = status;
      setStatus(next);

      try {
        const res = await fetch(`/api/events/${slug}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setStatus(prev);
          toast.error(data?.message ?? "Failed to update RSVP.");
          return;
        }

        toast.success(
          next === "GOING"
            ? "RSVP set to Going ✅"
            : next === "MAYBE"
            ? "RSVP set to Maybe 🤔"
            : "RSVP set to Declined 🚫"
        );
      } catch (e: any) {
        setStatus(prev);
        toast.error(e?.message ?? "Network error.");
      }
    });
  }

  const base =
    "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:opacity-60 disabled:hover:bg-white/5";

  const active = "border-white/20 bg-white/10 ring-2 ring-white/10";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">RSVP</div>
        <div className="text-xs text-zinc-400">
          {pending ? "Saving..." : `Current: ${label(status)}`}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => update("GOING")}
          className={`${base} ${status === "GOING" ? active : ""}`}
        >
          Going
        </button>

        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => update("MAYBE")}
          className={`${base} ${status === "MAYBE" ? active : ""}`}
        >
          Maybe
        </button>

        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => update("DECLINED")}
          className={`${base} ${status === "DECLINED" ? active : ""}`}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
