export type TripPlanningErrorCode =
  | "not-found"
  | "forbidden"
  | "conflict"
  | "invalid-request"
  | "duplicate-stop"
  | "invalid-date"
  | "invalid-lifecycle"
  | "missing-tasco-place";

export class TripPlanningError extends Error {
  constructor(
    readonly code: TripPlanningErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "TripPlanningError";
  }
}

export function assertTascoPlaceReference(place: { readonly id: string; readonly provider: string }): void {
  if (!place.id.includes(":")) {
    throw new TripPlanningError("missing-tasco-place", "Every stop must reference a Tasco place ID.");
  }
  if (place.provider !== "tasco") {
    throw new TripPlanningError("missing-tasco-place", "Place references must originate from Tasco.");
  }
}
