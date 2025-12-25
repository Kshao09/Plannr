"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export default function DeleteButton({ slug }: { slug: string }) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef<HTMLButtonElement | null>(null);

  function openModal() {
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setOpen(false);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;

    // focus Cancel (safer than focusing Delete)
    setTimeout(() => cancelRef.current?.focus(), 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading]);

  async function confirmDelete() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Failed to delete.");
        toast.error(msg || "Failed to delete event.", "Delete failed");
        return;
      }

      toast.success("Event deleted");
      setOpen(false);
      router.push("/events");
      router.refresh();
    } catch (err: any) {
      const msg = err?.message ?? "Network error.";
      setError(msg);
      toast.error(msg, "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={openModal} disabled={loading}>
        Delete
      </button>

      {open && (
        <div className="modalOverlay" onMouseDown={closeModal}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Delete event confirmation"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modalTitle">Delete event?</div>
            <div className="modalDesc">This action cannot be undone.</div>

            {error ? <div className="modalError">{error}</div> : null}

            <div className="modalActions">
              <button
                ref={cancelRef}
                type="button"
                className="btn btnGhost"
                onClick={closeModal}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btnDanger"
                onClick={confirmDelete}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
