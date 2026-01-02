"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function Modal({
  open,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <button
        aria-label="Close modal"
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />

      {/* Panel */}
      <div className="relative w-[92vw] max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="space-y-2">
          <h3 id="modal-title" className="text-lg font-semibold text-white">
            {title}
          </h3>
          {description ? <p className="text-sm text-zinc-300">{description}</p> : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? "rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                : "rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-60"
            }
          >
            {loading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeleteEventButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function doDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${slug}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Failed to delete event.");
        return;
      }

      setOpen(false);
      router.push("/public/events");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
        title="Delete event"
      >
        Delete
      </button>

      <Modal
        open={open}
        title="Delete this event?"
        description="This will permanently delete the event and notify all RSVPed users. This cannot be undone."
        confirmText="Yes, delete"
        cancelText="Cancel"
        danger
        loading={loading}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        onConfirm={() => {
          if (!loading) void doDelete();
        }}
      />
    </>
  );
}
