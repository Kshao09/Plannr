import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <h1>Plannr</h1>
      <p className="small">
        Create events. Publish to the marketplace. Find events by time + place.
      </p>
      <Link className="card" href="/events">
        Browse events →
      </Link>
    </div>
  );
}
