// app/(auth)/auth/role/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SP = { role?: string | string[]; next?: string | string[] };

function safeNext(v: unknown) {
  const s = typeof v === "string" ? v : "";
  if (!s.startsWith("/")) return "/app/dashboard";
  if (s.startsWith("//")) return "/app/dashboard";
  return s;
}

export default async function AuthRolePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const roleRaw = typeof sp.role === "string" ? sp.role : "MEMBER";
  const desiredRole = roleRaw.toUpperCase() === "ORGANIZER" ? "ORGANIZER" : "MEMBER";
  const next = safeNext(typeof sp.next === "string" ? sp.next : "/app/dashboard");

  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const email = session?.user?.email ? String(session.user.email).toLowerCase() : undefined;

  // If OAuth hasn't finalized a session yet, send them to login, then they'll come back.
  if (!userId && !email) {
    redirect(`/login?next=${encodeURIComponent(`/auth/role?role=${desiredRole}&next=${next}`)}`);
  }

  // Prefer updating by id, fallback to email
  const where = userId ? ({ id: userId } as const) : ({ email: email! } as const);

  const dbUser = await prisma.user.findUnique({
    where: where as any,
    select: { role: true },
  });

  // ✅ Only upgrade (never downgrade)
  if (desiredRole === "ORGANIZER" && dbUser?.role !== "ORGANIZER") {
    await prisma.user.update({
      where: where as any,
      data: { role: "ORGANIZER" as any },
    });
  }

  redirect(next);
}
