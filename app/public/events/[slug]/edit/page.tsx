import { notFound } from "next/navigation";
import { prisma } from "@/lib/db"; // ✅ use the same one you use in lib/events.ts
import EditEventForm from "./EditEventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  return (
    <EditEventForm
      event={{
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description ?? "",     // ✅ avoid null
        locationName: event.locationName ?? "",   // ✅ avoid null
        address: event.address ?? "",             // ✅ avoid null
        startAt: event.startAt.toISOString(),
        endAt: event.endAt.toISOString(),
      }}
    />
  );
}
