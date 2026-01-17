import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EventEditForm from "./EventEditForm";

export const dynamic = "force-dynamic";

type TicketTier = "FREE" | "PREMIUM";

async function resolveMe(
  session: any
): Promise<{ id: string; role: string } | null> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const sessionRole = (su as any)?.role as string | undefined;
  const sessionEmail = su?.email as string | undefined;

  // If your auth session already has both, trust it.
  if (sessionId && sessionRole) return { id: sessionId, role: sessionRole };

  // Otherwise, resolve via email (most reliable)
  if (sessionEmail) {
    const me = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, role: true },
    });
    if (!me?.id || !me.role) return null;
    return { id: me.id, role: me.role as any };
  }

  return null;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await resolveMe(session);
  if (!me?.id || me.role !== "ORGANIZER") redirect("/public/events");

  const event = await prisma.event.findFirst({
    where: { slug },
    select: {
      id: true,
      slug: true,
      organizerId: true,

      title: true,
      description: true,
      startAt: true,
      endAt: true,
      locationName: true,

      address: true,
      city: true,
      state: true,

      category: true,

      ticketTier: true,
      priceCents: true,
      currency: true,

      capacity: true,
      waitlistEnabled: true,

      isRecurring: true,
      recurrence: true,

      image: true,
      images: true,

      checkInSecret: true,
    },
  });

  if (!event) return notFound();
  if (event.organizerId !== me.id) redirect("/public/events");

  const safeImages = Array.isArray(event.images)
  ? (event.images as unknown[]).map((x: unknown) => String(x ?? "").trim()).filter(Boolean)
  : [];

  const ticketTier: TicketTier =
    String(event.ticketTier ?? "FREE").toUpperCase() === "PREMIUM"
      ? "PREMIUM"
      : "FREE";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Edit event</div>
          <div className="mt-1 text-sm text-zinc-600">
            Update details, manage images, and save changes.
          </div>
        </div>
      </div>

      <EventEditForm
        initial={{
          id: event.id,
          slug: event.slug,

          title: event.title ?? "",
          description: event.description ?? null,

          startAt: event.startAt ? event.startAt.toISOString() : "",
          endAt: event.endAt ? event.endAt.toISOString() : "",

          locationName: event.locationName ?? "",
          address: event.address ?? "",
          city: event.city ?? "",
          state: event.state ?? "",

          category: event.category ?? "",

          ticketTier,
          priceCents: event.priceCents ?? 0,
          currency: event.currency ?? "usd",

          capacity: event.capacity ?? null,
          waitlistEnabled: !!event.waitlistEnabled,

          isRecurring: !!event.isRecurring,
          recurrence: (event.recurrence as any) ?? null,

          image: event.image ?? "",
          images: safeImages,
          checkInSecret: event.checkInSecret ?? null,
        }}
      />
    </div>
  );
}
