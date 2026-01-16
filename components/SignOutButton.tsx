"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function clearPlannrClientState() {
  if (typeof window === "undefined") return;

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("plannr:")) localStorage.removeItem(k);
    }
  } catch {}

  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("plannr:")) sessionStorage.removeItem(k);
    }
  } catch {}
}

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
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          // 1) Clear your own app state
          clearPlannrClientState();

          // 2) Invalidate Auth.js session cookie
          await signOut({ redirect: false });

          // 3) Update UI immediately (no manual refresh)
          router.replace(redirectTo);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {children ?? "Sign out"}
    </button>
  );
}
