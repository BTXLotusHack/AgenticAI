import type { TripLifecycle } from "./contracts.js";
import { TripPlanningError } from "./errors.js";

const ALLOWED_TRANSITIONS: Readonly<Record<TripLifecycle, readonly TripLifecycle[]>> = {
  draft: ["published"],
  published: ["active", "draft"],
  active: ["completed"],
  completed: [],
};

const EDITABLE_LIFECYCLES = new Set<TripLifecycle>(["draft", "published"]);

export function canEditItinerary(lifecycle: TripLifecycle): boolean {
  return EDITABLE_LIFECYCLES.has(lifecycle);
}

export function assertEditable(lifecycle: TripLifecycle): void {
  if (!canEditItinerary(lifecycle)) {
    throw new TripPlanningError("invalid-lifecycle", `Itinerary edits are not allowed while the trip is ${lifecycle}.`);
  }
}

export function transitionLifecycle(current: TripLifecycle, next: TripLifecycle): TripLifecycle {
  if (current === next) return current;
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new TripPlanningError("invalid-lifecycle", `Cannot transition a trip from ${current} to ${next}.`);
  }
  return next;
}

export function lifecycleTimestampField(next: TripLifecycle): "publishedAt" | "activatedAt" | "completedAt" | undefined {
  if (next === "published") return "publishedAt";
  if (next === "active") return "activatedAt";
  if (next === "completed") return "completedAt";
  return undefined;
}
