import { z } from "zod";

const IdentifierSchema = z.string().min(1).max(160);
const IsoDateTimeSchema = z.iso.datetime();

export const LocationConfidenceSchema = z.enum(["high", "medium", "low"]);
export type LocationConfidence = z.infer<typeof LocationConfidenceSchema>;

export const ConnectivitySchema = z.enum(["healthy", "degraded", "stale", "lost"]);
export type Connectivity = z.infer<typeof ConnectivitySchema>;

export const LocationTelemetryV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: IdentifierSchema,
    tripId: IdentifierSchema,
    memberId: IdentifierSchema,
    deviceId: IdentifierSchema,
    sequence: z.number().int().nonnegative(),
    observedAt: IsoDateTimeSchema,
    sentAt: IsoDateTimeSchema,
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    accuracyMeters: z.number().nonnegative().lte(5_000),
    speedKmh: z.number().nonnegative().lte(300).nullable(),
    headingDegrees: z.number().gte(0).lt(360).nullable(),
    batteryPercent: z.number().gte(0).lte(100).nullable(),
    networkQuality: z.enum(["good", "weak", "offline-replay"]),
    source: z.enum(["gps", "simulator"]),
  })
  .strict();

export type LocationTelemetryV1 = z.infer<typeof LocationTelemetryV1Schema>;

export const ProjectedLocationV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: IdentifierSchema,
    sourceTelemetryEventId: IdentifierSchema,
    tripId: IdentifierSchema,
    memberId: IdentifierSchema,
    role: z.enum(["leader", "member"]),
    routeProgressMeters: z.number().nonnegative(),
    routeDeviationMeters: z.number().nonnegative(),
    matchConfidence: z.enum(["high", "medium", "low", "unmatchable"]),
    projectedAt: IsoDateTimeSchema,
  })
  .strict();

export type ProjectedLocationV1 = z.infer<typeof ProjectedLocationV1Schema>;

export const EventEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: IdentifierSchema,
    eventType: IdentifierSchema,
    occurredAt: IsoDateTimeSchema,
    producedAt: IsoDateTimeSchema,
    correlationId: IdentifierSchema,
    causationId: IdentifierSchema.optional(),
    tripId: IdentifierSchema,
    producer: IdentifierSchema,
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export const VehicleNodeSchema = z
  .object({
    tripId: IdentifierSchema,
    memberId: IdentifierSchema,
    role: z.enum(["leader", "member"]),
    routeProgressMeters: z.number().nonnegative(),
    routeDeviationMeters: z.number().nonnegative(),
    speedKmh: z.number().nonnegative().lte(300).nullable(),
    headingDegrees: z.number().gte(0).lt(360).nullable(),
    accuracyMeters: z.number().nonnegative().lte(5_000),
    observedAt: IsoDateTimeSchema,
    confidence: LocationConfidenceSchema,
    connectivity: ConnectivitySchema,
  })
  .strict();

export type VehicleNode = z.infer<typeof VehicleNodeSchema>;

export const ConvoyEdgeStateSchema = z.enum(["healthy", "stretched", "broken", "recovering", "unknown"]);
export type ConvoyEdgeState = z.infer<typeof ConvoyEdgeStateSchema>;

export const ConvoyEdgeSchema = z
  .object({
    aheadMemberId: IdentifierSchema,
    behindMemberId: IdentifierSchema,
    routeGapMeters: z.number().nonnegative(),
    etaGapSeconds: z.number().nonnegative().nullable(),
    combinedUncertaintyMeters: z.number().nonnegative(),
    confidentLowerGapMeters: z.number().nonnegative(),
    state: ConvoyEdgeStateSchema,
    stateSince: IsoDateTimeSchema,
    policyVersion: IdentifierSchema,
  })
  .strict();

export type ConvoyEdge = z.infer<typeof ConvoyEdgeSchema>;

export const ConvoyComponentSchema = z
  .object({
    componentId: IdentifierSchema,
    memberIds: z.array(IdentifierSchema),
    frontBoundaryMemberId: IdentifierSchema,
    rearBoundaryMemberId: IdentifierSchema,
    containsLeader: z.boolean(),
    averageSpeedKmh: z.number().nonnegative().lte(300).nullable(),
  })
  .strict();

export type ConvoyComponent = z.infer<typeof ConvoyComponentSchema>;

export const ConvoyGraphSchema = z
  .object({
    tripId: IdentifierSchema,
    leaderMemberId: IdentifierSchema.nullable(),
    graphRevision: z.number().int().nonnegative(),
    calculatedAt: IsoDateTimeSchema,
    overallState: z.enum(["together", "stretched", "split", "degraded"]),
    orderedMemberIds: z.array(IdentifierSchema),
    edges: z.array(ConvoyEdgeSchema),
    components: z.array(ConvoyComponentSchema),
    policyVersion: IdentifierSchema,
  })
  .strict();

