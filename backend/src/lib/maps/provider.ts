import type { Coordinate } from "../../contracts/common.js";

/**
 * Vendor-neutral map-matching boundary.
 *
 * All vendor access (Tasco Maps / Valhalla) lives behind this interface so
 * domain and handler code never depends on a specific engine. Responses are
 * normalized before returning. A dev/degraded adapter can implement this with
 * fixtures.
 */
export interface SnappedPoint {
  /** Original observed coordinate, echoed for correlation. */
  input: Coordinate;
  snappedLat: number;
  snappedLng: number;
  /** 0..1 match confidence, or null when the engine cannot express it. */
  matchConfidence: number | null;
}

export interface TraceRequest {
  /** Ordered raw GPS points for a single rider, oldest first. */
  points: Coordinate[];
}

export interface MapsProvider {
  /** Snap a rider's raw GPS trace onto the road network. */
  traceAttributes(request: TraceRequest): Promise<SnappedPoint[]>;

  // --- Trip Planning Extensions ---
  geocodePlace?(query: string): Promise<{ lat: number; lng: number; address: string } | null>;
  calculateRoute?(origin: Coordinate, destination: Coordinate): Promise<{ distanceMeters: number; durationSeconds: number; polyline: Coordinate[] } | null>;
  calculateEta?(origin: Coordinate, destination: Coordinate): Promise<number | null>;
  calculateDetour?(routePolyline: Coordinate[], stop: Coordinate): Promise<number | null>;
  validateStopOnRoute?(routePolyline: Coordinate[], stop: Coordinate): Promise<{ status: "not_checked" | "compatible" | "detour_warning" | "rejected"; detourMeters?: number }>;
}
