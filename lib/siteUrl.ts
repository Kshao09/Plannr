import { headers } from "next/headers";

function normalizeBaseUrl(u: string) {
  return u.replace(/\/+$/, "");
}

function envBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return `https://${raw}`;
  return normalizeBaseUrl(raw);
}

export async function getBaseUrl(): Promise<string> {
  const env = envBaseUrl();
  if (env) return env;

  try {
    const h = await headers(); // ✅ FIX
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return normalizeBaseUrl(`${proto}://${host}`);
  } catch {
    // ignore
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getBaseUrlFromRequest(req: Request): string {
  const env = envBaseUrl();
  if (env) return env;

  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return normalizeBaseUrl(`${proto ?? "http"}://${host}`);

  try {
    return new URL(req.url).origin;
  } catch {
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
  }
}
