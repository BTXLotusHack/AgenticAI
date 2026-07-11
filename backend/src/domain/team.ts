import type { CallerIdentity } from "../contracts/common.js";
import type { CreateTeamRequest, Team, TeamMembership } from "../contracts/team.js";
import { newTeamId } from "../lib/ids.js";

/** Build the team aggregate and its leader membership from a validated request. */
export function buildTeam(
  request: CreateTeamRequest,
  caller: CallerIdentity,
  now: Date = new Date(),
): { team: Team; leader: TeamMembership } {
  const teamId = newTeamId();
  const iso = now.toISOString();
  return {
    team: {
      teamId,
      name: request.name,
      leaderUserId: caller.userId,
      createdAt: iso,
    },
    leader: {
      teamId,
      userId: caller.userId,
      role: "LEADER",
      joinedAt: iso,
    },
  };
}
