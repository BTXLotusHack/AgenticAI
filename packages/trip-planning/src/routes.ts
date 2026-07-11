import type { PlannedTripV1, RouteRequestV1 } from "./contracts.js";
import { TRIP_PLANNING_POLICY_V1 } from "./contracts.js";
import { TripPlanningError } from "./errors.js";
import { flattenOrderedStops } from "./ordering.js";

export function buildRouteRequest(trip: PlannedTripV1): RouteRequestV1 {
  const stops = flattenOrderedStops(trip.itinerary);
  if (stops.length < TRIP_PLANNING_POLICY_V1.minimumStopsForRoute) {
    throw new TripPlanningError(
      "invalid-request",
      `At least ${TRIP_PLANNING_POLICY_V1.minimumStopsForRoute} Tasco-backed stops are required to build a route request.`,
    );
  }

  return {
    schemaVersion: 1,
    tripId: trip.tripId,
    locations: stops.map((stop) => ({
      lat: stop.place.coordinates.lat,
      lon: stop.place.coordinates.lon,
    })),
    mode: trip.preferences.travelMode,
    language: trip.preferences.language,
    units: "kilometers",
    avoidTolls: trip.preferences.avoidTolls,
    avoidHighways: trip.preferences.avoidHighways,
    stopPlaceIds: stops.map((stop) => stop.tascoPlaceId),
  };
}
