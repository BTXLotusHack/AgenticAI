import { describe, expect, it } from "vitest";

import { runGoldenScenario } from "../src/run-golden-scenario";

describe("R001 golden convoy journey", () => {
  it("runs split, safe regroup, reconnection, and summary end to end", () => {
    const result = runGoldenScenario();
    const splitStep = result.steps.find((step) => step.overallState === "split");

    expect(result.splitSituation?.situationId).toBe("split:TRIP001:M003:M004");
    expect(splitStep?.components).toEqual([["M001", "M002", "M003"], ["M004"]]);
    expect(result.splitSituation?.evidence).toMatchObject({
      frontBoundaryMemberId: "M003",
      rearBoundaryMemberId: "M004",
      routeGapMeters: 900,
    });
    expect(new Set(result.splitNotifications.map((item) => item.dedupeKey)).size).toBe(4);
    expect(result.regroupRanking.selectedCandidate?.poiId).toBe("POI001");
    expect(result.regroupRanking.excludedCandidates.find((item) => item.poiId === "POI002")?.reasonCodes).toContain("unsafe-stop");
    expect(result.finalSituation?.lifecycle).toBe("resolved");
    expect(result.steps.at(-1)?.overallState).toBe("together");
    expect(result.resolutionNotifications).toHaveLength(4);
    expect(result.summary.measuredFacts).toMatchObject({
      confirmedSplitCount: 1,
      resolvedSplitCount: 1,
      regroupRecommendationCount: 1,
      maximumConfirmedRouteGapMeters: 900,
    });
  });

  it("records duplicate, stale, replay, and low-confidence inputs without duplicate incidents", () => {
    const result = runGoldenScenario();
    expect(result.ingestionStatusCounts).toMatchObject({ duplicate: 1, "stale-sequence": 1, "history-only": 1 });
    expect(result.steps.some((step) => step.overallState === "degraded")).toBe(true);
    expect(result.summary.measuredFacts.confirmedSplitCount).toBe(1);
  });
});
