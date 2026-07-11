import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";

import {
  FixedClock,
  FixtureMapsProvider,
  LoopinApplication,
  MemoryTripRepository,
  RecordingPublisher,
  createTripState,
} from "@loopin/application";
import type { EventEnvelope, LocationTelemetryV1, ProjectedLocationV1 } from "@loopin/contracts";
import { GOLDEN_R001 } from "@loopin/demo-scenarios";

import { LocalRealtimeHub, createLocalServer, type RunningLocalServer } from "../src/index";

const running: RunningLocalServer[] = [];

afterEach(async () => {
  await Promise.all(running.splice(0).map((server) => server.close()));
});

function setup() {
  const repository = new MemoryTripRepository([
    createTripState({
      tripId: "TRIP001",
      joinCode: "HALONG26",
      leaderMemberId: "M001",
      members: GOLDEN_R001.members.map((member, index) => ({
        memberId: member.memberId,
        tripId: "TRIP001",
        userId: `USER00${index + 1}`,
        displayName: member.name,
        role: member.role,
        readinessState: "ready" as const,
        visibilityPolicy: member.privacySetting === "Leader only" ? "leader-only" as const : "group" as const,
      })),
      placeCandidates: [...GOLDEN_R001.candidates],
    }),
  ]);
  const maps = new FixtureMapsProvider();
  const realtime = new LocalRealtimeHub(repository);
  const app = new LoopinApplication({
    repository,
    maps,
    realtime,
    domainEvents: new RecordingPublisher<EventEnvelope>(),
    clock: new FixedClock("2026-07-20T00:00:01.000Z"),
  });
  return { repository, maps, realtime, app };
}

async function start() {
  const dependencies = setup();
  const server = await createLocalServer({
    ...dependencies,
    environment: "test",
    allowedOrigins: ["http://127.0.0.1:4173"],
  }).listen(0, "127.0.0.1");
  running.push(server);
  return { ...dependencies, server };
}

function auth(userId: string): Record<string, string> {
  return { authorization: `Bearer fixture:${userId}`, "content-type": "application/json" };
}

function firstObservation() {
  const telemetry: LocationTelemetryV1 = {
    schemaVersion: 1,
    eventId: "local:M001:1",
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
    batteryPercent: 90,
    networkQuality: "good",
    source: "simulator",
  };
  const projection: ProjectedLocationV1 = {
    schemaVersion: 1,
    eventId: "projection:local:M001:1",
    sourceTelemetryEventId: telemetry.eventId,
    tripId: telemetry.tripId,
    memberId: telemetry.memberId,
    role: "leader",
    routeProgressMeters: 10_000,
    routeDeviationMeters: 0,
    matchConfidence: "high",
    projectedAt: telemetry.sentAt,
  };
  return { telemetry, projection };
}

describe("local service runtime", () => {
  it("serves health and rejects unauthenticated application routes", async () => {
    const { server } = await start();
    expect(await (await fetch(`${server.url}/healthz`)).json()).toEqual({ status: "ok" });
    const response = await fetch(`${server.url}/v1/trips/TRIP001/live-snapshot`);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "unauthorized", retryable: false });
  });

  it("joins a fixture user and validates request bodies", async () => {
    const { server } = await start();
    const joined = await fetch(`${server.url}/v1/trips/join`, {
      method: "POST",
      headers: auth("USER005"),
      body: JSON.stringify({ schemaVersion: 1, joinCode: "HALONG26", displayName: "Mai" }),
    });
    expect(joined.status).toBe(200);
    const joinedBody = await joined.json() as { member: { memberId: string; userId: string }; tripId: string };
    expect(joinedBody).toMatchObject({ tripId: "TRIP001", member: { userId: "USER005" } });
    const readiness = await fetch(`${server.url}/v1/trips/TRIP001/members/${joinedBody.member.memberId}/readiness`, {
      method: "POST",
      headers: auth("USER005"),
      body: JSON.stringify({ schemaVersion: 1, ready: true }),
    });
    expect(await readiness.json()).toMatchObject({ member: { readinessState: "ready" } });

    const invalid = await fetch(`${server.url}/v1/trips/join`, {
      method: "POST",
      headers: auth("USER006"),
      body: JSON.stringify({ schemaVersion: 1, joinCode: "!", displayName: "" }),
    });
    expect(invalid.status).toBe(400);

    const forbiddenOrigin = await fetch(`${server.url}/healthz`, { headers: { origin: "https://attacker.example" } });
    expect(forbiddenOrigin.status).toBe(403);
  });

  it("accepts telemetry and emits an authorized realtime event", async () => {
    const { server, maps } = await start();
    const input = firstObservation();
    maps.add(input.projection);
    const channel = "/trip/TRIP001/state";
    const socket = new WebSocket(
      `${server.wsUrl}/v1/realtime?tripId=TRIP001&channel=${encodeURIComponent(channel)}`,
      { headers: { authorization: "Bearer fixture:USER001" } },
    );
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    const message = new Promise<unknown>((resolve) => socket.once("message", (data) => resolve(JSON.parse(data.toString()))));

    const response = await fetch(`${server.url}/v1/telemetry`, {
      method: "POST",
      headers: auth("USER001"),
      body: JSON.stringify(input.telemetry),
    });
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ status: "accepted", snapshotRevision: 1 });
    expect(await message).toMatchObject({ schemaVersion: 1, eventType: "ConvoyGraphChanged" });
    socket.close();
  });
});
