import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
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
import { GOLDEN_R001, createGoldenR001TelemetryInputs } from "@loopin/demo-scenarios";

import { LocalRealtimeHub, createLocalServer, type RunningLocalServer } from "../src/index";
import { createDefaultLocalRuntime } from "../src/default-runtime";

const running: RunningLocalServer[] = [];
const originalLoopinEnvironment = process.env.LOOPIN_ENV;

beforeAll(() => {
  process.env.LOOPIN_ENV = "test";
});

afterAll(() => {
  if (originalLoopinEnvironment === undefined) delete process.env.LOOPIN_ENV;
  else process.env.LOOPIN_ENV = originalLoopinEnvironment;
});

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
    allowedOrigins: ["http://127.0.0.1:4173"],
  }).listen(0, "127.0.0.1");
  running.push(server);
  return { ...dependencies, server };
}

function auth(userId: string): Record<string, string> {
  return { authorization: `Bearer fixture:${userId}`, "content-type": "application/json" };
}

async function rejectedUpgrade(url: string, protocol: string, origin = "http://127.0.0.1:4173"): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let settled = false;
    const socket = new WebSocket(url, protocol, { origin });
    socket.once("unexpected-response", (_request, response) => {
      settled = true;
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    socket.once("open", () => {
      socket.close();
      reject(new Error("WebSocket upgrade unexpectedly succeeded."));
    });
    socket.once("error", (error) => {
      if (!settled) reject(error);
    });
  });
}

