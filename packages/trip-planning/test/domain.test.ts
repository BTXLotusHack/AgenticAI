import { describe, expect, it } from "vitest";

import {
  GOLDEN_ITINERARY,
  GOLDEN_PLACES,
  GOLDEN_PLANNED_TRIP,
  GOLDEN_RECOMMENDATION_CANDIDATES,
  TripPlanningError,
  buildRouteRequest,
  calculateTripEstimates,
  rankPlaceRecommendations,
  validateItineraryDates,
} from "../src/index.js";

describe("validation", () => {
  it("rejects duplicate stops on the same day", () => {
    const invalid = structuredClone(GOLDEN_ITINERARY);
    invalid.days[0]!.stops.push({
      schemaVersion: 1,
      stopId: "STOP999",
      tascoPlaceId: GOLDEN_PLACES.hanoiOldQuarter.tascoPlaceId,
      place: GOLDEN_PLACES.hanoiOldQuarter,
      sequence: 3,
      dwellMinutes: 10,
    });
    expect(() => validateItineraryDates(invalid)).toThrow(TripPlanningError);
    expect(() => validateItineraryDates(invalid)).toThrow(/Duplicate stop/);
  });

  it("rejects out-of-order itinerary dates", () => {
    const invalid = structuredClone(GOLDEN_ITINERARY);
    invalid.days = [invalid.days[1]!, invalid.days[0]!];
    expect(() => validateItineraryDates(invalid)).toThrow(/chronological order/);
  });

  it("rejects stops without Tasco place IDs", () => {
    const invalidPlace = {
      ...GOLDEN_PLACES.hanoiOldQuarter,
      tascoPlaceId: "generated:poi:123",
      tags: [...(GOLDEN_PLACES.hanoiOldQuarter.tags ?? [])],
    };
    expect(() =>
      rankPlaceRecommendations({
        tripId: "PLAN001",
        preferences: GOLDEN_PLANNED_TRIP.preferences,
        candidates: [invalidPlace],
      }),
    ).toThrow(/Tasco place ID/);
  });
});

describe("recommendations", () => {
  it("ranks Tasco-backed candidates with explainable scores", () => {
    const ranked = rankPlaceRecommendations({
      tripId: "PLAN001",
      preferences: GOLDEN_PLANNED_TRIP.preferences,
      candidates: GOLDEN_RECOMMENDATION_CANDIDATES,
      anchorCoordinates: GOLDEN_PLACES.hanoiOldQuarter.coordinates,
    });
    expect(ranked).toHaveLength(2);
    expect(ranked[0]!.tascoPlaceId.startsWith("tasco:")).toBe(true);
    expect(ranked[0]!.explanation.length).toBeGreaterThan(0);
    expect(ranked[0]!.weightedScore).toBeGreaterThanOrEqual(ranked[1]!.weightedScore);
  });
});

describe("routes and estimates", () => {
  it("builds a route request from ordered Tasco stops without provider calls", () => {
    const routeRequest = buildRouteRequest(GOLDEN_PLANNED_TRIP);
    expect(routeRequest.locations).toHaveLength(3);
    expect(routeRequest.stopPlaceIds.every((id) => id.startsWith("tasco:"))).toBe(true);
    expect(routeRequest.mode).toBe("auto");
  });

  it("calculates deterministic time and budget estimates", () => {
    const estimates = calculateTripEstimates(GOLDEN_PLANNED_TRIP);
    expect(estimates.estimatedTotalMinutes).toBeGreaterThan(0);
    expect(estimates.estimatedDistanceMeters).toBeGreaterThan(0);
    expect(estimates.estimatedCostMinorUnits).toBeGreaterThan(0);
    expect(estimates.withinBudget).toBe(true);
  });
});
