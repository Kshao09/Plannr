// lib/appUrl.ts
export function getAppUrl(): string {
  // Prefer explicit env vars (best for Production / custom domain)
  const explicit =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL;

  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel sets this automatically in Preview + Production deploys
  // (it has no protocol, so we add https://)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // Local fallback
  return "http://localhost:3000";
}
