import { GOLDEN_R001, createGoldenR001Replay } from "@loopin/demo-scenarios";
import type {
  IngestionStatus,
  NotificationRequest,
  RegroupRanking,
  Situation,
  TripSummaryV1,
} from "@loopin/convoy-core";

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
  const frames = createGoldenR001Replay();
  const split = frames.find((frame) => frame.phase === "split");
  const completed = frames.at(-1);
  if (!split?.regroupRanking || !completed?.summary) {
    throw new Error("golden-replay-incomplete");
  }

  const ingestionStatusCounts: Record<IngestionStatus, number> = {
    accepted: 0,
    duplicate: 0,
    "stale-sequence": 0,
    "history-only": 0,
    rejected: 0,
  };
  for (const frame of frames) {
    for (const [status, count] of Object.entries(frame.ingestionStatusDelta)) {
      ingestionStatusCounts[status as IngestionStatus] += count ?? 0;
    }
  }

  return {
    fixtureSource: GOLDEN_R001.provenance,
    steps: frames.map((frame) => ({
      at: frame.occurredAt,
      overallState: frame.graph.overallState,
      components: frame.graph.components.map((component) => component.memberIds),
      graphRevision: frame.graph.graphRevision,
    })),
    ingestionStatusCounts,
    splitSituation: split.situation,
    finalSituation: completed.situation,
    splitNotifications: split.notifications,
    resolutionNotifications: completed.notifications,
    regroupRanking: split.regroupRanking,
    selectedCandidateId: split.regroupRanking.selectedCandidate?.poiId ?? null,
    summary: completed.summary,
  };
}
