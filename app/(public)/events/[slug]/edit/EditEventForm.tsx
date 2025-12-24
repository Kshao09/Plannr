"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type EventDTO = {
  id: string;
  slug: string;
  title: string;
  description: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  locationName: string;
  address: string;
};

function isoToDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function EditEventForm({ event }: { event: EventDTO }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [locationName, setLocationName] = useState(event.locationName);
  const [address, setAddress] = useState(event.address);

  // avoid SSR timezone mismatch
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  useEffect(() => {
    setMounted(true);
    setStartAt(isoToDatetimeLocal(event.startAt));
    setEndAt(isoToDatetimeLocal(event.endAt));
  }, [event.startAt, event.endAt]);

  if (!mounted) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/events/${event.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        locationName,
        address,
        startAt,
        endAt,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const msg = await res.text();
      alert("Failed to update event: " + msg);
      return;
    }

    const updated = await res.json();
    router.push(`/events/${updated.slug}`);
    router.refresh();
  }

  return (
    <div>
      <h1>Edit Event</h1>

      <form className="card" onSubmit={onSubmit}>
        <label className="small">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label className="small">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
        />

        <label className="small">Start</label>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          required
        />

        <label className="small">End</label>
        <input
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          required
        />

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
