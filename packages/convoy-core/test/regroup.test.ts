import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { CONVOY_POLICY_V1, rankRegroupCandidates, type PlaceCandidate } from "../src/index";

function candidate(overrides: Partial<PlaceCandidate> = {}): PlaceCandidate {
  return {
    poiId: "POI001",
    name: "Minh Châu Rest Stop",
    type: "Rest Stop",
    safeStopScore: 0.95,
    routeCompatibilityScore: 0.98,
    etaFairnessScore: 0.9,
    parkingScore: 1,
    detourScore: 0.98,
    fuelOrChargingScore: 0.8,
    amenitiesScore: 1,
    maximumMemberEtaSeconds: 420,
    isLegal: true,
    isSafeToStop: true,
    isOpen: true,
    isAccessible: true,
    hasSufficientParking: true,
    requiresReverseDirection: false,
    detourMeters: 100,
    sourceConfidence: "high",
    ...overrides,
  };
}

describe("rankRegroupCandidates", () => {
  it.each([
    ["illegal", { isLegal: false }, "illegal"],
    ["unsafe", { isSafeToStop: false }, "unsafe-stop"],
    ["closed", { isOpen: false }, "closed"],
    ["inaccessible", { isAccessible: false }, "inaccessible"],
    ["inadequate parking", { hasSufficientParking: false }, "insufficient-parking"],
    ["reverse direction", { requiresReverseDirection: true }, "reverse-direction"],
    ["excessive detour", { detourMeters: 5_001 }, "excessive-detour"],
    ["low confidence", { sourceConfidence: "low" }, "low-source-confidence"],
  ] as const)("hard-excludes %s candidates before scoring", (_label, override, reason) => {
    const item = candidate({ ...override, safeStopScore: 1, routeCompatibilityScore: 1 });
    const result = rankRegroupCandidates([item], { requiresParking: true }, CONVOY_POLICY_V1);

    expect(result.rankedCandidates).toEqual([]);
    expect(result.selectedCandidate).toBeNull();
    expect(result.outcome).toBe("no-safe-candidate");
    expect(result.excludedCandidates[0]).toEqual({ poiId: "POI001", reasonCodes: [reason] });
  });

  it("calculates the documented normalized weighted score", () => {
    const result = rankRegroupCandidates([candidate()], { requiresParking: true }, CONVOY_POLICY_V1);
    expect(result.rankedCandidates[0]).toMatchObject({ poiId: "POI001", score: 0.9515 });
    expect(result.rankedCandidates[0]?.breakdown).toEqual({
      safety: 0.3325,
      routeCompatibility: 0.196,
      etaFairness: 0.135,
      parking: 0.1,
      detour: 0.098,
      fuelOrCharging: 0.04,
      amenities: 0.05,
    });
  });

  it("selects POI001 over POI003 and excludes the unsafe workbook shoulder POI002", () => {
    const poi001 = candidate();
    const poi002 = candidate({
      poiId: "POI002", name: "Highway Shoulder KM62", type: "Road Shoulder",
      safeStopScore: 0.25, parkingScore: 0, amenitiesScore: 0, fuelOrChargingScore: 0,
      isSafeToStop: false, hasSufficientParking: false, maximumMemberEtaSeconds: 180,
    });
    const poi003 = candidate({
      poiId: "POI003", name: "Hạ Long Service Area", safeStopScore: 0.88,
      routeCompatibilityScore: 0.95, etaFairnessScore: 0.75, detourScore: 0.9,
      maximumMemberEtaSeconds: 900,
    });

    const result = rankRegroupCandidates([poi003, poi002, poi001], { requiresParking: true }, CONVOY_POLICY_V1);

    expect(result.selectedCandidate?.poiId).toBe("POI001");
    expect(result.rankedCandidates.map((item) => item.poiId)).toEqual(["POI001", "POI003"]);
    expect(result.excludedCandidates.find((item) => item.poiId === "POI002")?.reasonCodes).toContain("unsafe-stop");
  });

  it("breaks equal-score ties by ETA then POI ID", () => {
    const slower = candidate({ poiId: "POI-B", maximumMemberEtaSeconds: 500 });
    const fasterB = candidate({ poiId: "POI-C", maximumMemberEtaSeconds: 400 });
    const fasterA = candidate({ poiId: "POI-A", maximumMemberEtaSeconds: 400 });
    const result = rankRegroupCandidates([slower, fasterB, fasterA], { requiresParking: true }, CONVOY_POLICY_V1);
    expect(result.rankedCandidates.map((item) => item.poiId)).toEqual(["POI-A", "POI-C", "POI-B"]);
  });

  it("never allows a hard-excluded candidate into the ranking", () => {
    fc.assert(fc.property(
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.boolean(),
      (safeStopScore, isLegal) => {
        const item = candidate({ safeStopScore, isLegal, isSafeToStop: false });
        const result = rankRegroupCandidates([item], { requiresParking: true }, CONVOY_POLICY_V1);
        expect(result.rankedCandidates).toHaveLength(0);
      },
    ));
  });
});
