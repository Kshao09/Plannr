// lib/siteUrl.ts
import { headers } from "next/headers";

function pickFirst(v: string | null) {
  if (!v) return null;
  // forwarded headers can be "https, http" etc.
  return v.split(",")[0]?.trim() || null;
}

function normalizeOrigin(origin: string) {
  // remove trailing slash
  return origin.replace(/\/+$/, "");
}

export async function absoluteUrl(path: string): Promise<string> {
  const base = await getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Works in Server Components / Route Handlers.
 * Next.js (newer) returns headers() as Promise<ReadonlyHeaders>.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();

  const proto = pickFirst(h.get("x-forwarded-proto")) || "https";
  const host = pickFirst(h.get("x-forwarded-host")) || pickFirst(h.get("host"));

  if (host) return normalizeOrigin(`${proto}://${host}`);

  // fallback for local dev
  return "http://localhost:3000";
}

/**
 * Use this when you already have a Request object (route handlers).
 * No Next headers() usage needed.
 */
export function getBaseUrlFromRequest(req: Request): string {
  const h = req.headers;
  const proto = pickFirst(h.get("x-forwarded-proto")) || "http";
  const host = pickFirst(h.get("x-forwarded-host")) || pickFirst(h.get("host")) || "localhost:3000";
  return normalizeOrigin(`${proto}://${host}`);
}
