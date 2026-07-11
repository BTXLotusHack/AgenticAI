<<<<<<< Updated upstream
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
=======
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
>>>>>>> Stashed changes
import { CreateInviteRequest } from "../contracts/invite.js";
import { buildInvite } from "../domain/invite.js";
import {
  getMembershipRole,
  getUserSnsEndpoint,
  putInvite,
} from "../lib/dynamo/repository.js";
import { sendPush } from "../lib/sns/push.js";
import { getCaller, parseBody, pathParam } from "../lib/http/request.js";
import { created, error, HttpError } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";

/**
 * Control path: POST /teams/{teamId}/invites.
 *
 * Requires the caller to be the team LEADER. Persists an invite record with a
 * TTL, then emits a best-effort high-priority push alert to the inviter's
 * device confirming the invitation was sent.
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
    const teamId = pathParam(event, "teamId");
    const request = parseBody(event, CreateInviteRequest);

    const role = await getMembershipRole(caller.userId, teamId);
    if (role !== "LEADER") {
      throw new HttpError(403, "forbidden", "Only a team leader can invite members.");
    }

    const invite = buildInvite(teamId, request, caller);
    await putInvite(invite);

    // Downstream push notification (Feature 4). Best-effort — never fails the
    // invite transaction. The token itself is delivered out-of-band, not pushed.
    const endpoint = await getUserSnsEndpoint(caller.userId);
    if (endpoint) {
      await sendPush(endpoint, {
        targetUserId: caller.userId,
        title: "Invitation sent",
        body: `Invitation to ${invite.email} is pending.`,
        data: { teamId, inviteId: invite.inviteId },
      });
    }

    logger.info("invite_created", { teamId, inviteId: invite.inviteId });
    return created({
      invite: {
        inviteId: invite.inviteId,
        teamId: invite.teamId,
        email: invite.email,
        status: invite.status,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("invite_user_unhandled", { reason: err instanceof Error ? err.name : "unknown" });
    return error(500, "internal_error", "Unexpected error creating invite.");
  }
};
