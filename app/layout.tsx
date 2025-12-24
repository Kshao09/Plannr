import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Plannr",
  description: "Self-serve event marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="container nav">
          <Link href="/"><b>Plannr</b></Link>
          <Link href="/events">Events</Link>
          <Link href="/create">Create</Link>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
