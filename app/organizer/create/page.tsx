"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // basic client validation
    if (!startAt || !endAt) {
      alert("Please select start and end time.");
      return;
    }
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      alert("End time must be after start time.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        startAt, // datetime-local string is OK; server converts to ISO
        endAt,
        locationName: locationName.trim(),
        address: address.trim(),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const msg = await res.text();
      alert("Failed to create event: " + msg);
      return;
    }

    // Go straight to Events page
    router.push("/public/events");
  }

  return (
    <div>
      <h1>Create Event</h1>

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
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
}
