import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

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

async function getEventForOrganizer(slug: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, organizerId: true, images: true, image: true },
  });
  if (!event) return { status: 404 as const, error: "Not found", event: null };
  if (event.organizerId !== userId) return { status: 403 as const, error: "Forbidden", event: null };
  return { status: 200 as const, error: null, event };
}

function safeAbsPathForEventUpload(eventId: string, url: string) {
  // only allow deleting files we created: /uploads/events/<eventId>/<file>.png
  const rel = (url.startsWith("/") ? url.slice(1) : url).replace(/\\/g, "/");
  const expectedPrefix = `uploads/events/${eventId}/`;
  if (!rel.startsWith(expectedPrefix)) return null;
  return path.join(process.cwd(), "public", rel);
}

/** POST: upload pngs */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const guard = await getEventForOrganizer(slug, userId);
  if (!guard.event) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const event = guard.event;
  const form = await req.formData();
  const files = form.getAll("files").filter(Boolean) as File[];

  if (files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

  for (const f of files) {
    if (f.type !== "image/png") {
      return NextResponse.json({ error: "Only image/png is allowed" }, { status: 400 });
    }
  }

  const existing = Array.isArray(event.images) ? (event.images as string[]) : [];
  if (existing.length + files.length > 5) {
    return NextResponse.json({ error: "Max 5 images per event" }, { status: 400 });
  }

  const relDir = path.join("uploads", "events", event.id);
  const absDir = path.join(process.cwd(), "public", relDir);
  await fs.mkdir(absDir, { recursive: true });

  const newUrls: string[] = [];
  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    const name = `${crypto.randomUUID()}.png`;
    const absPath = path.join(absDir, name);
    await fs.writeFile(absPath, buf);
    newUrls.push(`/${relDir.replace(/\\/g, "/")}/${name}`);
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      images: { push: newUrls },
      image: event.image ?? newUrls[0], // set cover if missing
    },
    select: { images: true, image: true },
  });

  return NextResponse.json({ ok: true, images: updated.images, image: updated.image });
}

/** PATCH: set cover image (must be one of images[]) */
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const guard = await getEventForOrganizer(slug, userId);
  if (!guard.event) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const event = guard.event;
  const body = await req.json().catch(() => ({}));
  const url = String(body?.url ?? "");

  const imgs = Array.isArray(event.images) ? (event.images as string[]) : [];
  if (!url || !imgs.includes(url)) {
    return NextResponse.json({ error: "Cover must be one of the uploaded images" }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: { image: url },
    select: { images: true, image: true },
  });

  return NextResponse.json({ ok: true, images: updated.images, image: updated.image });
}

/** DELETE: remove image (and delete file from /public if safe) */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const guard = await getEventForOrganizer(slug, userId);
  if (!guard.event) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const event = guard.event;

  // allow JSON body
  const body = await req.json().catch(() => ({}));
  const url = String(body?.url ?? "");

  const imgs = Array.isArray(event.images) ? (event.images as string[]) : [];
  if (!url || !imgs.includes(url)) {
    return NextResponse.json({ error: "Image not found on this event" }, { status: 400 });
  }

  const nextImages = imgs.filter((x) => x !== url);
  const nextCover = event.image === url ? nextImages[0] ?? null : event.image ?? null;

  // delete file from disk (only if it's in our safe upload folder)
  const abs = safeAbsPathForEventUpload(event.id, url);
  if (abs) {
    try {
      await fs.unlink(abs);
    } catch {
      // ignore missing file
    }
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      images: { set: nextImages },
      image: nextCover,
    },
    select: { images: true, image: true },
  });

  return NextResponse.json({ ok: true, images: updated.images, image: updated.image });
}
