import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { CONVOY_POLICY_V1, buildComponents, calculateGraph, type ConvoyEdge, type VehicleNode } from "../src/index";

function node(memberId: string, routeProgressMeters: number): VehicleNode {
  return {
    tripId: "TRIP001", memberId, role: memberId === "M0" ? "leader" : "member", routeProgressMeters,
    routeDeviationMeters: 0, speedKmh: 50, headingDegrees: 90, accuracyMeters: 5,
    observedAt: "2026-07-20T00:00:00.000Z", confidence: "high", connectivity: "healthy",
  };
}

describe("convoy graph properties", () => {
  it("is invariant to input node order", () => {
    fc.assert(fc.property(fc.shuffledSubarray([0, 1, 2, 3, 4], { minLength: 5, maxLength: 5 }), (order) => {
      const nodes = order.map((value) => node(`M${value}`, 1_000 - value * 100));
      const graph = calculateGraph(undefined, nodes, "2026-07-20T00:00:00.000Z", CONVOY_POLICY_V1).graph;
      expect(graph.orderedMemberIds).toEqual(["M0", "M1", "M2", "M3", "M4"]);
    }));
  });

  it("adding a healthy internal edge cannot increase component count", () => {
    fc.assert(fc.property(fc.integer({ min: 2, max: 8 }), (size) => {
      const nodes = Array.from({ length: size }, (_, index) => node(`M${index}`, 1_000 - index * 100));
      const edges: ConvoyEdge[] = nodes.slice(0, -1).map((current, index) => ({
        aheadMemberId: current.memberId, behindMemberId: nodes[index + 1]!.memberId, routeGapMeters: 100,
        etaGapSeconds: null, combinedUncertaintyMeters: 5, confidentLowerGapMeters: 95,
        state: index % 2 === 0 ? "broken" : "healthy", stateSince: "2026-07-20T00:00:00.000Z", policyVersion: "convoy-v1",
      }));
      const before = buildComponents(nodes, edges).length;
      const brokenIndex = edges.findIndex((edge) => edge.state === "broken");
      edges[brokenIndex] = { ...edges[brokenIndex]!, state: "healthy" };
      expect(buildComponents(nodes, edges).length).toBeLessThanOrEqual(before);
    }));
  });
});
