import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import { getMembershipRole, listTeamMembers } from "../lib/dynamo/repository.js";
import { getCaller, pathParam } from "../lib/http/request.js";
import { ok, error, HttpError } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";

/**
 * Control path: GET /teams/{teamId}/members.
 *
 * Returns the team roster. Only a member of the team may read it; the caller's
 * own membership is the authorization check.
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
      throw new HttpError(403, "forbidden", "Only team members can view the roster.");
    }

    const members = await listTeamMembers(teamId);
    return ok({ members });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("list_team_members_unhandled", { reason: err instanceof Error ? err.name : "unknown" });
    return error(500, "internal_error", "Unexpected error listing members.");
  }
};
