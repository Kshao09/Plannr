"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this event? This cannot be undone.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        alert("Failed to delete: " + msg);
        return;
      }
      router.push("/events");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={onDelete} disabled={loading}>
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}
