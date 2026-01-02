"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import CheckInQRCode from "@/components/CheckInQRCode";
import { EVENT_CATEGORIES } from "@/lib/EventCategories";

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

type StagedImage = {
  key: string;
  file: File;
  previewUrl: string;
};

function makeKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random()
    .toString(16)
    .slice(2)}`;
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
    image: string;
    images: string[];
    capacity: number | null;
    waitlistEnabled: boolean;
    checkInSecret: string;
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

  const [capacity, setCapacity] = useState<string>(
    initial.capacity ? String(initial.capacity) : ""
  );
  const [waitlistEnabled, setWaitlistEnabled] = useState<boolean>(
    !!initial.waitlistEnabled
  );

  const [images, setImages] = useState<string[]>(initial.images ?? []);
  const [cover, setCover] = useState<string>(initial.image ?? "");

  // ---- NEW: staged previews (local, before upload) ----
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [stagedCoverKey, setStagedCoverKey] = useState<string | null>(null);

  // Revoke preview URLs on unmount (and also when we manually clear/remove)
  const stagedRef = useRef<StagedImage[]>([]);
  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);
  useEffect(() => {
    return () => {
      stagedRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
  }, []);

  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const checkInUrl = origin
    ? `${origin}/app/organizer/check-in/${slug}?key=${encodeURIComponent(
        initial.checkInSecret
      )}`
    : "";

  const payload = useMemo(() => {
    const cap = capacity.trim() ? Number(capacity) : null;
    return {
      title: title.trim(),
      description: description.trim() || null,
      startAt: fromDateTimeLocalValue(startAt),
      endAt: fromDateTimeLocalValue(endAt),
      locationName: locationName.trim() || null,
      address: address.trim() || null,
      category: category.trim() || null,
      capacity: cap && Number.isFinite(cap) ? Math.max(1, Math.floor(cap)) : null,
      waitlistEnabled,
    };
  }, [
    title,
    description,
    startAt,
    endAt,
    locationName,
    address,
    category,
    capacity,
    waitlistEnabled,
  ]);

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

  function clearStaged() {
    staged.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setStaged([]);
    setStagedCoverKey(null);
  }

  function removeStaged(key: string) {
    const target = staged.find((s) => s.key === key);
    if (target) URL.revokeObjectURL(target.previewUrl);

    const next = staged.filter((s) => s.key !== key);
    setStaged(next);

    if (stagedCoverKey === key) {
      setStagedCoverKey(next[0]?.key ?? null);
    }
  }

  function onStageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);

    const remaining = 5 - images.length - staged.length;
    if (remaining <= 0) return;

    const selected = Array.from(files).slice(0, remaining);

    for (const f of selected) {
      if (!f.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        return;
      }
    }

    const newStaged: StagedImage[] = selected.map((file) => ({
      key: makeKey(file),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    const merged = [...staged, ...newStaged];
    setStaged(merged);

    // default cover = first staged if none selected yet
    if (!stagedCoverKey && merged.length) setStagedCoverKey(merged[0].key);
  }

  async function persistCover(url: string) {
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
      // keep optimistic cover UI if you want; here we just leave it
    } finally {
      setMutatingImages(null);
    }
  }

  async function onUploadStaged() {
    if (!staged.length) return;

    setError(null);

    const existingCount = images.length;
    const fd = new FormData();
    for (const s of staged) fd.append("images", s.file);

    setUploading(true);
    try {
      const res = await fetch(`/api/events/${slug}/images`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");

      const returned = Array.isArray(data.images) ? data.images : [];
      const nextImages =
        returned.length >= existingCount ? returned : [...images, ...returned];

      setImages(nextImages);

      // If backend already chose a cover, use it first
      const backendCover = (data.image as string) ?? "";
      if (backendCover) setCover(backendCover);

      // Then apply user's staged cover choice (override) if we can resolve it
      const coverIdx = stagedCoverKey
        ? staged.findIndex((s) => s.key === stagedCoverKey)
        : 0;

      const desiredCoverUrl =
        nextImages[existingCount + (coverIdx >= 0 ? coverIdx : 0)];

      // Clear staged previews immediately (UI feels responsive)
      clearStaged();
      router.refresh();

      // Persist the chosen cover if we resolved it
      if (desiredCoverUrl) {
        setCover(desiredCoverUrl); // optimistic
        await persistCover(desiredCoverUrl);
      }
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSetCover(url: string) {
    await persistCover(url);
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
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Location name"
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <select
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
            value={category ?? ""}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Category (optional)</option>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Capacity (blank = unlimited)"
            inputMode="numeric"
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={waitlistEnabled}
            onChange={(e) => setWaitlistEnabled(e.target.checked)}
          />
          Enable waitlist when full
        </label>

        {/* Check-in QR + link */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-white">Check-in</div>
          <div className="mt-1 text-xs text-zinc-400">
            Staff can open this link to check in attendees (QR included).
          </div>

          {checkInUrl ? (
            <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <a
                  href={checkInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm text-cyan-200 hover:underline"
                >
                  {checkInUrl}
                </a>
              </div>
              <CheckInQRCode value={checkInUrl} />
            </div>
          ) : (
            <div className="mt-3 text-sm text-zinc-400">Loading…</div>
          )}
        </div>

        {/* Images */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-white">Images</div>

          {/* Existing (uploaded) images */}
          {images.length ? (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {images.map((src, i) => {
                const isCover = (!cover && i === 0) || (!!cover && src === cover);
                const busy = mutatingImages === src;

                return (
                  <div
                    key={`${src}-${i}`}
                    className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="event image" className="h-full w-full object-cover" />

                    {isCover ? (
                      <div className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white">
                        Cover
                      </div>
                    ) : null}

                    <div className="absolute inset-x-2 bottom-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy || isCover}
                        onClick={() => onSetCover(src)}
                        className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs font-semibold text-white hover:bg-black/70 disabled:opacity-60"
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

          {/* NEW: Staged (local preview) images */}
          {staged.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs font-semibold text-zinc-200">
                Selected (preview — not uploaded yet)
              </div>

              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {staged.map((s) => {
                  const isStagedCover = stagedCoverKey
                    ? s.key === stagedCoverKey
                    : false;

                  return (
                    <div
                      key={s.key}
                      className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.previewUrl}
                        alt="selected preview"
                        className="h-full w-full object-cover"
                      />

                      {isStagedCover ? (
                        <div className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white">
                          Cover
                        </div>
                      ) : null}

                      <div className="absolute inset-x-2 bottom-2 flex gap-2">
                        <button
                          type="button"
                          disabled={uploading || isStagedCover}
                          onClick={() => setStagedCoverKey(s.key)}
                          className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs font-semibold text-white hover:bg-black/70 disabled:opacity-60"
                        >
                          {isStagedCover ? "Cover" : "Set cover"}
                        </button>

                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => removeStaged(s.key)}
                          className="rounded-lg border border-white/10 bg-red-500/60 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500/70 disabled:opacity-60"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={onUploadStaged}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : `Upload ${staged.length} image${staged.length === 1 ? "" : "s"}`}
                </button>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={clearStaged}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
                >
                  Clear selection
                </button>
              </div>
            </div>
          ) : null}

          {/* File picker (now stages instead of auto-upload) */}
          <div className="mt-3">
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || images.length + staged.length >= 5}
              onChange={(e) => {
                onStageFiles(e.target.files);
                // allow selecting the same file again
                e.currentTarget.value = "";
              }}
              className="block w-full text-sm text-zinc-200 file:mr-3 file:rounded-xl file:border file:border-white/10 file:bg-white/5 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-200 hover:file:bg-white/10 disabled:opacity-60"
            />
            <div className="mt-2 text-xs text-zinc-400">
              Upload up to 5 images total. Pick files → preview → choose cover → upload.
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
