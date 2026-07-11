import { z } from "zod";

export const LocationTelemetryV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: z.string().min(1),
    tripId: z.string().min(1),
    memberId: z.string().min(1),
    deviceId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    observedAt: z.iso.datetime(),
    sentAt: z.iso.datetime(),
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
    eventId: z.string().min(1),
    sourceTelemetryEventId: z.string().min(1),
    tripId: z.string().min(1),
    memberId: z.string().min(1),
    role: z.enum(["leader", "member"]),
    routeProgressMeters: z.number().nonnegative(),
    routeDeviationMeters: z.number().nonnegative(),
    matchConfidence: z.enum(["high", "medium", "low", "unmatchable"]),
    projectedAt: z.iso.datetime(),
  })
  .strict();

export type ProjectedLocationV1 = z.infer<typeof ProjectedLocationV1Schema>;

export const EventEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: z.string().min(1),
    eventType: z.string().min(1),
    occurredAt: z.iso.datetime(),
    producedAt: z.iso.datetime(),
    correlationId: z.string().min(1),
    causationId: z.string().min(1).optional(),
    tripId: z.string().min(1),
    producer: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export type LocationConfidence = "high" | "medium" | "low";
export type Connectivity = "healthy" | "degraded" | "stale" | "lost";

export type VehicleNode = {
  tripId: string;
  memberId: string;
  role: "leader" | "member";
  routeProgressMeters: number;
  routeDeviationMeters: number;
  speedKmh: number | null;
  headingDegrees: number | null;
  accuracyMeters: number;
  observedAt: string;
  confidence: LocationConfidence;
  connectivity: Connectivity;
};

export type ConvoyEdgeState = "healthy" | "stretched" | "broken" | "recovering" | "unknown";

export type ConvoyEdge = {
  aheadMemberId: string;
  behindMemberId: string;
  routeGapMeters: number;
  etaGapSeconds: number | null;
  combinedUncertaintyMeters: number;
  confidentLowerGapMeters: number;
  state: ConvoyEdgeState;
  stateSince: string;
  policyVersion: string;
};

export type ConvoyComponent = {
  componentId: string;
  memberIds: string[];
  frontBoundaryMemberId: string;
  rearBoundaryMemberId: string;
  containsLeader: boolean;
  averageSpeedKmh: number | null;
};

export type ConvoyGraph = {
  tripId: string;
  leaderMemberId: string | null;
  graphRevision: number;
  calculatedAt: string;
  overallState: "together" | "stretched" | "split" | "degraded";
  orderedMemberIds: string[];
  edges: ConvoyEdge[];
  components: ConvoyComponent[];
  policyVersion: string;
};

export type SituationEvidence = {
  frontBoundaryMemberId?: string;
  rearBoundaryMemberId?: string;
  routeGapMeters?: number;
  etaGapSeconds?: number;
  durationSeconds: number;
  locationConfidence: LocationConfidence;
  graphRevision: number;
  sourceEventIds: string[];
};

export type Situation = {
  situationId: string;
  tripId: string;
  type: "convoy-split";
  lifecycle: "confirmed" | "notified" | "resolved";
  severity: "medium" | "high";
  affectedComponentIds: string[];
  evidence: SituationEvidence;
  policyVersion: string;
  confirmedAt: string;
  updatedAt: string;
  notifiedAt?: string;
  resolvedAt?: string;
};

export type PlaceCandidate = {
  poiId: string;
  name: string;
  type: string;
  safeStopScore: number;
  routeCompatibilityScore: number;
  etaFairnessScore: number;
  parkingScore: number;
  detourScore: number;
  fuelOrChargingScore: number;
  amenitiesScore: number;
  maximumMemberEtaSeconds: number;
  isLegal: boolean;
  isSafeToStop: boolean;
  isOpen: boolean;
  isAccessible: boolean;
  hasSufficientParking: boolean;
  requiresReverseDirection: boolean;
  detourMeters: number;
  sourceConfidence: LocationConfidence;
};

export type NotificationRequest = {
  notificationId: string;
  dedupeKey: string;
  situationId: string;
  recipientMemberId: string;
  locale: "en" | "vi";
  audience: "leader" | "front-section" | "rear-section" | "front-boundary" | "rear-boundary" | "resolution";
  severity: "info" | "medium" | "high";
  message: string;
  graphRevision: number;
  createdAt: string;
  expiresAt: string;
  channels: Array<"visual" | "voice" | "haptic" | "push">;
};
