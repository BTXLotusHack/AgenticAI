import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import { getMembershipRole, removeMembership } from "../lib/dynamo/repository.js";
import { getCaller, pathParam } from "../lib/http/request.js";
import { ok, error, HttpError } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";

/**
 * Control path: DELETE /teams/{teamId}/members/{userId}.
 *
 * One route serves both cases:
 *  - Leaving: {userId} is the caller. Any member may leave, except the leader,
 *    who must transfer leadership first (avoids a leaderless team).
 *  - Removing: {userId} is someone else. Only the leader may remove a member.
 * With the single-leader model the leader is always the caller here, so no
 * separate "cannot remove the leader" case arises.
 */
export const handler: Handler<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2
> = async (event) => {
  try {
    const caller = getCaller(event);
    const teamId = pathParam(event, "teamId");
    const targetUserId = pathParam(event, "userId");

    const callerRole = await getMembershipRole(caller.userId, teamId);
    if (!callerRole) {
      throw new HttpError(403, "forbidden", "You are not a member of this team.");
    }

    const isSelf = targetUserId === caller.userId;
    if (isSelf) {
      if (callerRole === "LEADER") {
        throw new HttpError(409, "leader_must_transfer", "Transfer leadership before leaving the team.");
      }
    } else if (callerRole !== "LEADER") {
      throw new HttpError(403, "forbidden", "Only the leader can remove other members.");
    }

    await removeMembership(teamId, targetUserId);

    logger.info(isSelf ? "member_left" : "member_removed", {
      teamId,
      targetUserId,
      byUserId: caller.userId,
    });
    return ok({ teamId, userId: targetUserId, removed: true });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("remove_member_unhandled", { reason: err instanceof Error ? err.name : "unknown" });
    return error(500, "internal_error", "Unexpected error removing member.");
  }
};
