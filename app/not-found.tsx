import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h1>404 – Not Found</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link href="/">Go home</Link>
    </div>
  );
}
