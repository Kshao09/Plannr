"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL ERROR]", error);
  }, [error]);

  return (
    <html>
      <body className="bg-black text-white">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="text-2xl font-semibold">App crashed (server render)</h1>
          <p className="mt-3 text-sm text-zinc-300">{error.message || "Hidden in production"}</p>
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
      </body>
    </html>
  );
}
