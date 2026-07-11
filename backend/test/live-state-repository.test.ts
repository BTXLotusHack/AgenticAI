import { describe, expect, it } from "vitest";

import { createEmptyLiveTripState, processProjectedTelemetry } from "../src/domain/live-telemetry.js";
import {
  liveMemberSnapshotItem,
  liveSnapshotItem,
  liveTripStateItem,
  realtimeEventItem,
  telemetryEventItem,
} from "../src/lib/dynamo/live-state.js";

const telemetry = {
  schemaVersion: 1,
  eventId: "gps:0:M001",
  tripId: "TRIP001",
  memberId: "M001",
  deviceId: "device:M001",
  sequence: 1,
  observedAt: "2026-07-20T00:00:00.000Z",
  sentAt: "2026-07-20T00:00:01.000Z",
  latitude: 21.0285,
  longitude: 105.8542,
  accuracyMeters: 5,
  speedKmh: 70,
  headingDegrees: 90,
  batteryPercent: 80,
  networkQuality: "good",
  source: "simulator",
} as const;

const projection = {
  schemaVersion: 1,
  eventId: "projection:gps:0:M001",
  sourceTelemetryEventId: telemetry.eventId,
  tripId: telemetry.tripId,
  memberId: telemetry.memberId,
  role: "leader",
  routeProgressMeters: 10_000,
  routeDeviationMeters: 0,
  matchConfidence: "high",
  projectedAt: telemetry.sentAt,
} as const;

describe("live-state Dynamo item builders", () => {
  it("stores current snapshots and member freshness with TTL", () => {
    const result = processProjectedTelemetry(createEmptyLiveTripState("TRIP001"), {
      telemetry,
      projection,
      receivedAt: telemetry.sentAt,
    });
    const ttl = 1_785_000_000;
    const snapshot = liveSnapshotItem(result.snapshot!, ttl);
    const member = liveMemberSnapshotItem(result.snapshot!.members[0]!, ttl);

    expect(snapshot).toMatchObject({
      PK: "TRIP#TRIP001",
      SK: "LIVE#SNAPSHOT",
      type: "LiveSnapshot",
      ttl,
      snapshotRevision: 1,
      graphRevision: 1,
    });
    expect(member).toMatchObject({
      PK: "TRIP#TRIP001",
      SK: "LIVE#MEMBER#M001",
      type: "LiveMemberSnapshot",
      ttl,
      sequence: 1,
      confidence: "high",
      connectivity: "healthy",
    });
    expect(liveTripStateItem(result.state, ttl)).toMatchObject({
      PK: "TRIP#TRIP001",
      SK: "LIVE#STATE",
      type: "LiveTripState",
      snapshotRevision: 1,
      ttl,
    });
  });

  it("stores idempotency and realtime events without dropping audience or expiry", () => {
    const result = processProjectedTelemetry(createEmptyLiveTripState("TRIP001"), {
      telemetry,
      projection,
      receivedAt: telemetry.sentAt,
    });
    const ttl = 1_785_000_000;

    expect(telemetryEventItem(telemetry, ttl)).toMatchObject({
      PK: "TRIP#TRIP001",
      SK: "TELEMETRY_EVENT#gps:0:M001",
      type: "TelemetryEvent",
      sequence: 1,
      memberId: "M001",
      ttl,
    });
    expect(realtimeEventItem(result.events[0]!, ttl)).toMatchObject({
      PK: "TRIP#TRIP001",
      SK: "REALTIME#0000000001#realtime:TRIP001:1:liveSnapshotUpdated",
      type: "RealtimeEvent",
      eventType: "liveSnapshotUpdated",
      audience: { kind: "trip" },
      expiresAt: "2026-07-20T00:05:01.000Z",
      ttl,
    });
  });
});
