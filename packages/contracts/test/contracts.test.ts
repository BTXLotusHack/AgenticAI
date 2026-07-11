import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  ApiErrorSchema,
  CommandEnvelopeV1Schema,
  CompleteTripRequestV1Schema,
  ConvoySituationEventV1Schema,
  DriverAlertAcknowledgementV1Schema,
  DriverAlertV1Schema,
  EventEnvelopeSchema,
  JoinTripRequestV1Schema,
  JoinTripResultV1Schema,
  LiveSnapshotV1Schema,
  LocationTelemetryV1Schema,
  MemberTelemetryInputV1Schema,
  NotificationRequestSchema,
  ProjectedLocationV1Schema,
  RealtimeEventV1Schema,
  SetReadinessRequestV1Schema,
  SituationSchema,
  TascoPlaceRefV1Schema,
  TascoRoutePreviewV1Schema,
  TripSummaryV1Schema,
  TripPlanSummaryV1Schema,
  TripStopV1Schema,
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
    expect(
      MemberTelemetryInputV1Schema.parse({
        schemaVersion: 1,
        telemetry,
        transport: "mqtt",
        publishedAt: telemetry.sentAt,
        offlineQueueDepth: 0,
      }),
    ).toMatchObject({ transport: "mqtt", telemetry });
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
  const tascoPlace = {
    id: "poi:poi001-minh-chau-rest-stop",
    provider: "tasco",
    name: "Minh Chau Rest Stop",
    address: "QL5, Km 62, Hung Yen",
    coordinates: { lat: 20.8724, lon: 106.0518 },
    categories: ["rest_stop", "parking", "fuel"],
    ratingSummary: { averageRating: 4.4, reviewCount: 128, source: "tasco" },
    sourceVersion: "tasco-mock-2026-06-25",
  } as const;

  it("validates shared Tasco place, route and trip planning summaries", () => {
    expect(TascoPlaceRefV1Schema.parse(tascoPlace)).toEqual(tascoPlace);
    expect(TascoPlaceRefV1Schema.safeParse({ ...tascoPlace, provider: "caller" }).success).toBe(false);
    expect(TascoPlaceRefV1Schema.safeParse({ ...tascoPlace, ratingSummary: { averageRating: 6, reviewCount: 1, source: "tasco" } }).success).toBe(false);

    const stop = TripStopV1Schema.parse({
      stopId: "STOP001",
      place: tascoPlace,
      plannedWindow: {
        arrivalAt: "2026-07-20T03:20:00.000Z",
        departureAt: "2026-07-20T03:50:00.000Z",
      },
      notes: "Leader-approved rest stop.",
      locked: true,
      source: "tasco-search",
    });
    expect(stop.place.id).toBe("poi:poi001-minh-chau-rest-stop");

    const routePreview = TascoRoutePreviewV1Schema.parse({
      routeId: "route:r001-primary",
      provider: "tasco",
      origin: { ...tascoPlace, id: "poi:origin", name: "Ha Noi", categories: ["city"] },
      destination: { ...tascoPlace, id: "poi:destination", name: "Ha Long", categories: ["city"] },
      waypoints: [tascoPlace],
      summary: { distanceMeters: 156000, durationSeconds: 9000 },
      geometry: { type: "LineString", coordinates: [[105.8542, 21.0285], [106.0518, 20.8724]] },
      sourceVersion: "tasco-mock-2026-06-25",
    });
    expect(routePreview.summary.distanceMeters).toBe(156000);

    const tripSummary = TripPlanSummaryV1Schema.parse({
      tripId: "TRIP001",
      title: "Ha Noi to Ha Long",
      lifecycle: "ready",
      origin: routePreview.origin,
      destination: routePreview.destination,
      stops: [stop],
      routeSummary: routePreview.summary,
      departureTime: "2026-07-20T02:00:00.000Z",
      policyId: "policy-v1",
      memberCount: 4,
    });
    expect(tripSummary.stops[0]?.place.provider).toBe("tasco");
  });

  it("validates join results with consent and offline route requirements", () => {
    expect(
      JoinTripResultV1Schema.parse({
        schemaVersion: 1,
        tripId: "TRIP001",
        memberId: "M004",
        role: "member",
        consentRequirements: ["location-while-driving", "driver-alerts"],
        routeOfflineSummary: {
          routeId: "route:r001-primary",
          distanceMeters: 156000,
          durationSeconds: 9000,
          encodedGeometry: "fixture-polyline",
          sourceVersion: "tasco-mock-2026-06-25",
        },
      }),
    ).toMatchObject({ memberId: "M004" });
  });

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
    const notification = {
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
    };
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
      members: [
        {
          memberId: "M001",
          tripId: "TRIP001",
          role: "leader",
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
          snappedLatitude: telemetry.latitude,
          snappedLongitude: telemetry.longitude,
          routeProgressMeters: 12_000,
          routeDeviationMeters: 4,
          speedKmh: telemetry.speedKmh,
          headingDegrees: telemetry.headingDegrees,
          accuracyMeters: telemetry.accuracyMeters,
          observedAt: telemetry.observedAt,
          receivedAt: telemetry.sentAt,
          sequence: telemetry.sequence,
          sourceTelemetryEventId: telemetry.eventId,
          confidence: "high",
          connectivity: "healthy",
          policyVersion: "convoy-v1",
        },
      ],
      graph,
      situations: [situation],
      recommendations: [],
      notifications: [notification],
    };

    expect(LiveSnapshotV1Schema.parse(snapshot)).toEqual(snapshot);
    expect(
      ConvoySituationEventV1Schema.parse({
        schemaVersion: 1,
        eventId: "situation-event-9",
        tripId: "TRIP001",
        snapshotRevision: 9,
        graphRevision: 9,
        eventType: "convoySituationCreated",
        occurredAt: telemetry.observedAt,
        situation,
      }),
    ).toMatchObject({ graphRevision: 9 });
    expect(
      DriverAlertV1Schema.parse({
        schemaVersion: 1,
        alertId: "alert-notification-1",
        tripId: "TRIP001",
        recipientMemberId: "M004",
        issuedAt: telemetry.observedAt,
        expiresAt: "2026-07-11T03:05:00.000Z",
        notification,
        requiresAcknowledgement: true,
      }),
    ).toMatchObject({ recipientMemberId: "M004" });
    expect(
      DriverAlertAcknowledgementV1Schema.parse({
        schemaVersion: 1,
        acknowledgementId: "ack-notification-1",
        alertId: "alert-notification-1",
        notificationId: "notification-1",
        tripId: "TRIP001",
        memberId: "M004",
        acknowledgedAt: telemetry.observedAt,
        idempotencyKey: "ack:notification-1",
      }),
    ).toMatchObject({ notificationId: "notification-1" });
    expect(
      RealtimeEventV1Schema.parse({
        schemaVersion: 1,
        eventId: "realtime-9",
        tripId: "TRIP001",
        snapshotRevision: 9,
        graphRevision: 9,
        audience: { kind: "trip" },
        eventType: "liveSnapshotUpdated",
        occurredAt: telemetry.observedAt,
        expiresAt: "2026-07-11T03:05:00.000Z",
        payload: { overallState: "split" },
      }),
    ).toMatchObject({ snapshotRevision: 9 });
    expect(
      RealtimeEventV1Schema.safeParse({
        schemaVersion: 1,
        eventId: "realtime-unknown",
        tripId: "TRIP001",
        snapshotRevision: 10,
        graphRevision: 10,
        audience: { kind: "trip" },
        eventType: "ConvoyGraphChanged",
        occurredAt: telemetry.observedAt,
        expiresAt: "2026-07-11T03:05:00.000Z",
        payload: {},
      }).success,
    ).toBe(false);
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
});
