import { describe, expect, it } from "vitest";

import { CONVOY_POLICY_V1, calculateGraph, type GraphEngineState, type VehicleNode } from "../src/index";

function at(seconds: number): string {
  return new Date(Date.parse("2026-07-20T00:00:00.000Z") + seconds * 1_000).toISOString();
}

function node(memberId: string, routeProgressMeters: number, overrides: Partial<VehicleNode> = {}): VehicleNode {
  return {
    tripId: "TRIP001",
    memberId,
    role: memberId === "M001" ? "leader" : "member",
    routeProgressMeters,
    routeDeviationMeters: 0,
    speedKmh: 70,
    headingDegrees: 90,
    accuracyMeters: 5,
    observedAt: at(0),
    confidence: "high",
    connectivity: "healthy",
    ...overrides,
  };
}

const splitNodes = () => [node("M001", 2_000), node("M002", 1_900), node("M003", 1_800), node("M004", 900), node("M005", 800)];

function calculateAt(previous: GraphEngineState | undefined, nodes: VehicleNode[], seconds: number) {
  return calculateGraph(previous, nodes, at(seconds), CONVOY_POLICY_V1);
}

describe("calculateGraph", () => {
  it("calculates adjacent route gaps only", () => {
    const result = calculateAt(undefined, [node("M003", 800), node("M001", 1_000), node("M002", 900)], 0);
    expect(result.graph.orderedMemberIds).toEqual(["M001", "M002", "M003"]);
    expect(result.graph.edges.map((edge) => [edge.aheadMemberId, edge.behindMemberId, edge.routeGapMeters])).toEqual([
      ["M001", "M002", 100],
      ["M002", "M003", 100],
    ]);
  });

  it("uses root-sum-square accuracy as combined uncertainty", () => {
    const result = calculateAt(undefined, [node("M001", 1_000, { accuracyMeters: 3 }), node("M002", 900, { accuracyMeters: 4 })], 0);
    expect(result.graph.edges[0]).toMatchObject({ combinedUncertaintyMeters: 5, confidentLowerGapMeters: 95 });
  });

  it("stretches after 15 seconds and breaks after 30 seconds", () => {
    const initial = calculateAt(undefined, splitNodes(), 0);
    const stretched = calculateAt(initial.state, splitNodes(), 15);
    const broken = calculateAt(stretched.state, splitNodes(), 30);

    expect(initial.graph.edges[2]?.state).toBe("healthy");
    expect(stretched.graph.edges[2]?.state).toBe("stretched");
    expect(broken.graph.edges[2]?.state).toBe("broken");
    expect(broken.graph.overallState).toBe("split");
    expect(broken.graph.components.map((component) => component.memberIds)).toEqual([
      ["M001", "M002", "M003"],
      ["M004", "M005"],
    ]);
    expect(broken.graph.components[0]).toMatchObject({ frontBoundaryMemberId: "M001", rearBoundaryMemberId: "M003" });
    expect(broken.graph.components[1]).toMatchObject({ frontBoundaryMemberId: "M004", rearBoundaryMemberId: "M005" });
  });

  it("does not break when uncertainty overlaps the broken threshold", () => {
    const nodes = [node("M001", 1_000, { accuracyMeters: 50 }), node("M002", 400, { accuracyMeters: 50 })];
    const initial = calculateAt(undefined, nodes, 0);
    const later = calculateAt(initial.state, nodes, 30);
    expect(later.graph.edges[0]?.state).not.toBe("broken");
  });

  it("does not let low-confidence evidence break a healthy edge", () => {
    const healthy = calculateAt(undefined, [node("M001", 1_000), node("M002", 900)], 0);
    const unreliable = [node("M001", 1_000), node("M002", 100, { confidence: "low" })];
    const later = calculateAt(healthy.state, unreliable, 60);
    expect(later.graph.edges[0]?.state).toBe("healthy");
    expect(later.graph.overallState).toBe("degraded");
  });

  it("resets pending break persistence when confidence is interrupted", () => {
    const initial = calculateAt(undefined, splitNodes(), 0);
    const lowConfidence = splitNodes().map((item) => item.memberId === "M004" ? { ...item, confidence: "low" as const } : item);
    const interrupted = calculateAt(initial.state, lowConfidence, 15);
    const resumed = calculateAt(interrupted.state, splitNodes(), 30);
    const finallyBroken = calculateAt(resumed.state, splitNodes(), 60);

    expect(resumed.graph.edges[2]?.state).not.toBe("broken");
    expect(finallyBroken.graph.edges[2]?.state).toBe("broken");
  });

  it("recovers a broken edge only after the reconnect window", () => {
    const initial = calculateAt(undefined, splitNodes(), 0);
    const stretched = calculateAt(initial.state, splitNodes(), 15);
    const broken = calculateAt(stretched.state, splitNodes(), 30);
    const rejoined = [node("M001", 2_000), node("M002", 1_900), node("M003", 1_800), node("M004", 1_500), node("M005", 1_400)];
    const recovering = calculateAt(broken.state, rejoined, 35);
    const healthy = calculateAt(recovering.state, rejoined, 65);

    expect(recovering.graph.edges[2]?.state).toBe("recovering");
    expect(recovering.graph.components).toHaveLength(1);
    expect(healthy.graph.edges[2]?.state).toBe("healthy");
    expect(healthy.graph.overallState).toBe("together");
  });

  it("does not increment graph revision for an identical calculation", () => {
    const first = calculateAt(undefined, [node("M001", 1_000), node("M002", 900)], 0);
    const duplicate = calculateAt(first.state, [node("M001", 1_000), node("M002", 900)], 0);
    expect(duplicate.changed).toBe(false);
    expect(duplicate.graph.graphRevision).toBe(first.graph.graphRevision);
  });
});
