import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function resolveSlug(
  params: { slug: string } | Promise<{ slug: string }>
): Promise<string> {
  const { slug } = await Promise.resolve(params);
  return slug;
}

// POST /api/events/:slug/checkin body: { code, secret? }
// - Organizer (logged in) can check in without secret
// - Staff can check in with secret
export async function POST(
  req: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const slug = await resolveSlug(params);

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim();
  const secretFromBody = String(body?.secret ?? "").trim();
  const secretFromHeader = (req.headers.get("x-checkin-secret") ?? "").trim();
  const secret = secretFromHeader || secretFromBody;

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, organizerId: true, checkInSecret: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const session = await auth();
  const isOrganizer = !!session?.user?.id && session.user.id === event.organizerId;
  const isStaffWithSecret = !!secret && secret === event.checkInSecret;

  if (!isOrganizer && !isStaffWithSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rsvp = await prisma.rSVP.findFirst({
    where: {
      eventId: event.id,
      status: "GOING",
      attendanceState: "CONFIRMED",
      checkInCode: code,
    },
    select: {
      id: true,
      checkedInAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!rsvp) {
    return NextResponse.json(
      { error: "Invalid code or attendee not confirmed." },
      { status: 404 }
    );
  }

  if (rsvp.checkedInAt) {
    return NextResponse.json({ ok: true, already: true, rsvp }, { status: 200 });
  }

  const updated = await prisma.rSVP.update({
    where: { id: rsvp.id },
    data: { checkedInAt: new Date() },
    select: {
      id: true,
      checkedInAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, already: false, rsvp: updated }, { status: 200 });
}
