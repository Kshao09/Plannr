import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CreateEventForm from "./CreateEventForm";

export const dynamic = "force-dynamic";

export default async function OrganizerCreatePage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "ORGANIZER") redirect("/public/events");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <div className="text-2xl font-semibold text-white">Create event</div>
        <div className="mt-1 text-sm text-black">Add details, upload images, and publish.</div>
      </div>
      <CreateEventForm />
    </div>
  );
}
