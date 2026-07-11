import type {
  CreateTripRequestV1,
  ItineraryV1,
  PlannedTripV1,
  TripBudgetV1,
  TripPreferencesV1,
} from "./contracts.js";
import { TRIP_PLANNING_POLICY_V1, TripBudgetV1Schema, TripPreferencesV1Schema } from "./contracts.js";
import { calculateTripEstimates } from "./recommendations.js";
import { sortItineraryDays } from "./ordering.js";
import { validateItineraryDates } from "./validation.js";

export function defaultPreferences(): TripPreferencesV1 {
  return TripPreferencesV1Schema.parse({
    schemaVersion: 1,
    travelMode: "auto",
    language: "vi",
    pace: "moderate",
    avoidTolls: false,
    avoidHighways: false,
    interestTags: [],
    vehicleCount: 1,
  });
}

export function defaultBudget(): TripBudgetV1 {
  return TripBudgetV1Schema.parse({
    schemaVersion: 1,
    currency: TRIP_PLANNING_POLICY_V1.defaultCurrency,
    totalBudgetMinorUnits: 5_000_000,
  });
}

export function defaultItinerary(tripId: string, now: string): ItineraryV1 {
  const date = now.slice(0, 10);
  return {
    schemaVersion: 1,
    itineraryId: `${tripId}:itinerary`,
    days: [
      {
        schemaVersion: 1,
        dayId: `${tripId}:day:1`,
        date,
        label: "Day 1",
        stops: [],
      },
    ],
  };
}

export function createPlannedTrip(input: CreateTripRequestV1, now: string): PlannedTripV1 {
  const itinerary = input.itinerary
    ? { ...input.itinerary, days: sortItineraryDays(input.itinerary.days) }
    : defaultItinerary(input.tripId, now);
  validateItineraryDates(itinerary);

  const trip: PlannedTripV1 = {
    schemaVersion: 1,
    tripId: input.tripId,
    name: input.name,
    lifecycle: "draft",
    version: 1,
    ownerUserId: input.ownerUserId,
    collaborators: [
      {
        schemaVersion: 1,
        userId: input.ownerUserId,
        displayName: input.ownerDisplayName,
        role: "owner",
        joinedAt: now,
      },
    ],
    preferences: input.preferences ?? defaultPreferences(),
    budget: input.budget ?? defaultBudget(),
    itinerary,
    createdAt: now,
    updatedAt: now,
    ...(input.description ? { description: input.description } : {}),
  };

  return { ...trip, estimates: calculateTripEstimates(trip) };
}

export function withUpdatedEstimates(trip: PlannedTripV1): PlannedTripV1 {
  return { ...trip, estimates: calculateTripEstimates(trip) };
}
