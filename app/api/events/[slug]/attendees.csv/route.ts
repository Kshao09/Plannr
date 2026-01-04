import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function resolveUser(session: any): Promise<{ userId: string | null; role: string | null }> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
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

function csvCell(v: string) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

// ✅ add a type for what we SELECT from prisma
type RSVPRow = {
  status: "GOING" | "MAYBE" | "DECLINED";
  createdAt: Date;
  user: { name: string | null; email: string | null } | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> } // ✅ Promise
) {
  const { slug } = await params; // ✅ unwrap

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, organizerId: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const canManage = role === "ORGANIZER" && event.organizerId === userId;
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ✅ force the result type so map param isn't implicit any
  const rsvps: RSVPRow[] = await prisma.rSVP.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: "asc" },
    select: {
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  const header = ["Name", "Email", "Status", "RSVP At"].map(csvCell).join(",");

  // ✅ annotate r to avoid implicit any (even if your tsconfig is strict)
  const rows = rsvps.map((r: RSVPRow) =>
    [
      csvCell(r.user?.name ?? ""),
      csvCell(r.user?.email ?? ""),
      csvCell(r.status),
      csvCell(r.createdAt.toISOString()), // createdAt is already a Date
    ].join(",")
  );

  const csv = [header, ...rows, ""].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-attendees.csv"`,
    },
  });
}
