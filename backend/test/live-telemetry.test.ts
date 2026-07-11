import { describe, expect, it } from "vitest";
import type { RegroupRecommendationV1 } from "@loopin/convoy-core";

import {
  acknowledgeDriverAlert,
  createEmptyLiveTripState,
  publishRegroupCandidateSelection,
  processProjectedTelemetry,
  type LiveTripState,
} from "../src/domain/live-telemetry.js";

const tripId = "TRIP001";

function iso(seconds: number): string {
  return new Date(Date.parse("2026-07-20T00:00:00.000Z") + seconds * 1_000).toISOString();
}

function memberIndex(memberId: string): number {
  return Number(memberId.replace("M00", "")) - 1;
}

function input(
  memberId: string,
  role: "leader" | "member",
  tick: number,
  routeProgressMeters: number,
  overrides: { sequence?: number; eventId?: string; networkQuality?: "good" | "weak" | "offline-replay" } = {},
) {
  const eventId = overrides.eventId ?? `gps:${tick}:${memberId}`;
  const index = memberIndex(memberId);
  const observedAt = iso(tick);
  return {
    telemetry: {
      schemaVersion: 1,
      eventId,
      tripId,
      memberId,
      deviceId: `device:${memberId}`,
      sequence: overrides.sequence ?? tick * 10 + index + 1,
      observedAt,
      sentAt: iso(tick + 1),
      latitude: 21.0285,
      longitude: 105.8542 + index * 0.0001,
      accuracyMeters: 5,
      speedKmh: 70,
      headingDegrees: 90,
      batteryPercent: 80,
      networkQuality: overrides.networkQuality ?? "good",
      source: "simulator",
    },
    projection: {
      schemaVersion: 1,
      eventId: `projection:${eventId}`,
      sourceTelemetryEventId: eventId,
      tripId,
      memberId,
      role,
      routeProgressMeters,
      routeDeviationMeters: 0,
      matchConfidence: "high",
      projectedAt: iso(tick + 1),
    },
    receivedAt: iso(tick + 1),
  } as const;
}

function apply(state: LiveTripState, value: ReturnType<typeof input>) {
  return processProjectedTelemetry(state, value);
}

