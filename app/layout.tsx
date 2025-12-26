import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata = {
  title: "Plannr",
  description: "Self-serve event marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen w-screen overflow-x-hidden bg-[#050711] text-white">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
