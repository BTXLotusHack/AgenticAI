import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import { AcceptInviteRequest } from "../contracts/invite.js";
import { checkInviteAcceptance } from "../domain/invite.js";
import { buildMembership } from "../domain/team.js";
import { acceptInvite, getInvite } from "../lib/dynamo/repository.js";
import { getCaller, parseBody, pathParam } from "../lib/http/request.js";
import { created, error, HttpError } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";

/**
 * Control path: POST /teams/{teamId}/invites/{inviteId}/accept.
 *
 * The invite token (delivered out-of-band) is the join capability: possession
 * plus a PENDING, unexpired invite lets the authenticated caller join as MEMBER.
 * Token validation is deterministic and constant-time; the write transaction
 * re-checks PENDING to close the accept race. The token is never logged.
 */
export const handler: Handler<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2
> = async (event) => {
  try {
    const caller = getCaller(event);
    const teamId = pathParam(event, "teamId");
    const inviteId = pathParam(event, "inviteId");
    const { token } = parseBody(event, AcceptInviteRequest);

    const invite = await getInvite(teamId, inviteId);
    if (!invite) throw new HttpError(404, "invite_not_found", "Invite not found.");

    const check = checkInviteAcceptance(invite, token);
    if (!check.ok) {
      const status = check.code === "invalid_token" ? 403 : 409;
      throw new HttpError(status, check.code, check.message);
    }

    const membership = buildMembership(teamId, caller.userId, "MEMBER");
    await acceptInvite({ teamId, inviteId }, membership);

    logger.info("invite_accepted", { teamId, inviteId, userId: caller.userId });
    return created({ membership });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("accept_invite_unhandled", { reason: err instanceof Error ? err.name : "unknown" });
    return error(500, "internal_error", "Unexpected error accepting invite.");
  }
};
