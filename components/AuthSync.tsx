"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { subscribeAuth } from "@/lib/authBroadcast";

export default function AuthSync() {
  const router = useRouter();

  useEffect(() => {
    return subscribeAuth((msg) => {
      if (msg.type !== "signout") return;

      // 1) soft refresh first
      router.refresh();

      // 2) if this tab still thinks it's logged-in, force a hard reload
      setTimeout(async () => {
        try {
          const s = await getSession();
          if (s?.user) {
            window.location.reload();
          }
        } catch {
          // If session check fails, reload anyway to be safe
          window.location.reload();
        }
      }, 300);
    });
  }, [router]);

  return null;
}
