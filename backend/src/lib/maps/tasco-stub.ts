import type { Coordinate } from "../../contracts/common.js";
import type { MapsProvider, SnappedPoint } from "./provider.js";

/**
 * Stub implementation of the MapsProvider for Tasco Hackathon.
 * Deterministically returns 'not_checked' for route validation since
 * real map credentials might not be available during MVP.
 */
export class TascoMapsStub implements MapsProvider {
  async traceAttributes(request: { points: Coordinate[] }): Promise<SnappedPoint[]> {
    return request.points.map((p) => ({
      input: p,
      snappedLat: p[0],
      snappedLng: p[1],
      matchConfidence: 0.5,
    }));
  }

  async geocodePlace(query: string): Promise<{ lat: number; lng: number; address: string } | null> {
    // Stub
    return null;
  }

  async calculateRoute(origin: Coordinate, destination: Coordinate): Promise<{ distanceMeters: number; durationSeconds: number; polyline: Coordinate[] } | null> {
    // Stub
    return null;
  }

  async calculateEta(origin: Coordinate, destination: Coordinate): Promise<number | null> {
    return null;
  }

  async calculateDetour(routePolyline: Coordinate[], stop: Coordinate): Promise<number | null> {
    return null;
  }

  async validateStopOnRoute(routePolyline: Coordinate[], stop: Coordinate): Promise<{ status: "not_checked" | "compatible" | "detour_warning" | "rejected"; detourMeters?: number }> {
    return { status: "not_checked" };
  }
}
