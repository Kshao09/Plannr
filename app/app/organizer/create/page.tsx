// app/app/organizer/create/page.tsx
import Link from "next/link";
import CreateEventForm from "./CreateEventForm";

export default function OrganizerCreatePage() {
  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_500px_at_50%_-50px,rgba(255,255,255,0.08),transparent)]" />

      <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Create event
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Add details and publish when you’re ready.
            </p>
          </div>
        </div>

        <div className="mt-8 mx-auto w-full max-w-3xl">
          <CreateEventForm />
        </div>
      </div>
    </main>
  );
}
