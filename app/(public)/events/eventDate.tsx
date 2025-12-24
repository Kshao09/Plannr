"use client";

export default function EventDate({ iso }: { iso: string }) {
  return <span>{new Date(iso).toLocaleString()}</span>;
}
