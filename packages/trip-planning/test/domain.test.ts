import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  GOLDEN_ITINERARY,
  GOLDEN_PLACES,
  GOLDEN_PLANNED_TRIP,
  GOLDEN_RECOMMENDATION_CANDIDATES,
  PlannedTripV1Schema,
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
      tascoPlaceId: GOLDEN_PLACES.hanoiOldQuarter.id,
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
      id: "generated-place-123",
    };
    expect(() =>
      rankPlaceRecommendations({
        tripId: "PLAN001",
        preferences: GOLDEN_PLANNED_TRIP.preferences,
        candidates: [invalidPlace],
      }),
    ).toThrow(/Tasco place/);
  });

  it("accepts shared Tasco place references from the maps facade namespace", () => {
    const sharedPlace = {
      id: "poi:poi001-minh-chau-rest-stop",
      provider: "tasco" as const,
      name: "Minh Chau Rest Stop",
      address: "QL5, Km 62, Hung Yen",
      coordinates: { lat: 20.8724, lon: 106.0518 },
      categories: ["rest_stop", "parking"],
      ratingSummary: { averageRating: 4.4, reviewCount: 0, source: "tasco" as const },
      sourceVersion: "tasco-mock-2026-06-25",
    };

    const ranked = rankPlaceRecommendations({
      tripId: "PLAN001",
      preferences: GOLDEN_PLANNED_TRIP.preferences,
      candidates: [sharedPlace],
    });

    expect(ranked[0]?.tascoPlaceId).toBe("poi:poi001-minh-chau-rest-stop");
    expect(ranked[0]?.place).toEqual(sharedPlace);
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
    expect(ranked[0]!.tascoPlaceId.startsWith("poi:")).toBe(true);
    expect(ranked[0]!.explanation.length).toBeGreaterThan(0);
    expect(ranked[0]!.weightedScore).toBeGreaterThanOrEqual(ranked[1]!.weightedScore);
  });
});

describe("routes and estimates", () => {
  it("builds a route request from ordered Tasco stops without provider calls", () => {
    const routeRequest = buildRouteRequest(GOLDEN_PLANNED_TRIP);
    expect(routeRequest.locations).toHaveLength(3);
    expect(routeRequest.stopPlaceIds).toEqual([
      "poi:hanoi-old-quarter",
      "poi:poi001-minh-chau-rest-stop",
      "poi:ha-long-bai-chay",
    ]);
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

describe("published examples", () => {
  it("keeps planned-trip-v1.json valid against the public schema", () => {
    const path = fileURLToPath(new URL("../examples/planned-trip-v1.json", import.meta.url));
    const example = JSON.parse(readFileSync(path, "utf8")) as unknown;
    expect(PlannedTripV1Schema.parse(example)).toMatchObject({ tripId: "PLAN001" });
  });
});
