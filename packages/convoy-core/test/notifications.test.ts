import { describe, expect, it } from "vitest";

import { createResolutionNotifications, createSplitNotifications, type ConvoyGraph, type Situation } from "../src/index";

const calculatedAt = "2026-07-20T00:00:30.000Z";

const graph: ConvoyGraph = {
  tripId: "TRIP001",
  leaderMemberId: "M001",
  graphRevision: 3,
  calculatedAt,
  overallState: "split",
  orderedMemberIds: ["M001", "M002", "M003", "M004", "M005"],
  edges: [
    { aheadMemberId: "M001", behindMemberId: "M002", routeGapMeters: 100, etaGapSeconds: 5, combinedUncertaintyMeters: 7, confidentLowerGapMeters: 93, state: "healthy", stateSince: calculatedAt, policyVersion: "convoy-v1" },
    { aheadMemberId: "M002", behindMemberId: "M003", routeGapMeters: 100, etaGapSeconds: 5, combinedUncertaintyMeters: 7, confidentLowerGapMeters: 93, state: "healthy", stateSince: calculatedAt, policyVersion: "convoy-v1" },
    { aheadMemberId: "M003", behindMemberId: "M004", routeGapMeters: 1_300, etaGapSeconds: 67, combinedUncertaintyMeters: 7, confidentLowerGapMeters: 1_293, state: "broken", stateSince: calculatedAt, policyVersion: "convoy-v1" },
    { aheadMemberId: "M004", behindMemberId: "M005", routeGapMeters: 100, etaGapSeconds: 5, combinedUncertaintyMeters: 7, confidentLowerGapMeters: 93, state: "healthy", stateSince: calculatedAt, policyVersion: "convoy-v1" },
  ],
  components: [
    { componentId: "front", memberIds: ["M001", "M002", "M003"], frontBoundaryMemberId: "M001", rearBoundaryMemberId: "M003", containsLeader: true, averageSpeedKmh: 70 },
    { componentId: "rear", memberIds: ["M004", "M005"], frontBoundaryMemberId: "M004", rearBoundaryMemberId: "M005", containsLeader: false, averageSpeedKmh: 68 },
  ],
  policyVersion: "convoy-v1",
};

const situation: Situation = {
  situationId: "split:TRIP001:M003:M004",
  tripId: "TRIP001",
  type: "convoy-split",
  lifecycle: "confirmed",
  severity: "high",
  affectedComponentIds: ["front", "rear"],
  evidence: {
    frontBoundaryMemberId: "M003",
    rearBoundaryMemberId: "M004",
    routeGapMeters: 1_300,
    etaGapSeconds: 67,
    durationSeconds: 0,
    locationConfidence: "high",
    graphRevision: 3,
    sourceEventIds: ["event-30"],
  },
  policyVersion: "convoy-v1",
  confirmedAt: calculatedAt,
  updatedAt: calculatedAt,
};

describe("createSplitNotifications", () => {
  const locales = { M001: "en", M002: "en", M003: "en", M004: "vi", M005: "en" } as const;

  it("selects one role-specific message per member", () => {
    const notifications = createSplitNotifications(situation, graph, locales);
    expect(Object.fromEntries(notifications.map((item) => [item.recipientMemberId, item.audience]))).toEqual({
      M001: "leader",
      M002: "front-section",
      M003: "front-boundary",
      M004: "rear-boundary",
      M005: "rear-section",
    });
  });

  it("includes the measured route gap and supports Vietnamese", () => {
    const notifications = createSplitNotifications(situation, graph, locales);
    expect(notifications.every((item) => item.message.includes("1.3 km"))).toBe(true);
    expect(notifications.find((item) => item.recipientMemberId === "M004")).toMatchObject({ locale: "vi" });
    expect(notifications.find((item) => item.recipientMemberId === "M004")?.message).toContain("đoạn phía trước");
  });

  it("never emits unsafe catch-up language", () => {
    const messages = createSplitNotifications(situation, graph, locales).map((item) => item.message).join(" ");
    expect(messages).not.toMatch(/speed up|hurry|brake suddenly|tăng tốc|phanh gấp/i);
  });

  it("produces stable dedupe keys for retries", () => {
    const first = createSplitNotifications(situation, graph, locales);
    const retry = createSplitNotifications(situation, graph, locales);
    expect(retry.map((item) => item.dedupeKey)).toEqual(first.map((item) => item.dedupeKey));
    expect(new Set(first.map((item) => item.dedupeKey)).size).toBe(5);
  });

  it("expires split alerts after five minutes", () => {
    const notification = createSplitNotifications(situation, graph, locales)[0]!;
    expect(notification.expiresAt).toBe("2026-07-20T00:05:30.000Z");
  });
});

describe("createResolutionNotifications", () => {
  it("notifies every currently ordered member that the convoy reconnected", () => {
    const togetherGraph = { ...graph, overallState: "together" as const, calculatedAt: "2026-07-20T00:01:30.000Z" };
    const resolved = { ...situation, lifecycle: "resolved" as const, updatedAt: togetherGraph.calculatedAt, resolvedAt: togetherGraph.calculatedAt };
    const notifications = createResolutionNotifications(resolved, togetherGraph, { M004: "vi" });

    expect(notifications).toHaveLength(5);
    expect(notifications.every((item) => item.audience === "resolution" && item.severity === "info")).toBe(true);
    expect(notifications.find((item) => item.recipientMemberId === "M004")?.message).toContain("đã kết nối lại");
  });
});
