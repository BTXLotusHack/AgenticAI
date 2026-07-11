import { z } from "zod";
import { Id, IsoTimestamp } from "./common.js";

export const TeamRole = z.enum(["LEADER", "MEMBER"]);
export type TeamRole = z.infer<typeof TeamRole>;

/** Body of POST /teams. */
export const CreateTeamRequest = z.object({
  name: z.string().min(2).max(80).trim(),
});
export type CreateTeamRequest = z.infer<typeof CreateTeamRequest>;

export const Team = z.object({
  teamId: Id,
  name: z.string(),
  leaderUserId: Id,
  createdAt: IsoTimestamp,
});
export type Team = z.infer<typeof Team>;

export const TeamMembership = z.object({
  teamId: Id,
  userId: Id,
  role: TeamRole,
  joinedAt: IsoTimestamp,
});
export type TeamMembership = z.infer<typeof TeamMembership>;

/** Body of PUT /teams/{teamId}/leader — the member to promote to LEADER. */
export const TransferLeaderRequest = z.object({
  userId: Id,
});
export type TransferLeaderRequest = z.infer<typeof TransferLeaderRequest>;
