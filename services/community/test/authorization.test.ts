import { describe, expect, it } from "vitest";

import {
  FixedClock,
  LoopinCommunityApplication,
  createMemoryCommunityRepositories,
} from "../src/index";

const now = "2026-07-20T08:00:00.000Z";
const placeId = "tasco:poi:POI001";

function setup() {
  const repositories = createMemoryCommunityRepositories();
  const app = new LoopinCommunityApplication({ repositories, clock: new FixedClock(now) });
  return { app };
}

describe("authorization", () => {
  it("requires moderator privileges to change review moderation state", async () => {
    const { app } = setup();
    const created = await app.upsertPlaceReview(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        tascoPlaceId: placeId,
        rating: 4,
        comment: "Needs moderation.",
        idempotencyKey: "auth-1",
      },
    );
    await expect(app.setReviewModeration(
      { userId: "USER002" },
      { schemaVersion: 1, reviewId: created.review.reviewId, moderationState: "approved" },
    )).rejects.toMatchObject({ code: "forbidden" });

    const moderated = await app.setReviewModeration(
      { userId: "MOD001", isModerator: true },
      { schemaVersion: 1, reviewId: created.review.reviewId, moderationState: "approved" },
    );
    expect(moderated.moderationState).toBe("approved");
  });

  it("allows only the owner to delete a review", async () => {
    const { app } = setup();
    await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 3, comment: null, idempotencyKey: "auth-2" },
    );
    await expect(app.deletePlaceReview({ userId: "USER002" }, placeId)).rejects.toMatchObject({ code: "not-found" });
    await app.deletePlaceReview({ userId: "USER001" }, placeId);
    expect(await app.getMyPlaceReview({ userId: "USER001" }, placeId)).toBeNull();
  });

  it("forbids self-blocking and self-reporting", async () => {
    const { app } = setup();
    await expect(app.blockUser({ userId: "USER001" }, "USER001")).rejects.toMatchObject({ code: "invalid-request" });
    const created = await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 2, comment: null, idempotencyKey: "auth-3" },
    );
    await expect(app.reportContent(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        targetType: "place-review",
        targetId: created.review.reviewId,
        reasonCode: "spam",
        details: null,
        idempotencyKey: "self-report",
      },
    )).rejects.toMatchObject({ code: "invalid-request" });
  });

  it("hides non-approved comments from other viewers while preserving owner visibility", async () => {
    const { app } = setup();
    await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 4, comment: "Pending comment.", idempotencyKey: "auth-4" },
    );
    const ownerList = await app.listPlaceReviews(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, limit: 10, cursor: null },
    );
    expect(ownerList.items[0]?.comment).toBe("Pending comment.");

    const viewerList = await app.listPlaceReviews(
      { userId: "USER002" },
      { schemaVersion: 1, tascoPlaceId: placeId, limit: 10, cursor: null },
    );
    expect(viewerList.items).toHaveLength(0);
  });

  it("keeps private and connections travel presence out of public listings", async () => {
    const { app } = setup();
    await app.upsertTravelPresence(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        city: "Hue",
        approximateStartDate: "2026-10-01",
        approximateEndDate: "2026-10-05",
        interests: ["history"],
        sharedPlaces: [],
        visibility: "connections",
        retentionDays: 30,
        idempotencyKey: "auth-5",
      },
    );
    const listed = await app.listPublicTravelPresence(
      { userId: "USER002" },
      { schemaVersion: 1, city: "Hue", limit: 10, cursor: null },
    );
    expect(listed.items).toHaveLength(0);
    expect(await app.getMyTravelPresence({ userId: "USER001" })).not.toBeNull();
  });
});
