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

  it("builds current live-state keys under the trip partition", () => {
    expect(keys.liveSnapshot("TRIP001")).toEqual({ PK: "TRIP#TRIP001", SK: "LIVE#SNAPSHOT" });
    expect(keys.liveTripState("TRIP001")).toEqual({ PK: "TRIP#TRIP001", SK: "LIVE#STATE" });
    expect(keys.liveMember("TRIP001", "M004")).toEqual({ PK: "TRIP#TRIP001", SK: "LIVE#MEMBER#M004" });
    expect(keys.telemetryEvent("TRIP001", "gps:30:M004")).toEqual({
      PK: "TRIP#TRIP001",
      SK: "TELEMETRY_EVENT#gps:30:M004",
    });
    expect(keys.realtimeEvent("TRIP001", 12, "driverAlertIssued:M004")).toEqual({
      PK: "TRIP#TRIP001",
      SK: "REALTIME#0000000012#driverAlertIssued:M004",
    });
  });
});
