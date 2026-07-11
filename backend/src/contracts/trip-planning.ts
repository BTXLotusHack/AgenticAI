import { z } from "zod";
import { Id, IsoTimestamp } from "./common.js";

export const LocationConfidenceSchema = z.enum(["high", "medium", "low"]);
export type LocationConfidence = z.infer<typeof LocationConfidenceSchema>;

// --- Trip Planning V1 ---

export const TripPlanningRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    origin: z.string().min(1).max(200),
    destination: z.string().min(1).max(200),
    startDate: IsoTimestamp.optional(),
    days: z.number().int().positive().lte(30),
    travelers: z.number().int().positive().optional(),
    travelerType: z.enum(["family", "friends", "motorcycle_group", "tour_group", "business", "other"]).optional(),
    interests: z.array(z.string().min(1).max(100)).max(20),
    budgetLevel: z.enum(["low", "medium", "high"]).optional(),
    pace: z.enum(["relaxed", "balanced", "packed"]).optional(),
    avoid: z.array(z.string().min(1).max(100)).max(20).optional(),
    maxStopsPerDay: z.number().int().positive().lte(20).optional(),
    maxDriveHoursPerDay: z.number().positive().lte(16).optional(),
  })
  .strict();

export type TripPlanningRequestV1 = z.infer<typeof TripPlanningRequestV1Schema>;

export const TripPlanningIntentV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    extractedOrigin: z.string(),
    extractedDestination: z.string(),
    primaryCategories: z.array(z.string()),
    searchBoundingBox: z
      .object({
        minLat: z.number(),
        minLon: z.number(),
        maxLat: z.number(),
        maxLon: z.number(),
      })
      .optional(),
    suggestedMaxStopsPerDay: z.number().int().positive(),
  })
  .strict();

export type TripPlanningIntentV1 = z.infer<typeof TripPlanningIntentV1Schema>;

export const TripPlanningPoiCandidateV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePlaceId: Id,
    name: z.string().min(1).max(240),
    type: z.string().min(1).max(120),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    address: z.string().optional(),
    rating: z.number().gte(0).lte(5).optional(),
    reviewsCount: z.number().int().nonnegative().optional(),
    categories: z.array(z.string()),
    sourceConfidence: LocationConfidenceSchema,
    dataFreshness: IsoTimestamp.optional(),
  })
  .strict();

export type TripPlanningPoiCandidateV1 = z.infer<typeof TripPlanningPoiCandidateV1Schema>;

export const TripPlanningStopV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePlaceId: Id,
    name: z.string().min(1).max(240),
    type: z.string().min(1).max(120),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    address: z.string().optional(),
    plannedStartTime: IsoTimestamp.optional(),
    plannedDurationMinutes: z.number().int().positive().optional(),
    reason: z.string().min(1).max(500),
    sourceConfidence: LocationConfidenceSchema,
    dataFreshness: IsoTimestamp.optional(),
    routeValidationStatus: z.enum(["not_checked", "compatible", "detour_warning", "rejected"]),
  })
  .strict();

export type TripPlanningStopV1 = z.infer<typeof TripPlanningStopV1Schema>;

export const TripPlanningDayV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    dayNumber: z.number().int().positive(),
    date: IsoTimestamp.optional(),
    theme: z.string().max(200).optional(),
    stops: z.array(TripPlanningStopV1Schema),
  })
  .strict();

export type TripPlanningDayV1 = z.infer<typeof TripPlanningDayV1Schema>;

export const TripPlanningValidationResultV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(["valid", "valid_with_warnings", "invalid"]),
    warnings: z.array(z.string()),
    errors: z.array(z.string()),
    rejectedStopIds: z.array(Id),
  })
  .strict();

export type TripPlanningValidationResultV1 = z.infer<typeof TripPlanningValidationResultV1Schema>;

export const TripPlanningItineraryV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    planId: Id,
    title: z.string().min(1).max(200),
    summary: z.string().max(1000).optional(),
    days: z.array(TripPlanningDayV1Schema),
    warnings: z.array(z.string()).optional(),
    rejectedCandidates: z.array(Id).optional(),
  })
  .strict();

export type TripPlanningItineraryV1 = z.infer<typeof TripPlanningItineraryV1Schema>;
