"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[checkin segment error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-white">
      <h1 className="text-2xl font-semibold">Check-in crashed</h1>
      <p className="mt-3 text-sm text-zinc-300">
        {error.message || "Hidden in production"}
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-zinc-400">Digest: {error.digest}</p>
      ) : null}
      <button
        onClick={() => reset()}
        className="mt-6 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
      >
        Retry
      </button>
    </div>
  );
}
