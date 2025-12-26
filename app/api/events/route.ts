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

async function uniqueSlug(base: string) {
  let slug = base;
  let i = 2;
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { startAt: "asc" },
    select: { id: true, title: true, slug: true, startAt: true, locationName: true },
  });

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  // ✅ NextAuth v5: get session anywhere server-side
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const v = validateEventInput(body);
  if (!v.ok) return NextResponse.json({ message: v.message }, { status: 400 });

  // Support either validator output shape: start/end OR startAt/endAt
  const startRaw = (v.data as any).startAt ?? (v.data as any).start;
  const endRaw = (v.data as any).endAt ?? (v.data as any).end;

  const startAt = new Date(startRaw);
  const endAt = new Date(endRaw);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ message: "Invalid start/end date." }, { status: 400 });
  }

  const base = slugify(v.data.title);
  const slug = await uniqueSlug(base);

  const created = await prisma.event.create({
    data: {
      title: v.data.title,
      slug,
      description: v.data.description ?? null,
      startAt,
      endAt,
      locationName: v.data.locationName ?? null,
      address: v.data.address ?? null,

      // ✅ required by your schema
      organizerId: userId,
    },
  });

  return NextResponse.json(created, { status: 201 });
}