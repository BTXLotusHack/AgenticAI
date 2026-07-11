import type { ConvoyComponent, ConvoyEdge, ConvoyEdgeState, ConvoyGraph, VehicleNode } from "./contracts";
import type { ConvoyPolicy } from "./policy";
import { updateStableOrder, type StableOrderState } from "./ordering";

type EdgeTracker = {
  readonly state: ConvoyEdgeState;
  readonly stateSince: string;
  readonly stretchedSince?: string;
  readonly brokenSince?: string;
  readonly reconnectSince?: string;
};

export type GraphEngineState = {
  readonly graph: ConvoyGraph;
  readonly ordering: StableOrderState;
  readonly edgeTrackers: Readonly<Record<string, EdgeTracker>>;
};

export type GraphCalculationResult = {
  readonly graph: ConvoyGraph;
  readonly state: GraphEngineState;
  readonly changed: boolean;
};

function elapsedSeconds(from: string, to: string): number {
  return Math.max(0, (Date.parse(to) - Date.parse(from)) / 1_000);
}

function thresholdBand(speedKmh: number, policy: ConvoyPolicy): ConvoyPolicy["cohesionBands"][number] {
  return policy.cohesionBands.find((band) => speedKmh >= band.minimumSpeedKmh && speedKmh < band.maximumSpeedKmh)
    ?? policy.cohesionBands.at(-1)!;
}

function transitionTracker(
  previous: EdgeTracker | undefined,
  reliable: boolean,
  confidentLowerGapMeters: number,
  confidentUpperGapMeters: number,
  speedKmh: number,
  calculatedAt: string,
  policy: ConvoyPolicy,
): EdgeTracker {
  if (!reliable) return previous ?? { state: "unknown", stateSince: calculatedAt };

  const current = previous ?? { state: "healthy", stateSince: calculatedAt };
  const band = thresholdBand(speedKmh, policy);

  if (confidentLowerGapMeters >= band.brokenMeters) {
    const stretchedSince = current.stretchedSince ?? calculatedAt;
    const brokenSince = current.brokenSince ?? calculatedAt;
    const nextState = elapsedSeconds(brokenSince, calculatedAt) >= policy.persistenceSeconds.broken
      ? "broken"
      : elapsedSeconds(stretchedSince, calculatedAt) >= policy.persistenceSeconds.stretched
        ? "stretched"
        : current.state;
    return {
      state: nextState,
      stateSince: nextState === current.state ? current.stateSince : calculatedAt,
      stretchedSince,
      brokenSince,
    };
  }

  if (confidentLowerGapMeters >= band.stretchedMeters) {
    if (current.state === "broken") {
      const { brokenSince: _brokenSince, ...withoutBrokenTimer } = current;
      return withoutBrokenTimer;
    }
    const stretchedSince = current.stretchedSince ?? calculatedAt;
    const nextState = elapsedSeconds(stretchedSince, calculatedAt) >= policy.persistenceSeconds.stretched ? "stretched" : current.state;
    return {
      state: nextState,
      stateSince: nextState === current.state ? current.stateSince : calculatedAt,
      stretchedSince,
    };
  }

  if (confidentUpperGapMeters <= band.reconnectMeters) {
    if (current.state === "broken") {
      return { state: "recovering", stateSince: calculatedAt, reconnectSince: calculatedAt };
    }
    if (current.state === "recovering") {
      const reconnectSince = current.reconnectSince ?? calculatedAt;
      if (elapsedSeconds(reconnectSince, calculatedAt) >= policy.persistenceSeconds.reconnect) {
        return { state: "healthy", stateSince: calculatedAt };
      }
      return { state: "recovering", stateSince: current.stateSince, reconnectSince };
    }
    return { state: "healthy", stateSince: current.state === "healthy" ? current.stateSince : calculatedAt };
  }

  return current;
}

function averageSpeed(nodes: readonly VehicleNode[]): number | null {
  const speeds = nodes.flatMap((node) => node.speedKmh === null ? [] : [node.speedKmh]);
  return speeds.length === 0 ? null : speeds.reduce((total, speed) => total + speed, 0) / speeds.length;
}

