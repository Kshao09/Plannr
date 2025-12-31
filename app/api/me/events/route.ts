import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function resolveUserId(session: any): Promise<string | null> {
  const su = session?.user ?? {};
  const sessionId = su?.id as string | undefined;
  const sessionEmail = su?.email as string | undefined;

  if (sessionId) return sessionId;

  if (sessionEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true },
    });
    return dbUser?.id ?? null;
  }

  return null;
}

// GET /api/me/events -> events I organize
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    where: { organizerId: userId },
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      startAt: true,
      endAt: true,
      locationName: true,
      category: true,
      image: true,
      capacity: true,
      waitlistEnabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ events }, { status: 200 });
}
