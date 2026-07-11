import { describe, expect, it } from "vitest";

import {
  CONVOY_POLICY_V1,
  calculateGraph,
  markSituationNotified,
  reduceSplitSituation,
  type GraphEngineState,
  type VehicleNode,
} from "../src/index";

function at(seconds: number): string {
  return new Date(Date.parse("2026-07-20T00:00:00.000Z") + seconds * 1_000).toISOString();
}

function nodes(gapMeters = 900): VehicleNode[] {
  return [
    ["M001", 2_000, "leader"], ["M002", 1_900, "member"], ["M003", 1_800, "member"],
    ["M004", 1_800 - gapMeters, "member"], ["M005", 1_700 - gapMeters, "member"],
  ].map(([memberId, progress, role]) => ({
    tripId: "TRIP001", memberId: memberId as string, role: role as "leader" | "member",
    routeProgressMeters: progress as number, routeDeviationMeters: 0, speedKmh: 70,
    headingDegrees: 90, accuracyMeters: 5, observedAt: at(0), confidence: "high", connectivity: "healthy",
  }));
}

function graphAt(previous: GraphEngineState | undefined, seconds: number, gapMeters = 900) {
  return calculateGraph(previous, nodes(gapMeters), at(seconds), CONVOY_POLICY_V1);
}

describe("split situation lifecycle", () => {
  it("does not create a situation before an edge is broken", () => {
    const graph = graphAt(undefined, 0).graph;
    expect(reduceSplitSituation(undefined, graph, ["event-1"])).toEqual({ transition: "none" });
  });

  it("confirms one stable situation at the broken component boundary", () => {
    const initial = graphAt(undefined, 0);
    const stretched = graphAt(initial.state, 15);
    const broken = graphAt(stretched.state, 30);
    const result = reduceSplitSituation(undefined, broken.graph, ["event-30"]);

    expect(result.transition).toBe("confirmed");
    expect(result.situation).toMatchObject({
      situationId: "split:TRIP001:M003:M004",
      lifecycle: "confirmed",
      affectedComponentIds: ["component:M001+M002+M003", "component:M004+M005"],
      evidence: {
        frontBoundaryMemberId: "M003",
        rearBoundaryMemberId: "M004",
        routeGapMeters: 900,
        graphRevision: broken.graph.graphRevision,
        sourceEventIds: ["event-30"],
      },
    });
  });

  it("updates evidence without changing identity", () => {
    const initial = graphAt(undefined, 0);
    const stretched = graphAt(initial.state, 15);
    const broken = graphAt(stretched.state, 30);
    const confirmed = reduceSplitSituation(undefined, broken.graph, ["event-30"]);
    if (!confirmed.situation) throw new Error("expected situation");
    const laterGraph = graphAt(broken.state, 40, 1_000);
    const updated = reduceSplitSituation(confirmed.situation, laterGraph.graph, ["event-40"]);

    expect(updated.transition).toBe("updated");
    expect(updated.situation?.situationId).toBe(confirmed.situation.situationId);
    expect(updated.situation?.evidence.routeGapMeters).toBe(1_000);
    expect(updated.situation?.evidence.sourceEventIds).toEqual(["event-30", "event-40"]);
  });

  it("marks notification exactly once", () => {
    const initial = graphAt(undefined, 0);
    const stretched = graphAt(initial.state, 15);
    const broken = graphAt(stretched.state, 30);
    const confirmed = reduceSplitSituation(undefined, broken.graph, ["event-30"]);
    if (!confirmed.situation) throw new Error("expected situation");

    const notified = markSituationNotified(confirmed.situation, at(31));
    const duplicate = markSituationNotified(notified.situation, at(32));

    expect(notified.transition).toBe("notified");
    expect(notified.situation.lifecycle).toBe("notified");
    expect(duplicate.transition).toBe("none");
    expect(duplicate.situation).toBe(notified.situation);
  });

  it("resolves only after the graph is stably together", () => {
    const initial = graphAt(undefined, 0);
    const stretched = graphAt(initial.state, 15);
    const broken = graphAt(stretched.state, 30);
    const confirmed = reduceSplitSituation(undefined, broken.graph, ["event-30"]);
    if (!confirmed.situation) throw new Error("expected situation");
    const notified = markSituationNotified(confirmed.situation, at(31)).situation;
    const recovering = graphAt(broken.state, 35, 300);
    const stillOpen = reduceSplitSituation(notified, recovering.graph, ["event-35"]);
    const healthy = graphAt(recovering.state, 65, 300);
    const resolved = reduceSplitSituation(stillOpen.situation, healthy.graph, ["event-65"]);

    expect(stillOpen.transition).toBe("updated");
    expect(stillOpen.situation?.lifecycle).toBe("notified");
    expect(resolved.transition).toBe("resolved");
    expect(resolved.situation).toMatchObject({ lifecycle: "resolved", resolvedAt: at(65) });
  });
});
