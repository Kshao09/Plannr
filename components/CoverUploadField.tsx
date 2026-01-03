"use client";

import React, { useMemo, useState } from "react";

export default function CoverUploadField({
  value,
  onChange,
  label = "Cover image",
  help = "Upload a cover image (JPG/PNG/WebP).",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  help?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const previewSrc = useMemo(() => localPreview || value || "", [localPreview, value]);

  async function onPick(file: File | null) {
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }

    // instant preview
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/uploads/cover", { method: "POST", body: fd });

      // try JSON first, fall back to text (very useful for debugging)
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        throw new Error(data?.error || `Upload failed (${res.status})`);
      }

      onChange(data.url as string);

      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="mt-1 text-xs text-zinc-400">{help}</div>

      {previewSrc ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="cover preview" className="h-48 w-full object-cover" />
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-zinc-200 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm font-semibold text-white hover:bg-black/50"
          >
            Remove
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Upload failed: {error}
        </div>
      ) : null}

      {uploading ? <div className="mt-2 text-xs text-zinc-400">Uploading…</div> : null}
    </div>
  );
}
