import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EventEditForm from "./EventEditForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { email: session.user.email ?? "" },
    select: { id: true, role: true },
  });

  if (!me?.id || me.role !== "ORGANIZER") redirect("/public/events");

  const event = await prisma.event.findFirst({
    where: { slug },
    select: {
      slug: true,
      organizerId: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      locationName: true,
      address: true,
      category: true,
      capacity: true,
      waitlistEnabled: true,
      image: true,
      images: true,
      checkInSecret: true,
    },
  });

  if (!event) return notFound();
  if (event.organizerId !== me.id) redirect("/public/events");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* match create page look */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">Edit event</div>
          <div className="mt-1 text-sm text-zinc-400">
            Update details, manage images, and save changes.
          </div>
        </div>
      </div>

      <EventEditForm
        slug={slug}
        initial={{
          title: event.title ?? "",
          description: event.description ?? "",
          startAt: event.startAt ? event.startAt.toISOString() : "",
          endAt: event.endAt ? event.endAt.toISOString() : "",
          locationName: event.locationName ?? "",
          address: event.address ?? "",
          category: event.category ?? "",
          capacity: event.capacity ?? null,
          waitlistEnabled: !!event.waitlistEnabled,
          image: event.image ?? "",
          images: event.images ?? [],
          checkInSecret: event.checkInSecret ?? "",
        }}
      />
    </div>
  );
}
