"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventClient({
  slug,
  initial,
}: {
  slug: string;
  initial: {
    title: string;
    description: string;
    startAt: string;
    endAt: string;
    locationName: string;
    address: string;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);

  const startDefault = useMemo(() => toLocalInputValue(initial.startAt), [initial.startAt]);
  const endDefault = useMemo(() => toLocalInputValue(initial.endAt), [initial.endAt]);

  const [startAt, setStartAt] = useState(startDefault);
  const [endAt, setEndAt] = useState(endDefault);
  const [locationName, setLocationName] = useState(initial.locationName);
  const [address, setAddress] = useState(initial.address);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, startAt, endAt, locationName, address }),
      });

      if (!res.ok) {
        const msg = await res.text();
        alert("Failed to update: " + msg);
        return;
      }

      router.push(`/events/${slug}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Edit Event</h1>

      <form className="card" onSubmit={onSubmit}>
        <label className="small">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label className="small">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />

        <label className="small">Start</label>
        <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />

        <label className="small">End</label>
        <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />

        <label className="small">Location name</label>
        <input value={locationName} onChange={(e) => setLocationName(e.target.value)} required />

        <label className="small">Address</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} required />

        <button disabled={loading} style={{ marginTop: 12 }}>
          {loading ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
