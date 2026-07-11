import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  ApiErrorSchema,
  CommandEnvelopeV1Schema,
  CompleteTripRequestV1Schema,
  ContentReportV1Schema,
  EventEnvelopeSchema,
  JoinTripRequestV1Schema,
  LocationVisibilityPolicyV1Schema,
  LiveSnapshotV1Schema,
  LocationTelemetryV1Schema,
  NotificationRequestSchema,
  PlaceCommunitySummaryV1Schema,
  ProjectedLocationV1Schema,
  RealtimeEventV1Schema,
  SetReadinessRequestV1Schema,
  SituationSchema,
  TripSummaryV1Schema,
  UserTravelProfileV1Schema,
} from "../src/index";

const telemetry = {
  schemaVersion: 1,
  eventId: "telemetry-1",
  tripId: "TRIP001",
  memberId: "M003",
  deviceId: "device-3",
  sequence: 8,
  observedAt: "2026-07-11T03:00:00.000Z",
  sentAt: "2026-07-11T03:00:01.000Z",
  latitude: 21.0285,
  longitude: 105.8542,
  accuracyMeters: 8,
  speedKmh: 72,
  headingDegrees: 90,
  batteryPercent: 80,
  networkQuality: "good",
  source: "simulator",
} as const;

const situation = {
  situationId: "split:TRIP001:M003:M004",
  tripId: "TRIP001",
  type: "convoy-split",
  lifecycle: "confirmed",
  severity: "high",
  affectedComponentIds: ["component:M001", "component:M004"],
  evidence: {
    frontBoundaryMemberId: "M003",
    rearBoundaryMemberId: "M004",
    routeGapMeters: 900,
    maximumRouteGapMeters: 900,
    durationSeconds: 30,
    locationConfidence: "high",
    graphRevision: 9,
    sourceEventIds: ["telemetry-1"],
  },
  policyVersion: "policy-v1",
  confirmedAt: "2026-07-11T03:00:00.000Z",
  updatedAt: "2026-07-11T03:00:00.000Z",
} as const;

describe("telemetry and event contracts", () => {
  it("publishes language-neutral golden telemetry examples", () => {
    const path = fileURLToPath(new URL("../examples/telemetry-cases-v1.json", import.meta.url));
    const examples = JSON.parse(readFileSync(path, "utf8")) as Array<{
      expectedContract: "valid" | "invalid";
      telemetry: unknown;
    }>;

    expect(examples).toHaveLength(5);
    expect(examples.map((example) => LocationTelemetryV1Schema.safeParse(example.telemetry).success)).toEqual(
      examples.map((example) => example.expectedContract === "valid"),
    );
  });

  it("accepts the published telemetry shape and rejects incompatible versions", () => {
    expect(LocationTelemetryV1Schema.parse(telemetry)).toEqual(telemetry);
    expect(LocationTelemetryV1Schema.safeParse({ ...telemetry, schemaVersion: 2 }).success).toBe(false);
    expect(LocationTelemetryV1Schema.safeParse({ ...telemetry, latitude: 91 }).success).toBe(false);
  });

  it("requires a projection to identify its source telemetry", () => {
    const projection = {
      schemaVersion: 1,
      eventId: "projection-1",
      sourceTelemetryEventId: telemetry.eventId,
      tripId: telemetry.tripId,
      memberId: telemetry.memberId,
      role: "member",
      routeProgressMeters: 12_000,
      routeDeviationMeters: 4,
      matchConfidence: "high",
      projectedAt: telemetry.observedAt,
    };

    expect(ProjectedLocationV1Schema.parse(projection)).toEqual(projection);
  });

  it("validates immutable event envelopes", () => {
    const event = {
      schemaVersion: 1,
      eventId: "event-1",
      eventType: "MemberLocationAccepted",
      occurredAt: telemetry.observedAt,
      producedAt: telemetry.sentAt,
      correlationId: "correlation-1",
      tripId: telemetry.tripId,
      producer: "telemetry-service",
      payload: { memberId: telemetry.memberId },
    };

    expect(EventEnvelopeSchema.parse(event)).toEqual(event);
    expect(EventEnvelopeSchema.safeParse({ ...event, internalSecret: "no" }).success).toBe(false);
  });
});

