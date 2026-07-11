import { describe, expect, it } from "vitest";

import { GOLDEN_R001 } from "@loopin/demo-scenarios";
import type { EventEnvelope, LocationTelemetryV1, ProjectedLocationV1, RealtimeEventV1 } from "@loopin/contracts";

import {
  ApplicationError,
  FixedClock,
  FixtureMapsProvider,
  LoopinApplication,
  MemoryTripRepository,
  RecordingPublisher,
  createTripState,
} from "../src/index";

const startAt = "2026-07-20T00:00:00.000Z";

function at(seconds: number): string {
  return new Date(Date.parse(startAt) + seconds * 1_000).toISOString();
}

function position(memberId: string, tick: number): number {
  const leader = 10_000 + tick * 20;
  if (memberId === "M001") return leader;
  if (memberId === "M002") return leader - 100;
  if (memberId === "M003") return leader - 200;
  if (tick < 5) return leader - 300;
  if (tick < 40) return leader - 1_100;
  return leader - 500;
}

function pair(memberIndex: number, tick: number, overrides: Partial<LocationTelemetryV1> = {}) {
  const member = GOLDEN_R001.members[memberIndex]!;
  const telemetry: LocationTelemetryV1 = {
    schemaVersion: 1,
    eventId: `service:${tick}:${member.memberId}`,
    tripId: "TRIP001",
    memberId: member.memberId,
    deviceId: `device:${member.memberId}`,
    sequence: tick * 10 + memberIndex + 1,
    observedAt: at(tick),
    sentAt: at(tick + 1),
    latitude: GOLDEN_R001.routeStart.latitude,
    longitude: GOLDEN_R001.routeStart.longitude + tick * 0.0001,
    accuracyMeters: 5,
    speedKmh: 70,
    headingDegrees: 90,
    batteryPercent: 80,
    networkQuality: "good",
    source: "simulator",
    ...overrides,
  };
  const projection: ProjectedLocationV1 = {
    schemaVersion: 1,
    eventId: `projection:${telemetry.eventId}`,
    sourceTelemetryEventId: telemetry.eventId,
    tripId: telemetry.tripId,
    memberId: telemetry.memberId,
    role: member.role,
    routeProgressMeters: position(member.memberId, tick),
    routeDeviationMeters: 0,
    matchConfidence: "high",
    projectedAt: at(tick + 1),
  };
  return { telemetry, projection };
}

function goldenState() {
  return createTripState({
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
  });
}

function setup(
  repository = new MemoryTripRepository([goldenState()]),
  clock = new FixedClock(at(36)),
  realtime = new RecordingPublisher<RealtimeEventV1>(),
) {
  const maps = new FixtureMapsProvider();
  const domainEvents = new RecordingPublisher<EventEnvelope>();
  const app = new LoopinApplication({ repository, maps, clock, domainEvents, realtime });
  return { app, repository, maps, domainEvents, realtime };
}

async function driveToSplit(app: LoopinApplication, maps: FixtureMapsProvider) {
  let splitResult: Awaited<ReturnType<typeof app.processTelemetry>> | undefined;
  for (const tick of [0, 5, 10, 15, 20, 25, 30, 35]) {
    for (let memberIndex = 0; memberIndex < 4; memberIndex += 1) {
      const input = pair(memberIndex, tick);
      maps.add(input.projection);
      const result = await app.processTelemetry(
        { userId: `USER00${memberIndex + 1}` },
        input.telemetry,
        at(tick + 1),
      );
      if (result.situation?.lifecycle === "notified") splitResult = result;
    }
  }
  return splitResult;
}

