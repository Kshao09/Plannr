// lib/siteUrl.ts
import { headers } from "next/headers";

/**
 * Server-component safe base URL (Next 15+ headers() is async).
 */
export async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ??
    "localhost:3000";

  return `${proto}://${host}`;
}

/**
 * Route-handler safe base URL (req.headers is sync).
 */
export function getBaseUrlFromRequest(req: Request) {
  const h = new Headers(req.headers);
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ??
    "localhost:3000";

  return `${proto}://${host}`;
}

/**
 * For pages that previously imported absoluteUrl().
 */
export async function absoluteUrl(path: string) {
  const base = await getBaseUrl();
  return new URL(path, base).toString();
}

export function absoluteUrlFromRequest(req: Request, path: string) {
  const base = getBaseUrlFromRequest(req);
  return new URL(path, base).toString();
}
