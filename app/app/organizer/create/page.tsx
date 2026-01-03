import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CreateEventForm from "./CreateEventForm";

export const dynamic = "force-dynamic";

export default async function OrganizerCreatePage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "ORGANIZER") redirect("/public/events");

  return <CreateEventForm />;
}
