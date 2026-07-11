import type { Situation, TripSummaryV1 } from "./contracts";

export type TripSummaryInput = {
  tripId: string;
  startedAt: string;
  completedAt: string;
  situations: readonly Situation[];
  regroupRecommendationCount: number;
  notificationRequestCount: number;
  rejectedTelemetryCount: number;
};

export function summarizeTrip(input: TripSummaryInput): TripSummaryV1 {
  const splitSituations = input.situations.filter((situation) => situation.type === "convoy-split");
  const resolvedSplitCount = splitSituations.filter((situation) => situation.lifecycle === "resolved").length;
  const maximumConfirmedRouteGapMeters = splitSituations.reduce(
    (maximum, situation) => Math.max(
      maximum,
      situation.evidence.maximumRouteGapMeters ?? situation.evidence.routeGapMeters ?? 0,
    ),
    0,
  );
  const durationSeconds = Math.max(0, (Date.parse(input.completedAt) - Date.parse(input.startedAt)) / 1_000);
  const splitLabel = splitSituations.length === 1 ? "split" : "splits";
  const regroupLabel = input.regroupRecommendationCount === 1 ? "recommendation" : "recommendations";

  return {
    schemaVersion: 1,
    tripId: input.tripId,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    measuredFacts: {
      durationSeconds,
      confirmedSplitCount: splitSituations.length,
      resolvedSplitCount,
      regroupRecommendationCount: input.regroupRecommendationCount,
      notificationRequestCount: input.notificationRequestCount,
      rejectedTelemetryCount: input.rejectedTelemetryCount,
      maximumConfirmedRouteGapMeters,
    },
    narrative: {
      source: "deterministic-template",
      text: `Trip completed with ${splitSituations.length} confirmed convoy ${splitLabel}, ${resolvedSplitCount} resolved, and ${input.regroupRecommendationCount} regroup ${regroupLabel}.`,
    },
  };
}
