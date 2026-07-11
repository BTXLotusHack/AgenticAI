import { z } from "zod";
import { Id, IsoTimestamp } from "./common.js";

export const VehicleType = z.enum(["CAR", "MOTORCYCLE", "TRUCK", "EV", "OTHER"]);
export type VehicleType = z.infer<typeof VehicleType>;

/**
 * Body of PUT /me/profile — everything a caller may set about themselves.
 * The user id is never in the body; it comes from the verified JWT.
 */
export const UpsertProfileRequest = z.object({
  displayName: z.string().min(2).max(60).trim(),
  vehicleType: VehicleType.optional(),
  phone: z.string().trim().min(3).max(32).optional(),
  locale: z.string().min(2).max(35).optional(),
});
export type UpsertProfileRequest = z.infer<typeof UpsertProfileRequest>;

/** The caller's stored profile as returned by GET/PUT /me/profile. */
export const UserProfile = z.object({
  userId: Id,
  displayName: z.string(),
  vehicleType: VehicleType.optional(),
  phone: z.string().optional(),
  locale: z.string(),
  updatedAt: IsoTimestamp,
});
export type UserProfile = z.infer<typeof UserProfile>;
