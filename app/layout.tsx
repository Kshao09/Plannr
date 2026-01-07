import "./globals.css";
import Providers from "@/components/Providers";
import AuthSync from "@/components/AuthSync";
import type { ReactNode } from "react";

export const metadata = {
  title: "Plannr",
  description: "Event planner",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="min-h-full bg-white text-zinc-900 antialiased">
        <Providers>
          <AuthSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
