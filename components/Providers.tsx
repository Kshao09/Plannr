"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ToastProvider";
import AuthSync from "@/components/AuthSync";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSync />
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
