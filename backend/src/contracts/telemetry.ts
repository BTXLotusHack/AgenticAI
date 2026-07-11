import { z } from "zod";
import { Id, IsoTimestamp, Latitude, Longitude } from "./common.js";

/**
 * Telemetry contract (fast path).
 *
 * Published by the mobile client to MQTT topic:
 *   teams/{team_id}/riders/{rider_id}/telemetry
 * An IoT topic rule forwards each payload to Kinesis; the processor Lambda reads
 * micro-batches of these records.
 */
export const RiderTelemetry = z.object({
  schemaVersion: z.string().default("1"),
  riderId: Id,
  teamId: Id,
  /** [lat, lng] as sent by the device (raw, pre map-match). */
  coords: z.tuple([Latitude, Longitude]),
  headingDegrees: z.number().gte(0).lt(360).nullable().default(null),
  speedKmh: z.number().gte(0).nullable().default(null),
  accuracyMeters: z.number().gte(0).nullable().default(null),
  observedAt: IsoTimestamp,
});
export type RiderTelemetry = z.infer<typeof RiderTelemetry>;

/**
 * Road-snapped position produced after map-matching, fanned out to live clients
 * via the AppSync `publishRiderPosition` mutation.
 */
export const RiderPosition = z.object({
  teamId: Id,
  riderId: Id,
  lat: Latitude,
  lng: Longitude,
  snappedLat: Latitude,
  snappedLng: Longitude,
  headingDegrees: z.number().gte(0).lt(360).nullable(),
  matchConfidence: z.number().gte(0).lte(1).nullable(),
  observedAt: IsoTimestamp,
});
export type RiderPosition = z.infer<typeof RiderPosition>;
