import {
  LocationTelemetryV1Schema,
  ProjectedLocationV1Schema,
  type Connectivity,
  type LocationConfidence,
  type VehicleNode,
} from "./contracts";

export type TelemetryState = {
  readonly seenEventIds: readonly string[];
  readonly historyEventIds: readonly string[];
  readonly latestSequenceByMember: Readonly<Record<string, number>>;
  readonly currentNodes: Readonly<Record<string, VehicleNode>>;
};

export type IngestionStatus = "accepted" | "duplicate" | "stale-sequence" | "history-only" | "rejected";

export type IngestionResult =
  | { status: Exclude<IngestionStatus, "rejected">; state: TelemetryState; node?: VehicleNode }
  | { status: "rejected"; state: TelemetryState; reason: "invalid-contract" | "projection-mismatch" | "unmatchable" };

export function createTelemetryState(): TelemetryState {
  return {
    seenEventIds: [],
    historyEventIds: [],
    latestSequenceByMember: {},
    currentNodes: {},
  };
}

function ageSeconds(observedAt: string, receivedAt: string): number {
  return Math.max(0, (Date.parse(receivedAt) - Date.parse(observedAt)) / 1_000);
}

function classifyConfidence(accuracyMeters: number, age: number, matchConfidence: "high" | "medium" | "low"): LocationConfidence {
  if (accuracyMeters < 20 && age < 10 && matchConfidence === "high") return "high";
  if (accuracyMeters < 50 && age < 30 && matchConfidence !== "low") return "medium";
  return "low";
}

function classifyConnectivity(age: number, networkQuality: "good" | "weak"): Connectivity {
  if (age < 10 && networkQuality === "good") return "healthy";
  if (age < 30) return "degraded";
  if (age < 120) return "stale";
  return "lost";
}

export function acceptProjectedLocation(
  state: TelemetryState,
  input: { telemetry: unknown; projection: unknown },
  receivedAt: string,
): IngestionResult {
  const telemetryResult = LocationTelemetryV1Schema.safeParse(input.telemetry);
  const projectionResult = ProjectedLocationV1Schema.safeParse(input.projection);
  if (!telemetryResult.success || !projectionResult.success) {
    return { status: "rejected", state, reason: "invalid-contract" };
  }

  const telemetry = telemetryResult.data;
  const projection = projectionResult.data;

  if (state.seenEventIds.includes(telemetry.eventId)) return { status: "duplicate", state };

  if (
    projection.sourceTelemetryEventId !== telemetry.eventId ||
    projection.tripId !== telemetry.tripId ||
    projection.memberId !== telemetry.memberId
  ) {
    return { status: "rejected", state, reason: "projection-mismatch" };
  }

  if (projection.matchConfidence === "unmatchable") return { status: "rejected", state, reason: "unmatchable" };

  if (telemetry.networkQuality === "offline-replay") {
    return {
      status: "history-only",
      state: {
        ...state,
        seenEventIds: [...state.seenEventIds, telemetry.eventId],
        historyEventIds: [...state.historyEventIds, telemetry.eventId],
      },
    };
  }

  const previousSequence = state.latestSequenceByMember[telemetry.memberId];
  if (previousSequence !== undefined && telemetry.sequence <= previousSequence) return { status: "stale-sequence", state };

  const observationAgeSeconds = ageSeconds(telemetry.observedAt, receivedAt);
  const node: VehicleNode = {
    tripId: telemetry.tripId,
    memberId: telemetry.memberId,
    role: projection.role,
    routeProgressMeters: projection.routeProgressMeters,
    routeDeviationMeters: projection.routeDeviationMeters,
    speedKmh: telemetry.speedKmh,
    headingDegrees: telemetry.headingDegrees,
    accuracyMeters: telemetry.accuracyMeters,
    observedAt: telemetry.observedAt,
    confidence: classifyConfidence(telemetry.accuracyMeters, observationAgeSeconds, projection.matchConfidence),
    connectivity: classifyConnectivity(observationAgeSeconds, telemetry.networkQuality),
  };

  return {
    status: "accepted",
    node,
    state: {
      ...state,
      seenEventIds: [...state.seenEventIds, telemetry.eventId],
      latestSequenceByMember: { ...state.latestSequenceByMember, [telemetry.memberId]: telemetry.sequence },
      currentNodes: { ...state.currentNodes, [telemetry.memberId]: node },
    },
  };
}
