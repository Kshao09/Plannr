import Link from "next/link";

export default function OrganizerCreateLink() {
  return (
    <Link
      href="/app/organizer/create"
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
    >
      Create
    </Link>
  );
}
