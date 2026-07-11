<<<<<<< Updated upstream
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
=======
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
>>>>>>> Stashed changes
import { CreateTeamRequest } from "../contracts/team.js";
import { buildTeam } from "../domain/team.js";
import { createTeamWithLeader } from "../lib/dynamo/repository.js";
import { getCaller, parseBody } from "../lib/http/request.js";
import { created, error, HttpError } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";

/**
 * Control path: POST /teams.
 *
 * Cognito (via the API Gateway JWT authorizer) has already authenticated the
 * caller; the caller becomes the team LEADER. Thin handler: authenticate,
 * validate, build the aggregate, persist atomically, map the result.
 */
<<<<<<< Updated upstream
export const handler: Handler<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2
> = async (event) => {
=======
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
>>>>>>> Stashed changes
  try {
    const caller = getCaller(event);
    const request = parseBody(event, CreateTeamRequest);

    const { team, leader } = buildTeam(request, caller);
    await createTeamWithLeader(team, leader);

    logger.info("team_created", { teamId: team.teamId, leaderUserId: caller.userId });
    return created({ team });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("create_team_unhandled", { reason: err instanceof Error ? err.name : "unknown" });
    return error(500, "internal_error", "Unexpected error creating team.");
  }
};
