"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export default function ProfileFlash() {
  const toast = useToast();
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const sub = sp.get("sub");
    const portal = sp.get("portal");

    if (sub === "success") {
      toast.success("You’re all set — welcome to Pro!");
      router.replace("/app/profile");
      router.refresh();
    } else if (sub === "cancel") {
      toast.info("Checkout canceled. You can upgrade anytime.");
      router.replace("/app/profile");
      router.refresh();
    } else if (portal === "return") {
      toast.success("Billing updated.");
      router.replace("/app/profile");
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
