import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Invite } from "../../contracts/invite.js";
import type { Team, TeamMembership } from "../../contracts/team.js";
import { HttpError } from "../http/response.js";
import { ddb, tableName } from "./client.js";
import { keys } from "./keys.js";

/**
 * Persistence for the control plane. Handlers stay thin by delegating all
 * DynamoDB access here. Writes that must be consistent (team + leader
 * membership) use a single transaction.
 */

interface UserMetadata {
  snsEndpointArn?: string;
  email?: string;
}

/** Create a team and its leader membership atomically. Fails if the team exists. */
export async function createTeamWithLeader(
  team: Team,
  leader: TeamMembership,
): Promise<void> {
  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName(),
              Item: {
                ...keys.teamMetadata(team.teamId),
                type: "Team",
                teamId: team.teamId,
                name: team.name,
                leaderUserId: team.leaderUserId,
                createdAt: team.createdAt,
              },
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            Put: {
              TableName: tableName(),
              Item: {
                ...keys.userMembership(leader.userId, leader.teamId),
                type: "Membership",
                teamId: leader.teamId,
                userId: leader.userId,
                role: leader.role,
                joinedAt: leader.joinedAt,
              },
            },
          },
          {
            Put: {
              TableName: tableName(),
              Item: {
                ...keys.teamMember(leader.teamId, leader.userId),
                type: "Membership",
                teamId: leader.teamId,
                userId: leader.userId,
                role: leader.role,
                joinedAt: leader.joinedAt,
              },
            },
          },
        ],
      }),
    );
  } catch (err) {
    if (err instanceof Error && err.name === "TransactionCanceledException") {
      throw new HttpError(409, "team_exists", "A team with this id already exists.");
    }
    throw err;
  }
}

/** Return a caller's role in a team, or null if they are not a member. */
export async function getMembershipRole(
  userId: string,
  teamId: string,
): Promise<TeamMembership["role"] | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: tableName(), Key: keys.userMembership(userId, teamId) }),
  );
  const role = res.Item?.["role"];
  return role === "LEADER" || role === "MEMBER" ? role : null;
}

/** Persist an invite record with a TTL derived from expiresAt. */
export async function putInvite(invite: Invite): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        ...keys.invite(invite.teamId, invite.inviteId),
        type: "Invite",
        inviteId: invite.inviteId,
        teamId: invite.teamId,
        email: invite.email,
        invitedByUserId: invite.invitedByUserId,
        status: invite.status,
        token: invite.token,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        // DynamoDB TTL attribute (epoch seconds) — auto-expires stale invites.
        ttl: Math.floor(new Date(invite.expiresAt).getTime() / 1000),
      },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

/** Look up a user's stored SNS platform endpoint for push delivery. */
export async function getUserSnsEndpoint(userId: string): Promise<string | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: tableName(),
      Key: { PK: `USER#${userId}`, SK: "METADATA" },
    }),
  );
  const meta = res.Item as UserMetadata | undefined;
  return meta?.snsEndpointArn ?? null;
}

/** List a team's members (team-perspective query). */
export async function listTeamMembers(teamId: string): Promise<TeamMembership[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `TEAM#${teamId}`, ":sk": "MEMBER#" },
    }),
  );
  return (res.Items ?? []).map((item) => ({
    teamId: item["teamId"] as string,
    userId: item["userId"] as string,
    role: item["role"] as TeamMembership["role"],
    joinedAt: item["joinedAt"] as string,
  }));
}
