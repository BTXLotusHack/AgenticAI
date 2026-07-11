import { describe, expect, it } from "vitest";
import { buildProfile, DEFAULT_LOCALE } from "../src/domain/profile.js";
import type { CallerIdentity } from "../src/contracts/common.js";

const caller: CallerIdentity = { userId: "u1", email: "driver@example.com" };
const now = new Date("2026-07-12T08:30:00.000Z");

describe("buildProfile", () => {
  it("takes the user id from the caller, never the body", () => {
    const profile = buildProfile({ displayName: "Khanh" }, caller, now);
    expect(profile.userId).toBe("u1");
    expect(profile.updatedAt).toBe("2026-07-12T08:30:00.000Z");
  });

  it("defaults locale when none is supplied", () => {
    const profile = buildProfile({ displayName: "Khanh" }, caller, now);
    expect(profile.locale).toBe(DEFAULT_LOCALE);
  });

  it("keeps optional fields absent rather than null when omitted", () => {
    const profile = buildProfile({ displayName: "Khanh" }, caller, now);
    expect("vehicleType" in profile).toBe(false);
    expect("phone" in profile).toBe(false);
  });

  it("carries through supplied optional fields", () => {
    const profile = buildProfile(
      { displayName: "Khanh", vehicleType: "MOTORCYCLE", phone: "+84900000000", locale: "en-US" },
      caller,
      now,
    );
    expect(profile.vehicleType).toBe("MOTORCYCLE");
    expect(profile.phone).toBe("+84900000000");
    expect(profile.locale).toBe("en-US");
  });
});
