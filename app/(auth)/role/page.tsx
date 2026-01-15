import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SP = { role?: string | string[]; next?: string | string[] };

export default async function AuthRolePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const roleRaw = typeof sp.role === "string" ? sp.role : "MEMBER";
  const desiredRole = roleRaw === "ORGANIZER" ? "ORGANIZER" : "MEMBER";

  const nextRaw = sp.next;
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/app/dashboard";

  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  // Safety: don't accidentally downgrade an ORGANIZER back to MEMBER
  const shouldUpdate =
    !dbUser?.role ||
    (dbUser.role !== "ORGANIZER" && desiredRole === "ORGANIZER");

  if (shouldUpdate) {
    await prisma.user.update({
      where: { email },
      data: { role: desiredRole as any },
    });
  }

  redirect(next);
}
