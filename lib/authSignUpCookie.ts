// lib/authSignUpCookie.ts
export const SIGNUP_ROLE_COOKIE = "plannr.signup_role";

// Only accept these values
const ALLOWED = new Set(["MEMBER", "ORGANIZER"] as const);
export type Role = "MEMBER" | "ORGANIZER";

// Returns null if cookie missing/invalid
export function normalizeRole(v: unknown): Role | null {
  if (typeof v !== "string") return null;
  const up = v.trim().toUpperCase();
  if (ALLOWED.has(up as Role)) return up as Role;
  return null;
}
