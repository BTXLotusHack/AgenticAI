import { requireEnv, optionalEnv } from "../env.js";
import { logger } from "../logger.js";
import type { MapsProvider, SnappedPoint, TraceRequest } from "./provider.js";

/**
 * Tasco Maps / Valhalla adapter.
 *
 * Calls the Valhalla `/trace_attributes` endpoint to correct GPS jitter and
 * snap points onto the logical street grid. The endpoint and optional API key
 * are injected by Terraform via environment variables:
 *   MAPS_TRACE_URL   e.g. https://maps.tasco.example/trace_attributes
 *   MAPS_API_KEY     optional bearer token
 *
 * External validation still required (per docs): Tasco auth, quotas and the
 * exact response shape. The parsing below targets the documented Valhalla
 * `/trace_attributes` schema (`matched_points[]`).
 */

interface ValhallaMatchedPoint {
  lat?: number;
  lon?: number;
  type?: string; // "matched" | "interpolated" | "unmatched"
  distance_from_trace_point?: number;
}

interface ValhallaTraceResponse {
  matched_points?: ValhallaMatchedPoint[];
}

export class ValhallaMapsProvider implements MapsProvider {
  private readonly url = requireEnv("MAPS_TRACE_URL");
  private readonly apiKey = optionalEnv("MAPS_API_KEY", "");
  private readonly timeoutMs = Number(optionalEnv("MAPS_TIMEOUT_MS", "2500"));

  async traceAttributes(request: TraceRequest): Promise<SnappedPoint[]> {
    if (request.points.length === 0) return [];

    const body = {
      shape: request.points.map(([lat, lon]) => ({ lat, lon })),
      costing: "auto",
      shape_match: "map_snap",
      // Only ask for the matched points; we do not need full edge attributes.
      filters: { attributes: ["matched.point"], action: "include" },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`trace_attributes returned HTTP ${res.status}`);
      }

      const parsed = (await res.json()) as ValhallaTraceResponse;
      return this.normalize(request, parsed);
    } catch (err) {
      logger.warn("map_match_failed_falling_back_to_raw", {
        pointCount: request.points.length,
        reason: err instanceof Error ? err.name : "unknown",
      });
      // Degraded mode: return raw points with null confidence so the fast path
      // never blocks on the maps engine. Positions remain honest about quality.
      return request.points.map((input) => ({
        input,
        snappedLat: input[0],
        snappedLng: input[1],
        matchConfidence: null,
      }));
    } finally {
      clearTimeout(timer);
    }
  }

  private normalize(request: TraceRequest, res: ValhallaTraceResponse): SnappedPoint[] {
    const matched = res.matched_points ?? [];
    return request.points.map((input, i) => {
      const m = matched[i];
      const usable =
        m && typeof m.lat === "number" && typeof m.lon === "number" && m.type !== "unmatched";
      return {
        input,
        snappedLat: usable ? (m.lat as number) : input[0],
        snappedLng: usable ? (m.lon as number) : input[1],
        matchConfidence: usable ? confidenceFromDistance(m.distance_from_trace_point) : null,
      };
    });
  }
}

/** Map a snap distance (meters) to a coarse 0..1 confidence. */
function confidenceFromDistance(distanceMeters: number | undefined): number | null {
  if (typeof distanceMeters !== "number") return null;
  // 0 m -> 1.0, 50 m+ -> ~0. Simple monotonic decay for the scaffold.
  return Math.max(0, Math.min(1, 1 - distanceMeters / 50));
}
