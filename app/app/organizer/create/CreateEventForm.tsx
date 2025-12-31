"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { EVENT_CATEGORIES } from "@/lib/EventCategories";

function toISOFromDatetimeLocal(v: string) {
  // input like "2026-01-07T23:15"
  // Convert to ISO string in local time -> UTC ISO
  const d = new Date(v);
  return d.toISOString();
}

export default function CreateEventForm() {
  const router = useRouter();
  const toast = useToast();

  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");

  // images
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Build previews + cleanup URLs
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const onlyImages = files.filter((f) => f.type.startsWith("image/"));
    if (onlyImages.length !== files.length) {
      toast.error("Only image files are allowed.", "Invalid file");
    }

    const merged = [...images, ...onlyImages];
    if (merged.length > 5) {
      toast.error("You can upload up to 5 images.", "Too many images");
      setImages(merged.slice(0, 5));
    } else {
      setImages(merged);
    }

    // allow selecting the same file again later
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  const payload = useMemo(() => {
    return {
      title: title.trim(),
      description: description.trim() || null,
      startAt: startAt ? toISOFromDatetimeLocal(startAt) : null,
      endAt: endAt ? toISOFromDatetimeLocal(endAt) : null,
      locationName: locationName.trim() || null,
      address: address.trim() || null,
      category: category || null,
    };
  }, [title, description, startAt, endAt, locationName, address, category]);

  function validate() {
    if (!payload.title) return "Title is required.";
    if (!startAt || !endAt) return "Start and End are required.";
    const s = new Date(payload.startAt as string).getTime();
    const e = new Date(payload.endAt as string).getTime();
    if (Number.isNaN(s) || Number.isNaN(e)) return "Invalid Start/End time.";
    if (e <= s) return "End must be after Start.";
    if (images.length > 5) return "Max 5 images.";
    return null;
  }

  async function uploadImages(slug: string) {
    if (images.length === 0) return;

    const fd = new FormData();
    // server expects "images"
    images.forEach((file) => fd.append("images", file));

    const res = await fetch(`/api/events/${slug}/images`, {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error ?? "Failed to upload images.";
      throw new Error(msg);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      toast.error(v, "Create failed");
      return;
    }

    setSaving(true);
    try {
      // 1) Create event (JSON)
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

      // IMPORTANT: your POST must return slug
      const slug =
        data?.slug ?? data?.event?.slug ?? data?.data?.slug ?? null;

      if (!slug || typeof slug !== "string") {
        toast.success("Event created!");
        router.push("/app/organizer/events");
        router.refresh();
        return;
      }

      // 2) Upload images (multipart)
      if (images.length) {
        await uploadImages(slug);
      }

      toast.success("Event created!");
      router.push(`/app/organizer/events/${slug}/edit`);
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

        {/* Images (max 5) */}
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">Images</div>
            <div className="text-xs text-zinc-500">{images.length}/5</div>
          </div>

          <div className="mt-2 flex flex-wrap gap-3">
            {previews.map((src, idx) => (
              <div
                key={src}
                className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10 bg-black/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute right-1 top-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            ))}

            <label
              className={`flex h-24 w-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 text-xs text-zinc-300 hover:bg-white/10 ${
                images.length >= 5 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              + Add
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onPickImages}
                className="hidden"
                disabled={images.length >= 5}
              />
            </label>
          </div>

          <div className="mt-2 text-xs text-zinc-500">
            Upload up to 5 images. You can reorder later on the edit page (if you support that there).
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create event"}
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