export type ConvoyGraph = z.infer<typeof ConvoyGraphSchema>;

export const SituationEvidenceSchema = z
  .object({
    frontBoundaryMemberId: IdentifierSchema.optional(),
    rearBoundaryMemberId: IdentifierSchema.optional(),
    routeGapMeters: z.number().nonnegative().optional(),
    maximumRouteGapMeters: z.number().nonnegative().optional(),
    etaGapSeconds: z.number().nonnegative().optional(),
    durationSeconds: z.number().nonnegative(),
    locationConfidence: LocationConfidenceSchema,
    graphRevision: z.number().int().nonnegative(),
    sourceEventIds: z.array(IdentifierSchema),
  })
  .strict();

export type SituationEvidence = z.infer<typeof SituationEvidenceSchema>;

export const SituationSchema = z
  .object({
    situationId: IdentifierSchema,
    tripId: IdentifierSchema,
    type: z.literal("convoy-split"),
    lifecycle: z.enum(["confirmed", "notified", "resolved"]),
    severity: z.enum(["medium", "high"]),
    affectedComponentIds: z.array(IdentifierSchema),
    evidence: SituationEvidenceSchema,
    policyVersion: IdentifierSchema,
    confirmedAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    notifiedAt: IsoDateTimeSchema.optional(),
    resolvedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export type Situation = z.infer<typeof SituationSchema>;

export const PlaceCandidateSchema = z
  .object({
    poiId: IdentifierSchema,
    name: z.string().min(1).max(240),
    type: z.string().min(1).max(120),
    safeStopScore: z.number().gte(0).lte(1),
    routeCompatibilityScore: z.number().gte(0).lte(1),
    etaFairnessScore: z.number().gte(0).lte(1),
    parkingScore: z.number().gte(0).lte(1),
    detourScore: z.number().gte(0).lte(1),
    fuelOrChargingScore: z.number().gte(0).lte(1),
    amenitiesScore: z.number().gte(0).lte(1),
    maximumMemberEtaSeconds: z.number().nonnegative(),
    isLegal: z.boolean(),
    isSafeToStop: z.boolean(),
    isOpen: z.boolean(),
    isAccessible: z.boolean(),
    hasSufficientParking: z.boolean(),
    requiresReverseDirection: z.boolean(),
    detourMeters: z.number().nonnegative(),
    sourceConfidence: LocationConfidenceSchema,
  })
  .strict();

export type PlaceCandidate = z.infer<typeof PlaceCandidateSchema>;

export const NotificationRequestSchema = z
  .object({
    notificationId: IdentifierSchema,
    dedupeKey: IdentifierSchema,
    situationId: IdentifierSchema,
    recipientMemberId: IdentifierSchema,
    locale: z.enum(["en", "vi"]),
    audience: z.enum(["leader", "front-section", "rear-section", "front-boundary", "rear-boundary", "resolution"]),
    severity: z.enum(["info", "medium", "high"]),
    message: z.string().min(1).max(500),
    graphRevision: z.number().int().nonnegative(),
    createdAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
    channels: z.array(z.enum(["visual", "voice", "haptic", "push"])),
  })
  .strict();

export type NotificationRequest = z.infer<typeof NotificationRequestSchema>;

export const RegroupExclusionCodeSchema = z.enum([
  "illegal",
  "unsafe-stop",
  "closed",
  "inaccessible",
  "insufficient-parking",
  "reverse-direction",
  "excessive-detour",
  "low-source-confidence",
]);

export type RegroupExclusionCode = z.infer<typeof RegroupExclusionCodeSchema>;

export const RegroupRecommendationV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    recommendationId: IdentifierSchema,
    tripId: IdentifierSchema,
    situationId: IdentifierSchema,
    policyVersion: IdentifierSchema,
    state: z.enum(["pending", "approved", "expired"]),
    selectedCandidate: PlaceCandidateSchema.nullable(),
    excludedCandidates: z.array(
      z
        .object({
          poiId: IdentifierSchema,
          reasonCodes: z.array(RegroupExclusionCodeSchema),
        })
        .strict(),
    ),
    createdAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
    approvedAt: IsoDateTimeSchema.optional(),
    approvedByMemberId: IdentifierSchema.optional(),
  })
  .strict();

export type RegroupRecommendationV1 = z.infer<typeof RegroupRecommendationV1Schema>;

