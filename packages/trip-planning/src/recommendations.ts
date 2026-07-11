import type {
  PlannedTripV1,
  RecommendationScoreBreakdown,
  TascoCoordinates,
  TascoPlaceReferenceV1,
  TripEstimatesV1,
  TripPreferencesV1,
  TripRecommendationV1,
} from "./contracts.js";
import { TRIP_PLANNING_POLICY_V1 } from "./contracts.js";
import {
  estimateFuelCostMinorUnits,
  estimateLegDistanceMeters,
  estimateStopCostMinorUnits,
  estimateTravelMinutes,
  haversineMeters,
} from "./estimates.js";
import { TripPlanningError } from "./errors.js";
import { flattenOrderedStops } from "./ordering.js";
import { validatePlaceReference } from "./validation.js";

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function normalized(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function categoryMatchScore(place: TascoPlaceReferenceV1, preferences: TripPreferencesV1): number {
  if (preferences.interestTags.length === 0) return 0.5;
  const haystack = `${place.category} ${(place.tags ?? []).join(" ")}`.toLowerCase();
  const matches = preferences.interestTags.filter((tag) => haystack.includes(tag.toLowerCase()));
  return normalized(matches.length / preferences.interestTags.length);
}

function ratingScore(place: TascoPlaceReferenceV1): number {
  if (place.rating === undefined) return 0.4;
  return normalized(place.rating / 5);
}

function distanceFitScore(place: TascoPlaceReferenceV1, anchor?: TascoCoordinates): number {
  if (!anchor) return 0.5;
  const distance = haversineMeters(anchor, place.coordinates);
  if (distance <= 5_000) return 1;
  if (distance >= 150_000) return 0.1;
  return normalized(1 - (distance - 5_000) / 145_000);
}

function preferenceTagScore(place: TascoPlaceReferenceV1, preferences: TripPreferencesV1): number {
  const tags = new Set((place.tags ?? []).map((tag) => tag.toLowerCase()));
  if (tags.size === 0 || preferences.interestTags.length === 0) return 0.3;
  const overlap = preferences.interestTags.filter((tag) => tags.has(tag.toLowerCase())).length;
  return normalized(overlap / preferences.interestTags.length);
}

function buildBreakdown(
  place: TascoPlaceReferenceV1,
  preferences: TripPreferencesV1,
  anchor?: TascoCoordinates,
): RecommendationScoreBreakdown {
  const weights = TRIP_PLANNING_POLICY_V1.recommendationWeights;
  return {
    categoryMatch: round(normalized(categoryMatchScore(place, preferences)) * weights.categoryMatch),
    rating: round(normalized(ratingScore(place)) * weights.rating),
    distanceFit: round(normalized(distanceFitScore(place, anchor)) * weights.distanceFit),
    preferenceTag: round(normalized(preferenceTagScore(place, preferences)) * weights.preferenceTag),
  };
}

function explainScore(place: TascoPlaceReferenceV1, breakdown: RecommendationScoreBreakdown): string {
  const parts: string[] = [];
  if (breakdown.categoryMatch >= 0.2) parts.push("matches trip interests");
  if (breakdown.rating >= 0.15) parts.push("strong Tasco rating");
  if (breakdown.distanceFit >= 0.15) parts.push("fits the current route anchor");
  if (breakdown.preferenceTag >= 0.1) parts.push("aligns with preference tags");
  if (parts.length === 0) parts.push("eligible Tasco-backed candidate");
  return `${place.name} (${place.tascoPlaceId}): ${parts.join(", ")}.`;
}

export function rankPlaceRecommendations(input: {
  readonly tripId: string;
  readonly preferences: TripPreferencesV1;
  readonly candidates: readonly TascoPlaceReferenceV1[];
  readonly anchorCoordinates?: TascoCoordinates | undefined;
  readonly recommendationIdPrefix?: string;
}): TripRecommendationV1[] {
  const validated: TascoPlaceReferenceV1[] = [];
  for (const candidate of input.candidates) {
    validatePlaceReference(candidate);
    if (validated.some((existing) => existing.tascoPlaceId === candidate.tascoPlaceId)) continue;
    validated.push(candidate);
  }
  if (validated.length === 0) {
    throw new TripPlanningError("missing-tasco-place", "Recommendations require at least one Tasco-backed place.");
  }

  return validated
    .map((place, index) => {
      const breakdown = buildBreakdown(place, input.preferences, input.anchorCoordinates);
      const weightedScore = round(Object.values(breakdown).reduce((total, value) => total + value, 0));
      return {
        schemaVersion: 1 as const,
        recommendationId: `${input.recommendationIdPrefix ?? input.tripId}:rec:${index + 1}`,
        tascoPlaceId: place.tascoPlaceId,
        place,
        score: round(weightedScore / Object.values(TRIP_PLANNING_POLICY_V1.recommendationWeights).reduce((a, b) => a + b, 0)),
        weightedScore,
        breakdown,
        explanation: explainScore(place, breakdown),
        policyVersion: TRIP_PLANNING_POLICY_V1.version,
      };
    })
    .sort((left, right) => right.weightedScore - left.weightedScore || left.tascoPlaceId.localeCompare(right.tascoPlaceId));
}

export function calculateTripEstimates(trip: PlannedTripV1): TripEstimatesV1 {
  const stops = flattenOrderedStops(trip.itinerary);
  const totalDwellMinutes = stops.reduce((total, stop) => total + stop.dwellMinutes, 0);
  const estimatedDistanceMeters = estimateLegDistanceMeters(stops);
  const estimatedTravelMinutes = estimateTravelMinutes(estimatedDistanceMeters);
  const stopCosts = stops.reduce((total, stop) => total + estimateStopCostMinorUnits(stop), 0);
  const estimatedCostMinorUnits = stopCosts + estimateFuelCostMinorUnits(estimatedDistanceMeters);
  const estimatedTotalMinutes = totalDwellMinutes + estimatedTravelMinutes;
  return {
    schemaVersion: 1,
    totalDwellMinutes,
    estimatedTravelMinutes,
    estimatedTotalMinutes,
    estimatedDistanceMeters,
    estimatedCostMinorUnits,
    withinBudget: estimatedCostMinorUnits <= trip.budget.totalBudgetMinorUnits,
    policyVersion: TRIP_PLANNING_POLICY_V1.version,
  };
}
