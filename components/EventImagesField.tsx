"use client";

import { useMemo, useRef, useState } from "react";

function uniqNonEmpty(list: string[]) {
  const out: string[] = [];
  for (const s of list) {
    const v = (s ?? "").trim();
    if (!v) continue;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

function normalizeFromServer(server: { image: string | null; images: string[] | null | undefined }) {
  const cover = (server.image ?? "").trim();
  const imgs = Array.isArray(server.images) ? server.images : [];
  const gallery = imgs.map((x) => (x ?? "").trim()).filter((x) => x && x !== cover);
  return { cover, images: gallery };
}

export default function EventImagesField({
  slug, // ✅ if provided, uses /api/events/[slug]/images (recommended for edit)
  cover,
  images,
  onChange,
  maxTotal = 5,
  onUploadingChange,
}: {
  slug?: string;
  cover: string;
  images: string[];
  onChange: (next: { cover: string; images: string[] }) => void;
  maxTotal?: number; // max TOTAL unique images incl cover
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const normalizedCover = (cover ?? "").trim();
  const normalizedImages = (images ?? []).map((x) => (x ?? "").trim()).filter(Boolean);

  // total unique across cover + images[]
  const totalUnique = useMemo(() => {
    return uniqNonEmpty([normalizedCover, ...normalizedImages].filter(Boolean));
  }, [normalizedCover, normalizedImages]);

  const remainingSlots = Math.max(0, maxTotal - totalUnique.length);
  const isFull = remainingSlots === 0;

  function openPicker() {
    fileRef.current?.click();
  }

  async function uploadDraftOne(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/uploads/cover", { method: "POST", body: fd });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text };
    }
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    if (!data?.url) throw new Error("Upload failed: missing url");
    return String(data.url);
  }

  async function uploadPersisted(files: File[]) {
    if (!slug) throw new Error("Missing slug for persisted upload");

    const fd = new FormData();
    for (const f of files) fd.append("images", f);

    const res = await fetch(`/api/events/${encodeURIComponent(slug)}/images`, {
      method: "POST",
      body: fd,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.message || "Upload failed");

    if (!data?.images) throw new Error("Upload failed: missing images");
    onChange(normalizeFromServer({ image: data.image ?? null, images: data.images ?? [] }));
  }

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setErr(null);

    const selected = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, remainingSlots);
    if (selected.length === 0) {
      setErr("Only image files are allowed.");
      return;
    }

    setBusy(true);
    onUploadingChange?.(true);

    try {
      if (slug) {
        await uploadPersisted(selected);
      } else {
        // draft mode (create form): upload to /api/uploads/cover and update local form
        let nextCover = normalizedCover;
        let nextImages = [...normalizedImages];

        for (const f of selected) {
          const url = await uploadDraftOne(f);
          const nextUnique = uniqNonEmpty([nextCover, ...nextImages, url].filter(Boolean));
          if (nextUnique.length > maxTotal) break;

          if (!nextCover) nextCover = url;
          else nextImages.push(url);
        }

        nextImages = uniqNonEmpty(nextImages.filter((x) => x && x !== nextCover));
        onChange({ cover: nextCover, images: nextImages });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      onUploadingChange?.(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function setAsCover(url: string) {
    const u = (url ?? "").trim();
    if (!u || u === normalizedCover) return;

    setErr(null);
    setBusy(true);
    try {
      if (slug) {
        const res = await fetch(`/api/events/${encodeURIComponent(slug)}/images`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: u }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || data?.message || "Failed to set cover");
        onChange(normalizeFromServer({ image: data.image ?? null, images: data.images ?? [] }));
      } else {
        // draft mode: just reorder locally
        const nextCover = u;
        const nextImages = uniqNonEmpty([normalizedCover, ...normalizedImages].filter((x) => x && x !== nextCover));
        onChange({ cover: nextCover, images: nextImages });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to set cover");
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage(url: string) {
    const u = (url ?? "").trim();
    if (!u) return;

    setErr(null);
    setBusy(true);
    try {
      if (slug) {
        const res = await fetch(`/api/events/${encodeURIComponent(slug)}/images`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: u }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || data?.message || "Failed to delete");
        onChange(normalizeFromServer({ image: data.image ?? null, images: data.images ?? [] }));
      } else {
        // draft mode: local delete only (does not delete blob)
        if (u === normalizedCover) {
          const remaining = normalizedImages.filter((x) => x && x !== u);
          const newCover = remaining[0] ?? "";
          const rest = remaining.slice(1).filter((x) => x && x !== newCover);
          onChange({ cover: newCover, images: rest });
        } else {
          onChange({ cover: normalizedCover, images: normalizedImages.filter((x) => x && x !== u) });
        }
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  const all = useMemo(() => {
    const out: string[] = [];
    if (normalizedCover) out.push(normalizedCover);
    for (const u of normalizedImages) if (u && u !== normalizedCover && !out.includes(u)) out.push(u);
    return out;
  }, [normalizedCover, normalizedImages]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Images</div>
          <div className="text-xs text-zinc-400">
            Max {maxTotal} total images (cover included). {slug ? "Changes are saved immediately." : "Saved when you submit."}
          </div>
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
            disabled={busy || isFull}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm disabled:opacity-50"
            title={isFull ? "Image limit reached" : "Upload images"}
          >
            {busy ? "Working..." : `Add images (${remainingSlots} slots)`}
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
                      disabled={busy || isCover}
                      className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {isCover ? "Cover" : "Set cover"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteImage(url)}
                      disabled={busy}
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
