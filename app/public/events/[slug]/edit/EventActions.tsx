"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function EventActions({ slug }: { slug: string }) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openConfirm() {
    setError(null);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (busy) return;
    setConfirmOpen(false);
    setError(null);
  }

  async function doDelete() {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Delete failed.");
        return;
      }

      setConfirmOpen(false);
      router.push("/public/events");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="eventActions">
        {/* Download .ics */}
        <a
          className="iconBtn"
          href={`/api/events/${encodeURIComponent(slug)}/ics`}
          title="Download .ics"
          aria-label="Download .ics"
        >
          <DownloadIcon />
        </a>

        {/* Edit */}
        <Link
          className="iconBtn"
          href={`/public/events/${encodeURIComponent(slug)}/edit`}
          title="Edit"
          aria-label="Edit"
        >
          <EditIcon />
        </Link>

        {/* Delete -> opens modal */}
        <button
          type="button"
          className="iconBtn iconBtnDanger"
          onClick={openConfirm}
          title="Delete"
          aria-label="Delete"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Custom confirm modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Delete event?"
        description="This action cannot be undone."
        error={error}
        busy={busy}
        onCancel={closeConfirm}
        onConfirm={doDelete}
      />
    </>
  );
}

/* ---------------- Modal ---------------- */

function ConfirmModal({
  open,
  title,
  description,
  error,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  error?: string | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      // focus Cancel for safety
      setTimeout(() => cancelRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalTitle">{title}</div>
        {description ? <div className="modalDesc">{description}</div> : null}

        {error ? <div className="modalError">{error}</div> : null}

        <div className="modalActions">
          <button
            ref={cancelRef}
            type="button"
            className="btn btnGhost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btnDanger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Icons ---------------- */

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4.01 4a1 1 0 0 1-1.4 0l-4.01-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1zm-7 16a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.13 1.13 3.75 3.75 1.13-1.13z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h1v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7h1a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9zm1 2h4v0H10V5zm-2 2h8v13H8V7zm2 3a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1zm5 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1z"
      />
    </svg>
  );
}
