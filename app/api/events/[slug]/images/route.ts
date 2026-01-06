// app/api/events/[slug]/images/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { enforceRateLimit, limiters } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_TOTAL_IMAGES = 5;

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
  const event = await prisma.event.findFirst({
    where: { slug },
    select: { id: true, slug: true, organizerId: true, images: true, image: true },
  });
  if (!event) return { status: 404 as const, error: "Not found", event: null };
  if (event.organizerId !== userId) return { status: 403 as const, error: "Forbidden", event: null };
  return { status: 200 as const, error: null, event };
}

function mergeHeaders(...hs: (Headers | undefined)[]) {
  const out = new Headers();
  for (const h of hs) {
    if (!h) continue;
    h.forEach((v, k) => out.set(k, v));
  }
  return out;
}

function isAllowedImageType(mime: string) {
  return mime === "image/png" || mime === "image/jpeg" || mime === "image/jpg" || mime === "image/webp" || mime === "image/gif";
}

function extFromType(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function looksLikeVercelBlobUrl(url: string) {
  return typeof url === "string" && url.includes("blob.vercel-storage.com");
}

function uniqueNonEmpty(list: (string | null | undefined)[]) {
  const out: string[] = [];
  for (const x of list) {
    const v = String(x ?? "").trim();
    if (!v) continue;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/** POST: upload images (Blob), push into Event.images[] */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ip = getClientIp(req);
  const rlIp = await enforceRateLimit({ limiter: limiters.uploadIpMinute, key: ip, message: "Too many uploads" });
  if (!rlIp.ok) return rlIp.response;

  const rlUser = await enforceRateLimit({ limiter: limiters.uploadUserMinute, key: userId, message: "Too many uploads" });
  if (!rlUser.ok) return rlUser.response;

  const headers = mergeHeaders(rlIp.headers, rlUser.headers);

  const guard = await getEventForOrganizer(slug, userId);
  if (!guard.event) return NextResponse.json({ error: guard.error }, { status: guard.status, headers });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Missing BLOB_READ_WRITE_TOKEN (connect Blob store and pull env vars)." }, { status: 500, headers });
  }

  const event = guard.event;

  const form = await req.formData();
  const files = [...form.getAll("images"), ...form.getAll("files"), ...form.getAll("file")].filter(Boolean) as File[];

  if (files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400, headers });

  for (const f of files) {
    if (!isAllowedImageType(f.type)) return NextResponse.json({ error: `Unsupported image type: ${f.type}` }, { status: 400, headers });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 8MB)." }, { status: 400, headers });
  }

  // Enforce max TOTAL unique images across (cover + images[])
  const existingUnique = uniqueNonEmpty([event.image, ...(Array.isArray(event.images) ? (event.images as string[]) : [])]);
  if (existingUnique.length + files.length > MAX_TOTAL_IMAGES) {
    return NextResponse.json({ error: `Max ${MAX_TOTAL_IMAGES} total images per event` }, { status: 400, headers });
  }

  const newUrls: string[] = [];
  for (const file of files) {
    const ext = extFromType(file.type);
    const name = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const blob = await put(`events/${event.id}/${name}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });

    newUrls.push(blob.url);
  }

  // Push into images[]; if cover missing, set to first new URL
  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      images: { push: newUrls },
      image: event.image ?? newUrls[0],
    },
    select: { images: true, image: true },
  });

  revalidatePath("/public/events");
  revalidatePath(`/public/events/${slug}`);

  return NextResponse.json({ ok: true, images: updated.images, image: updated.image }, { headers });
}

/** PATCH: set cover (must exist either in images[] or already be cover) */
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
  const url = String(body?.url ?? "").trim();

  const imgs = Array.isArray(event.images) ? (event.images as string[]) : [];
  const valid = url && (imgs.includes(url) || event.image === url);
  if (!valid) return NextResponse.json({ error: "Cover must be one of the uploaded images" }, { status: 400 });

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: { image: url },
    select: { images: true, image: true },
  });

  revalidatePath("/public/events");
  revalidatePath(`/public/events/${slug}`);

  return NextResponse.json({ ok: true, images: updated.images, image: updated.image });
}

/** DELETE: remove image (from DB; best-effort delete from Blob) */
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
  const body = await req.json().catch(() => ({}));
  const url = String(body?.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const imgs = Array.isArray(event.images) ? (event.images as string[]) : [];
  const isInImages = imgs.includes(url);
  const isCover = event.image === url;

  if (!isInImages && !isCover) {
    return NextResponse.json({ error: "Image not found on this event" }, { status: 400 });
  }

  const nextImages = isInImages ? imgs.filter((x) => x !== url) : imgs;
  const nextCover = isCover ? (nextImages[0] ?? null) : (event.image ?? null);

  if (looksLikeVercelBlobUrl(url) && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(url);
    } catch (e) {
      console.warn("[images] blob delete failed:", (e as any)?.message ?? e);
    }
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: { images: { set: nextImages }, image: nextCover },
    select: { images: true, image: true },
  });

  revalidatePath("/public/events");
  revalidatePath(`/public/events/${slug}`);

  return NextResponse.json({ ok: true, images: updated.images, image: updated.image });
}
