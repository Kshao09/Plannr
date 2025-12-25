import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata = {
  title: "Plannr",
  description: "Self-serve event marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <html lang="en">
      <body>
        <div className="container">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
    </html>
  );
}
