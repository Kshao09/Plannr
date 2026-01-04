// lib/siteUrl.ts
import { headers } from "next/headers";

function pickFirst(v: string | null | undefined) {
  if (!v) return null;
  // sometimes comma-separated
  return v.split(",")[0]?.trim() || null;
}

function stripProto(hostOrUrl: string) {
  return hostOrUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function isLocalHost(h: string) {
  return (
    h.startsWith("localhost") ||
    h.startsWith("127.0.0.1") ||
    h.startsWith("0.0.0.0")
  );
}

/**
 * Server-component safe base URL (Next 15+ headers() is async).
 * IMPORTANT:
 * - Prefer `host` over `x-forwarded-host` to avoid Vercel alias -> deployment host mismatches.
 */
export async function getBaseUrl() {
  const h = await headers();

  const host =
    pickFirst(h.get("host")) || // ✅ prefer actual host user is visiting
    pickFirst(h.get("x-forwarded-host")) ||
    stripProto((process.env.NEXT_PUBLIC_APP_URL ?? "").trim()) ||
    stripProto((process.env.VERCEL_URL ?? "").trim()) ||
    "localhost:3000";

  const forwardedProto = pickFirst(h.get("x-forwarded-proto"));
  const proto =
    forwardedProto ||
    (isLocalHost(host) ? "http" : "https"); // reasonable fallback

  return `${proto}://${host}`;
}

/**
 * Route-handler safe base URL (req.headers is sync).
 */
export function getBaseUrlFromRequest(req: Request) {
  const h = new Headers(req.headers);

  const host =
    pickFirst(h.get("host")) || // ✅ prefer actual host
    pickFirst(h.get("x-forwarded-host")) ||
    stripProto((process.env.NEXT_PUBLIC_APP_URL ?? "").trim()) ||
    stripProto((process.env.VERCEL_URL ?? "").trim()) ||
    "localhost:3000";

  const forwardedProto = pickFirst(h.get("x-forwarded-proto"));
  const proto = forwardedProto || (isLocalHost(host) ? "http" : "https");

  return `${proto}://${host}`;
}

export async function absoluteUrl(path: string) {
  const base = await getBaseUrl();
  return new URL(path, base).toString();
}

export function absoluteUrlFromRequest(req: Request, path: string) {
  const base = getBaseUrlFromRequest(req);
  return new URL(path, base).toString();
}
