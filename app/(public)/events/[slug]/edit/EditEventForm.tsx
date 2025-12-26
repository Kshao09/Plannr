"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type EventDTO = {
  id: string;
  slug: string;
  title: string;
  description: string;
  startAt: string; // ISO
  endAt: string; // ISO
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
  const toast = useToast();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(event.title ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [locationName, setLocationName] = useState(event.locationName ?? "");
  const [address, setAddress] = useState(event.address ?? "");

  // avoid SSR timezone mismatch: set these after mount
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

    try {
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

      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || "Failed to update event.", "Update failed");
        return;
      }

      const updated = await res.json();
      toast.success("Event updated!");
      router.push(`/events/${updated.slug}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Network error.", "Update failed");
    } finally {
      setLoading(false);
    }
  }

  const labelCls = "text-xs font-medium text-zinc-200";
  const inputCls =
    "mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-500 " +
    "border border-zinc-300 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-black/10";
  const textareaCls =
    "mt-1 w-full resize-none rounded-xl bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-500 " +
    "border border-zinc-300 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-black/10";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit event</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Update details and save your changes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/events/${event.slug}`)}
          className="w-auto rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 shadow-2xl">
        {/* subtle glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <form onSubmit={onSubmit} className="relative space-y-4 p-6">
          <div>
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Study group meetup"
              required
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={textareaCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What is this event about?"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Start</label>
              <input
                className={inputCls}
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
                // ✅ fixes invisible calendar icon because your site uses color-scheme: dark
                style={{ colorScheme: "light" }}
              />
            </div>

            <div>
              <label className={labelCls}>End</label>
              <input
                className={inputCls}
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
                // ✅ fixes invisible calendar icon
                style={{ colorScheme: "light" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Location name</label>
              <input
                className={inputCls}
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. FIU Library"
                required
              />
            </div>

            <div>
              <label className={labelCls}>Address</label>
              <input
                className={inputCls}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city, state"
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => router.push(`/events/${event.slug}`)}
              className="w-auto rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-60"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-auto rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
