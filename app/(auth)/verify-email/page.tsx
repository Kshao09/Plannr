import Link from "next/link";
import { prisma } from "@/lib/prisma";

type SP = { token?: string | string[] };

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  if (!token) {
    return (
      <Card title="Invalid link">
        <p className="mt-2 text-sm text-zinc-600">Missing verification token.</p>
        <div className="mt-6">
          <Link className="font-semibold text-zinc-900 hover:underline" href="/login">
            Go to log in
          </Link>
        </div>
      </Card>
    );
  }

  const now = new Date();

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    select: { userId: true, expiresAt: true },
  });

  if (!record || record.expiresAt < now) {
    return (
      <Card title="Link expired">
        <p className="mt-2 text-sm text-zinc-600">
          This verification link is invalid or expired. Please sign up again.
        </p>
        <div className="mt-6">
          <Link className="font-semibold text-zinc-900 hover:underline" href="/signup">
            Back to sign up
          </Link>
        </div>
      </Card>
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
    <Card title="Email verified ✅">
      <p className="mt-2 text-sm text-zinc-600">Your email is verified. You can log in now.</p>
      <div className="mt-6">
        <Link className="font-semibold text-zinc-900 hover:underline" href="/login">
          Go to log in
        </Link>
      </div>
    </Card>
  );
}