describe("service boundary contracts", () => {
  it("validates join, readiness and idempotent command requests", () => {
    expect(JoinTripRequestV1Schema.parse({ schemaVersion: 1, joinCode: "HALONG26", displayName: "An" })).toEqual({
      schemaVersion: 1,
      joinCode: "HALONG26",
      displayName: "An",
    });
    expect(SetReadinessRequestV1Schema.parse({ schemaVersion: 1, ready: true })).toEqual({
      schemaVersion: 1,
      ready: true,
    });
    expect(
      CommandEnvelopeV1Schema.parse({
        schemaVersion: 1,
        commandId: "command-1",
        idempotencyKey: "approve:recommendation-1",
        occurredAt: telemetry.observedAt,
        payload: { recommendationId: "recommendation-1" },
      }),
    ).toMatchObject({ idempotencyKey: "approve:recommendation-1" });
    expect(CompleteTripRequestV1Schema.parse({
      schemaVersion: 1,
      commandId: "complete-1",
      idempotencyKey: "complete:TRIP001",
    })).toMatchObject({ idempotencyKey: "complete:TRIP001" });
  });

  it("validates authoritative situations and member notifications", () => {
    expect(SituationSchema.parse(situation)).toEqual(situation);
    expect(
      NotificationRequestSchema.parse({
        notificationId: "notification-1",
        dedupeKey: "split:rear:M004:9",
        situationId: situation.situationId,
        recipientMemberId: "M004",
        locale: "vi",
        audience: "rear-section",
        severity: "high",
        message: "Duy tri toc do an toan va tiep tuc tren lo trinh.",
        graphRevision: 9,
        createdAt: telemetry.observedAt,
        expiresAt: "2026-07-11T03:05:00.000Z",
        channels: ["visual", "voice", "haptic"],
      }),
    ).toMatchObject({ recipientMemberId: "M004" });
  });

  it("validates snapshots, realtime revisions and measured summaries", () => {
    const graph = {
      tripId: "TRIP001",
      leaderMemberId: "M001",
      graphRevision: 9,
      calculatedAt: telemetry.observedAt,
      overallState: "split",
      orderedMemberIds: ["M001", "M002", "M003", "M004"],
      edges: [],
      components: [],
      policyVersion: "policy-v1",
    };
    const snapshot = {
      schemaVersion: 1,
      tripId: "TRIP001",
      snapshotRevision: 9,
      generatedAt: telemetry.observedAt,
      viewer: { memberId: "M001", role: "leader" },
      graph,
      situations: [situation],
      recommendations: [],
      notifications: [],
    };

    expect(LiveSnapshotV1Schema.parse(snapshot)).toEqual(snapshot);
    expect(
      RealtimeEventV1Schema.parse({
        schemaVersion: 1,
        eventId: "realtime-9",
        tripId: "TRIP001",
        snapshotRevision: 9,
        graphRevision: 9,
        audience: { kind: "trip" },
        eventType: "ConvoyGraphChanged",
        occurredAt: telemetry.observedAt,
        expiresAt: "2026-07-11T03:05:00.000Z",
        payload: { overallState: "split" },
      }),
    ).toMatchObject({ snapshotRevision: 9 });
    expect(
      TripSummaryV1Schema.parse({
        schemaVersion: 1,
        tripId: "TRIP001",
        startedAt: "2026-07-11T02:00:00.000Z",
        completedAt: telemetry.observedAt,
        measuredFacts: {
          durationSeconds: 3_600,
          confirmedSplitCount: 1,
          resolvedSplitCount: 1,
          regroupRecommendationCount: 1,
          notificationRequestCount: 8,
          rejectedTelemetryCount: 2,
          maximumConfirmedRouteGapMeters: 900,
        },
        narrative: { source: "deterministic-template", text: "One split was resolved safely." },
      }),
    ).toMatchObject({ tripId: "TRIP001" });
  });

  it("keeps errors safe and correlated", () => {
    expect(
      ApiErrorSchema.parse({
        code: "forbidden",
        message: "Active trip membership is required.",
        correlationId: "correlation-1",
        retryable: false,
      }),
    ).toMatchObject({ code: "forbidden" });
    expect(
      ApiErrorSchema.safeParse({
        code: "internal",
        message: "internal",
        correlationId: "correlation-1",
        retryable: false,
        stack: "secret",
      }).success,
    ).toBe(false);
  });

  it("validates community, profile and privacy contracts without Tasco fact leakage", () => {
    expect(
      PlaceCommunitySummaryV1Schema.parse({
        schemaVersion: 1,
        tascoPlaceId: "tasco:poi:POI001",
        averageRating: 4.5,
        reviewCount: 12,
        commentCount: 7,
        viewerCanReview: true,
        viewerHasReviewed: false,
        source: "user-generated",
      }),
    ).toMatchObject({ source: "user-generated" });
    expect(
      LocationVisibilityPolicyV1Schema.parse({
        schemaVersion: 1,
        userId: "USER001",
        tripVisibility: "leader-only",
        placePresenceVisibility: "private",
        retentionPreference: "minimal",
        blockedUserIds: ["USER002"],
        updatedAt: telemetry.observedAt,
      }),
    ).toMatchObject({ tripVisibility: "leader-only" });
    expect(
      UserTravelProfileV1Schema.parse({
        schemaVersion: 1,
        userId: "USER001",
        displayName: "Mai",
        homeCity: "Ha Noi",
        travelStyles: ["family trips"],
        interests: ["seafood"],
        preferredLanguages: ["vi", "en"],
        dietaryPreferences: [],
        accessibilityPreferences: [],
        updatedAt: telemetry.observedAt,
      }),
    ).toMatchObject({ displayName: "Mai" });
    expect(
      ContentReportV1Schema.parse({
        schemaVersion: 1,
        reportId: "report-1",
        reporterUserId: "USER001",
        targetType: "place-review",
        targetId: "review-1",
        reasonCode: "privacy-violation",
        details: null,
        createdAt: telemetry.observedAt,
        status: "open",
        resolvedAt: null,
        resolvedByUserId: null,
        resolution: null,
      }),
    ).toMatchObject({ status: "open" });
  });
});
