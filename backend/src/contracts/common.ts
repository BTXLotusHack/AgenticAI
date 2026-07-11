import { z } from "zod";

/**
 * Shared primitives for versioned boundary schemas.
 *
 * Every external boundary (MQTT payload, HTTP body, event) is validated with a
 * Zod schema before reaching domain logic. Field names carry explicit units and
 * timestamps are UTC ISO 8601, per CONTRIBUTING.md.
 */

export const SCHEMA_VERSION = "1" as const;

export const IsoTimestamp = z
  .string()
  .datetime({ offset: true })
  .describe("UTC ISO 8601 timestamp");

export const Latitude = z.number().gte(-90).lte(90);
export const Longitude = z.number().gte(-180).lte(180);

export const Coordinate = z.tuple([Latitude, Longitude]);
export type Coordinate = z.infer<typeof Coordinate>;

export const Id = z.string().min(1).max(128);

/** Identity extracted from a verified Cognito JWT (API Gateway) or IAM principal. */
export const CallerIdentity = z.object({
  userId: Id,
  email: z.string().email().optional(),
});
export type CallerIdentity = z.infer<typeof CallerIdentity>;
