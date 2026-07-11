import type { ConvoyEdge, ConvoyGraph, Situation, SituationEvidence } from "./contracts";

export type SituationTransition = {
  readonly transition: "none" | "confirmed" | "updated" | "notified" | "resolved";
  readonly situation?: Situation;
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function boundaryEdge(graph: ConvoyGraph, previous?: Situation): ConvoyEdge | undefined {
  const broken = graph.edges.find((edge) => edge.state === "broken");
  if (broken) return broken;
  if (!previous?.evidence.frontBoundaryMemberId || !previous.evidence.rearBoundaryMemberId) return undefined;
  return graph.edges.find(
    (edge) => edge.aheadMemberId === previous.evidence.frontBoundaryMemberId
      && edge.behindMemberId === previous.evidence.rearBoundaryMemberId,
  );
}

function affectedComponents(graph: ConvoyGraph, edge: ConvoyEdge): string[] {
  return graph.components
    .filter((component) => component.memberIds.includes(edge.aheadMemberId) || component.memberIds.includes(edge.behindMemberId))
    .map((component) => component.componentId);
}

function evidenceFor(
  graph: ConvoyGraph,
  edge: ConvoyEdge,
  sourceEventIds: readonly string[],
  confirmedAt: string,
  previousMaximumRouteGapMeters = 0,
): SituationEvidence {
  return {
    frontBoundaryMemberId: edge.aheadMemberId,
    rearBoundaryMemberId: edge.behindMemberId,
    routeGapMeters: edge.routeGapMeters,
    maximumRouteGapMeters: Math.max(previousMaximumRouteGapMeters, edge.routeGapMeters),
    ...(edge.etaGapSeconds === null ? {} : { etaGapSeconds: edge.etaGapSeconds }),
    durationSeconds: Math.max(0, (Date.parse(graph.calculatedAt) - Date.parse(confirmedAt)) / 1_000),
    locationConfidence: graph.overallState === "degraded" ? "low" : "high",
    graphRevision: graph.graphRevision,
    sourceEventIds: unique(sourceEventIds),
  };
}

export function reduceSplitSituation(
  previous: Situation | undefined,
  graph: ConvoyGraph,
  sourceEventIds: readonly string[],
): SituationTransition {
  if (!previous) {
    if (graph.overallState !== "split") return { transition: "none" };
    const edge = boundaryEdge(graph);
    if (!edge) return { transition: "none" };
    const confirmedAt = graph.calculatedAt;
    const situation: Situation = {
      situationId: `split:${graph.tripId}:${edge.aheadMemberId}:${edge.behindMemberId}`,
      tripId: graph.tripId,
      type: "convoy-split",
      lifecycle: "confirmed",
      severity: edge.routeGapMeters >= 1_000 ? "high" : "medium",
      affectedComponentIds: affectedComponents(graph, edge),
      evidence: evidenceFor(graph, edge, sourceEventIds, confirmedAt),
      policyVersion: graph.policyVersion,
      confirmedAt,
      updatedAt: graph.calculatedAt,
    };
    return { transition: "confirmed", situation };
  }

  if (previous.lifecycle === "resolved") return { transition: "none", situation: previous };
  const edge = boundaryEdge(graph, previous);
  const mergedSourceEventIds = unique([...previous.evidence.sourceEventIds, ...sourceEventIds]);

  if (graph.overallState === "together") {
    const situation: Situation = {
      ...previous,
      lifecycle: "resolved",
      updatedAt: graph.calculatedAt,
      resolvedAt: graph.calculatedAt,
      evidence: edge
        ? evidenceFor(graph, edge, mergedSourceEventIds, previous.confirmedAt, previous.evidence.maximumRouteGapMeters ?? previous.evidence.routeGapMeters)
        : { ...previous.evidence, graphRevision: graph.graphRevision, sourceEventIds: mergedSourceEventIds },
    };
    return { transition: "resolved", situation };
  }

  const situation: Situation = {
    ...previous,
    updatedAt: graph.calculatedAt,
    affectedComponentIds: edge ? affectedComponents(graph, edge) : previous.affectedComponentIds,
    evidence: edge
      ? evidenceFor(graph, edge, mergedSourceEventIds, previous.confirmedAt, previous.evidence.maximumRouteGapMeters ?? previous.evidence.routeGapMeters)
      : { ...previous.evidence, graphRevision: graph.graphRevision, sourceEventIds: mergedSourceEventIds },
  };
  return { transition: "updated", situation };
}

export function markSituationNotified(situation: Situation, notifiedAt: string): SituationTransition & { situation: Situation } {
  if (situation.lifecycle !== "confirmed") return { transition: "none", situation };
  return {
    transition: "notified",
    situation: {
      ...situation,
      lifecycle: "notified",
      notifiedAt,
      updatedAt: notifiedAt,
    },
  };
}
