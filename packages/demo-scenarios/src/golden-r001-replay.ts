import {
  CONVOY_POLICY_V1,
  acceptProjectedLocation,
  calculateGraph,
  createResolutionNotifications,
  createSplitNotifications,
  createTelemetryState,
  markSituationNotified,
  rankRegroupCandidates,
  reduceSplitSituation,
  summarizeTrip,
  type ConvoyGraph,
  type GraphEngineState,
  type IngestionStatus,
  type LocationTelemetryV1,
  type NotificationRequest,
  type ProjectedLocationV1,
  type RegroupRanking,
  type Situation,
  type SituationTransition,
  type TelemetryState,
  type TripSummaryV1,
  type VehicleNode,
} from "@loopin/convoy-core";

import { GOLDEN_R001 } from "./golden-r001.fixture";

const startAt = "2026-07-20T00:00:00.000Z";

export type GoldenReplayPhase = "together" | "degraded" | "stretched" | "split" | "recovering" | "completed";

export type GoldenReplayFrameV1 = {
  readonly schemaVersion: 1;
  readonly frameIndex: number;
  readonly occurredAt: string;
  readonly elapsedSeconds: number;
  readonly phase: GoldenReplayPhase;
  readonly graph: ConvoyGraph;
  readonly nodes: VehicleNode[];
  readonly ingestionStatusDelta: Partial<Record<IngestionStatus, number>>;
  readonly situationTransition: SituationTransition["transition"];
  readonly situation?: Situation;
  readonly notifications: NotificationRequest[];
  readonly regroupRanking?: RegroupRanking;
  readonly approvedCandidateId?: string;
  readonly summary?: TripSummaryV1;
};

function at(seconds: number): string {
  return new Date(Date.parse(startAt) + seconds * 1_000).toISOString();
}

function position(memberId: string, tick: number): number {
  const leader = 10_000 + tick * 20;
  if (memberId === "M001") return leader;
  if (memberId === "M002") return leader - 100;
  if (memberId === "M003") return leader - 200;
  if (tick < GOLDEN_R001.splitStartsAtSeconds) return leader - 300;
  if (tick < GOLDEN_R001.reconnectStartsAtSeconds) return leader - 1_100;
  return leader - 500;
}

export function createGoldenR001Input(memberIndex: number, tick: number, overrides: Partial<LocationTelemetryV1> = {}) {
  const member = GOLDEN_R001.members[memberIndex]!;
  const telemetry: LocationTelemetryV1 = {
    schemaVersion: 1,
    eventId: `gps:${tick}:${member.memberId}`,
    tripId: GOLDEN_R001.trip.tripId,
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
    matchConfidence: telemetry.accuracyMeters > 50 ? "low" : "high",
    projectedAt: at(tick + 1),
  };
  return { telemetry, projection };
}

export function createGoldenR001TelemetryInputs() {
  const inputs: Array<ReturnType<typeof createGoldenR001Input> & { receivedAt: string }> = [];
  for (const tick of GOLDEN_R001.ticks) {
    GOLDEN_R001.members.forEach((_member, memberIndex) => {
      inputs.push({ ...createGoldenR001Input(memberIndex, tick), receivedAt: at(tick + 1) });
    });
    if (tick === 0) {
      inputs.push({ ...createGoldenR001Input(0, 0), receivedAt: at(1) });
      inputs.push({ ...createGoldenR001Input(1, 0, { eventId: "gps:stale:M002", sequence: 2 }), receivedAt: at(1) });
      inputs.push({
        ...createGoldenR001Input(2, 0, { eventId: "gps:replay:M003", sequence: 999, networkQuality: "offline-replay" }),
        receivedAt: at(2),
      });
      inputs.push({
        ...createGoldenR001Input(3, 1, { eventId: "gps:weak:M004", sequence: 20, observedAt: at(1), accuracyMeters: 100 }),
        receivedAt: at(2),
      });
    }
  }
  return inputs;
}

function phaseFor(graph: ConvoyGraph, transition: SituationTransition["transition"], seconds: number): GoldenReplayPhase {
  if (transition === "resolved") return "completed";
  if (graph.overallState === "split") return "split";
  if (seconds >= GOLDEN_R001.reconnectStartsAtSeconds) return "recovering";
  return graph.overallState;
}

