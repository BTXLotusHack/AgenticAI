import type { PlaceCandidate } from "@loopin/convoy-core";

export const GOLDEN_R001 = {
  provenance: {
    sourceWorkbook: "ai_maps_track7_dataset_participants.xlsx",
    sheets: ["Group Trips", "Trip Members", "Route Waypoints", "Regroup POIs", "GPS Traces", "Trip Events"],
    note: "Identity, route, POI, and scenario facts are normalized from the supplied synthetic workbook; 5-second route projections are deterministic demo fixtures.",
  },
  trip: { tripId: "TRIP001", routeId: "R001", name: "Hà Nội → Hạ Long Family Trip", leaderMemberId: "M001" },
  members: [
    { memberId: "M001", name: "Anh Minh", role: "leader" as const, locale: "vi" as const },
    { memberId: "M002", name: "Chị Lan", role: "member" as const, locale: "vi" as const },
    { memberId: "M003", name: "Anh Huy", role: "member" as const, locale: "vi" as const },
    { memberId: "M004", name: "Chú Sơn", role: "member" as const, locale: "vi" as const },
  ],
  routeStart: { latitude: 21.0285, longitude: 105.8542 },
  ticks: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  splitStartsAtSeconds: 5,
  reconnectStartsAtSeconds: 40,
  expectedSplitBoundary: { aheadMemberId: "M003", behindMemberId: "M004" },
  candidates: [
    {
      poiId: "POI001", name: "Minh Châu Rest Stop", type: "Rest Stop", safeStopScore: 0.95,
      routeCompatibilityScore: 0.98, etaFairnessScore: 0.9, parkingScore: 1, detourScore: 0.98,
      fuelOrChargingScore: 0.8, amenitiesScore: 1, maximumMemberEtaSeconds: 420,
      isLegal: true, isSafeToStop: true, isOpen: true, isAccessible: true, hasSufficientParking: true,
      requiresReverseDirection: false, detourMeters: 100, sourceConfidence: "high",
    },
    {
      poiId: "POI002", name: "Highway Shoulder KM62", type: "Road Shoulder", safeStopScore: 0.25,
      routeCompatibilityScore: 0.99, etaFairnessScore: 0.95, parkingScore: 0, detourScore: 1,
      fuelOrChargingScore: 0, amenitiesScore: 0, maximumMemberEtaSeconds: 180,
      isLegal: true, isSafeToStop: false, isOpen: true, isAccessible: true, hasSufficientParking: false,
      requiresReverseDirection: false, detourMeters: 0, sourceConfidence: "high",
    },
    {
      poiId: "POI003", name: "Hạ Long Service Area", type: "Rest Stop", safeStopScore: 0.88,
      routeCompatibilityScore: 0.95, etaFairnessScore: 0.75, parkingScore: 1, detourScore: 0.9,
      fuelOrChargingScore: 0.8, amenitiesScore: 1, maximumMemberEtaSeconds: 900,
      isLegal: true, isSafeToStop: true, isOpen: true, isAccessible: true, hasSufficientParking: true,
      requiresReverseDirection: false, detourMeters: 200, sourceConfidence: "high",
    },
  ] satisfies PlaceCandidate[],
} as const;
