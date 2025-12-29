import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EventEditForm from "@/components/EventEditForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/organizer");

  const role = (session.user as any)?.role;
  if (role !== "ORGANIZER") redirect("/app/dashboard");

  const userId = (session.user as any)?.id as string | undefined;
  const email = session.user.email as string | undefined;

  // resolve userId if missing
  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    resolvedUserId = dbUser?.id;
  }
  if (!resolvedUserId) redirect("/login?next=/organizer");

  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      locationName: true,
      address: true,
      category: true,
      image: true,
      organizerId: true,
    },
  });

  if (!event || event.organizerId !== resolvedUserId) redirect("/app/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-white">Edit event</h1>
      <p className="mt-2 text-sm text-zinc-400">Update details and save.</p>

      <div className="mt-8">
        <EventEditForm
          slug={event.slug}
          initial={{
            title: event.title,
            description: event.description ?? "",
            startAt: event.startAt.toISOString(),
            endAt: event.endAt.toISOString(),
            locationName: event.locationName ?? "",
            address: event.address ?? "",
            category: event.category ?? "",
            image: event.image ?? "",
          }}
        />
      </div>
    </main>
  );
}
