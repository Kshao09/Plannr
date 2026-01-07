"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-white">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm text-black">
        {error?.message || "A server render crashed."}
      </p>
      {error?.digest ? (
        <p className="mt-2 text-xs text-black">Digest: {error.digest}</p>
      ) : null}

      <button
        onClick={() => reset()}
        className="mt-6 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
      >
        Try again
      </button>
    </div>
  );
}
