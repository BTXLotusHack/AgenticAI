import { RiderTelemetry, type RiderPosition } from "../contracts/telemetry.js";
import type { SnappedPoint } from "../lib/maps/provider.js";

/**
 * Pure telemetry domain logic. No AWS SDK, no I/O — unit-testable in isolation.
 * The processor handler wires these functions to Kinesis, the maps adapter and
 * AppSync.
 */

/** Decode a base64 Kinesis record payload into validated telemetry, or null. */
export function decodeRecord(base64Data: string): RiderTelemetry | null {
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(base64Data, "base64").toString("utf8"));
  } catch {
    return null;
  }
  const result = RiderTelemetry.safeParse(json);
  return result.success ? result.data : null;
}

/**
 * Group telemetry by rider and keep chronological order per rider. Map-matching
 * quality improves when a rider's points are traced as one ordered sequence
 * rather than point-by-point.
 */
export function groupByRider(items: RiderTelemetry[]): Map<string, RiderTelemetry[]> {
  const groups = new Map<string, RiderTelemetry[]>();
  for (const item of items) {
    const key = `${item.teamId}#${item.riderId}`;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  }
  return groups;
}

/**
 * Combine a rider's ordered raw telemetry with the snapped points returned by
 * the maps engine into fan-out-ready positions. Snapped points are aligned to
 * inputs by index (the adapter guarantees one output per input).
 */
export function toRiderPositions(
  ordered: RiderTelemetry[],
  snapped: SnappedPoint[],
): RiderPosition[] {
  return ordered.map((t, i) => {
    const s = snapped[i];
    return {
      teamId: t.teamId,
      riderId: t.riderId,
      lat: t.coords[0],
      lng: t.coords[1],
      snappedLat: s ? s.snappedLat : t.coords[0],
      snappedLng: s ? s.snappedLng : t.coords[1],
      headingDegrees: t.headingDegrees,
      matchConfidence: s ? s.matchConfidence : null,
      observedAt: t.observedAt,
    };
  });
}

/**
 * For live tracking we only need the freshest position per rider to fan out;
 * intermediate points refine the snap but the dashboard renders the latest.
 */
export function latestPerRider(positions: RiderPosition[]): RiderPosition[] {
  const latest = new Map<string, RiderPosition>();
  for (const p of positions) {
    const key = `${p.teamId}#${p.riderId}`;
    const existing = latest.get(key);
    if (!existing || p.observedAt > existing.observedAt) latest.set(key, p);
  }
  return [...latest.values()];
}
