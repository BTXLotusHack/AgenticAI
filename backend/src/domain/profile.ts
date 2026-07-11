import type { CallerIdentity } from "../contracts/common.js";
import type { UpsertProfileRequest, UserProfile } from "../contracts/profile.js";

/** App default when the caller does not send an explicit locale. */
export const DEFAULT_LOCALE = "vi-VN";

/**
 * Build the caller's profile aggregate from a validated request. Pure: the
 * user id is taken from the authenticated caller, never from the body, and
 * optional fields are only present when supplied.
 */
export function buildProfile(
  request: UpsertProfileRequest,
  caller: CallerIdentity,
  now: Date = new Date(),
): UserProfile {
  return {
    userId: caller.userId,
    displayName: request.displayName,
    ...(request.vehicleType ? { vehicleType: request.vehicleType } : {}),
    ...(request.phone ? { phone: request.phone } : {}),
    locale: request.locale ?? DEFAULT_LOCALE,
    updatedAt: now.toISOString(),
  };
}
