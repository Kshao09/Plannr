"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

export default function AvatarUploader() {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File) {
    if (!file) return;
    if (uploading) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);

      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");

      toast.success("Avatar updated!");
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
      {uploading ? "Uploading…" : "Upload avatar"}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}
