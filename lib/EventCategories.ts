// lib/eventCategories.ts
export const EVENT_CATEGORIES = [
  "Tech",
  "Social",
  "Arts",
  "Sports",
  "Music",
  "Food & Drink",
  "Outdoors",
  "Study",
  "Career",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
