import type { CallerIdentity } from "../contracts/common.js";
import type { CreateInviteRequest, Invite } from "../contracts/invite.js";
import { newInviteId, newInviteToken } from "../lib/ids.js";

/** Invites live for a fixed window; expiry is enforced by DynamoDB TTL. */
export const INVITE_TTL_HOURS = 72;

export function buildInvite(
  teamId: string,
  request: CreateInviteRequest,
  caller: CallerIdentity,
  now: Date = new Date(),
): Invite {
  const expiresAt = new Date(now.getTime() + INVITE_TTL_HOURS * 3600 * 1000);
  return {
    inviteId: newInviteId(),
    teamId,
    email: request.email,
    invitedByUserId: caller.userId,
    status: "PENDING",
    token: newInviteToken(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
