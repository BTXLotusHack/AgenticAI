import { describe, expect, it } from "vitest";

import { summarizeTrip, type Situation } from "../src/index";

const resolvedSplit: Situation = {
  situationId: "split:TRIP001:M003:M004", tripId: "TRIP001", type: "convoy-split", lifecycle: "resolved",
  severity: "medium", affectedComponentIds: ["front", "rear"],
  evidence: { frontBoundaryMemberId: "M003", rearBoundaryMemberId: "M004", routeGapMeters: 900,
    durationSeconds: 40, locationConfidence: "high", graphRevision: 8, sourceEventIds: ["event-1"] },
  policyVersion: "convoy-v1", confirmedAt: "2026-07-20T00:00:30.000Z",
  updatedAt: "2026-07-20T00:01:10.000Z", notifiedAt: "2026-07-20T00:00:31.000Z",
  resolvedAt: "2026-07-20T00:01:10.000Z",
};

describe("summarizeTrip", () => {
  it("separates measured facts from deterministic narrative", () => {
    const summary = summarizeTrip({
      tripId: "TRIP001",
      startedAt: "2026-07-20T00:00:00.000Z",
      completedAt: "2026-07-20T00:01:15.000Z",
      situations: [resolvedSplit],
      regroupRecommendationCount: 1,
      notificationRequestCount: 9,
      rejectedTelemetryCount: 2,
    });

    expect(summary).toMatchObject({
      schemaVersion: 1,
      tripId: "TRIP001",
      measuredFacts: {
        durationSeconds: 75,
        confirmedSplitCount: 1,
        resolvedSplitCount: 1,
        regroupRecommendationCount: 1,
        notificationRequestCount: 9,
        rejectedTelemetryCount: 2,
        maximumConfirmedRouteGapMeters: 900,
      },
      narrative: { source: "deterministic-template" },
    });
    expect(summary.narrative.text).toContain("1 confirmed convoy split");
  });
});
