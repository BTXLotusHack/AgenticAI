import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Invite } from "../../contracts/invite.js";
import type { UserProfile } from "../../contracts/profile.js";
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
    new GetCommand({ TableName: tableName(), Key: keys.userMetadata(userId) }),
  );
  const meta = res.Item as UserMetadata | undefined;
  return meta?.snsEndpointArn ?? null;
}

/**
 * Upsert the caller's profile onto their USER#<id>/METADATA item.
 *
 * Uses an UpdateExpression (not Put) so profile writes never clobber other
 * attributes on the shared item — notably `snsEndpointArn` written by the push
 * flow. Optional fields the caller omitted are REMOVEd so the stored profile
 * reflects exactly what was submitted (PUT replace semantics). `type` is a
 * DynamoDB reserved word, hence the name placeholder.
 */
export async function putProfile(profile: UserProfile): Promise<void> {
  const sets = [
    "#type = :type",
    "userId = :userId",
    "displayName = :displayName",
    "locale = :locale",
    "updatedAt = :updatedAt",
  ];
  const removes: string[] = [];
  const values: Record<string, unknown> = {
    ":type": "User",
    ":userId": profile.userId,
    ":displayName": profile.displayName,
    ":locale": profile.locale,
    ":updatedAt": profile.updatedAt,
  };

  if (profile.vehicleType !== undefined) {
    sets.push("vehicleType = :vehicleType");
    values[":vehicleType"] = profile.vehicleType;
  } else {
    removes.push("vehicleType");
  }
  if (profile.phone !== undefined) {
    sets.push("phone = :phone");
    values[":phone"] = profile.phone;
  } else {
    removes.push("phone");
  }

  const updateExpression =
    `SET ${sets.join(", ")}` + (removes.length ? ` REMOVE ${removes.join(", ")}` : "");

  await ddb.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: keys.userMetadata(profile.userId),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: values,
    }),
  );
}

/** Read the caller's profile, or null when they have not set one yet. */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: tableName(), Key: keys.userMetadata(userId) }),
  );
  const item = res.Item;
  // A user item may exist for push only (snsEndpointArn) without a profile;
  // treat a missing displayName as "no profile set".
  if (!item || typeof item["displayName"] !== "string") return null;
  return {
    userId,
    displayName: item["displayName"] as string,
    vehicleType: item["vehicleType"] as UserProfile["vehicleType"],
    phone: item["phone"] as string | undefined,
    locale: (item["locale"] as string | undefined) ?? "vi-VN",
    updatedAt: item["updatedAt"] as string,
  };
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
