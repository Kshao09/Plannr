export type EventInput = {
  title: string;
  description: string;
  locationName: string;
  address: string;
  startAt: string; // ISO or datetime-local string depending on caller
  endAt: string;
};

export function validateEventInput(input: EventInput) {
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const locationName = String(input.locationName ?? "").trim();
  const address = String(input.address ?? "").trim();

  if (!title || !description || !locationName || !address) {
    return { ok: false as const, message: "Missing fields" };
  }

  const start = new Date(input.startAt);
  const end = new Date(input.endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false as const, message: "Invalid start/end date" };
  }

  if (end <= start) {
    return { ok: false as const, message: "End time must be after start time" };
  }

  return {
    ok: true as const,
    data: { title, description, locationName, address, start, end },
  };
}
