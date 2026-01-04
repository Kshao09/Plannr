import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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

type SavedRow = Prisma.SavedEventGetPayload<{
  select: {
    createdAt: true;
    event: {
      select: {
        id: true;
        slug: true;
        title: true;
        startAt: true;
        endAt: true;
        locationName: true;
        category: true;
        image: true;
        organizer: { select: { name: true } };
      };
    };
  };
}>;

// GET /api/me/saved?page=1&take=12 -> saved events for current user
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const take = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("take") ?? "12", 10) || 12)
  );
  const skip = (page - 1) * take;

  const total = await prisma.savedEvent.count({ where: { userId } });

  const saved: SavedRow[] = await prisma.savedEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      createdAt: true,
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

  return NextResponse.json(
    {
      page,
      take,
      total,
      totalPages: Math.max(1, Math.ceil(total / take)),
      events: saved.map((r) => ({
        id: r.event.id,
        slug: r.event.slug,
        title: r.event.title,
        startAt: r.event.startAt,
        endAt: r.event.endAt,
        locationName: r.event.locationName,
        category: r.event.category,
        image: r.event.image,
        organizerName: r.event.organizer?.name ?? null,
        savedAt: r.createdAt,
      })),
    },
    { status: 200 }
  );
}
