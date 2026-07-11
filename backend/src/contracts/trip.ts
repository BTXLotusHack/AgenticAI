import { z } from "zod";
import { Id, IsoTimestamp, Latitude, Longitude } from "./common.js";

export const GeoCoordinates = z.object({
  lat: Latitude,
  lon: Longitude,
});
export type GeoCoordinates = z.infer<typeof GeoCoordinates>;

export const TascoRatingSummary = z.object({
  averageRating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  source: z.literal("tasco"),
});
export type TascoRatingSummary = z.infer<typeof TascoRatingSummary>;

export const TascoPlaceRef = z.object({
  id: Id,
  provider: z.literal("tasco"),
  name: z.string().min(1).max(240),
  address: z.string().min(1).max(500),
  coordinates: GeoCoordinates,
  categories: z.array(z.string().min(1).max(120)).min(1).max(16),
  ratingSummary: TascoRatingSummary.optional(),
  sourceVersion: Id,
});
export type TascoPlaceRef = z.infer<typeof TascoPlaceRef>;

export const TripStop = z.object({
  stopId: Id,
  place: TascoPlaceRef,
  plannedWindow: z.object({
    arrivalAt: IsoTimestamp.optional(),
    departureAt: IsoTimestamp.optional(),
  }).optional(),
  notes: z.string().max(500).optional(),
  locked: z.boolean(),
  source: z.enum(["tasco-search", "leader", "system"]),
});
export type TripStop = z.infer<typeof TripStop>;

export const TascoRouteSummary = z.object({
  distanceMeters: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative(),
});
export type TascoRouteSummary = z.infer<typeof TascoRouteSummary>;

export const TripPlanSummary = z.object({
  tripId: Id,
  title: z.string().min(1).max(120),
  lifecycle: z.enum(["draft", "ready", "active", "completed", "archived"]),
  origin: TascoPlaceRef,
  destination: TascoPlaceRef,
  stops: z.array(TripStop),
  routeSummary: TascoRouteSummary,
  departureTime: IsoTimestamp,
  policyId: Id,
  memberCount: z.number().int().nonnegative(),
});
export type TripPlanSummary = z.infer<typeof TripPlanSummary>;

export const JoinTripResult = z.object({
  schemaVersion: z.literal(1),
  tripId: Id,
  memberId: Id,
  role: z.enum(["leader", "member"]),
  consentRequirements: z.array(z.enum(["location-while-driving", "driver-alerts", "background-location"])),
  routeOfflineSummary: z.object({
    routeId: Id,
    distanceMeters: z.number().int().nonnegative(),
    durationSeconds: z.number().int().nonnegative(),
    encodedGeometry: z.string().min(1),
    sourceVersion: Id,
  }),
});
export type JoinTripResult = z.infer<typeof JoinTripResult>;
