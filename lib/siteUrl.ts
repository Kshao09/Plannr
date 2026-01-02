// lib/siteUrl.ts
import "server-only";
import { headers } from "next/headers";

function pickFirst(v: string | null | undefined) {
  if (!v) return "";
  // Vercel can send comma-separated forwarded headers
  return v.split(",")[0]?.trim() ?? "";
}

function normalizeOrigin(origin: string) {
  const o = String(origin ?? "").trim().replace(/\/+$/, "");
  if (!o) return "";
  if (/^https?:\/\//i.test(o)) return o;
  // Allow env like "myapp.vercel.app" (no protocol)
  return `https://${o}`;
}

export function getBaseUrl() {
  // Prefer explicit env when present
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    "";

  const normalizedEnv = normalizeOrigin(env);
  if (normalizedEnv) return normalizedEnv;

  // Infer from request headers (Vercel/server)
  try {
    const h = headers();

    const proto = pickFirst(h.get("x-forwarded-proto")) || "https";
    const host = pickFirst(h.get("x-forwarded-host")) || pickFirst(h.get("host"));

    if (host) return normalizeOrigin(`${proto}://${host}`);
  } catch {
    // ignore
  }

  // Vercel fallback
  const vercel = pickFirst(process.env.VERCEL_URL);
  if (vercel) return normalizeOrigin(`https://${vercel}`);

  // Local fallback
  return "http://localhost:3000";
}

export function getBaseUrlFromRequest(req: Request) {
  const proto = pickFirst(req.headers.get("x-forwarded-proto")) || "https";
  const host =
    pickFirst(req.headers.get("x-forwarded-host")) || pickFirst(req.headers.get("host"));

  if (host) return normalizeOrigin(`${proto}://${host}`);

  return getBaseUrl();
}

export function absoluteUrl(pathOrUrl: string, base = getBaseUrl()) {
  const v = String(pathOrUrl ?? "").trim();
  if (!v) return base;
  if (/^https?:\/\//i.test(v)) return v;

  const p = v.startsWith("/") ? v : `/${v}`;

  try {
    return new URL(p, base).toString();
  } catch {
    return `${base}${p}`;
  }
}
