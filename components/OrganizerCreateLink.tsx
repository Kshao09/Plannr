"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function OrganizerCreateLink() {
  const pathname = usePathname();

  // Hide the button if already on the create page
  const onCreatePage =
    pathname === "/app/organizer/create" ||
    pathname === "/organizer/create"; // (optional if you still have this route)

  if (onCreatePage) return null;

  return (
    <Link
      href="/app/organizer/create"
      className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/5"
    >
      Create
    </Link>
  );
}
