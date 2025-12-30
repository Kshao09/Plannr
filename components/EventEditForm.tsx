"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

const CATEGORY_OPTIONS = ["Tech", "Food & Drink", "Music", "Outdoors", "Arts", "Sports", "Other"];

function toDateTimeLocalValue(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocalValue(v: string) {
  const d = new Date(v);
  return d.toISOString();
}

export default function EventEditForm({
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
    category: string;
    image: string; // ✅ cover
    images: string[]; // ✅ gallery
  };
}) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mutatingImages, setMutatingImages] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(initial.startAt));
  const [endAt, setEndAt] = useState(toDateTimeLocalValue(initial.endAt));
  const [locationName, setLocationName] = useState(initial.locationName);
  const [address, setAddress] = useState(initial.address);
  const [category, setCategory] = useState(initial.category);

  const [images, setImages] = useState<string[]>(initial.images ?? []);
  const [cover, setCover] = useState<string>(initial.image ?? "");

  const payload = useMemo(
    () => ({
      title: title.trim(),
      description: description.trim() || null,
      startAt: fromDateTimeLocalValue(startAt),
      endAt: fromDateTimeLocalValue(endAt),
      locationName: locationName.trim() || null,
      address: address.trim() || null,
      category: category.trim() || null,
    }),
    [title, description, startAt, endAt, locationName, address, category]
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");

      router.push(`/public/events/${slug}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onUploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);

    const remaining = 5 - images.length;
    const selected = Array.from(files).slice(0, remaining);

    for (const f of selected) {
      if (f.type !== "image/png") {
        setError("Only PNG files are allowed.");
        return;
      }
    }

    const fd = new FormData();
    for (const f of selected) fd.append("files", f);

    setUploading(true);
    try {
      const res = await fetch(`/api/events/${slug}/images`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");

      setImages(Array.isArray(data.images) ? data.images : []);
      setCover(data.image ?? "");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSetCover(url: string) {
    setError(null);
    setMutatingImages(url);
    try {
      const res = await fetch(`/api/events/${slug}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to set cover");

      setCover(data.image ?? url);
      setImages(Array.isArray(data.images) ? data.images : images);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Failed to set cover");
    } finally {
      setMutatingImages(null);
    }
  }

  async function onDeleteImage(url: string) {
    if (!confirm("Delete this image?")) return;

    setError(null);
    setMutatingImages(url);
    try {
      const res = await fetch(`/api/events/${slug}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete image");

      setImages(Array.isArray(data.images) ? data.images : []);
      setCover(data.image ?? "");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete image");
    } finally {
      setMutatingImages(null);
    }
  }

  return (
    <form onSubmit={onSave} className="rounded-2xl border border-white/10 bg-white/5 p-6">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

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
          {/* ✅ Fix: add label for Location name (Apple Store field) */}
          <label className="text-sm text-zinc-300">
            Location name
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Apple Store"
            />
          </label>

          {/* ✅ Category dropdown */}
          <label className="text-sm text-zinc-300">
            Category
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">—</option>
              {CATEGORY_OPTIONS.map((c) => (
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

        {/* ✅ Images: upload + carousel + set cover + delete */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-white">Images</div>
            <div className="text-xs text-zinc-400">{images.length}/5</div>
          </div>

          {images.length ? (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((src, i) => {
                const isCover = !!cover && src === cover;
                const busy = mutatingImages === src;

                return (
                  <div
                    key={`${src}-${i}`}
                    className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="event image" className="h-full w-full object-cover" />

                    {/* Cover badge */}
                    {isCover ? (
                      <div className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white">
                        Cover
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="absolute inset-x-2 bottom-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy || isCover}
                        onClick={() => onSetCover(src)}
                        className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs font-semibold text-white hover:bg-black/70 disabled:opacity-60"
                        title="Set cover"
                      >
                        {isCover ? "Cover" : "Set cover"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDeleteImage(src)}
                        className="rounded-lg border border-white/10 bg-red-500/60 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500/70 disabled:opacity-60"
                        title="Delete"
                      >
                        {busy ? "…" : "✕"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-2 text-sm text-zinc-400">No images yet.</div>
          )}

          <div className="mt-3">
            <input
              type="file"
              accept="image/png"
              multiple
              disabled={uploading || images.length >= 5}
              onChange={(e) => onUploadFiles(e.target.files)}
              className="block w-full text-sm text-zinc-200 file:mr-3 file:rounded-xl file:border file:border-white/10 file:bg-white/5 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-200 hover:file:bg-white/10 disabled:opacity-60"
            />
            <div className="mt-2 text-xs text-zinc-400">
              PNG only. Upload up to 5 images. You can set one as the cover.
            </div>
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => history.back()}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
