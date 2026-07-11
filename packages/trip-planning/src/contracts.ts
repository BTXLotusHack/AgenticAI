import { z } from "zod";
import {
  GeoCoordinatesV1Schema,
  TascoPlaceRefV1Schema,
  type GeoCoordinatesV1,
  type TascoPlaceRefV1,
} from "@loopin/contracts";

const IdentifierSchema = z.string().min(1).max(160);
const IsoDateTimeSchema = z.iso.datetime();
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const TascoPlaceIdSchema = z.string().min(1).max(240);

export const TRIP_PLANNING_POLICY_V1 = {
  version: "trip-planning-v1",
  defaultCurrency: "VND",
  averageRoadSpeedKmh: 55,
  minimumStopsForRoute: 2,
  recommendationWeights: {
    categoryMatch: 0.35,
    rating: 0.25,
    distanceFit: 0.2,
    preferenceTag: 0.2,
  },
  budgetHeuristics: {
    mealMinorUnits: 120_000,
    restStopMinorUnits: 40_000,
    attractionMinorUnits: 180_000,
    lodgingMinorUnits: 850_000,
    fuelPer100KmMinorUnits: 250_000,
  },
} as const;

export const TripLifecycleSchema = z.enum(["draft", "published", "active", "completed"]);
export type TripLifecycle = z.infer<typeof TripLifecycleSchema>;

export const CollaboratorRoleSchema = z.enum(["owner", "editor", "viewer"]);
export type CollaboratorRole = z.infer<typeof CollaboratorRoleSchema>;

export const TravelModeSchema = z.enum(["auto", "pedestrian", "bicycle"]);
export type TravelMode = z.infer<typeof TravelModeSchema>;

export const TascoCoordinatesSchema = GeoCoordinatesV1Schema;

export type TascoCoordinates = GeoCoordinatesV1;

export const TascoPlaceReferenceV1Schema = TascoPlaceRefV1Schema;

export type TascoPlaceReferenceV1 = TascoPlaceRefV1;

export const TripPreferencesV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    travelMode: TravelModeSchema,
    language: z.enum(["vi", "en"]),
    pace: z.enum(["relaxed", "moderate", "fast"]),
    avoidTolls: z.boolean(),
    avoidHighways: z.boolean(),
    interestTags: z.array(z.string().min(1).max(80)),
    vehicleCount: z.number().int().positive().max(50),
  })
  .strict();

export type TripPreferencesV1 = z.infer<typeof TripPreferencesV1Schema>;

export const TripBudgetV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    currency: z.string().length(3),
    totalBudgetMinorUnits: z.number().int().nonnegative(),
    dailyBudgetMinorUnits: z.number().int().nonnegative().optional(),
  })
  .strict();

export type TripBudgetV1 = z.infer<typeof TripBudgetV1Schema>;

export const TripCollaboratorV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    userId: IdentifierSchema,
    displayName: z.string().min(1).max(80),
    role: CollaboratorRoleSchema,
    joinedAt: IsoDateTimeSchema,
  })
  .strict();

export type TripCollaboratorV1 = z.infer<typeof TripCollaboratorV1Schema>;

export const ItineraryStopV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    stopId: IdentifierSchema,
    tascoPlaceId: TascoPlaceIdSchema,
    place: TascoPlaceReferenceV1Schema,
    sequence: z.number().int().positive(),
    dwellMinutes: z.number().int().nonnegative().max(1_440),
    plannedArrivalAt: IsoDateTimeSchema.optional(),
    plannedDepartureAt: IsoDateTimeSchema.optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export type ItineraryStopV1 = z.infer<typeof ItineraryStopV1Schema>;

export const ItineraryDayV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    dayId: IdentifierSchema,
    date: IsoDateSchema,
    label: z.string().min(1).max(120).optional(),
    stops: z.array(ItineraryStopV1Schema),
  })
  .strict();

export type ItineraryDayV1 = z.infer<typeof ItineraryDayV1Schema>;

export const ItineraryV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    itineraryId: IdentifierSchema,
    days: z.array(ItineraryDayV1Schema).min(1),
  })
  .strict();

