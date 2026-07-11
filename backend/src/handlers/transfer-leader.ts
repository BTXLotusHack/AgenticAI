import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import { TransferLeaderRequest } from "../contracts/team.js";
import { getMembershipRole, transferLeadership } from "../lib/dynamo/repository.js";
import { getCaller, parseBody, pathParam } from "../lib/http/request.js";
import { ok, error, HttpError } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";

/**
 * Control path: PUT /teams/{teamId}/leader.
 *
 * Only the current leader may transfer leadership. The target is promoted to
 * LEADER and the caller demoted to MEMBER in one transaction; the write is
 * conditioned on the caller still being leader and the target being a member.
 */
export const handler: Handler<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2
> = async (event) => {
  try {
    const caller = getCaller(event);
    const teamId = pathParam(event, "teamId");
    const { userId: newLeaderId } = parseBody(event, TransferLeaderRequest);

    if (newLeaderId === caller.userId) {
      throw new HttpError(400, "already_leader", "You are already the leader of this team.");
    }

    const role = await getMembershipRole(caller.userId, teamId);
    if (role !== "LEADER") {
      throw new HttpError(403, "forbidden", "Only the current leader can transfer leadership.");
    }

    await transferLeadership(teamId, caller.userId, newLeaderId);

    logger.info("leadership_transferred", { teamId, fromUserId: caller.userId, toUserId: newLeaderId });
    return ok({ teamId, leaderUserId: newLeaderId });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("transfer_leader_unhandled", { reason: err instanceof Error ? err.name : "unknown" });
    return error(500, "internal_error", "Unexpected error transferring leadership.");
  }
};
