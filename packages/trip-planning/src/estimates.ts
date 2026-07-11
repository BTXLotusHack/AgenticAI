import type { ItineraryStopV1, TascoCoordinates } from "./contracts.js";
import { TRIP_PLANNING_POLICY_V1 } from "./contracts.js";

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(from: TascoCoordinates, to: TascoCoordinates): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function estimateTravelMinutes(distanceMeters: number, speedKmh = TRIP_PLANNING_POLICY_V1.averageRoadSpeedKmh): number {
  if (distanceMeters <= 0) return 0;
  return Math.ceil((distanceMeters / 1_000 / speedKmh) * 60);
}

function categoryCostMinorUnits(category: string): number {
  const normalized = category.toLowerCase();
  if (normalized.includes("rest") || normalized.includes("stop")) return TRIP_PLANNING_POLICY_V1.budgetHeuristics.restStopMinorUnits;
  if (normalized.includes("hotel") || normalized.includes("lodg")) return TRIP_PLANNING_POLICY_V1.budgetHeuristics.lodgingMinorUnits;
  if (normalized.includes("attraction") || normalized.includes("view")) return TRIP_PLANNING_POLICY_V1.budgetHeuristics.attractionMinorUnits;
  return TRIP_PLANNING_POLICY_V1.budgetHeuristics.mealMinorUnits;
}

export function estimateStopCostMinorUnits(stop: ItineraryStopV1): number {
  return categoryCostMinorUnits(stop.place.category);
}

export function estimateLegDistanceMeters(stops: readonly ItineraryStopV1[]): number {
  let total = 0;
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1]!;
    const current = stops[index]!;
    total += haversineMeters(previous.place.coordinates, current.place.coordinates);
  }
  return total;
}

export function estimateFuelCostMinorUnits(distanceMeters: number): number {
  return Math.round((distanceMeters / 100_000) * TRIP_PLANNING_POLICY_V1.budgetHeuristics.fuelPer100KmMinorUnits);
}