export type ItineraryV1 = z.infer<typeof ItineraryV1Schema>;

export const TripEstimatesV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    totalDwellMinutes: z.number().int().nonnegative(),
    estimatedTravelMinutes: z.number().int().nonnegative(),
    estimatedTotalMinutes: z.number().int().nonnegative(),
    estimatedDistanceMeters: z.number().int().nonnegative(),
    estimatedCostMinorUnits: z.number().int().nonnegative(),
    withinBudget: z.boolean(),
    policyVersion: IdentifierSchema,
  })
  .strict();

export type TripEstimatesV1 = z.infer<typeof TripEstimatesV1Schema>;

export const RouteRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: IdentifierSchema,
    locations: z.array(TascoCoordinatesSchema).min(2),
    mode: TravelModeSchema,
    language: z.enum(["vi", "en"]),
    units: z.literal("kilometers"),
    avoidTolls: z.boolean(),
    avoidHighways: z.boolean(),
    stopPlaceIds: z.array(TascoPlaceIdSchema).min(2),
  })
  .strict();

export type RouteRequestV1 = z.infer<typeof RouteRequestV1Schema>;

export const RecommendationScoreBreakdownSchema = z
  .object({
    categoryMatch: z.number().gte(0).lte(1),
    rating: z.number().gte(0).lte(1),
    distanceFit: z.number().gte(0).lte(1),
    preferenceTag: z.number().gte(0).lte(1),
  })
  .strict();

export type RecommendationScoreBreakdown = z.infer<typeof RecommendationScoreBreakdownSchema>;

export const TripRecommendationV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    recommendationId: IdentifierSchema,
    tascoPlaceId: TascoPlaceIdSchema,
    place: TascoPlaceReferenceV1Schema,
    score: z.number().gte(0).lte(1),
    weightedScore: z.number().gte(0).lte(1),
    breakdown: RecommendationScoreBreakdownSchema,
    explanation: z.string().min(1).max(500),
    policyVersion: IdentifierSchema,
  })
  .strict();

export type TripRecommendationV1 = z.infer<typeof TripRecommendationV1Schema>;

export const PlannedTripV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: IdentifierSchema,
    name: z.string().min(1).max(120),
    description: z.string().max(1_000).optional(),
    lifecycle: TripLifecycleSchema,
    version: z.number().int().positive(),
    ownerUserId: IdentifierSchema,
    collaborators: z.array(TripCollaboratorV1Schema).min(1),
    preferences: TripPreferencesV1Schema,
    budget: TripBudgetV1Schema,
    itinerary: ItineraryV1Schema,
    joinCode: z.string().min(4).max(32).optional(),
    estimates: TripEstimatesV1Schema.optional(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    publishedAt: IsoDateTimeSchema.optional(),
    activatedAt: IsoDateTimeSchema.optional(),
    completedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export type PlannedTripV1 = z.infer<typeof PlannedTripV1Schema>;

export const CreateTripRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: IdentifierSchema,
    name: z.string().min(1).max(120),
    description: z.string().max(1_000).optional(),
    ownerUserId: IdentifierSchema,
    ownerDisplayName: z.string().min(1).max(80),
    preferences: TripPreferencesV1Schema.optional(),
    budget: TripBudgetV1Schema.optional(),
    itinerary: ItineraryV1Schema.optional(),
  })
  .strict();

export type CreateTripRequestV1 = z.infer<typeof CreateTripRequestV1Schema>;

export const AddItineraryStopRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    dayId: IdentifierSchema,
    stopId: IdentifierSchema,
    place: TascoPlaceReferenceV1Schema,
    sequence: z.number().int().positive().optional(),
    dwellMinutes: z.number().int().nonnegative().max(1_440).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export type AddItineraryStopRequestV1 = z.infer<typeof AddItineraryStopRequestV1Schema>;

export const RecommendPlacesRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    candidates: z.array(TascoPlaceReferenceV1Schema).min(1),
    anchorCoordinates: TascoCoordinatesSchema.optional(),
  })
  .strict();

export type RecommendPlacesRequestV1 = z.infer<typeof RecommendPlacesRequestV1Schema>;
