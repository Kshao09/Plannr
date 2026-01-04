// lib/ip.ts
import "server-only";

function pickFirst(v: string | null) {
  if (!v) return "";
  return v.split(",")[0]?.trim() ?? "";
}

export function getClientIp(req: Request) {
  const h = new Headers(req.headers);
  const xff = pickFirst(h.get("x-forwarded-for"));
  const xrip = pickFirst(h.get("x-real-ip"));
  const cf = pickFirst(h.get("cf-connecting-ip"));
  return cf || xff || xrip || "0.0.0.0";
}
