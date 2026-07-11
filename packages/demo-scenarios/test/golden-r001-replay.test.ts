import { describe, expect, it } from "vitest";

import { createGoldenR001Replay } from "../src/index";

describe("createGoldenR001Replay", () => {
  it("preserves the complete authoritative convoy journey", () => {
    const frames = createGoldenR001Replay();
    const phases = new Set(frames.map((frame) => frame.phase));
    const split = frames.find((frame) => frame.phase === "split");
    const completed = frames.at(-1);

    expect(phases).toEqual(
      new Set(["together", "degraded", "stretched", "split", "recovering", "completed"]),
    );
    expect(split?.graph.components.map((component) => component.memberIds)).toEqual([
      ["M001", "M002", "M003"],
      ["M004"],
    ]);
    expect(split?.situation?.situationId).toBe("split:TRIP001:M003:M004");
    expect(split?.situation?.evidence).toMatchObject({
      frontBoundaryMemberId: "M003",
      rearBoundaryMemberId: "M004",
      routeGapMeters: 900,
    });
    expect(split?.notifications).toHaveLength(4);
    expect(split?.regroupRanking?.selectedCandidate?.poiId).toBe("POI001");
    expect(
      split?.regroupRanking?.excludedCandidates.find((candidate) => candidate.poiId === "POI002")?.reasonCodes,
    ).toContain("unsafe-stop");
    expect(completed?.graph.overallState).toBe("together");
    expect(completed?.situation).toMatchObject({ lifecycle: "resolved" });
    expect(completed?.summary?.measuredFacts).toMatchObject({
      confirmedSplitCount: 1,
      resolvedSplitCount: 1,
      maximumConfirmedRouteGapMeters: 900,
    });
  });

  it("keeps telemetry failure modes visible without duplicate incidents", () => {
    const frames = createGoldenR001Replay();
    const degraded = frames.find((frame) => frame.phase === "degraded");
    const aggregate = frames.reduce<Record<string, number>>((counts, frame) => {
      for (const [status, count] of Object.entries(frame.ingestionStatusDelta)) {
        counts[status] = (counts[status] ?? 0) + (count ?? 0);
      }
      return counts;
    }, {});

    expect(degraded?.graph.overallState).toBe("degraded");
    expect(degraded?.situation).toBeUndefined();
    expect(aggregate).toMatchObject({ duplicate: 1, "stale-sequence": 1, "history-only": 1 });
    expect(frames.filter((frame) => frame.situationTransition === "confirmed")).toHaveLength(1);
  });

  it("returns fresh immutable frame graphs on each invocation", () => {
    const first = createGoldenR001Replay();
    const second = createGoldenR001Replay();

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second[0]?.graph).not.toBe(first[0]?.graph);
  });
});
