import type { VehicleNode } from "./contracts";

export type StableOrderState = {
  readonly orderedMemberIds: readonly string[];
  readonly candidateMemberIds?: readonly string[];
  readonly candidateSince?: string;
};

function sameOrder(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((memberId, index) => memberId === right[index]);
}

function sameMembers(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && [...left].sort().every((memberId, index) => memberId === [...right].sort()[index]);
}

export function updateStableOrder(
  previous: StableOrderState | undefined,
  nodes: readonly VehicleNode[],
  calculatedAt: string,
  reorderWindowSeconds: number,
): StableOrderState {
  const measuredOrder = nodes
    .filter((node) => node.connectivity !== "lost")
    .slice()
    .sort((left, right) => right.routeProgressMeters - left.routeProgressMeters || left.memberId.localeCompare(right.memberId))
    .map((node) => node.memberId);

  if (!previous || !sameMembers(previous.orderedMemberIds, measuredOrder)) return { orderedMemberIds: measuredOrder };
  if (sameOrder(previous.orderedMemberIds, measuredOrder)) return { orderedMemberIds: previous.orderedMemberIds };

  if (!previous.candidateMemberIds || !sameOrder(previous.candidateMemberIds, measuredOrder) || !previous.candidateSince) {
    return { orderedMemberIds: previous.orderedMemberIds, candidateMemberIds: measuredOrder, candidateSince: calculatedAt };
  }

  const candidateAgeSeconds = (Date.parse(calculatedAt) - Date.parse(previous.candidateSince)) / 1_000;
  if (candidateAgeSeconds >= reorderWindowSeconds) return { orderedMemberIds: measuredOrder };
  return previous;
}
