import { prisma } from "@/lib/prisma";

function icsEscape(s: string) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toICSDate(d: Date) {
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const e = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!e) return new Response("Not found", { status: 404 });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Plannr//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@plannr`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(e.startAt)}`,
    `DTEND:${toICSDate(e.endAt)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    `DESCRIPTION:${icsEscape(e.description ?? "")}`,
    `LOCATION:${icsEscape(`${e.locationName ?? ""} - ${e.address ?? ""}`.trim())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.slug}.ics"`,
    },
  });
}
