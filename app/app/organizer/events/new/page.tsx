import { redirect } from "next/navigation";

export default function NewEventRedirect() {
  redirect("/app/organizer/create");
}
