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
    id: "poi:hanoi-old-quarter",
    provider: "tasco",
    name: "Ha Noi Old Quarter",
    address: "Hoan Kiem, Ha Noi, Viet Nam",
    coordinates: { lat: 21.0285, lon: 105.8542 },
    categories: ["city", "culture", "food"],
    ratingSummary: { averageRating: 4.6, reviewCount: 0, source: "tasco" },
    sourceVersion: "tasco-mock-2026-06-25",
  },
  minhChauRestStop: {
    id: "poi:poi001-minh-chau-rest-stop",
    provider: "tasco",
    name: "Minh Chau Rest Stop",
    address: "QL5, Hai Duong, Viet Nam",
    coordinates: { lat: 20.95, lon: 106.2 },
    categories: ["rest_stop", "rest", "parking"],
    ratingSummary: { averageRating: 4.2, reviewCount: 0, source: "tasco" },
    sourceVersion: "tasco-mock-2026-06-25",
  },
  haLongBay: {
    id: "poi:ha-long-bai-chay",
    provider: "tasco",
    name: "Bai Chay, Ha Long",
    address: "Bai Chay, Ha Long, Quang Ninh, Viet Nam",
    coordinates: { lat: 20.959, lon: 107.042 },
    categories: ["destination", "view", "attraction"],
    ratingSummary: { averageRating: 4.8, reviewCount: 0, source: "tasco" },
    sourceVersion: "tasco-mock-2026-06-25",
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
      label: "Ha Noi departure",
      stops: [
        {
          schemaVersion: 1,
          stopId: "STOP001",
          tascoPlaceId: GOLDEN_PLACES.hanoiOldQuarter.id,
          place: GOLDEN_PLACES.hanoiOldQuarter,
          sequence: 1,
          dwellMinutes: 30,
        },
        {
          schemaVersion: 1,
          stopId: "STOP002",
          tascoPlaceId: GOLDEN_PLACES.minhChauRestStop.id,
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
      label: "Ha Long arrival",
      stops: [
        {
          schemaVersion: 1,
          stopId: "STOP003",
          tascoPlaceId: GOLDEN_PLACES.haLongBay.id,
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
  name: "Ha Noi to Ha Long Family Trip",
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
      displayName: "Chi Lan",
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
    id: "poi:poi003-ha-long-service-area",
    provider: "tasco",
    name: "Ha Long Service Area",
    address: "QL18, Quang Ninh, Viet Nam",
    coordinates: { lat: 20.98, lon: 106.95 },
    categories: ["rest_stop", "rest", "fuel"],
    ratingSummary: { averageRating: 3.9, reviewCount: 0, source: "tasco" },
    sourceVersion: "tasco-mock-2026-06-25",
  },
];
