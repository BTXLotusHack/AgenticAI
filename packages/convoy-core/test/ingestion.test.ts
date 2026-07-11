import { describe, expect, it } from "vitest";

import { acceptProjectedLocation, createTelemetryState, type LocationTelemetryV1, type ProjectedLocationV1 } from "../src/index";

const receivedAt = "2026-07-20T00:30:10.000Z";

function telemetry(overrides: Partial<LocationTelemetryV1> = {}): LocationTelemetryV1 {
  return {
    schemaVersion: 1,
    eventId: "event-1",
    tripId: "TRIP001",
    memberId: "M001",
    deviceId: "device-1",
    sequence: 1,
    observedAt: "2026-07-20T00:30:01.000Z",
    sentAt: "2026-07-20T00:30:02.000Z",
    latitude: 21.0285,
    longitude: 105.8542,
    accuracyMeters: 8,
    speedKmh: 65,
    headingDegrees: 90,
    batteryPercent: 80,
    networkQuality: "good",
    source: "simulator",
    ...overrides,
  };
}

function projection(overrides: Partial<ProjectedLocationV1> = {}): ProjectedLocationV1 {
  return {
    schemaVersion: 1,
    eventId: "projection-1",
    sourceTelemetryEventId: "event-1",
    tripId: "TRIP001",
    memberId: "M001",
    role: "leader",
    routeProgressMeters: 1_200,
    routeDeviationMeters: 4,
    matchConfidence: "high",
    projectedAt: "2026-07-20T00:30:03.000Z",
    ...overrides,
  };
}

describe("acceptProjectedLocation", () => {
  it("accepts the first valid projected location as live state", () => {
    const result = acceptProjectedLocation(createTelemetryState(), { telemetry: telemetry(), projection: projection() }, receivedAt);

    expect(result.status).toBe("accepted");
    expect(result.state.currentNodes.M001).toMatchObject({
      memberId: "M001",
      routeProgressMeters: 1_200,
      confidence: "high",
      connectivity: "healthy",
    });
    expect(result.state.latestSequenceByMember.M001).toBe(1);
  });

  it("deduplicates an event without mutating state", () => {
    const accepted = acceptProjectedLocation(createTelemetryState(), { telemetry: telemetry(), projection: projection() }, receivedAt);
    const duplicate = acceptProjectedLocation(accepted.state, { telemetry: telemetry(), projection: projection() }, receivedAt);

    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.state).toBe(accepted.state);
  });

  it.each([1, 0])("rejects a non-newer sequence %s", (sequence) => {
    const accepted = acceptProjectedLocation(createTelemetryState(), { telemetry: telemetry(), projection: projection() }, receivedAt);
    const nextTelemetry = telemetry({ eventId: `event-${sequence + 2}`, sequence });
    const nextProjection = projection({ eventId: `projection-${sequence + 2}`, sourceTelemetryEventId: nextTelemetry.eventId });

    const result = acceptProjectedLocation(accepted.state, { telemetry: nextTelemetry, projection: nextProjection }, receivedAt);

    expect(result.status).toBe("stale-sequence");
    expect(result.state).toBe(accepted.state);
  });

  it("accepts a newer live sequence", () => {
    const first = acceptProjectedLocation(createTelemetryState(), { telemetry: telemetry(), projection: projection() }, receivedAt);
    const nextTelemetry = telemetry({ eventId: "event-2", sequence: 2, observedAt: "2026-07-20T00:30:05.000Z" });
    const nextProjection = projection({ eventId: "projection-2", sourceTelemetryEventId: "event-2", routeProgressMeters: 1_350 });

    const result = acceptProjectedLocation(first.state, { telemetry: nextTelemetry, projection: nextProjection }, receivedAt);

    expect(result.status).toBe("accepted");
    expect(result.state.currentNodes.M001?.routeProgressMeters).toBe(1_350);
    expect(result.state.latestSequenceByMember.M001).toBe(2);
  });

  it("records offline replay for history without replacing live state", () => {
    const first = acceptProjectedLocation(createTelemetryState(), { telemetry: telemetry(), projection: projection() }, receivedAt);
    const replayTelemetry = telemetry({ eventId: "event-9", sequence: 9, networkQuality: "offline-replay" });
    const replayProjection = projection({ eventId: "projection-9", sourceTelemetryEventId: "event-9", routeProgressMeters: 9_000 });

    const result = acceptProjectedLocation(first.state, { telemetry: replayTelemetry, projection: replayProjection }, receivedAt);

    expect(result.status).toBe("history-only");
    expect(result.state.currentNodes.M001?.routeProgressMeters).toBe(1_200);
    expect(result.state.latestSequenceByMember.M001).toBe(1);
    expect(result.state.historyEventIds).toContain("event-9");
  });

  it("rejects a projection that does not belong to the telemetry", () => {
    const result = acceptProjectedLocation(
      createTelemetryState(),
      { telemetry: telemetry(), projection: projection({ memberId: "M002" }) },
      receivedAt,
    );

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("projection-mismatch");
  });

  it("rejects an unmatchable projection", () => {
    const result = acceptProjectedLocation(
      createTelemetryState(),
      { telemetry: telemetry(), projection: projection({ matchConfidence: "unmatchable" }) },
      receivedAt,
    );

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.reason).toBe("unmatchable");
  });

  it.each([
    { ageSeconds: 9, accuracyMeters: 19, matchConfidence: "high" as const, expected: "high" },
    { ageSeconds: 10, accuracyMeters: 19, matchConfidence: "high" as const, expected: "medium" },
    { ageSeconds: 29, accuracyMeters: 49, matchConfidence: "medium" as const, expected: "medium" },
    { ageSeconds: 30, accuracyMeters: 49, matchConfidence: "medium" as const, expected: "low" },
    { ageSeconds: 5, accuracyMeters: 51, matchConfidence: "high" as const, expected: "low" },
    { ageSeconds: 5, accuracyMeters: 8, matchConfidence: "low" as const, expected: "low" },
  ])("classifies $expected confidence from freshness, accuracy, and route match", ({ ageSeconds, accuracyMeters, matchConfidence, expected }) => {
    const observedAt = new Date(Date.parse(receivedAt) - ageSeconds * 1_000).toISOString();
    const result = acceptProjectedLocation(
      createTelemetryState(),
      { telemetry: telemetry({ observedAt, accuracyMeters }), projection: projection({ matchConfidence }) },
      receivedAt,
    );

    expect(result.status).toBe("accepted");
    expect(result.state.currentNodes.M001?.confidence).toBe(expected);
  });
});