export function buildComponents(orderedNodes: readonly VehicleNode[], edges: readonly ConvoyEdge[]): ConvoyComponent[] {
  if (orderedNodes.length === 0) return [];
  const groups: VehicleNode[][] = [[orderedNodes[0]!]];

  edges.forEach((edge, index) => {
    if (edge.state === "broken") groups.push([]);
    groups.at(-1)!.push(orderedNodes[index + 1]!);
  });

  return groups.map((nodes) => ({
    componentId: `component:${nodes.map((node) => node.memberId).join("+")}`,
    memberIds: nodes.map((node) => node.memberId),
    frontBoundaryMemberId: nodes[0]!.memberId,
    rearBoundaryMemberId: nodes.at(-1)!.memberId,
    containsLeader: nodes.some((node) => node.role === "leader"),
    averageSpeedKmh: averageSpeed(nodes),
  }));
}

function semanticGraph(graph: ConvoyGraph): string {
  return JSON.stringify({
    overallState: graph.overallState,
    orderedMemberIds: graph.orderedMemberIds,
    edges: graph.edges,
    components: graph.components,
    policyVersion: graph.policyVersion,
  });
}

export function calculateGraph(
  previous: GraphEngineState | undefined,
  nodes: readonly VehicleNode[],
  calculatedAt: string,
  policy: ConvoyPolicy,
): GraphCalculationResult {
  const ordering = updateStableOrder(previous?.ordering, nodes, calculatedAt, policy.persistenceSeconds.reorder);
  const nodeById = new Map(nodes.map((node) => [node.memberId, node]));
  const orderedNodes = ordering.orderedMemberIds.flatMap((memberId) => {
    const node = nodeById.get(memberId);
    return node ? [node] : [];
  });
  const edgeTrackers: Record<string, EdgeTracker> = {};
  const edges: ConvoyEdge[] = [];

  for (let index = 0; index < orderedNodes.length - 1; index += 1) {
    const ahead = orderedNodes[index]!;
    const behind = orderedNodes[index + 1]!;
    const key = `${ahead.memberId}:${behind.memberId}`;
    const routeGapMeters = Math.max(0, ahead.routeProgressMeters - behind.routeProgressMeters);
    const combinedUncertaintyMeters = Math.hypot(ahead.accuracyMeters, behind.accuracyMeters);
    const confidentLowerGapMeters = Math.max(0, routeGapMeters - combinedUncertaintyMeters);
    const confidentUpperGapMeters = routeGapMeters + combinedUncertaintyMeters;
    const speedKmh = averageSpeed([ahead, behind]) ?? 0;
    const reliable = ahead.confidence !== "low" && behind.confidence !== "low"
      && !["stale", "lost"].includes(ahead.connectivity) && !["stale", "lost"].includes(behind.connectivity);
    const tracker = transitionTracker(
      previous?.edgeTrackers[key],
      reliable,
      confidentLowerGapMeters,
      confidentUpperGapMeters,
      speedKmh,
      calculatedAt,
      policy,
    );
    edgeTrackers[key] = tracker;
    const metersPerSecond = speedKmh / 3.6;
    edges.push({
      aheadMemberId: ahead.memberId,
      behindMemberId: behind.memberId,
      routeGapMeters,
      etaGapSeconds: metersPerSecond > 0 ? Math.round(routeGapMeters / metersPerSecond) : null,
      combinedUncertaintyMeters,
      confidentLowerGapMeters,
      state: tracker.state,
      stateSince: tracker.stateSince,
      policyVersion: policy.version,
    });
  }

  const components = buildComponents(orderedNodes, edges);
  const degraded = nodes.some((node) => node.confidence === "low" || ["stale", "lost"].includes(node.connectivity))
    || edges.some((edge) => edge.state === "unknown");
  const overallState = degraded
    ? "degraded"
    : edges.some((edge) => edge.state === "broken")
      ? "split"
      : edges.some((edge) => edge.state === "stretched" || edge.state === "recovering")
        ? "stretched"
        : "together";

  const candidateGraph: ConvoyGraph = {
    tripId: orderedNodes[0]?.tripId ?? previous?.graph.tripId ?? "unknown",
    graphRevision: previous?.graph.graphRevision ?? 1,
    calculatedAt,
    overallState,
    orderedMemberIds: [...ordering.orderedMemberIds],
    edges,
    components,
    policyVersion: policy.version,
  };
  const changed = !previous || semanticGraph(candidateGraph) !== semanticGraph(previous.graph);
  const graph = changed && previous
    ? { ...candidateGraph, graphRevision: previous.graph.graphRevision + 1 }
    : candidateGraph;
  const state = { graph, ordering, edgeTrackers };
  return { graph, state, changed };
}
