"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { EVENT_CATEGORIES } from "@/lib/EventCategories";
import EventImagesField from "@/components/EventImagesField";

function toISOFromDatetimeLocal(v: string) {
  const d = new Date(v);
  return d.toISOString();
}

export default function CreateEventForm() {
  const router = useRouter();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");

  const [capacity, setCapacity] = useState<string>("");
  const [waitlistEnabled, setWaitlistEnabled] = useState<boolean>(true);

  // ✅ Blob URLs (same concept as Edit)
  const [cover, setCover] = useState<string>("");
  const [images, setImages] = useState<string[]>([]); // gallery (max 5)

  const payload = useMemo(() => {
    const cap = capacity.trim() ? Number(capacity) : null;

    return {
      title: title.trim(),
      description: description.trim() || null,
      startAt: startAt ? toISOFromDatetimeLocal(startAt) : null,
      endAt: endAt ? toISOFromDatetimeLocal(endAt) : null,
      locationName: locationName.trim() || null,
      address: address.trim() || null,
      category: category || null,
      capacity: cap != null && Number.isFinite(cap) ? Math.max(1, Math.floor(cap)) : null,
      waitlistEnabled,
    };
  }, [title, description, startAt, endAt, locationName, address, category, capacity, waitlistEnabled]);

  function validate() {
    if (!payload.title) return "Title is required.";
    if (!startAt || !endAt) return "Start and End are required.";

    const s = new Date(payload.startAt as string).getTime();
    const e = new Date(payload.endAt as string).getTime();
    if (Number.isNaN(s) || Number.isNaN(e)) return "Invalid Start/End time.";
    if (e <= s) return "End must be after Start.";

    if (payload.capacity != null && payload.capacity < 1) return "Capacity must be >= 1.";

    // gallery limit (cover is separate)
    if ((images?.length ?? 0) > 5) return "Max 5 gallery images.";

    if (imagesUploading) return "Please wait for image uploads to finish.";

    return null;
  }

  async function persistImages(slug: string) {
    // Save cover + gallery URLs into the event (same storage as Edit)
    const res = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: cover || null,
        images: Array.isArray(images) ? images : [],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error ?? "Failed to save images.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const v = validate();
    if (v) return toast.error(v, "Create failed");

    setSaving(true);
    try {
      // 1) create event (no filesystem uploads here)
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to create event.", "Create failed");
        return;
      }

      const slug = data?.slug ?? data?.event?.slug ?? data?.data?.slug ?? null;

      // 2) if we already uploaded blob URLs in the form, persist them into DB
      if (slug && (cover || (images?.length ?? 0) > 0)) {
        await persistImages(slug);
      }

      toast.success("Event created!");
      router.push(slug ? `/public/events/${slug}` : "/public/events");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Network error.", "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.70)] backdrop-blur"
    >
      <div className="grid gap-4">
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />

        <textarea
          className="min-h-[120px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Start
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </label>

          <label className="text-sm text-zinc-300">
            End
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Location name
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. FIU Library"
            />
          </label>

          <label className="text-sm text-zinc-300">
            Category
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/20"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">—</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-sm text-zinc-300">
          Address
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, state"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Capacity (blank = unlimited)
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 50"
            />
          </label>

          <label className="mt-6 flex items-center gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={waitlistEnabled}
              onChange={(e) => setWaitlistEnabled(e.target.checked)}
            />
            Enable waitlist when full
          </label>
        </div>

        {/* ✅ SAME as Edit: upload + set cover + delete, all URLs */}
        <EventImagesField
          cover={cover}
          images={images}
          onUploadingChange={setImagesUploading}
          onChange={({ cover, images }) => {
            setCover(cover);
            setImages(images);
          }}
        />

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={saving || imagesUploading}
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Creating…" : imagesUploading ? "Uploading images…" : "Create event"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
