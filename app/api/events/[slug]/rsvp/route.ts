import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED";
const ALLOWED: ReadonlySet<RSVPStatus> = new Set(["GOING", "MAYBE", "DECLINED"]);

async function resolveUserId(session: any): Promise<string | null> {
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

async function resolveSlug(
  params: { slug: string } | Promise<{ slug: string }>
): Promise<string> {
  const { slug } = await Promise.resolve(params);
  return slug;
}

// GET /api/events/:slug/rsvp  -> { status }
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const slug = await resolveSlug(params);

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });

  const existing = await prisma.rSVP.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
    select: { status: true },
  });

  return NextResponse.json({ status: existing?.status ?? null }, { status: 200 });
}

// POST /api/events/:slug/rsvp  body: { status }
export async function POST(
  req: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const slug = await resolveSlug(params);

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "") as RSVPStatus;

  if (!ALLOWED.has(status)) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, organizerId: true },
  });
  if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });

  // Optional enforcement: block creator RSVPing their own event
  if (event.organizerId === userId) {
    return NextResponse.json(
      { message: "Organizers cannot RSVP their own event." },
      { status: 403 }
    );
  }

  const rsvp = await prisma.rSVP.upsert({
    where: { userId_eventId: { userId, eventId: event.id } },
    update: { status },
    create: { userId, eventId: event.id, status },
    select: { status: true, updatedAt: true },
  });

  return NextResponse.json(rsvp, { status: 200 });
}
