"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export default function CreateEventPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, startAt, endAt, locationName, address }),
      });

      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || "Failed to create event.", "Create failed");
        return;
      }

      toast.success("Event created!");
      router.push("/events");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Network error.", "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Create Event</h1>

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
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
}
