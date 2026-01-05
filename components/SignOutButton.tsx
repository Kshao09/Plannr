"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "next-auth/react";
import { broadcastAuth } from "@/lib/authBroadcast";

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          // Important: sign out first so cookie/session is actually cleared
          await signOut({ redirect: false });

          // Then tell other tabs to refresh
          broadcastAuth("signout");

          // Update this tab too
          router.refresh();
          router.push("/");
        })
      }
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
