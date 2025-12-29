import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEventInput } from "@/lib/eventValidation";
import { auth } from "@/auth";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function makeUniqueSlug(desired: string, currentId?: string) {
  let slug = desired;
  let i = 2;

  while (true) {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (!existing) return slug;
    if (currentId && existing.id === currentId) return slug;
    slug = `${desired}-${i++}`;
  }
}

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(event);
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();

  const v = validateEventInput(body);
  if (!v.ok) return NextResponse.json({ message: v.message }, { status: 400 });

  const updated = await prisma.event.update({
    where: { slug },
    data: {
      title: v.data.title,
      // optional: update slug only if you want title change to change URL
      // slug: slugify(v.data.title),
      description: v.data.description,
      startAt: v.data.start,
      endAt: v.data.end,
      locationName: v.data.locationName,
      address: v.data.address,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { slug } = await params;

  const existing = await prisma.event.findUnique({ where: { slug } });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await prisma.event.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sessionId = (session.user as any)?.id as string | undefined;
  const sessionEmail = session.user.email as string | undefined;

  let userId = sessionId;
  if (!userId && sessionEmail) {
    const dbUser = await prisma.user.findUnique({ where: { email: sessionEmail }, select: { id: true } });
    userId = dbUser?.id;
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: { id: true, organizerId: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.organizerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  const startAt = body?.startAt ? new Date(body.startAt) : undefined;
  const endAt = body?.endAt ? new Date(body.endAt) : undefined;
  if (startAt && Number.isNaN(startAt.getTime())) return NextResponse.json({ error: "Invalid startAt" }, { status: 400 });
  if (endAt && Number.isNaN(endAt.getTime())) return NextResponse.json({ error: "Invalid endAt" }, { status: 400 });
  if (startAt && endAt && endAt <= startAt) return NextResponse.json({ error: "endAt must be after startAt" }, { status: 400 });

  const updated = await prisma.event.update({
    where: { slug: params.slug },
    data: {
      title: typeof body.title === "string" ? body.title : undefined,
      description: body.description ?? undefined,
      startAt: startAt ?? undefined,
      endAt: endAt ?? undefined,
      locationName: body.locationName ?? undefined,
      address: body.address ?? undefined,
      category: body.category ?? undefined,
      image: body.image ?? undefined,
    },
    select: { slug: true },
  });

  return NextResponse.json({ ok: true, event: updated });
}