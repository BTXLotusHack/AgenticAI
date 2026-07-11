import type { ItineraryDayV1, ItineraryStopV1, ItineraryV1 } from "./contracts.js";
import { TripPlanningError } from "./errors.js";

export function sortDayStops(stops: readonly ItineraryStopV1[]): ItineraryStopV1[] {
  return [...stops]
    .sort((left, right) => left.sequence - right.sequence || left.stopId.localeCompare(right.stopId))
    .map((stop, index) => ({ ...stop, sequence: index + 1 }));
}

export function sortItineraryDays(days: readonly ItineraryDayV1[]): ItineraryDayV1[] {
  return [...days]
    .sort((left, right) => left.date.localeCompare(right.date) || left.dayId.localeCompare(right.dayId))
    .map((day) => ({ ...day, stops: sortDayStops(day.stops) }));
}

export function flattenOrderedStops(itinerary: ItineraryV1): ItineraryStopV1[] {
  const orderedDays = sortItineraryDays(itinerary.days);
  return orderedDays.flatMap((day) => sortDayStops(day.stops));
}

export function insertStop(
  day: ItineraryDayV1,
  stop: ItineraryStopV1,
  sequence?: number,
): ItineraryDayV1 {
  const targetSequence = sequence ?? day.stops.length + 1;
  if (targetSequence < 1 || targetSequence > day.stops.length + 1) {
    throw new TripPlanningError("invalid-request", `Stop sequence ${targetSequence} is out of range for day ${day.dayId}.`);
  }
  const shifted = day.stops.map((existing) =>
    existing.sequence >= targetSequence ? { ...existing, sequence: existing.sequence + 1 } : existing,
  );
  return {
    ...day,
    stops: sortDayStops([...shifted, { ...stop, sequence: targetSequence }]),
  };
}

export function removeStop(day: ItineraryDayV1, stopId: string): ItineraryDayV1 {
  const remaining = day.stops.filter((stop) => stop.stopId !== stopId);
  if (remaining.length === day.stops.length) {
    throw new TripPlanningError("not-found", `Stop ${stopId} was not found on day ${day.dayId}.`);
  }
  return { ...day, stops: sortDayStops(remaining) };
}

export function reorderStop(day: ItineraryDayV1, stopId: string, sequence: number): ItineraryDayV1 {
  const stop = day.stops.find((candidate) => candidate.stopId === stopId);
  if (!stop) throw new TripPlanningError("not-found", `Stop ${stopId} was not found on day ${day.dayId}.`);
  const without = day.stops.filter((candidate) => candidate.stopId !== stopId);
  const clamped = Math.max(1, Math.min(sequence, without.length + 1));
  const shifted = without.map((existing) =>
    existing.sequence >= clamped ? { ...existing, sequence: existing.sequence + 1 } : existing,
  );
  return { ...day, stops: sortDayStops([...shifted, { ...stop, sequence: clamped }]) };
}

export function replaceDay(itinerary: ItineraryV1, day: ItineraryDayV1): ItineraryV1 {
  const index = itinerary.days.findIndex((candidate) => candidate.dayId === day.dayId);
  if (index < 0) throw new TripPlanningError("not-found", `Day ${day.dayId} was not found.`);
  const days = [...itinerary.days];
  days[index] = { ...day, stops: sortDayStops(day.stops) };
  return { ...itinerary, days: sortItineraryDays(days) };
}
