"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeAuth } from "@/lib/authBroadcast";

export default function AuthSync() {
  const router = useRouter();

  useEffect(() => {
    return subscribeAuth((msg) => {
      if (msg?.type === "signout") {
        // Re-render server components + trigger middleware redirects
        router.refresh();
      }
    });
  }, [router]);

  return null;
}
