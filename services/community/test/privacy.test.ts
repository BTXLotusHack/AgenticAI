import { describe, expect, it } from "vitest";

import type { PlaceReviewV1, TravelPresenceV1 } from "../src/contracts";
import {
  assertPublicPayloadHasNoPrivateFields,
  assertTravelPresenceInputSafe,
  toPublicPresence,
  toPublicReview,
  usersBlocked,
} from "../src/privacy";

const review: PlaceReviewV1 = {
  schemaVersion: 1,
  reviewId: "review:1",
  tascoPlaceId: "tasco:poi:POI001",
  userId: "USER001",
  rating: 5,
  comment: "Safe stop.",
  moderationState: "approved",
  editHistory: [],
  createdAt: "2026-07-20T08:00:00.000Z",
  updatedAt: "2026-07-20T08:00:00.000Z",
  deletedAt: null,
  expiresAt: null,
  source: "user-generated",
};

const presence: TravelPresenceV1 = {
  schemaVersion: 1,
  presenceId: "presence:USER001",
  userId: "USER001",
  city: "Ha Long",
  approximateStartDate: "2026-08-01",
  approximateEndDate: "2026-08-07",
  interests: ["seafood"],
  sharedPlaces: [{ tascoPlaceId: "tasco:poi:POI001", label: "Rest area" }],
  visibility: "public",
  createdAt: "2026-07-20T08:00:00.000Z",
  updatedAt: "2026-07-20T08:00:00.000Z",
  deletedAt: null,
  expiresAt: "2026-12-31T00:00:00.000Z",
};

describe("privacy sanitization", () => {
  it("never exposes private review states publicly", () => {
    expect(toPublicReview({ ...review, moderationState: "pending" })).toBeNull();
    expect(toPublicReview({ ...review, deletedAt: "2026-07-21T00:00:00.000Z" })).toBeNull();
    const publicReview = toPublicReview(review);
    expect(publicReview?.source).toBe("user-generated");
    expect(() => assertPublicPayloadHasNoPrivateFields(publicReview)).not.toThrow();
  });

  it("never exposes private or expired travel presence publicly", () => {
    expect(toPublicPresence({ ...presence, visibility: "private" }, presence.createdAt)).toBeNull();
    expect(toPublicPresence(presence, "2027-01-01T00:00:00.000Z")).toBeNull();
    const publicPresence = toPublicPresence(presence, presence.createdAt);
    expect(publicPresence).toMatchObject({
      city: "Ha Long",
      approximateStartDate: "2026-08-01",
      approximateEndDate: "2026-08-07",
    });
    expect(publicPresence).not.toHaveProperty("visibility");
    expect(publicPresence).not.toHaveProperty("expiresAt");
    expect(() => assertPublicPayloadHasNoPrivateFields(publicPresence)).not.toThrow();
  });

  it("rejects travel presence input that references exact accommodation or itinerary details", () => {
    expect(() => assertTravelPresenceInputSafe({
      schemaVersion: 1,
      city: "Ha Long",
      approximateStartDate: "2026-08-01",
      approximateEndDate: "2026-08-07",
      interests: ["full itinerary for every stop"],
      sharedPlaces: [],
      visibility: "public",
      retentionDays: 30,
      idempotencyKey: "privacy-1",
    })).toThrow();

    expect(() => assertTravelPresenceInputSafe({
      schemaVersion: 1,
      city: "Ha Long",
      approximateStartDate: "2026-08-01",
      approximateEndDate: "2026-08-07",
      interests: ["food"],
      sharedPlaces: [{ tascoPlaceId: "tasco:poi:POI001", label: "latitude 20.95" }],
      visibility: "public",
      retentionDays: 30,
      idempotencyKey: "privacy-2",
    })).toThrow();
  });

  it("rejects serialized public payloads that contain forbidden private location keys", () => {
    expect(() => assertPublicPayloadHasNoPrivateFields({
      city: "Ha Long",
      latitude: 20.95,
    })).toThrow();
  });

  it("does not reject harmless public text that mentions a forbidden key word", () => {
    expect(() => assertPublicPayloadHasNoPrivateFields({
      schemaVersion: 1,
      comment: "latitude",
    })).not.toThrow();
  });

  it("treats either blocking direction as private between viewer and author", () => {
    expect(usersBlocked(
      "VIEWER001",
      "AUTHOR001",
      new Set(["AUTHOR001"]),
      new Set(),
    )).toBe(true);
    expect(usersBlocked(
      "VIEWER001",
      "AUTHOR001",
      new Set(),
      new Set(["AUTHOR001"]),
    )).toBe(true);
    expect(usersBlocked(
      "VIEWER001",
      "VIEWER001",
      new Set(["VIEWER001"]),
      new Set(["VIEWER001"]),
    )).toBe(false);
  });
});
