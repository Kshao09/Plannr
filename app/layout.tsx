import "./globals.css";
import Providers from "@/components/Providers";
import AuthSync from "@/components/AuthSync";

export const metadata = {
  title: "Plannr",
  description: "Event planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AuthSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
