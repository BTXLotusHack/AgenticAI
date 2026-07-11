import { describe, expect, it } from "vitest";

import { updateStableOrder, type VehicleNode } from "../src/index";

function node(memberId: string, routeProgressMeters: number, overrides: Partial<VehicleNode> = {}): VehicleNode {
  return {
    tripId: "TRIP001",
    memberId,
    role: memberId === "leader" ? "leader" : "member",
    routeProgressMeters,
    routeDeviationMeters: 0,
    speedKmh: 70,
    headingDegrees: 90,
    accuracyMeters: 5,
    observedAt: "2026-07-20T00:00:00.000Z",
    confidence: "high",
    connectivity: "healthy",
    ...overrides,
  };
}

describe("updateStableOrder", () => {
  it("derives initial order from route progress instead of join order", () => {
    const state = updateStableOrder(undefined, [node("rear", 800), node("leader", 1_000), node("middle", 900)], "2026-07-20T00:00:00.000Z", 12);
    expect(state.orderedMemberIds).toEqual(["leader", "middle", "rear"]);
  });

  it("does not accept a one-frame overtake", () => {
    const initial = updateStableOrder(undefined, [node("leader", 1_000), node("car-2", 900), node("car-3", 800)], "2026-07-20T00:00:00.000Z", 12);
    const jitter = updateStableOrder(initial, [node("leader", 1_000), node("car-2", 890), node("car-3", 910)], "2026-07-20T00:00:05.000Z", 12);
    expect(jitter.orderedMemberIds).toEqual(["leader", "car-2", "car-3"]);
  });

  it("accepts an overtake that remains stable for the reorder window", () => {
    const initial = updateStableOrder(undefined, [node("leader", 1_000), node("car-2", 900), node("car-3", 800)], "2026-07-20T00:00:00.000Z", 12);
    const candidate = updateStableOrder(initial, [node("leader", 1_000), node("car-2", 890), node("car-3", 910)], "2026-07-20T00:00:05.000Z", 12);
    const accepted = updateStableOrder(candidate, [node("leader", 1_020), node("car-2", 900), node("car-3", 930)], "2026-07-20T00:00:17.000Z", 12);
    expect(accepted.orderedMemberIds).toEqual(["leader", "car-3", "car-2"]);
  });

  it("allows a member to remain ahead of the leader", () => {
    const state = updateStableOrder(undefined, [node("leader", 1_000), node("ahead", 1_100)], "2026-07-20T00:00:00.000Z", 12);
    expect(state.orderedMemberIds).toEqual(["ahead", "leader"]);
  });

  it("excludes lost members immediately", () => {
    const initial = updateStableOrder(undefined, [node("leader", 1_000), node("lost", 900), node("rear", 800)], "2026-07-20T00:00:00.000Z", 12);
    const next = updateStableOrder(initial, [node("leader", 1_010), node("lost", 905, { connectivity: "lost" }), node("rear", 810)], "2026-07-20T00:00:05.000Z", 12);
    expect(next.orderedMemberIds).toEqual(["leader", "rear"]);
  });
});
