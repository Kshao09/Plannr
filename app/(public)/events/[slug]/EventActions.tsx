"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function IconButton({
  children,
  ariaLabel,
  title,
  danger,
  onClick,
  href,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  title?: string;
  danger?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const className = `iconBtn ${danger ? "iconBtnDanger" : ""}`;

  if (href) {
    return (
      <a className={className} href={href} aria-label={ariaLabel} title={title}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v10" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function EventActions({ slug }: { slug: string }) {
  const router = useRouter();

  async function onDelete() {
    if (!confirm("Delete this event?")) return;

    const res = await fetch(`/api/events/${slug}`, { method: "DELETE" });

    if (!res.ok) {
      const msg = await res.text();
      alert("Failed to delete: " + msg);
      return;
    }

    router.push("/events");
    router.refresh();
  }

  return (
    <div className="eventActions">
      <IconButton href={`/api/events/${slug}/ics`} ariaLabel="Download ICS" title="Download .ics">
        <DownloadIcon />
      </IconButton>

      <Link className="iconBtn" href={`/events/${slug}/edit`} aria-label="Edit event" title="Edit">
        <EditIcon />
      </Link>

      <IconButton danger ariaLabel="Delete event" title="Delete" onClick={onDelete}>
        <TrashIcon />
      </IconButton>
    </div>
  );
}
