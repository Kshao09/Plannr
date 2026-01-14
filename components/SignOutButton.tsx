"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export default function SignOutButton({
  className,
  redirectTo = "/",
  children,
}: {
  className?: string;
  redirectTo?: string;
  children?: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          // Broadcast helper (optional)
          localStorage.setItem("plannr:auth", String(Date.now()));

          // ✅ Use a real navigation so server nav updates instantly
          await signOut({ callbackUrl: redirectTo });
        } finally {
          setPending(false);
        }
      }}
    >
      {children ?? "Sign out"}
    </button>
  );
}
