import { describe, expect, it } from "vitest";
import { keys } from "../src/lib/dynamo/keys.js";

describe("single-table keys", () => {
  it("builds team metadata key", () => {
    expect(keys.teamMetadata("t1")).toEqual({ PK: "TEAM#t1", SK: "METADATA" });
  });

  it("builds user-perspective membership key", () => {
    expect(keys.userMembership("u1", "t1")).toEqual({ PK: "USER#u1", SK: "TEAM#t1" });
  });

  it("builds team-perspective member key", () => {
    expect(keys.teamMember("t1", "u1")).toEqual({ PK: "TEAM#t1", SK: "MEMBER#u1" });
  });

  it("builds invite key", () => {
    expect(keys.invite("t1", "i1")).toEqual({ PK: "TEAM#t1", SK: "INVITE#i1" });
  });
});
