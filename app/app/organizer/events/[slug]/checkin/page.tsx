import { prisma } from "@/lib/prisma";
import CheckInClient from "./CheckInClient";

export default async function Page({ params }: { params: { slug: string } }) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: {
      slug: true,
      title: true,
      capacity: true,
      waitlistEnabled: true,
      checkInSecret: true,
      rsvps: {
        where: { status: "GOING" },
        select: {
          id: true,
          attendanceState: true,
          checkedInAt: true,
          checkInCode: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) return null;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-3xl font-semibold">{event.title}</h1>
      <p className="mt-2 text-sm text-zinc-400">Organizer check-in</p>
      <div className="mt-6">
        <CheckInClient event={event} />
      </div>
    </div>
  );
}
