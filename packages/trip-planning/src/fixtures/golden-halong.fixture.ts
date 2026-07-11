import type {
  ItineraryV1,
  PlannedTripV1,
  TascoPlaceReferenceV1,
  TripBudgetV1,
  TripPreferencesV1,
} from "../contracts.js";
import { TRIP_PLANNING_POLICY_V1 } from "../contracts.js";

export const GOLDEN_PLACES = {
  hanoiOldQuarter: {
    schemaVersion: 1,
    tascoPlaceId: "tasco:poi:HN-OLD-QUARTER",
    name: "Hoàn Kiếm, Hà Nội",
    label: "Hoàn Kiếm, Hà Nội",
    address: "Hoàn Kiếm, Hà Nội, Việt Nam",
    category: "City Center",
    coordinates: { lat: 21.0285, lon: 105.8542 },
    source: "tasco",
    rating: 4.6,
    tags: ["culture", "food"],
  },
  minhChauRestStop: {
    schemaVersion: 1,
    tascoPlaceId: "tasco:poi:POI001",
    name: "Minh Châu Rest Stop",
    label: "Minh Châu Rest Stop",
    address: "QL5, Hải Dương, Việt Nam",
    category: "Rest Stop",
    coordinates: { lat: 20.95, lon: 106.2 },
    source: "tasco",
    rating: 4.2,
    tags: ["rest", "parking"],
  },
  haLongBay: {
    schemaVersion: 1,
    tascoPlaceId: "tasco:poi:HL-BAI-CHAY",
    name: "Bãi Cháy, Hạ Long",
    label: "Bãi Cháy, Hạ Long",
    address: "Bãi Cháy, Hạ Long, Quảng Ninh, Việt Nam",
    category: "Destination",
    coordinates: { lat: 20.959, lon: 107.042 },
    source: "tasco",
    rating: 4.8,
    tags: ["view", "attraction"],
  },
} satisfies Record<string, TascoPlaceReferenceV1>;

export const GOLDEN_PREFERENCES: TripPreferencesV1 = {
  schemaVersion: 1,
  travelMode: "auto",
  language: "vi",
  pace: "moderate",
  avoidTolls: false,
  avoidHighways: false,
  interestTags: ["rest", "view", "food"],
  vehicleCount: 4,
};

export const GOLDEN_BUDGET: TripBudgetV1 = {
  schemaVersion: 1,
  currency: TRIP_PLANNING_POLICY_V1.defaultCurrency,
  totalBudgetMinorUnits: 12_000_000,
  dailyBudgetMinorUnits: 4_000_000,
};

export const GOLDEN_ITINERARY: ItineraryV1 = {
  schemaVersion: 1,
  itineraryId: "ITIN001",
  days: [
    {
      schemaVersion: 1,
      dayId: "DAY001",
      date: "2026-07-20",
      label: "Hà Nội departure",
      stops: [
        {
          schemaVersion: 1,
          stopId: "STOP001",
          tascoPlaceId: GOLDEN_PLACES.hanoiOldQuarter.tascoPlaceId,
          place: GOLDEN_PLACES.hanoiOldQuarter,
          sequence: 1,
          dwellMinutes: 30,
        },
        {
          schemaVersion: 1,
          stopId: "STOP002",
          tascoPlaceId: GOLDEN_PLACES.minhChauRestStop.tascoPlaceId,
          place: GOLDEN_PLACES.minhChauRestStop,
          sequence: 2,
          dwellMinutes: 20,
        },
      ],
    },
    {
      schemaVersion: 1,
      dayId: "DAY002",
      date: "2026-07-21",
      label: "Hạ Long arrival",
      stops: [
        {
          schemaVersion: 1,
          stopId: "STOP003",
          tascoPlaceId: GOLDEN_PLACES.haLongBay.tascoPlaceId,
          place: GOLDEN_PLACES.haLongBay,
          sequence: 1,
          dwellMinutes: 180,
        },
      ],
    },
  ],
};

export const GOLDEN_PLANNED_TRIP: PlannedTripV1 = {
  schemaVersion: 1,
  tripId: "PLAN001",
  name: "Hà Nội → Hạ Long Family Trip",
  description: "Two-day family convoy with a workbook-backed rest stop.",
  lifecycle: "draft",
  version: 1,
  ownerUserId: "USER001",
  collaborators: [
    {
      schemaVersion: 1,
      userId: "USER001",
      displayName: "Anh Minh",
      role: "owner",
      joinedAt: "2026-07-19T08:00:00.000Z",
    },
    {
      schemaVersion: 1,
      userId: "USER002",
      displayName: "Chị Lan",
      role: "editor",
      joinedAt: "2026-07-19T08:05:00.000Z",
    },
  ],
  preferences: GOLDEN_PREFERENCES,
  budget: GOLDEN_BUDGET,
  itinerary: GOLDEN_ITINERARY,
  createdAt: "2026-07-19T08:00:00.000Z",
  updatedAt: "2026-07-19T08:00:00.000Z",
};

export const GOLDEN_RECOMMENDATION_CANDIDATES: TascoPlaceReferenceV1[] = [
  GOLDEN_PLACES.minhChauRestStop,
  {
    schemaVersion: 1,
    tascoPlaceId: "tasco:poi:POI003",
    name: "Hạ Long Service Area",
    label: "Hạ Long Service Area",
    address: "QL18, Quảng Ninh, Việt Nam",
    category: "Rest Stop",
    coordinates: { lat: 20.98, lon: 106.95 },
    source: "tasco",
    rating: 3.9,
    tags: ["rest", "fuel"],
  },
];
