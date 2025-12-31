import StaffCheckInClient from "./staffCheckInClient";

export default function Page({ params, searchParams }: any) {
  const secret = searchParams?.secret ?? "";
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Staff Check-in</h1>
      <p className="mt-2 text-sm text-zinc-400">Paste/scan attendee code to check them in.</p>
      <div className="mt-6">
        <StaffCheckInClient slug={params.slug} secret={secret} />
      </div>
    </div>
  );
}
