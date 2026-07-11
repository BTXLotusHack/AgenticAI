import { z } from "zod";
import { TascoPlaceRefV1Schema, type TascoPlaceRefV1 } from "@loopin/contracts";

export const TascoCoordinatesSchema = z
  .object({
    lat: z.number().gte(-90).lte(90),
    lon: z.number().gte(-180).lte(180),
  })
  .strict();

export type TascoCoordinates = z.infer<typeof TascoCoordinatesSchema>;

export const PlaceResultSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    label: z.string().min(1),
    address: z.string().min(1),
    category: z.string().min(1),
    coordinates: TascoCoordinatesSchema,
    distanceMeters: z.number().nonnegative().optional(),
    score: z.number().min(0).max(1).optional(),
    source: z.string().min(1),
    tags: z.array(z.string().min(1)).optional(),
    rating: z.number().min(0).max(5).optional(),
    openingHours: z.string().min(1).optional(),
    aiSummary: z.string().min(1).optional(),
  })
  .strict();

export type PlaceResult = z.infer<typeof PlaceResultSchema>;

export function toTascoPlaceRef(place: PlaceResult, sourceVersion: string): TascoPlaceRefV1 {
  const categories = [...new Set([place.category, ...(place.tags ?? [])])].filter((category) => category.length > 0);
  return TascoPlaceRefV1Schema.parse({
    id: place.id,
    provider: "tasco",
    name: place.name,
    address: place.address,
    coordinates: place.coordinates,
    categories,
    ...(place.rating !== undefined
      ? { ratingSummary: { averageRating: place.rating, reviewCount: 0, source: "tasco" } }
      : {}),
    sourceVersion,
  });
}

export const ErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .strict(),
    requestId: z.string().min(1),
  })
  .strict();

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const SearchResponseSchema = z
  .object({
    query: z.string(),
    results: z.array(PlaceResultSchema),
    meta: z.object({ limit: z.number().int().positive(), lang: z.string().min(1) }).strict(),
  })
  .strict();

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const AutocompleteResponseSchema = z
  .object({
    query: z.string(),
    suggestions: z.array(PlaceResultSchema),
    meta: z
      .object({
        limit: z.number().int().positive(),
        sessionId: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

export type AutocompleteResponse = z.infer<typeof AutocompleteResponseSchema>;

export const PoiDetailsResponseSchema = z.object({ poi: PlaceResultSchema }).strict();
export type PoiDetailsResponse = z.infer<typeof PoiDetailsResponseSchema>;

export const ReverseGeocodingResponseSchema = z.object({ results: z.array(PlaceResultSchema) }).strict();
export type ReverseGeocodingResponse = z.infer<typeof ReverseGeocodingResponseSchema>;

export const NearbySearchResponseSchema = z
  .object({
    center: TascoCoordinatesSchema,
    results: z.array(PlaceResultSchema),
    meta: z.object({ radiusMeters: z.number().nonnegative(), limit: z.number().int().positive() }).strict(),
  })
  .strict();

export type NearbySearchResponse = z.infer<typeof NearbySearchResponseSchema>;

export const GeocodingResponseSchema = z
  .object({
    query: z.string(),
    results: z.array(PlaceResultSchema),
  })
  .strict();

export type GeocodingResponse = z.infer<typeof GeocodingResponseSchema>;

export const RouteManeuverSchema = z
  .object({
    instruction: z.string().min(1),
    distanceMeters: z.number().nonnegative(),
    durationSeconds: z.number().nonnegative(),
    beginShapeIndex: z.number().int().nonnegative(),
    endShapeIndex: z.number().int().nonnegative(),
    streetNames: z.array(z.string().min(1)),
  })
  .strict();

export type RouteManeuver = z.infer<typeof RouteManeuverSchema>;

export const RouteGeometrySchema = z
  .object({
    type: z.literal("LineString"),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
  })
  .strict();

export type RouteGeometry = z.infer<typeof RouteGeometrySchema>;

export const RouteResultSchema = z
  .object({
    routeId: z.string().min(1),
    sourceIndex: z.number().int().nonnegative(),
    summary: z
      .object({
        distanceMeters: z.number().nonnegative(),
        durationSeconds: z.number().nonnegative(),
      })
      .strict(),
    geometry: RouteGeometrySchema,
    maneuvers: z.array(RouteManeuverSchema),
  })
  .strict();

export type RouteResult = z.infer<typeof RouteResultSchema>;

export const RouteRequestSchema = z
  .object({
    locations: z
      .array(z.object({ lat: z.number().gte(-90).lte(90), lon: z.number().gte(-180).lte(180) }).strict())
      .min(2),
    mode: z.enum(["auto", "pedestrian", "bicycle"]).optional(),
    alternates: z.number().int().min(0).max(5).optional(),
    language: z.string().min(1).optional(),
    units: z.enum(["kilometers", "miles"]).optional(),
    avoidTolls: z.boolean().optional(),
    avoidHighways: z.boolean().optional(),
  })
  .strict();

export type RouteRequest = z.infer<typeof RouteRequestSchema>;

export const RouteResponseSchema = z
  .object({
    routes: z.array(RouteResultSchema).min(1),
    meta: z
      .object({
        mode: z.enum(["auto", "pedestrian", "bicycle"]),
        alternates: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type RouteResponse = z.infer<typeof RouteResponseSchema>;

export const HealthResponseSchema = z
  .object({
    status: z.literal("ok"),
    service: z.literal("tasco-maps-mock"),
    requestId: z.string().min(1),
  })
  .strict();

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
