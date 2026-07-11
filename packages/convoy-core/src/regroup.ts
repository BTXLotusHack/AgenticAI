import type { PlaceCandidate } from "./contracts";
import type { ConvoyPolicy } from "./policy";

export type RegroupExclusionCode =
  | "illegal"
  | "unsafe-stop"
  | "closed"
  | "inaccessible"
  | "insufficient-parking"
  | "reverse-direction"
  | "excessive-detour"
  | "low-source-confidence";

export type RegroupScoreBreakdown = {
  safety: number;
  routeCompatibility: number;
  etaFairness: number;
  parking: number;
  detour: number;
  fuelOrCharging: number;
  amenities: number;
};

export type RankedRegroupCandidate = {
  poiId: string;
  name: string;
  score: number;
  maximumMemberEtaSeconds: number;
  breakdown: RegroupScoreBreakdown;
  candidate: PlaceCandidate;
};

export type RegroupRanking = {
  outcome: "selected" | "no-safe-candidate";
  policyVersion: string;
  rankedCandidates: RankedRegroupCandidate[];
  excludedCandidates: Array<{ poiId: string; reasonCodes: RegroupExclusionCode[] }>;
  selectedCandidate: RankedRegroupCandidate | null;
};

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function normalized(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function exclusions(candidate: PlaceCandidate, requiresParking: boolean, policy: ConvoyPolicy): RegroupExclusionCode[] {
  const reasons: RegroupExclusionCode[] = [];
  if (!candidate.isLegal) reasons.push("illegal");
  if (!candidate.isSafeToStop) reasons.push("unsafe-stop");
  if (!candidate.isOpen) reasons.push("closed");
  if (!candidate.isAccessible) reasons.push("inaccessible");
  if (requiresParking && !candidate.hasSufficientParking) reasons.push("insufficient-parking");
  if (candidate.requiresReverseDirection) reasons.push("reverse-direction");
  if (candidate.detourMeters > policy.maximumRegroupDetourMeters) reasons.push("excessive-detour");
  if (candidate.sourceConfidence === "low") reasons.push("low-source-confidence");
  return reasons;
}

function score(candidate: PlaceCandidate, policy: ConvoyPolicy): RankedRegroupCandidate {
  const weights = policy.regroupWeights;
  const breakdown: RegroupScoreBreakdown = {
    safety: round(normalized(candidate.safeStopScore) * weights.safety),
    routeCompatibility: round(normalized(candidate.routeCompatibilityScore) * weights.routeCompatibility),
    etaFairness: round(normalized(candidate.etaFairnessScore) * weights.etaFairness),
    parking: round(normalized(candidate.parkingScore) * weights.parking),
    detour: round(normalized(candidate.detourScore) * weights.detour),
    fuelOrCharging: round(normalized(candidate.fuelOrChargingScore) * weights.fuelOrCharging),
    amenities: round(normalized(candidate.amenitiesScore) * weights.amenities),
  };
  return {
    poiId: candidate.poiId,
    name: candidate.name,
    score: round(Object.values(breakdown).reduce((total, component) => total + component, 0)),
    maximumMemberEtaSeconds: candidate.maximumMemberEtaSeconds,
    breakdown,
    candidate,
  };
}

export function rankRegroupCandidates(
  candidates: readonly PlaceCandidate[],
  context: { requiresParking: boolean },
  policy: ConvoyPolicy,
): RegroupRanking {
  const excludedCandidates: RegroupRanking["excludedCandidates"] = [];
  const eligible: PlaceCandidate[] = [];

  for (const candidate of candidates) {
    const reasonCodes = exclusions(candidate, context.requiresParking, policy);
    if (reasonCodes.length > 0) excludedCandidates.push({ poiId: candidate.poiId, reasonCodes });
    else eligible.push(candidate);
  }

  const rankedCandidates = eligible
    .map((candidate) => score(candidate, policy))
    .sort((left, right) => right.score - left.score
      || left.maximumMemberEtaSeconds - right.maximumMemberEtaSeconds
      || left.poiId.localeCompare(right.poiId));

  return {
    outcome: rankedCandidates.length > 0 ? "selected" : "no-safe-candidate",
    policyVersion: policy.version,
    rankedCandidates,
    excludedCandidates,
    selectedCandidate: rankedCandidates[0] ?? null,
  };
}
