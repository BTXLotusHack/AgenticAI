import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import { UpsertProfileRequest } from "../contracts/profile.js";
import { buildProfile } from "../domain/profile.js";
import { putProfile } from "../lib/dynamo/repository.js";
import { getCaller, parseBody } from "../lib/http/request.js";
import { ok, error, HttpError } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";

/**
 * Control path: PUT /me/profile.
 *
 * Upserts the authenticated caller's own profile onto their USER#<id>/METADATA
 * item, preserving push/identity attributes already stored there. Thin handler:
 * authenticate, validate, build, persist, map. Never logs the profile fields
 * themselves (displayName/phone are PII).
 */
export const handler: Handler<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2
> = async (event) => {
  try {
    const caller = getCaller(event);
    const request = parseBody(event, UpsertProfileRequest);

    const profile = buildProfile(request, caller);
    await putProfile(profile);

    logger.info("profile_upserted", { userId: caller.userId });
    return ok({ profile });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("upsert_profile_unhandled", {
      reason: err instanceof Error ? err.name : "unknown",
    });
    return error(500, "internal_error", "Unexpected error saving profile.");
  }
};
