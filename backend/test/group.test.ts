import { describe, expect, it } from "vitest";
import { buildMembership } from "../src/domain/team.js";
import { checkInviteAcceptance, type InviteView } from "../src/domain/invite.js";

const now = new Date("2026-07-12T10:00:00.000Z");

describe("buildMembership", () => {
  it("stamps the role and join time", () => {
    const m = buildMembership("t1", "u2", "MEMBER", now);
    expect(m).toEqual({
      teamId: "t1",
      userId: "u2",
      role: "MEMBER",
      joinedAt: "2026-07-12T10:00:00.000Z",
    });
  });
});

describe("checkInviteAcceptance", () => {
  const base: InviteView = {
    status: "PENDING",
    token: "the-real-token-abcdef",
    expiresAt: "2026-07-13T10:00:00.000Z",
  };

  it("accepts a pending, unexpired invite with the matching token", () => {
    expect(checkInviteAcceptance(base, "the-real-token-abcdef", now)).toEqual({ ok: true });
  });

  it("rejects a token that does not match", () => {
    const res = checkInviteAcceptance(base, "wrong-token-abcdef123", now);
    expect(res).toMatchObject({ ok: false, code: "invalid_token" });
  });

  it("rejects a token of a different length without throwing", () => {
    const res = checkInviteAcceptance(base, "short", now);
    expect(res).toMatchObject({ ok: false, code: "invalid_token" });
  });

  it("rejects an expired invite", () => {
    const res = checkInviteAcceptance(base, "the-real-token-abcdef", new Date("2026-07-14T00:00:00.000Z"));
    expect(res).toMatchObject({ ok: false, code: "invite_expired" });
  });

  it("rejects an invite that is not pending", () => {
    const res = checkInviteAcceptance({ ...base, status: "ACCEPTED" }, "the-real-token-abcdef", now);
    expect(res).toMatchObject({ ok: false, code: "invite_not_pending" });
  });
});
