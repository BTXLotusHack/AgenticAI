import { describe, expect, it } from "vitest";
import { buildTeam } from "../src/domain/team.js";
import { buildInvite, INVITE_TTL_HOURS } from "../src/domain/invite.js";
import type { CallerIdentity } from "../src/contracts/common.js";

const caller: CallerIdentity = { userId: "u1", email: "leader@example.com" };
const now = new Date("2026-07-11T10:00:00.000Z");

describe("buildTeam", () => {
  it("makes the caller the leader and shares one team id", () => {
    const { team, leader } = buildTeam({ name: "Road Trip" }, caller, now);
    expect(team.leaderUserId).toBe("u1");
    expect(leader.role).toBe("LEADER");
    expect(leader.teamId).toBe(team.teamId);
    expect(team.createdAt).toBe("2026-07-11T10:00:00.000Z");
  });

  it("generates distinct team ids across calls", () => {
    const a = buildTeam({ name: "A" }, caller, now).team.teamId;
    const b = buildTeam({ name: "B" }, caller, now).team.teamId;
    expect(a).not.toBe(b);
  });
});

describe("buildInvite", () => {
  it("sets a pending status, a token and a TTL window", () => {
    const invite = buildInvite("t1", { email: "member@example.com" }, caller, now);
    expect(invite.status).toBe("PENDING");
    expect(invite.token.length).toBeGreaterThanOrEqual(16);
    const deltaHours =
      (new Date(invite.expiresAt).getTime() - new Date(invite.createdAt).getTime()) / 3600000;
    expect(deltaHours).toBe(INVITE_TTL_HOURS);
  });
});
