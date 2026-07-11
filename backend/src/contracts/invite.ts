import { z } from "zod";
import { Id, IsoTimestamp } from "./common.js";

/** Body of POST /teams/{teamId}/invites. */
export const CreateInviteRequest = z.object({
  email: z.string().email().trim().toLowerCase(),
});
export type CreateInviteRequest = z.infer<typeof CreateInviteRequest>;

export const InviteStatus = z.enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]);
export type InviteStatus = z.infer<typeof InviteStatus>;

export const Invite = z.object({
  inviteId: Id,
  teamId: Id,
  email: z.string().email(),
  invitedByUserId: Id,
  status: InviteStatus,
  /** Opaque token delivered out-of-band; never logged. */
  token: z.string().min(16),
  createdAt: IsoTimestamp,
  expiresAt: IsoTimestamp,
});
export type Invite = z.infer<typeof Invite>;
