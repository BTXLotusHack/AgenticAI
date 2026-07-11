import { describe, expect, it } from "vitest";

import {
  CONVOY_POLICY_V1,
  EventEnvelopeSchema,
  LocationTelemetryV1Schema,
  ProjectedLocationV1Schema,
} from "../src/index";

const validTelemetry = {
  schemaVersion: 1,
  eventId: "event-1",
  tripId: "TRIP001",
  memberId: "M001",
  deviceId: "device-1",
  sequence: 1,
  observedAt: "2026-07-20T00:30:00.000Z",
  sentAt: "2026-07-20T00:30:01.000Z",
  latitude: 21.0285,
  longitude: 105.8542,
  accuracyMeters: 8,
  speedKmh: 60,
  headingDegrees: 90,
  batteryPercent: 85,
  networkQuality: "good",
  source: "simulator",
} as const;

describe("LocationTelemetryV1Schema", () => {
  it("accepts the published version-one contract", () => {
    expect(LocationTelemetryV1Schema.parse(validTelemetry)).toEqual(validTelemetry);
  });

  it("rejects incompatible schema versions", () => {
    expect(LocationTelemetryV1Schema.safeParse({ ...validTelemetry, schemaVersion: 2 }).success).toBe(false);
  });

  it("rejects coordinates outside geographic bounds", () => {
    expect(LocationTelemetryV1Schema.safeParse({ ...validTelemetry, latitude: 91 }).success).toBe(false);
  });

  it("rejects fields that do not belong to device telemetry", () => {
    expect(LocationTelemetryV1Schema.safeParse({ ...validTelemetry, routeProgressMeters: 1200 }).success).toBe(false);
  });
});

describe("projected location and event contracts", () => {
  it("keeps route projection separate from device telemetry", () => {
    const projection = {
      schemaVersion: 1,
      eventId: "projection-1",
      sourceTelemetryEventId: "event-1",
      tripId: "TRIP001",
      memberId: "M001",
      role: "leader",
      routeProgressMeters: 1200,
      routeDeviationMeters: 4,
      matchConfidence: "high",
      projectedAt: "2026-07-20T00:30:01.000Z",
    } as const;

    expect(ProjectedLocationV1Schema.parse(projection)).toEqual(projection);
  });

  it("preserves correlation fields in event envelopes", () => {
    const event = {
      schemaVersion: 1,
      eventId: "accepted-1",
      eventType: "MemberLocationAccepted",
      occurredAt: "2026-07-20T00:30:00.000Z",
      producedAt: "2026-07-20T00:30:01.000Z",
      correlationId: "correlation-1",
      causationId: "event-1",
      tripId: "TRIP001",
      producer: "simulator",
      payload: { memberId: "M001", sequence: 1 },
    };

    expect(EventEnvelopeSchema.parse(event)).toEqual(event);
  });
});

describe("CONVOY_POLICY_V1", () => {
  it("uses normalized regroup weights", () => {
    const sum = Object.values(CONVOY_POLICY_V1.regroupWeights).reduce((total, weight) => total + weight, 0);
    expect(sum).toBe(1);
  });

  it("contains the documented persistence and speed-band defaults", () => {
    expect(CONVOY_POLICY_V1.persistenceSeconds).toEqual({ stretched: 15, broken: 30, reconnect: 30, reorder: 12 });
    expect(CONVOY_POLICY_V1.cohesionBands[1]).toEqual({
      minimumSpeedKmh: 60,
      maximumSpeedKmh: 80,
      stretchedMeters: 400,
      brokenMeters: 600,
      reconnectMeters: 420,
    });
  });
});
