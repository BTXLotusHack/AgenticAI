/**
 * Single-table key builders.
 *
 * All access patterns are expressed as PK/SK pairs so one table serves every
 * query without JOINs. Keep every key format in this file so the schema is
 * auditable in one place.
 *
 *   Team metadata     PK = TEAM#<teamId>   SK = METADATA
 *   User metadata     PK = USER#<userId>   SK = METADATA          (profile + push)
 *   Membership        PK = USER#<userId>   SK = TEAM#<teamId>     (role on item)
 *   Team's members    PK = TEAM#<teamId>   SK = MEMBER#<userId>
 *   Invite            PK = TEAM#<teamId>   SK = INVITE#<inviteId>
 */
export const keys = {
  teamMetadata: (teamId: string) => ({ PK: `TEAM#${teamId}`, SK: "METADATA" }),

  /** One item per user: profile fields plus push endpoint / identity. */
  userMetadata: (userId: string) => ({ PK: `USER#${userId}`, SK: "METADATA" }),

  /** Membership from the user's perspective (list a user's teams). */
  userMembership: (userId: string, teamId: string) => ({
    PK: `USER#${userId}`,
    SK: `TEAM#${teamId}`,
  }),

  /** Membership from the team's perspective (list a team's members). */
  teamMember: (teamId: string, userId: string) => ({
    PK: `TEAM#${teamId}`,
    SK: `MEMBER#${userId}`,
  }),

  invite: (teamId: string, inviteId: string) => ({
    PK: `TEAM#${teamId}`,
    SK: `INVITE#${inviteId}`,
  }),
} as const;

/** SK prefixes for begins_with queries. */
export const skPrefix = {
  member: "MEMBER#",
  invite: "INVITE#",
  team: "TEAM#",
} as const;
