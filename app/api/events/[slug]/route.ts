import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function resolveUser(session: any): Promise<{ userId: string | null; role: string | null }> {
  const su = session?.user ?? {};
  const sessionId = su?.id as string | undefined;
  const sessionEmail = su?.email as string | undefined;
  const sessionRole = (su as any)?.role as string | undefined;

  if (sessionId && sessionRole) return { userId: sessionId, role: sessionRole };

  if (sessionEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, role: true },
    });

    return {
      userId: dbUser?.id ?? sessionId ?? null,
      role: sessionRole ?? dbUser?.role ?? null,
    };
  }

  return { userId: sessionId ?? null, role: sessionRole ?? null };
}

function parseISODate(v: any): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function asNullableString(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> } // ✅ Promise in your Next version
) {
  const { slug } = await params; // ✅ unwrap params

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Must be organizer to edit
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, organizerId: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (event.organizerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = asNullableString(body.title);
  const description = asNullableString(body.description);
  const locationName = asNullableString(body.locationName);
  const address = asNullableString(body.address);
  const category = asNullableString(body.category);
  const image = asNullableString(body.image);

  const startAt = parseISODate(body.startAt);
  const endAt = parseISODate(body.endAt);

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!startAt) return NextResponse.json({ error: "Start date is invalid" }, { status: 400 });
  if (!endAt) return NextResponse.json({ error: "End date is invalid" }, { status: 400 });
  if (endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      title,
      description,
      startAt,
      endAt,
      locationName,
      address,
      category,
      image,
    },
    select: { slug: true },
  });

  return NextResponse.json({ ok: true, slug: updated.slug }, { status: 200 });
}
