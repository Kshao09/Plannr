"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
          // extra nudge for tabs (optional, but helps)
          localStorage.setItem("plannr:auth", String(Date.now()));

          // NextAuth client signOut broadcasts to other tabs
          await signOut({ redirect: false });

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
