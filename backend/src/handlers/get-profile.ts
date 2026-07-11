import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import { getProfile } from "../lib/dynamo/repository.js";
import { getCaller } from "../lib/http/request.js";
import { ok, error, HttpError } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";

/**
 * Control path: GET /me/profile.
 *
 * Returns the authenticated caller's own profile, or 404 when they have not set
 * one yet. Callers can only read themselves; the id comes from the verified JWT.
 */
export const handler: Handler<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2
> = async (event) => {
  try {
    const caller = getCaller(event);
    const profile = await getProfile(caller.userId);
    if (!profile) {
      return error(404, "profile_not_found", "No profile has been set for this user.");
    }
    return ok({ profile });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("get_profile_unhandled", {
      reason: err instanceof Error ? err.name : "unknown",
    });
    return error(500, "internal_error", "Unexpected error loading profile.");
  }
};
