import { describe, expect, it } from "vitest";

import {
  JoinTripResult,
  TascoPlaceRef,
  TripPlanSummary,
  TripStop,
} from "../src/contracts/trip.js";

const place = {
  id: "poi:poi001-minh-chau-rest-stop",
  provider: "tasco",
  name: "Minh Chau Rest Stop",
  address: "QL5, Km 62, Hung Yen",
  coordinates: { lat: 20.8724, lon: 106.0518 },
  categories: ["rest_stop", "parking"],
  ratingSummary: { averageRating: 4.4, reviewCount: 0, source: "tasco" },
  sourceVersion: "tasco-mock-2026-06-25",
};

describe("trip service backend contracts", () => {
  it("validates shared Tasco place, stop, summary and join result shapes", () => {
    expect(TascoPlaceRef.parse(place)).toEqual(place);
    const stop = TripStop.parse({
      stopId: "STOP001",
      place,
      locked: true,
      source: "tasco-search",
    });
    expect(stop.place.provider).toBe("tasco");
    expect(TripPlanSummary.parse({
      tripId: "TRIP001",
      title: "Ha Noi to Ha Long",
      lifecycle: "ready",
      origin: place,
      destination: { ...place, id: "poi:ha-long-bai-chay", name: "Ha Long" },
      stops: [stop],
      routeSummary: { distanceMeters: 156000, durationSeconds: 9000 },
      departureTime: "2026-07-20T02:00:00.000Z",
      policyId: "policy-v1",
      memberCount: 4,
    })).toMatchObject({ memberCount: 4 });
    expect(JoinTripResult.parse({
      schemaVersion: 1,
      tripId: "TRIP001",
      memberId: "M004",
      role: "member",
      consentRequirements: ["location-while-driving", "driver-alerts"],
      routeOfflineSummary: {
        routeId: "route:r001-primary",
        distanceMeters: 156000,
        durationSeconds: 9000,
        encodedGeometry: "fixture-polyline",
        sourceVersion: "tasco-mock-2026-06-25",
      },
    })).toMatchObject({ role: "member" });
  });
});