describe("trip membership and authorization", () => {
  it("atomically reserves telemetry sequence, event TTL and command idempotency", async () => {
    const repository = new MemoryTripRepository([goldenState()]);
    const first = (await repository.get("TRIP001"))!;
    const committed = await repository.putIfVersion({ ...first, version: 2 }, 1, {
      now: at(1),
      telemetry: {
        eventId: "event-reserved",
        memberId: "M001",
        sequence: 10,
        expiresAt: at(100),
        advancesLiveSequence: true,
      },
    });
    const second = (await repository.get("TRIP001"))!;
    const duplicate = await repository.putIfVersion({ ...second, version: 3 }, 2, {
      now: at(2),
      telemetry: {
        eventId: "event-reserved",
        memberId: "M001",
        sequence: 11,
        expiresAt: at(100),
        advancesLiveSequence: true,
      },
    });
    const stale = await repository.putIfVersion({ ...second, version: 3 }, 2, {
      now: at(2),
      telemetry: {
        eventId: "event-stale",
        memberId: "M001",
        sequence: 9,
        expiresAt: at(100),
        advancesLiveSequence: true,
      },
    });
    const command = await repository.putIfVersion({ ...second, version: 3 }, 2, {
      now: at(2),
      command: { idempotencyKey: "command-key", fingerprint: "fingerprint-a", expiresAt: at(100) },
    });
    const third = (await repository.get("TRIP001"))!;
    const commandConflict = await repository.putIfVersion({ ...third, version: 4 }, 3, {
      now: at(3),
      command: { idempotencyKey: "command-key", fingerprint: "fingerprint-b", expiresAt: at(100) },
    });
    const commandAfterExpiry = await repository.putIfVersion({ ...third, version: 4 }, 3, {
      now: at(101),
      command: { idempotencyKey: "command-key", fingerprint: "fingerprint-b", expiresAt: at(200) },
    });

    expect({ committed, duplicate, stale }).toEqual({ committed: true, duplicate: false, stale: false });
    expect({ command, commandConflict, commandAfterExpiry }).toEqual({
      command: true,
      commandConflict: false,
      commandAfterExpiry: true,
    });
  });

  it("joins idempotently and updates only the caller's readiness", async () => {
    const { app } = setup();
    const identity = { userId: "USER005" };
    const joined = await app.joinTrip(identity, { schemaVersion: 1, joinCode: "HALONG26", displayName: "Mai" });
    const duplicate = await app.joinTrip(identity, { schemaVersion: 1, joinCode: "HALONG26", displayName: "Mai" });

    expect(duplicate.member.memberId).toBe(joined.member.memberId);
    const ready = await app.setReadiness(identity, "TRIP001", joined.member.memberId, { schemaVersion: 1, ready: true });
    expect(ready.member.readinessState).toBe("ready");
    await expect(
      app.setReadiness({ userId: "USER004" }, "TRIP001", joined.member.memberId, { schemaVersion: 1, ready: false }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("does not reveal a live snapshot to a nonmember", async () => {
    const { app } = setup();
    await expect(app.getLiveSnapshot({ userId: "OUTSIDER" }, "TRIP001")).rejects.toBeInstanceOf(ApplicationError);
  });
});

describe("ordered telemetry application flow", () => {
  it("replays a persisted outbox after realtime publication fails", async () => {
    class FailOncePublisher extends RecordingPublisher<RealtimeEventV1> {
      shouldFail = true;

      override async publish(channel: string, payload: RealtimeEventV1) {
        if (this.shouldFail) {
          this.shouldFail = false;
          throw new Error("realtime unavailable");
        }
        return super.publish(channel, payload);
      }
    }

    const realtime = new FailOncePublisher();
    const { app, maps } = setup(new MemoryTripRepository([goldenState()]), new FixedClock(at(36)), realtime);
    const input = pair(0, 0);
    maps.add(input.projection);
    await expect(app.processTelemetry({ userId: "USER001" }, input.telemetry, at(1))).rejects.toThrow("realtime unavailable");

    const retried = await app.processTelemetry({ userId: "USER001" }, input.telemetry, at(2));
    expect(retried.status).toBe("duplicate");
    expect(realtime.messages).toHaveLength(1);
  });

  it("retries an optimistic conflict without duplicating revisions or events", async () => {
    class FailOnceRepository extends MemoryTripRepository {
      private shouldFail = true;

      override async putIfVersion(
        state: Parameters<MemoryTripRepository["putIfVersion"]>[0],
        expectedVersion: number,
        condition?: Parameters<MemoryTripRepository["putIfVersion"]>[2],
      ) {
        if (this.shouldFail) {
          this.shouldFail = false;
          return false;
        }
        return super.putIfVersion(state, expectedVersion, condition);
      }
    }

    const { app, maps, domainEvents } = setup(new FailOnceRepository([goldenState()]));
    const input = pair(0, 0);
    maps.add(input.projection);
    const result = await app.processTelemetry({ userId: "USER001" }, input.telemetry, at(1));

    expect(result.status).toBe("accepted");
    expect(result.graph?.graphRevision).toBe(1);
    expect(domainEvents.messages).toHaveLength(1);
  });

  it("rejects a nonmember before invoking route projection", async () => {
    const { app } = setup();
    await expect(app.processTelemetry({ userId: "OUTSIDER" }, pair(0, 0).telemetry, at(1))).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("rejects a projection that changes the authorized member role", async () => {
    const { app, maps } = setup();
    const input = pair(1, 0);
    maps.add({ ...input.projection, role: "leader" });
    await expect(app.processTelemetry({ userId: "USER002" }, input.telemetry, at(1))).rejects.toMatchObject({
      code: "invalid-request",
    });
  });

  it("persists duplicate, stale and offline replay semantics without extra revisions", async () => {
    const { app, maps } = setup();
    const input = pair(0, 0);
    maps.add(input.projection);

    const accepted = await app.processTelemetry({ userId: "USER001" }, input.telemetry, at(1));
    const duplicate = await app.processTelemetry({ userId: "USER001" }, input.telemetry, at(2));
    const staleInput = pair(0, 0, { eventId: "service:stale:M001", sequence: 0 });
    maps.add({ ...staleInput.projection, eventId: "projection:stale", sourceTelemetryEventId: staleInput.telemetry.eventId });
    const stale = await app.processTelemetry({ userId: "USER001" }, staleInput.telemetry, at(2));
    const replayInput = pair(0, 0, { eventId: "service:replay:M001", sequence: 999, networkQuality: "offline-replay" });
    maps.add({ ...replayInput.projection, eventId: "projection:replay", sourceTelemetryEventId: replayInput.telemetry.eventId });
    const replay = await app.processTelemetry({ userId: "USER001" }, replayInput.telemetry, at(3));

    expect([accepted.status, duplicate.status, stale.status, replay.status]).toEqual([
      "accepted",
      "duplicate",
      "stale-sequence",
      "history-only",
    ]);
    expect(duplicate.snapshotRevision).toBe(accepted.snapshotRevision);
    expect(stale.snapshotRevision).toBe(accepted.snapshotRevision);
    expect(replay.snapshotRevision).toBe(accepted.snapshotRevision);
  });

  it("derives the exact split boundary and filters leader/member outputs", async () => {
    const { app, maps, realtime, domainEvents } = setup();
    const splitResult = await driveToSplit(app, maps);

    expect(splitResult?.situation?.situationId).toBe("split:TRIP001:M003:M004");
    expect(splitResult?.graph?.components.map((component) => component.memberIds)).toEqual([
      ["M001", "M002", "M003"],
      ["M004"],
    ]);

    const leader = await app.getLiveSnapshot({ userId: "USER001" }, "TRIP001");
    const rear = await app.getLiveSnapshot({ userId: "USER004" }, "TRIP001");
    expect(leader.recommendations[0]?.selectedCandidate?.poiId).toBe("POI001");
    expect(rear.recommendations).toEqual([]);
    expect(rear.graph.orderedMemberIds).not.toContain("M003");
    expect(rear.situations).toEqual([]);
    expect(rear.notifications.every((notification) => notification.recipientMemberId === "M004")).toBe(true);
    expect(realtime.messages.every((message) => message.payload.schemaVersion === 1)).toBe(true);
    expect(domainEvents.messages.some((message) => message.payload.eventType === "SituationConfirmed")).toBe(true);
    const confirmedEvent = domainEvents.messages.find((message) => message.payload.eventType === "SituationConfirmed");
    expect((confirmedEvent?.payload.payload.situation as { lifecycle: string }).lifecycle).toBe("confirmed");

    const recommendationId = leader.recommendations[0]!.recommendationId;
    await expect(
      app.approveRegroup({ userId: "USER004" }, "TRIP001", recommendationId, {
        schemaVersion: 1,
        commandId: "approve-member",
        idempotencyKey: "approve-member",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    const approved = await app.approveRegroup({ userId: "USER001" }, "TRIP001", recommendationId, {
      schemaVersion: 1,
      commandId: "approve-leader",
      idempotencyKey: "approve-leader",
    });
    expect(approved.recommendation.state).toBe("approved");
    const realtimeCount = realtime.messages.length;
    const duplicateApproval = await app.approveRegroup({ userId: "USER001" }, "TRIP001", recommendationId, {
      schemaVersion: 1,
      commandId: "approve-leader-retry",
      idempotencyKey: "approve-leader",
    });
    expect(duplicateApproval).toEqual(approved);
    expect(realtime.messages).toHaveLength(realtimeCount);
  });

  it("excludes not-ready members from both graph calculation and situation evidence", async () => {
    const state = goldenState();
    const repository = new MemoryTripRepository([{
      ...state,
      members: state.members.map((member) => member.memberId === "M004"
        ? { ...member, readinessState: "not-ready" as const }
        : member),
    }]);
    const { app, maps } = setup(repository);
    await driveToSplit(app, maps);
    const snapshot = await app.getLiveSnapshot({ userId: "USER001" }, "TRIP001");
    expect(snapshot.graph.orderedMemberIds).not.toContain("M004");
    expect(snapshot.situations).toEqual([]);
  });

  it("rejects an expired regroup recommendation", async () => {
    const clock = new FixedClock(at(1_000));
    const { app, maps } = setup(new MemoryTripRepository([goldenState()]), clock);
    await driveToSplit(app, maps);
    const leader = await app.getLiveSnapshot({ userId: "USER001" }, "TRIP001");
    const recommendationId = leader.recommendations[0]!.recommendationId;

    await expect(
      app.approveRegroup({ userId: "USER001" }, "TRIP001", recommendationId, {
        schemaVersion: 1,
        commandId: "approve-expired",
        idempotencyKey: "approve-expired",
      }),
    ).rejects.toMatchObject({ code: "conflict", message: "The regroup recommendation has expired." });
  });
});
