import type { KinesisStreamEvent } from "aws-lambda";
import { beforeAll, describe, expect, it } from "vitest";
import { createEmptyLiveTripState, type LiveTripState } from "../src/domain/live-telemetry.js";

let handler: (event: KinesisStreamEvent) => Promise<{ batchItemFailures: Array<{ itemIdentifier: string }> }>;
let createTelemetryProcessor: typeof import("../src/handlers/telemetry-processor.js").createTelemetryProcessor;

beforeAll(async () => {
  process.env.MAPS_TRACE_URL = "https://maps.invalid/trace_attributes";
  ({ handler, createTelemetryProcessor } = await import("../src/handlers/telemetry-processor.js"));
});

function eventWith(data: unknown, sequenceNumber: string): KinesisStreamEvent {
  return {
    Records: [
      {
        eventID: `shard:${sequenceNumber}`,
        eventName: "aws:kinesis:record",
        eventVersion: "1.0",
        eventSource: "aws:kinesis",
        eventSourceARN: "arn:aws:kinesis:ap-southeast-1:123456789012:stream/test",
        awsRegion: "ap-southeast-1",
        invokeIdentityArn: "arn:aws:iam::123456789012:role/test",
        kinesis: {
          kinesisSchemaVersion: "1.0",
          partitionKey: "t1",
          sequenceNumber,
          data: Buffer.from(JSON.stringify(data), "utf8").toString("base64"),
          approximateArrivalTimestamp: 0,
        },
      },
    ],
  };
}

describe("telemetry processor partial failures", () => {
  it("reports an unbound telemetry record by Kinesis sequence number", async () => {
    const response = await handler(eventWith({ teamId: "t1", riderId: "r1" }, "42"));
    expect(response).toEqual({ batchItemFailures: [{ itemIdentifier: "42" }] });
  });

  it("persists accepted live snapshots and publishes derived realtime events", async () => {
    const saved: unknown[] = [];
    const published: unknown[] = [];
    const stateByTrip = new Map<string, LiveTripState>();
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
    };
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
    };
    const testHandler = createTelemetryProcessor({
      loadState: async (tripId) => stateByTrip.get(tripId) ?? createEmptyLiveTripState(tripId),
      saveState: async (state) => {
        stateByTrip.set(state.tripId, state);
      },
      persist: async (record) => {
        saved.push(record);
      },
      publish: async (event) => {
        published.push(event);
      },
      ttlFor: () => 1_785_000_000,
    });

    const response = await testHandler(eventWith({ telemetry, projection, receivedAt: telemetry.sentAt }, "100"));

    expect(response).toEqual({ batchItemFailures: [] });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      telemetry,
      ttl: 1_785_000_000,
      snapshot: {
        tripId: "TRIP001",
        members: [{ memberId: "M001", confidence: "high" }],
      },
    });
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ eventType: "liveSnapshotUpdated", tripId: "TRIP001" });
  });
});