async function openSocket(url: string, protocol: string): Promise<WebSocket> {
  const socket = new WebSocket(url, protocol, { origin: "http://127.0.0.1:4173" });
  await new Promise<void>((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  return socket;
}

async function waitUntil(predicate: () => boolean, timeoutMs = 1_000): Promise<void> {
  const expiresAt = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= expiresAt) throw new Error("Timed out waiting for realtime evidence.");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
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
  it("fails closed at the lower-level constructor outside local/test", async () => {
    const dependencies = setup();
    const previous = process.env.LOOPIN_ENV;
    process.env.LOOPIN_ENV = "production";
    try {
      expect(() => createLocalServer({ ...dependencies, allowedOrigins: [] })).toThrow("restricted to local and test");
      delete process.env.LOOPIN_ENV;
      expect(() => createLocalServer({ ...dependencies, allowedOrigins: [] })).toThrow("restricted to local and test");
    } finally {
      if (previous === undefined) delete process.env.LOOPIN_ENV;
      else process.env.LOOPIN_ENV = previous;
      await dependencies.realtime.close();
    }
  });

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

    const unsupported = await fetch(`${server.url}/v1/trips/join`, {
      method: "POST",
      headers: { authorization: "Bearer fixture:USER006", "content-type": "text/plain" },
      body: "not-json",
    });
    expect(unsupported.status).toBe(415);
    const oversized = await fetch(`${server.url}/v1/trips/join`, {
      method: "POST",
      headers: auth("USER006"),
      body: JSON.stringify({ value: "x".repeat(33 * 1024) }),
    });
    expect(oversized.status).toBe(413);
  });

  it("accepts telemetry and emits an authorized realtime event", async () => {
    const { server, maps } = await start();
    const input = firstObservation();
    maps.add(input.projection);
    const channel = "/trip/TRIP001/state";
    const socket = new WebSocket(
      `${server.wsUrl}/v1/realtime?tripId=TRIP001&channel=${encodeURIComponent(channel)}`,
      "loopin.fixture.USER001",
      { origin: "http://127.0.0.1:4173" },
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

  it("denies nonmembers, wrong member channels and disallowed WebSocket origins", async () => {
    const { server } = await start();
    const stateUrl = `${server.wsUrl}/v1/realtime?tripId=TRIP001&channel=${encodeURIComponent("/trip/TRIP001/state")}`;
    const wrongMemberUrl = `${server.wsUrl}/v1/realtime?tripId=TRIP001&channel=${encodeURIComponent("/trip/TRIP001/member/M001/alerts")}`;
    expect(await rejectedUpgrade(stateUrl, "loopin.fixture.OUTSIDER")).toBe(403);
    expect(await rejectedUpgrade(wrongMemberUrl, "loopin.fixture.USER004")).toBe(403);
    expect(await rejectedUpgrade(stateUrl, "loopin.fixture.USER001", "https://attacker.example")).toBe(403);
  });

  it("closes a subscription when membership changes before delivery", async () => {
    const { server, repository, realtime } = await start();
    const channel = "/trip/TRIP001/state";
    const socket = new WebSocket(
      `${server.wsUrl}/v1/realtime?tripId=TRIP001&channel=${encodeURIComponent(channel)}`,
      "loopin.fixture.USER002",
      { origin: "http://127.0.0.1:4173" },
    );
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    const state = (await repository.get("TRIP001"))!;
    expect(await repository.putIfVersion({
      ...state,
      version: state.version + 1,
      members: state.members.filter((member) => member.userId !== "USER002"),
    }, state.version)).toBe(true);
    const closed = new Promise<number>((resolve) => socket.once("close", (code) => resolve(code)));
    await realtime.publish(channel, {
      schemaVersion: 1,
      eventId: "membership-recheck",
      tripId: "TRIP001",
      snapshotRevision: 1,
      graphRevision: 1,
      audience: { kind: "trip" },
      eventType: "ConvoyGraphChanged",
      occurredAt: "2026-07-20T00:00:00.000Z",
      expiresAt: "2026-07-20T00:05:00.000Z",
      payload: { overallState: "together" },
    });
    expect(await closed).toBe(1008);
  });

  it("bounds shutdown while an authenticated WebSocket is active", async () => {
    const { server } = await start();
    const channel = "/trip/TRIP001/state";
    const socket = await openSocket(
      `${server.wsUrl}/v1/realtime?tripId=TRIP001&channel=${encodeURIComponent(channel)}`,
      "loopin.fixture.USER001",
    );
    const closed = new Promise<number>((resolve) => socket.once("close", (code) => resolve(code)));
    running.splice(running.indexOf(server), 1);
    await expect(server.close()).resolves.toBeUndefined();
    expect(await closed).toBe(1001);
  });

  it("returns a typed deadline and emits coordinate-free request logs", async () => {
    const dependencies = setup();
    const records: Array<Readonly<Record<string, unknown>>> = [];
    const app = new Proxy(dependencies.app, {
      get(target, property, receiver) {
        if (property === "getSummary") return () => new Promise<never>(() => undefined);
        const value = Reflect.get(target, property, receiver) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const server = await createLocalServer({
      ...dependencies,
      app,
      allowedOrigins: [],
      deadlineMs: 10,
      logger: { log: (record) => records.push(record) },
    }).listen(0, "127.0.0.1");
    running.push(server);
    const response = await fetch(`${server.url}/v1/trips/TRIP001/summary`, { headers: auth("USER001") });
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ code: "operation-indeterminate", retryable: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(records[0]).toMatchObject({ method: "GET", path: "/v1/trips/TRIP001/summary", statusCode: 504 });
    expect(JSON.stringify(records)).not.toContain("latitude");
    expect(JSON.stringify(records)).not.toContain("longitude");
  });

  it("drives the canonical split, approval, reconnection and summary through HTTP", async () => {
    const dependencies = createDefaultLocalRuntime();
    const server = await createLocalServer({
      ...dependencies,
      allowedOrigins: ["http://127.0.0.1:4173"],
    }).listen(0, "127.0.0.1");
    running.push(server);
    const statuses = new Set<string>();
    const stateMessages: Array<{ eventType: string; snapshotRevision: number; payload: Record<string, unknown> }> = [];
    const rearMessages: Array<{ eventType: string; snapshotRevision: number; payload: Record<string, unknown> }> = [];
    const stateChannel = "/trip/TRIP001/state";
    const rearChannel = "/trip/TRIP001/member/M004/alerts";
    const stateSocket = await openSocket(
      `${server.wsUrl}/v1/realtime?tripId=TRIP001&channel=${encodeURIComponent(stateChannel)}`,
      "loopin.fixture.USER001",
    );
    const rearSocket = await openSocket(
      `${server.wsUrl}/v1/realtime?tripId=TRIP001&channel=${encodeURIComponent(rearChannel)}`,
      "loopin.fixture.USER004",
    );
    stateSocket.on("message", (data) => stateMessages.push(JSON.parse(data.toString())));
    rearSocket.on("message", (data) => rearMessages.push(JSON.parse(data.toString())));
    let splitSnapshot: {
      graph: { components: Array<{ memberIds: string[] }> };
      situations: Array<{ situationId: string; evidence: { frontBoundaryMemberId?: string; rearBoundaryMemberId?: string } }>;
      recommendations: Array<{ recommendationId: string; selectedCandidate: { poiId: string } | null; excludedCandidates: Array<{ poiId: string }> }>;
    } | undefined;

    for (const input of createGoldenR001TelemetryInputs()) {
      const memberIndex = GOLDEN_R001.members.findIndex((member) => member.memberId === input.telemetry.memberId);
      const response = await fetch(`${server.url}/v1/telemetry`, {
        method: "POST",
        headers: auth(`USER00${memberIndex + 1}`),
        body: JSON.stringify(input.telemetry),
      });
      expect(response.status).toBe(202);
      const body = await response.json() as { status: string };
      statuses.add(body.status);

      if (input.telemetry.eventId === "gps:35:M004") {
        const snapshot = await (await fetch(`${server.url}/v1/trips/TRIP001/live-snapshot`, {
          headers: auth("USER001"),
        })).json() as typeof splitSnapshot & { recommendations: Array<{ recommendationId: string }> };
        splitSnapshot = snapshot;
        const recommendationId = snapshot.recommendations[0]?.recommendationId;
        expect(recommendationId).toBeTruthy();
        const approved = await fetch(`${server.url}/v1/trips/TRIP001/recommendations/${recommendationId}/approve`, {
          method: "POST",
          headers: auth("USER001"),
          body: JSON.stringify({ schemaVersion: 1, commandId: "http-approve-1", idempotencyKey: "http-approve-1" }),
        });
        expect(approved.status).toBe(200);
      }
    }

    expect(splitSnapshot?.situations[0]).toMatchObject({
      situationId: "split:TRIP001:M003:M004",
      evidence: { frontBoundaryMemberId: "M003", rearBoundaryMemberId: "M004" },
    });
    expect(splitSnapshot?.graph.components.map((component) => component.memberIds)).toEqual([
      ["M001", "M002", "M003"],
      ["M004"],
    ]);
    expect(splitSnapshot?.recommendations[0]?.selectedCandidate?.poiId).toBe("POI001");
    expect(splitSnapshot?.recommendations[0]?.excludedCandidates).toContainEqual(expect.objectContaining({ poiId: "POI002" }));

    const prematureSummary = await fetch(`${server.url}/v1/trips/TRIP001/summary`, { headers: auth("USER001") });
    expect(prematureSummary.status).toBe(503);

    const completed = await fetch(`${server.url}/v1/trips/TRIP001/complete`, {
      method: "POST",
      headers: auth("USER001"),
      body: JSON.stringify({
        schemaVersion: 1,
        commandId: "http-complete-1",
        idempotencyKey: "http-complete-1",
      }),
    });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({
      summary: { completedAt: "2026-07-20T00:01:15.000Z", measuredFacts: { durationSeconds: 75 } },
    });

    const summary = await fetch(`${server.url}/v1/trips/TRIP001/summary`, { headers: auth("USER001") });
    expect(summary.status).toBe(200);
    expect(await summary.json()).toMatchObject({
      tripId: "TRIP001",
      measuredFacts: {
        confirmedSplitCount: 1,
        resolvedSplitCount: 1,
        regroupRecommendationCount: 1,
        notificationRequestCount: 8,
        rejectedTelemetryCount: 2,
        maximumConfirmedRouteGapMeters: 900,
        durationSeconds: 75,
      },
    });
    const outsiderSummary = await fetch(`${server.url}/v1/trips/TRIP001/summary`, { headers: auth("OUTSIDER") });
    expect(outsiderSummary.status).toBe(403);
    expect(statuses).toEqual(new Set(["accepted", "duplicate", "stale-sequence", "history-only"]));
    await waitUntil(() => stateMessages.some((message) => message.eventType === "TripCompleted") && rearMessages.length >= 2);
    const revisions = stateMessages.map((message) => message.snapshotRevision);
    expect(revisions.every((revision, index) => index === 0 || revision === revisions[index - 1]! + 1)).toBe(true);
    expect(rearMessages.map((message) =>
      (message.payload.notification as { audience: string }).audience)).toEqual(["rear-boundary", "resolution"]);
    const finalSnapshot = await (await fetch(`${server.url}/v1/trips/TRIP001/live-snapshot`, {
      headers: auth("USER001"),
    })).json() as { graph: { overallState: string; components: Array<{ memberIds: string[] }> } };
    expect(finalSnapshot.graph).toMatchObject({
      overallState: "together",
      components: [{ memberIds: ["M001", "M002", "M003", "M004"] }],
    });
    stateSocket.close();
    rearSocket.close();
  });
});
