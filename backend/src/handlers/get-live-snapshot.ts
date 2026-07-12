import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import { getMembershipRole } from "../lib/dynamo/repository.js";
import { loadLiveSnapshot } from "../lib/dynamo/live-state.js";
import { getCaller, pathParam } from "../lib/http/request.js";
import { error, HttpError, ok } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";

/**
 * Control path: GET /teams/{teamId}/live-snapshot.
 *
 * The realtime subscription publishes revision events only; clients refetch
 * this authorized snapshot to render member positions, graph edges, freshness
 * and confidence. `teamId` is the current deployed trip/channel id.
 */
export const handler: Handler<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2
> = async (event) => {
  try {
    const caller = getCaller(event);
    const teamId = pathParam(event, "teamId");

    const role = await getMembershipRole(caller.userId, teamId);
    if (!role) {
      throw new HttpError(403, "forbidden", "Only team members can view the live map.");
    }

    const snapshot = await loadLiveSnapshot(teamId);
    return ok({ snapshot });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("get_live_snapshot_unhandled", {
      reason: err instanceof Error ? err.name : "unknown",
    });
    return error(500, "internal_error", "Unexpected error loading live snapshot.");
  }
};
