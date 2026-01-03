"use client";

import { useRef, useState } from "react";

export default function EventImagesField({
  cover,
  images,
  onChange,
  maxImages = 5,
  onUploadingChange,
}: {
  cover: string;
  images: string[];
  onChange: (next: { cover: string; images: string[] }) => void;
  maxImages?: number;
  onUploadingChange?: (uploading: boolean) => void; // ✅ NEW (optional)
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const normalizedCover = (cover ?? "").trim();
  const normalizedImages = (images ?? []).map((x) => (x ?? "").trim()).filter(Boolean);

  const all = (() => {
    const out: string[] = [];
    if (normalizedCover) out.push(normalizedCover);
    for (const u of normalizedImages) if (u && u !== normalizedCover && !out.includes(u)) out.push(u);
    return out;
  })();

  const galleryCount = normalizedImages.filter((u) => u && u !== normalizedCover).length;
  const remainingGallery = Math.max(0, maxImages - galleryCount);

  const hasCover = !!normalizedCover;
  const isFull = hasCover && remainingGallery === 0;

  function openPicker() {
    fileRef.current?.click();
  }

  async function uploadOne(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/uploads/cover", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    if (!data?.url) throw new Error("Upload failed: missing url");
    return String(data.url);
  }

  function uniq(list: string[]) {
    const out: string[] = [];
    for (const s of list) {
      const v = (s ?? "").trim();
      if (!v) continue;
      if (!out.includes(v)) out.push(v);
    }
    return out;
  }

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setErr(null);

    const coverSlot = normalizedCover ? 0 : 1;
    const totalSlots = coverSlot + remainingGallery;

    const selected = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, totalSlots);

    if (selected.length === 0) {
      setErr("Only image files are allowed (JPG/PNG/WebP).");
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);

    try {
      let nextCover = normalizedCover;
      let nextGallery = normalizedImages.filter((u) => u && u !== nextCover);

      for (const f of selected) {
        const url = await uploadOne(f);

        if (!nextCover) {
          nextCover = url;
        } else if (nextGallery.length < maxImages) {
          nextGallery.push(url);
        }
      }

      nextGallery = uniq(nextGallery).slice(0, maxImages);
      onChange({ cover: nextCover, images: nextGallery });
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function setAsCover(url: string) {
    const u = (url ?? "").trim();
    if (!u) return;

    const oldCover = normalizedCover;
    if (u === oldCover) return;

    let nextGallery = normalizedImages.filter((x) => x && x !== u && x !== oldCover);

    if (oldCover) {
      if (nextGallery.length >= maxImages) nextGallery = nextGallery.slice(0, maxImages - 1);
      nextGallery = [oldCover, ...nextGallery];
    }

    nextGallery = uniq(nextGallery).slice(0, maxImages);
    onChange({ cover: u, images: nextGallery });
  }

  function deleteImage(url: string) {
    const u = (url ?? "").trim();
    if (!u) return;

    if (u === normalizedCover) {
      const g = normalizedImages.filter((x) => x && x !== normalizedCover);
      const newCover = g[0] ?? "";
      const rest = g.slice(1);
      onChange({ cover: newCover, images: rest });
      return;
    }

    const nextGallery = normalizedImages.filter((x) => x && x !== u && x !== normalizedCover);
    onChange({ cover: normalizedCover, images: nextGallery });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Images</div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading || isFull}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm disabled:opacity-50"
            title={isFull ? "Gallery is full" : "Upload images"}
          >
            {uploading
              ? "Uploading..."
              : `Add images (${hasCover ? remainingGallery : remainingGallery + 1} slots)`}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        {all.length === 0 ? (
          <div className="flex h-[140px] items-center justify-center text-sm text-zinc-500">
            No images yet. Upload to add cover + gallery.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {all.map((url) => {
              const isCover = url === normalizedCover;
              return (
                <div key={url} className="rounded-2xl border border-white/10 bg-black/20 p-2">
                  <div className="relative overflow-hidden rounded-xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Event" className="h-[110px] w-full object-cover" />

                    {isCover && (
                      <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-semibold text-white">
                        Cover
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setAsCover(url)}
                      disabled={uploading || isCover}
                      className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {isCover ? "Cover" : "Set cover"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteImage(url)}
                      disabled={uploading}
                      className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {err && <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
    </div>
  );
}
