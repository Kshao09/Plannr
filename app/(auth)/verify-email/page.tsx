// app/(auth)/verify-email/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type SP = { token?: string | string[] };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  if (!token) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-semibold text-white">Invalid link</h1>
          <p className="mt-2 text-sm text-zinc-400">Missing verification token.</p>
          <div className="mt-6">
            <Link className="text-zinc-200 hover:underline" href="/login">
              Go to log in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const now = new Date();

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    select: { userId: true, expiresAt: true },
  });

  if (!record || record.expiresAt < now) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-semibold text-white">Link expired</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This verification link is invalid or expired. Please sign up again.
          </p>
          <div className="mt-6">
            <Link className="text-zinc-200 hover:underline" href="/signup">
              Back to sign up
            </Link>
          </div>
        </div>
      </main>
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: now },
    }),
    prisma.emailVerificationToken.delete({ where: { token } }),
  ]);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-semibold text-white">Email verified ✅</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Your email is verified. You can log in now.
        </p>
        <div className="mt-6">
          <Link className="text-zinc-200 hover:underline" href="/login">
            Go to log in
          </Link>
        </div>
      </div>
    </main>
  );
}
