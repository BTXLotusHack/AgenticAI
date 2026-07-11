import { timingSafeEqual } from "node:crypto";
import type { CallerIdentity } from "../contracts/common.js";
import type { CreateInviteRequest, Invite, InviteStatus } from "../contracts/invite.js";
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

/** The stored invite fields an acceptance is validated against. */
export interface InviteView {
  status: InviteStatus;
  token: string;
  expiresAt: string;
}

export type AcceptCheck = { ok: true } | { ok: false; code: string; message: string };

/**
 * Pure validation of an accept attempt against the stored invite: the invite
 * must be PENDING, unexpired, and the supplied token must match (constant-time).
 * Deterministic — the transaction re-checks PENDING to close the accept race.
 */
export function checkInviteAcceptance(
  invite: InviteView,
  suppliedToken: string,
  now: Date = new Date(),
): AcceptCheck {
  if (invite.status !== "PENDING") {
    return { ok: false, code: "invite_not_pending", message: "This invite is no longer available." };
  }
  if (new Date(invite.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, code: "invite_expired", message: "This invite has expired." };
  }
  if (!tokensMatch(invite.token, suppliedToken)) {
    return { ok: false, code: "invalid_token", message: "Invite token does not match." };
  }
  return { ok: true };
}

/** Length-safe, constant-time token comparison. Never logs either value. */
function tokensMatch(stored: string, supplied: string): boolean {
  const a = Buffer.from(stored);
  const b = Buffer.from(supplied);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