export const TripSummaryV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: IdentifierSchema,
    startedAt: IsoDateTimeSchema,
    completedAt: IsoDateTimeSchema,
    measuredFacts: z
      .object({
        durationSeconds: z.number().nonnegative(),
        confirmedSplitCount: z.number().int().nonnegative(),
        resolvedSplitCount: z.number().int().nonnegative(),
        regroupRecommendationCount: z.number().int().nonnegative(),
        notificationRequestCount: z.number().int().nonnegative(),
        rejectedTelemetryCount: z.number().int().nonnegative(),
        maximumConfirmedRouteGapMeters: z.number().nonnegative(),
      })
      .strict(),
    narrative: z
      .object({
        source: z.literal("deterministic-template"),
        text: z.string().min(1).max(1_000),
      })
      .strict(),
  })
  .strict();

export type TripSummaryV1 = z.infer<typeof TripSummaryV1Schema>;

export const ApiErrorSchema = z
  .object({
    code: IdentifierSchema,
    message: z.string().min(1).max(500),
    correlationId: IdentifierSchema,
    details: z.record(z.string(), z.unknown()).optional(),
    retryable: z.boolean(),
  })
  .strict();

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const CommandEnvelopeV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    commandId: IdentifierSchema,
    idempotencyKey: IdentifierSchema,
    occurredAt: IsoDateTimeSchema,
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type CommandEnvelopeV1 = z.infer<typeof CommandEnvelopeV1Schema>;

export const TripMemberV1Schema = z
  .object({
    memberId: IdentifierSchema,
    tripId: IdentifierSchema,
    userId: IdentifierSchema,
    displayName: z.string().min(1).max(80),
    role: z.enum(["leader", "member"]),
    readinessState: z.enum(["not-ready", "ready"]),
    visibilityPolicy: z.enum(["group", "leader-only", "paused"]),
  })
  .strict();

export type TripMemberV1 = z.infer<typeof TripMemberV1Schema>;

export const JoinTripRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    joinCode: z.string().trim().min(4).max(32).regex(/^[A-Za-z0-9-]+$/),
    displayName: z.string().trim().min(1).max(80),
  })
  .strict();

export type JoinTripRequestV1 = z.infer<typeof JoinTripRequestV1Schema>;

export const JoinTripResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: IdentifierSchema,
    member: TripMemberV1Schema,
  })
  .strict();

export type JoinTripResponseV1 = z.infer<typeof JoinTripResponseV1Schema>;

export const SetReadinessRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    ready: z.boolean(),
  })
  .strict();

export type SetReadinessRequestV1 = z.infer<typeof SetReadinessRequestV1Schema>;

export const SetReadinessResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    member: TripMemberV1Schema,
    tripVersion: z.number().int().positive(),
  })
  .strict();

export type SetReadinessResponseV1 = z.infer<typeof SetReadinessResponseV1Schema>;

export const ApproveRegroupRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    commandId: IdentifierSchema,
    idempotencyKey: IdentifierSchema,
  })
  .strict();

export type ApproveRegroupRequestV1 = z.infer<typeof ApproveRegroupRequestV1Schema>;

export const ApproveRegroupResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    recommendation: RegroupRecommendationV1Schema,
  })
  .strict();

export type ApproveRegroupResponseV1 = z.infer<typeof ApproveRegroupResponseV1Schema>;

export const CompleteTripRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    commandId: IdentifierSchema,
    idempotencyKey: IdentifierSchema,
  })
  .strict();

export type CompleteTripRequestV1 = z.infer<typeof CompleteTripRequestV1Schema>;

export const CompleteTripResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    summary: TripSummaryV1Schema,
  })
  .strict();

export type CompleteTripResponseV1 = z.infer<typeof CompleteTripResponseV1Schema>;

export const LiveSnapshotV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: IdentifierSchema,
    snapshotRevision: z.number().int().nonnegative(),
    generatedAt: IsoDateTimeSchema,
    viewer: z
      .object({
        memberId: IdentifierSchema,
        role: z.enum(["leader", "member"]),
      })
      .strict(),
    graph: ConvoyGraphSchema,
    situations: z.array(SituationSchema),
    recommendations: z.array(RegroupRecommendationV1Schema),
    notifications: z.array(NotificationRequestSchema),
  })
  .strict();

export type LiveSnapshotV1 = z.infer<typeof LiveSnapshotV1Schema>;

export const RealtimeAudienceV1Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("trip") }).strict(),
  z.object({ kind: z.literal("leader") }).strict(),
  z.object({ kind: z.literal("member"), memberId: IdentifierSchema }).strict(),
]);

export type RealtimeAudienceV1 = z.infer<typeof RealtimeAudienceV1Schema>;

export const RealtimeEventV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: IdentifierSchema,
    tripId: IdentifierSchema,
    snapshotRevision: z.number().int().nonnegative(),
    graphRevision: z.number().int().nonnegative(),
    audience: RealtimeAudienceV1Schema,
    eventType: IdentifierSchema,
    occurredAt: IsoDateTimeSchema,
    expiresAt: IsoDateTimeSchema,
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type RealtimeEventV1 = z.infer<typeof RealtimeEventV1Schema>;