describe("live telemetry domain", () => {
  it("stores accepted projected telemetry as current member state and emits a snapshot update", () => {
    const result = apply(createEmptyLiveTripState(tripId), input("M001", "leader", 0, 10_000));

    expect(result.status).toBe("accepted");
    expect(result.snapshot?.members).toHaveLength(1);
    expect(result.snapshot?.members[0]).toMatchObject({
      memberId: "M001",
      sourceTelemetryEventId: "gps:0:M001",
      confidence: "high",
      connectivity: "healthy",
      policyVersion: "convoy-v1",
    });
    expect(result.events.map((event) => event.eventType)).toEqual(["liveSnapshotUpdated"]);
    expect(result.events[0]?.audience).toEqual({ kind: "trip" });
  });

  it("does not publish live events for duplicates, stale sequences or history-only replay", () => {
    const accepted = apply(createEmptyLiveTripState(tripId), input("M001", "leader", 0, 10_000));
    const duplicate = apply(accepted.state, input("M001", "leader", 0, 10_000));
    const stale = apply(duplicate.state, input("M001", "leader", 1, 10_050, { eventId: "gps:late:M001", sequence: 0 }));
    const replay = apply(stale.state, input("M001", "leader", 2, 10_100, {
      eventId: "gps:replay:M001",
      sequence: 99,
      networkQuality: "offline-replay",
    }));

    expect([duplicate.status, stale.status, replay.status]).toEqual(["duplicate", "stale-sequence", "history-only"]);
    expect(duplicate.events).toEqual([]);
    expect(stale.events).toEqual([]);
    expect(replay.events).toEqual([]);
    expect(replay.state.currentMembers.M001?.sequence).toBe(1);
    expect(replay.state.telemetryState.historyEventIds).toContain("gps:replay:M001");
  });

  it("runs convoy-core on backend state and emits safe driver alerts for a confirmed split", () => {
    let state = createEmptyLiveTripState(tripId, {
      M001: "en",
      M002: "en",
      M003: "en",
      M004: "en",
    });
    const ticks = [0, 15, 30];
    const progressAt = (memberId: string, tick: number) => {
      const leader = 10_000 + tick * 20;
      if (memberId === "M001") return leader;
      if (memberId === "M002") return leader - 100;
      if (memberId === "M003") return leader - 200;
      return leader - 1_100;
    };

    const allResults = ticks.flatMap((tick) =>
      ([
        ["M001", "leader"],
        ["M002", "member"],
        ["M003", "member"],
        ["M004", "member"],
      ] as const).map(([memberId, role]) => {
        const result = apply(state, input(memberId, role, tick, progressAt(memberId, tick)));
        state = result.state;
        return result;
      }),
    );

    const alertEvents = allResults.flatMap((result) => result.events).filter((event) => event.eventType === "driverAlertIssued");
    const situationEvents = allResults
      .flatMap((result) => result.events)
      .filter((event) => event.eventType === "convoySituationCreated");
    const alertMessages = Object.values(state.notificationsById).map((notification) => notification.message).join(" ");
    const rearBoundary = Object.values(state.notificationsById).find((notification) => notification.recipientMemberId === "M004");

    expect(state.graphState?.graph.overallState).toBe("split");
    expect(situationEvents[0]?.payload).toMatchObject({
      schemaVersion: 1,
      eventType: "convoySituationCreated",
      situation: { type: "convoy-split" },
    });
    expect(alertEvents).toHaveLength(4);
    expect(alertEvents[0]?.payload).toMatchObject({
      schemaVersion: 1,
      requiresAcknowledgement: true,
      notification: { channels: expect.arrayContaining(["voice", "haptic"]) },
    });
    expect(rearBoundary?.message).toContain("do not rush to catch up");
    expect(alertMessages).not.toMatch(/speed up|brake suddenly/i);
    expect(state.activeSituation?.evidence.sourceEventIds).toContain("gps:30:M004");
  });

  it("publishes driver alert acknowledgements idempotently", () => {
    let state = createEmptyLiveTripState(tripId, {
      M001: "en",
      M002: "en",
      M003: "en",
      M004: "en",
    });
    for (const tick of [0, 15, 30]) {
      state = apply(state, input("M001", "leader", tick, 10_000 + tick * 20)).state;
      state = apply(state, input("M002", "member", tick, 9_900 + tick * 20)).state;
      state = apply(state, input("M003", "member", tick, 9_800 + tick * 20)).state;
      state = apply(state, input("M004", "member", tick, 8_900 + tick * 20)).state;
    }

    const alert = Object.values(state.notificationsById).find((notification) => notification.recipientMemberId === "M004");
    expect(alert).toBeDefined();

    const acknowledgement = {
      schemaVersion: 1,
      acknowledgementId: `ack:${alert!.notificationId}`,
      alertId: `alert:${alert!.notificationId}`,
      notificationId: alert!.notificationId,
      tripId,
      memberId: "M004",
      acknowledgedAt: iso(35),
      idempotencyKey: `ack:${alert!.notificationId}`,
    } as const;
    const acknowledged = acknowledgeDriverAlert(state, acknowledgement);
    const duplicate = acknowledgeDriverAlert(acknowledged.state, acknowledgement);
    const unknown = acknowledgeDriverAlert(state, { ...acknowledgement, acknowledgementId: "ack:missing", notificationId: "missing" });

    expect(acknowledged.status).toBe("acknowledged");
    expect(acknowledged.events).toHaveLength(1);
    expect(acknowledged.events[0]).toMatchObject({
      eventType: "driverAlertAcknowledged",
      audience: { kind: "trip" },
      payload: acknowledgement,
    });
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.events).toEqual([]);
    expect(unknown.status).toBe("unknown-alert");
    expect(unknown.events).toEqual([]);
  });

  it("publishes selected regroup candidates only when deterministic input supplies a safe POI", () => {
    const state = createEmptyLiveTripState(tripId);
    const recommendation: RegroupRecommendationV1 = {
      schemaVersion: 1,
      recommendationId: "recommendation-1",
      tripId,
      situationId: "split:TRIP001:M003:M004",
      policyVersion: "convoy-v1",
      state: "pending",
      selectedCandidate: {
        poiId: "poi-safe-1",
        name: "Approved service area",
        type: "service-area",
        safeStopScore: 1,
        routeCompatibilityScore: 0.9,
        etaFairnessScore: 0.8,
        parkingScore: 0.9,
        detourScore: 0.95,
        fuelOrChargingScore: 0.7,
        amenitiesScore: 0.6,
        maximumMemberEtaSeconds: 240,
        isLegal: true,
        isSafeToStop: true,
        isOpen: true,
        isAccessible: true,
        hasSufficientParking: true,
        requiresReverseDirection: false,
        detourMeters: 300,
        sourceConfidence: "high",
      },
      excludedCandidates: [],
      createdAt: iso(40),
      expiresAt: iso(340),
    };

    const selected = publishRegroupCandidateSelection(state, recommendation, iso(41));
    const duplicate = publishRegroupCandidateSelection(selected.state, recommendation, iso(42));
    const noSafeCandidate = publishRegroupCandidateSelection(
      state,
      { ...recommendation, recommendationId: "recommendation-2", selectedCandidate: null },
      iso(43),
    );

    expect(selected.status).toBe("selected");
    expect(selected.events[0]).toMatchObject({
      eventType: "regroupCandidateSelected",
      audience: { kind: "leader" },
      payload: { recommendationId: "recommendation-1", selectedCandidate: { poiId: "poi-safe-1" } },
    });
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.events).toEqual([]);
    expect(noSafeCandidate.status).toBe("no-safe-candidate");
    expect(noSafeCandidate.events).toEqual([]);
  });
});
