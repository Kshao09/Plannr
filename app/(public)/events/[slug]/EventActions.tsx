"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export default function EventActions({
  slug,
  canManage,
}: {
  slug: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement | null>(null);

  // Close modal on Escape + restore focus
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setConfirmOpen(false);
        deleteBtnRef.current?.focus();
      }
    }
    if (confirmOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen]);

  async function doDelete() {
    try {
      const res = await fetch(`/api/events/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || "Failed to delete event.", "Delete failed");
        return;
      }

      toast.success("Event deleted!");
      router.push("/events");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Network error.", "Delete failed");
    } finally {
      setConfirmOpen(false);
    }
  }

  const iconBtn =
    "inline-flex h-11 w-11 items-center justify-center rounded-2xl " +
    "border border-white/10 bg-white/5 text-zinc-100 " +
    "transition hover:bg-white/10 hover:-translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-white/20";

  const dangerBtn =
    "inline-flex h-11 w-11 items-center justify-center rounded-2xl " +
    "border border-red-500/25 bg-red-500/10 text-zinc-100 " +
    "transition hover:bg-red-500/15 hover:border-red-500/40 hover:-translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-red-500/30";

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Download .ics (adjust if your route is under /api) */}
        <a
          href={`/api/events/${slug}/ics`}
          className={iconBtn}
          title="Download .ics"
          aria-label="Download calendar file"
        >
          ⬇
        </a>
        {canManage ? (
          <>
            <Link
              href={`/events/${slug}/edit`}
              className={iconBtn}
              title="Edit"
              aria-label="Edit event"
            >
              ✎
            </Link>

            <button
              ref={deleteBtnRef}
              type="button"
              onClick={() => setConfirmOpen(true)}
              className={dangerBtn}
              title="Delete"
              aria-label="Delete event"
            >
              🗑
            </button>
          </>
        ) : null}
      </div>

      {/* Confirm modal */}
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close delete confirmation"
            onClick={() => {
              setConfirmOpen(false);
              deleteBtnRef.current?.focus();
            }}
          />

          {/* modal */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="relative z-10 w-[min(92vw,28rem)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-2xl"
          >
            <div className="p-5">
              <h3 id="delete-title" className="text-base font-semibold text-white">
                Delete event?
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                This action can’t be undone. The event will be permanently removed.
              </p>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    deleteBtnRef.current?.focus();
                  }}
                  className="w-auto rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={doDelete}
                  className="w-auto rounded-xl border border-red-500/25 bg-red-500/15 px-4 py-2 text-sm font-semibold text-white hover:border-red-500/40 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
