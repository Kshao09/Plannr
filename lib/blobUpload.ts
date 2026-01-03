// lib/blobUpload.ts
import { put } from "@vercel/blob";

function safeName(name: string) {
  return (name || "file").replace(/[^\w.\-]+/g, "_");
}

export async function uploadPublicFile(file: File, folder: string) {
  if (!file || file.size === 0) throw new Error("No file provided");

  const path = `${folder}/${Date.now()}-${safeName(file.name)}`;

  const blob = await put(path, file, {
    access: "public",
    contentType: file.type || undefined,
  });

  return blob.url;
}
