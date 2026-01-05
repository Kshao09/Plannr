"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AuthSync() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const prev = useRef(status);

  useEffect(() => {
    const was = prev.current;
    prev.current = status;

    // Session changed (this tab OR another tab)
    if (was !== status) {
      // If user got signed out, refresh server components so /app layout updates
      if (status === "unauthenticated") {
        // If they’re on a protected page, send them to login (optional but nice)
        if (pathname?.startsWith("/app")) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      }

      router.refresh();
    }
  }, [status, router, pathname]);

  // Extra “poke” mechanism in case you want it (SignOutButton sets this):
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "plannr:auth") router.refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  return null;
}
