import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function resolveUserId(session: any) {
  const sessionUser = session?.user ?? {};
  const sessionId = sessionUser?.id as string | undefined;
  const sessionEmail = sessionUser?.email as string | undefined;

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

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saved = await prisma.savedEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          startAt: true,
          endAt: true,
          locationName: true,
          category: true,
          image: true,
          organizer: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    events: saved.map((r) => ({
      id: r.event.id,
      slug: r.event.slug,
      title: r.event.title,
      startAt: r.event.startAt.toISOString(),
      endAt: r.event.endAt?.toISOString() ?? null,
      locationName: r.event.locationName ?? null,
      category: r.event.category ?? null,
      image: r.event.image ?? null,
      organizerName: r.event.organizer?.name ?? null,
      isSaved: true,
    })),
  });
}
