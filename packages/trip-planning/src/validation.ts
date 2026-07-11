import type { ItineraryDayV1, ItineraryStopV1, ItineraryV1, TascoPlaceReferenceV1 } from "./contracts.js";
import { TascoPlaceReferenceV1Schema } from "./contracts.js";
import { TripPlanningError, assertTascoPlaceReference } from "./errors.js";

function parseIsoDate(date: string): number {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) {
    throw new TripPlanningError("invalid-date", `Invalid itinerary date: ${date}.`);
  }
  return parsed;
}

export function validatePlaceReference(place: TascoPlaceReferenceV1): void {
  const parsed = TascoPlaceReferenceV1Schema.safeParse(place);
  if (!parsed.success) {
    throw new TripPlanningError("missing-tasco-place", "Place references must match the shared Tasco place contract.");
  }
  assertTascoPlaceReference(place);
  if (place.id !== place.id.trim()) {
    throw new TripPlanningError("missing-tasco-place", "Tasco place IDs must not contain leading or trailing whitespace.");
  }
}

export function validateItineraryDates(itinerary: ItineraryV1): void {
  const seenDates = new Set<string>();
  let previousDate = Number.NEGATIVE_INFINITY;

  for (const day of itinerary.days) {
    const parsed = parseIsoDate(day.date);
    if (seenDates.has(day.date)) {
      throw new TripPlanningError("invalid-date", `Duplicate itinerary day date: ${day.date}.`);
    }
    if (parsed < previousDate) {
      throw new TripPlanningError("invalid-date", "Itinerary days must be in chronological order.");
    }
    seenDates.add(day.date);
    previousDate = parsed;
    validateDayStops(day);
  }
}

function validateDayStops(day: ItineraryDayV1): void {
  const seenPlaceIds = new Set<string>();
  const seenSequences = new Set<number>();

  for (const stop of day.stops) {
    validateStopReference(stop);
    if (seenPlaceIds.has(stop.tascoPlaceId)) {
      throw new TripPlanningError("duplicate-stop", `Duplicate stop ${stop.tascoPlaceId} on day ${day.date}.`);
    }
    if (seenSequences.has(stop.sequence)) {
      throw new TripPlanningError("invalid-request", `Duplicate stop sequence ${stop.sequence} on day ${day.date}.`);
    }
    seenPlaceIds.add(stop.tascoPlaceId);
    seenSequences.add(stop.sequence);
    if (stop.plannedArrivalAt && !stop.plannedArrivalAt.startsWith(day.date)) {
      throw new TripPlanningError("invalid-date", `Stop ${stop.stopId} arrival must fall on day ${day.date}.`);
    }
    if (stop.plannedDepartureAt && !stop.plannedDepartureAt.startsWith(day.date)) {
      throw new TripPlanningError("invalid-date", `Stop ${stop.stopId} departure must fall on day ${day.date}.`);
    }
    if (stop.plannedArrivalAt && stop.plannedDepartureAt && stop.plannedArrivalAt >= stop.plannedDepartureAt) {
      throw new TripPlanningError("invalid-date", `Stop ${stop.stopId} departure must be after arrival.`);
    }
  }
}

export function validateStopReference(stop: ItineraryStopV1): void {
  validatePlaceReference(stop.place);
  if (stop.tascoPlaceId !== stop.place.id) {
    throw new TripPlanningError("missing-tasco-place", `Stop ${stop.stopId} must keep a consistent Tasco place ID.`);
  }
}

export function findDuplicateStopAcrossItinerary(itinerary: ItineraryV1, tascoPlaceId: string, excludingStopId?: string): ItineraryStopV1 | undefined {
  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      if (stop.tascoPlaceId === tascoPlaceId && stop.stopId !== excludingStopId) return stop;
    }
  }
  return undefined;
}
