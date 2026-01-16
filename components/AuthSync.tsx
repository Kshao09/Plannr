// components/AuthSync.tsx
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

    // Don’t spam refreshes on auth routes
    const onAuthRoute = (pathname ?? "").startsWith("/login") || (pathname ?? "").startsWith("/signup") || (pathname ?? "").startsWith("/auth");

    if (was !== status) {
      if (status === "unauthenticated") {
        if ((pathname ?? "").startsWith("/app")) {
          router.replace(`/login?next=${encodeURIComponent(pathname ?? "/app/dashboard")}`);
          return;
        }
      }

      if (!onAuthRoute) router.refresh();
    }
  }, [status, router, pathname]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "plannr:auth") router.refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  return null;
}