export function createGoldenR001Replay(): GoldenReplayFrameV1[] {
  let telemetryState: TelemetryState = createTelemetryState();
  let graphState: GraphEngineState | undefined;
  let activeSituation: Situation | undefined;
  let splitNotifications: NotificationRequest[] = [];
  let resolutionNotifications: NotificationRequest[] = [];
  let regroupRanking = rankRegroupCandidates([], { requiresParking: true }, CONVOY_POLICY_V1);
  let delta: Partial<Record<IngestionStatus, number>> = {};
  const totals: Record<IngestionStatus, number> = {
    accepted: 0,
    duplicate: 0,
    "stale-sequence": 0,
    "history-only": 0,
    rejected: 0,
  };
  const frames: GoldenReplayFrameV1[] = [];
  const localeByMember = Object.fromEntries(GOLDEN_R001.members.map((member) => [member.memberId, member.locale]));

  const ingest = (input: ReturnType<typeof createGoldenR001Input>, receivedAt: string) => {
    const result = acceptProjectedLocation(telemetryState, input, receivedAt);
    totals[result.status] += 1;
    delta[result.status] = (delta[result.status] ?? 0) + 1;
    telemetryState = result.state;
  };

  const calculate = (seconds: number, sourceEventIds: string[]) => {
    const result = calculateGraph(graphState, Object.values(telemetryState.currentNodes), at(seconds), CONVOY_POLICY_V1);
    graphState = result.state;
    const transition = reduceSplitSituation(activeSituation, result.graph, sourceEventIds);
    const frameSituation = transition.situation ?? activeSituation;
    let notifications: NotificationRequest[] = [];
    let frameRanking: RegroupRanking | undefined;

    if (transition.situation) activeSituation = transition.situation;
    if (transition.transition === "confirmed" && transition.situation) {
      splitNotifications = createSplitNotifications(transition.situation, result.graph, localeByMember);
      notifications = splitNotifications;
      regroupRanking = rankRegroupCandidates(GOLDEN_R001.candidates, { requiresParking: true }, CONVOY_POLICY_V1);
      frameRanking = regroupRanking;
      activeSituation = markSituationNotified(transition.situation, at(seconds + 1)).situation;
    }
    if (transition.transition === "resolved" && transition.situation) {
      resolutionNotifications = createResolutionNotifications(transition.situation, result.graph, localeByMember);
      notifications = resolutionNotifications;
    }

    const phase = phaseFor(result.graph, transition.transition, seconds);
    const summary = phase === "completed"
      ? summarizeTrip({
          tripId: GOLDEN_R001.trip.tripId,
          startedAt: startAt,
          completedAt: at(75),
          situations: activeSituation ? [activeSituation] : [],
          regroupRecommendationCount: regroupRanking.selectedCandidate ? 1 : 0,
          notificationRequestCount: splitNotifications.length + resolutionNotifications.length,
          rejectedTelemetryCount: totals.duplicate + totals["stale-sequence"] + totals.rejected,
        })
      : undefined;
    const approvedCandidateId = regroupRanking.selectedCandidate?.poiId;

    frames.push({
      schemaVersion: 1,
      frameIndex: frames.length,
      occurredAt: at(seconds),
      elapsedSeconds: seconds,
      phase,
      graph: result.graph,
      nodes: Object.values(telemetryState.currentNodes),
      ingestionStatusDelta: { ...delta },
      situationTransition: transition.transition,
      ...(frameSituation ? { situation: frameSituation } : {}),
      notifications,
      ...(frameRanking ? { regroupRanking: frameRanking } : {}),
      ...((phase === "recovering" || phase === "completed") && approvedCandidateId
        ? { approvedCandidateId }
        : {}),
      ...(summary ? { summary } : {}),
    });
    delta = {};
  };

  for (const tick of GOLDEN_R001.ticks) {
    const eventIds: string[] = [];
    GOLDEN_R001.members.forEach((_member, index) => {
      const input = createGoldenR001Input(index, tick);
      eventIds.push(input.telemetry.eventId);
      ingest(input, at(tick + 1));
    });
    calculate(tick, eventIds);

    if (tick === 0) {
      ingest(createGoldenR001Input(0, 0), at(1));
      const stale = createGoldenR001Input(1, 0, { eventId: "gps:stale:M002", sequence: 2 });
      stale.projection.eventId = "projection:gps:stale:M002";
      stale.projection.sourceTelemetryEventId = stale.telemetry.eventId;
      ingest(stale, at(1));
      const replay = createGoldenR001Input(2, 0, { eventId: "gps:replay:M003", sequence: 999, networkQuality: "offline-replay" });
      replay.projection.eventId = "projection:gps:replay:M003";
      replay.projection.sourceTelemetryEventId = replay.telemetry.eventId;
      ingest(replay, at(2));
      const weak = createGoldenR001Input(3, 1, { eventId: "gps:weak:M004", sequence: 20, observedAt: at(1), accuracyMeters: 100 });
      weak.projection.eventId = "projection:gps:weak:M004";
      weak.projection.sourceTelemetryEventId = weak.telemetry.eventId;
      ingest(weak, at(2));
      calculate(1, [weak.telemetry.eventId]);
    }
  }

  return frames;
}
