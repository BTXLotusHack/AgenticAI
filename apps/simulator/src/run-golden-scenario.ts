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
  type GraphEngineState,
  type IngestionStatus,
  type LocationTelemetryV1,
  type NotificationRequest,
  type ProjectedLocationV1,
  type RegroupRanking,
  type Situation,
  type TelemetryState,
  type TripSummaryV1,
} from "@loopin/convoy-core";

import { GOLDEN_R001 } from "./golden-r001.fixture";

const startAt = "2026-07-20T00:00:00.000Z";

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

function pair(memberIndex: number, tick: number, overrides: Partial<LocationTelemetryV1> = {}) {
  const member = GOLDEN_R001.members[memberIndex]!;
  const eventId = `gps:${tick}:${member.memberId}`;
  const telemetry: LocationTelemetryV1 = {
    schemaVersion: 1,
    eventId,
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

export type GoldenScenarioResult = {
  fixtureSource: typeof GOLDEN_R001.provenance;
  steps: Array<{ at: string; overallState: string; components: string[][]; graphRevision: number }>;
  ingestionStatusCounts: Record<IngestionStatus, number>;
  splitSituation: Situation | undefined;
  finalSituation: Situation | undefined;
  splitNotifications: NotificationRequest[];
  resolutionNotifications: NotificationRequest[];
  regroupRanking: RegroupRanking;
  selectedCandidateId: string | null;
  summary: TripSummaryV1;
};

export function runGoldenScenario(): GoldenScenarioResult {
  let telemetryState: TelemetryState = createTelemetryState();
  let graphState: GraphEngineState | undefined;
  let activeSituation: Situation | undefined;
  let splitSituation: Situation | undefined;
  let splitNotifications: NotificationRequest[] = [];
  let resolutionNotifications: NotificationRequest[] = [];
  let regroupRanking = rankRegroupCandidates([], { requiresParking: true }, CONVOY_POLICY_V1);
  const statusCounts: Record<IngestionStatus, number> = {
    accepted: 0, duplicate: 0, "stale-sequence": 0, "history-only": 0, rejected: 0,
  };
  const steps: GoldenScenarioResult["steps"] = [];
  const localeByMember = Object.fromEntries(GOLDEN_R001.members.map((member) => [member.memberId, member.locale]));

  const ingest = (input: ReturnType<typeof pair>, receivedAt: string) => {
    const result = acceptProjectedLocation(telemetryState, input, receivedAt);
    statusCounts[result.status] += 1;
    telemetryState = result.state;
    return result;
  };

  const calculate = (seconds: number, sourceEventIds: string[]) => {
    const result = calculateGraph(graphState, Object.values(telemetryState.currentNodes), at(seconds), CONVOY_POLICY_V1);
    graphState = result.state;
    steps.push({
      at: at(seconds),
      overallState: result.graph.overallState,
      components: result.graph.components.map((component) => component.memberIds),
      graphRevision: result.graph.graphRevision,
    });
    const transition = reduceSplitSituation(activeSituation, result.graph, sourceEventIds);
    if (transition.situation) activeSituation = transition.situation;
    if (transition.transition === "confirmed" && transition.situation) {
      splitSituation = transition.situation;
      splitNotifications = createSplitNotifications(transition.situation, result.graph, localeByMember);
      activeSituation = markSituationNotified(transition.situation, at(seconds + 1)).situation;
      regroupRanking = rankRegroupCandidates(GOLDEN_R001.candidates, { requiresParking: true }, CONVOY_POLICY_V1);
    }
    if (transition.transition === "resolved" && transition.situation) {
      resolutionNotifications = createResolutionNotifications(transition.situation, result.graph, localeByMember);
    }
  };

  for (const tick of GOLDEN_R001.ticks) {
    const eventIds: string[] = [];
    GOLDEN_R001.members.forEach((_member, index) => {
      const input = pair(index, tick);
      eventIds.push(input.telemetry.eventId);
      ingest(input, at(tick + 1));
    });
    calculate(tick, eventIds);

    if (tick === 0) {
      ingest(pair(0, 0), at(1));
      const stale = pair(1, 0, { eventId: "gps:stale:M002", sequence: 2 });
      stale.projection.eventId = "projection:gps:stale:M002";
      stale.projection.sourceTelemetryEventId = stale.telemetry.eventId;
      ingest(stale, at(1));
      const replay = pair(2, 0, { eventId: "gps:replay:M003", sequence: 999, networkQuality: "offline-replay" });
      replay.projection.eventId = "projection:gps:replay:M003";
      replay.projection.sourceTelemetryEventId = replay.telemetry.eventId;
      ingest(replay, at(2));
      const weak = pair(3, 1, { eventId: "gps:weak:M004", sequence: 20, observedAt: at(1), accuracyMeters: 100 });
      weak.projection.eventId = "projection:gps:weak:M004";
      weak.projection.sourceTelemetryEventId = weak.telemetry.eventId;
      ingest(weak, at(2));
      calculate(1, [weak.telemetry.eventId]);
    }
  }

  const completedAt = at(75);
  const summary = summarizeTrip({
    tripId: GOLDEN_R001.trip.tripId,
    startedAt: startAt,
    completedAt,
    situations: activeSituation ? [activeSituation] : [],
    regroupRecommendationCount: regroupRanking.selectedCandidate ? 1 : 0,
    notificationRequestCount: splitNotifications.length + resolutionNotifications.length,
    rejectedTelemetryCount: statusCounts.duplicate + statusCounts["stale-sequence"] + statusCounts.rejected,
  });

  return {
    fixtureSource: GOLDEN_R001.provenance,
    steps,
    ingestionStatusCounts: statusCounts,
    splitSituation,
    finalSituation: activeSituation,
    splitNotifications,
    resolutionNotifications,
    regroupRanking,
    selectedCandidateId: regroupRanking.selectedCandidate?.poiId ?? null,
    summary,
  };
}
