import { describe, expect, it } from "vitest";

import {
  CommunityError,
  FixedClock,
  LoopinCommunityApplication,
  MemoryIdempotencyRepository,
  createMemoryCommunityRepositories,
} from "../src/index";

const now = "2026-07-20T08:00:00.000Z";
const placeId = "tasco:poi:POI001";

function setup(clock = new FixedClock(now)) {
  const repositories = createMemoryCommunityRepositories();
  const app = new LoopinCommunityApplication({ repositories, clock });
  return { app, repositories, clock };
}

describe("place reviews", () => {
  it("creates one review per user and place with editable history", async () => {
    const { app } = setup();
    const first = await app.upsertPlaceReview(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        tascoPlaceId: placeId,
        rating: 4,
        comment: "Great rest stop.",
        idempotencyKey: "idem-1",
      },
    );
    expect(first.review.moderationState).toBe("pending");
    expect(first.review.editHistory).toHaveLength(0);

    const second = await app.upsertPlaceReview(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        tascoPlaceId: placeId,
        rating: 5,
        comment: "Even better on the return trip.",
        idempotencyKey: "idem-2",
      },
    );
    expect(second.review.reviewId).toBe(first.review.reviewId);
    expect(second.review.editHistory).toHaveLength(1);
    expect(second.review.editHistory[0]).toMatchObject({ rating: 4, comment: "Great rest stop." });
  });

  it("returns the same review for repeated idempotent upserts", async () => {
    const { app } = setup();
    const payload = {
      schemaVersion: 1 as const,
      tascoPlaceId: placeId,
      rating: 3 as const,
      comment: null,
      idempotencyKey: "idem-repeat",
    };
    const first = await app.upsertPlaceReview({ userId: "USER001" }, payload);
    const second = await app.upsertPlaceReview({ userId: "USER001" }, payload);
    expect(second.review).toEqual(first.review);
  });

  it("rejects idempotency key reuse with a different payload", async () => {
    const { app } = setup();
    await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 3, comment: null, idempotencyKey: "idem-x" },
    );
    await expect(app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 4, comment: null, idempotencyKey: "idem-x" },
    )).rejects.toMatchObject({ code: "conflict" });
  });

  it("computes rating aggregates from approved user-generated reviews only", async () => {
    const { app } = setup();
    await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 5, comment: null, idempotencyKey: "a" },
    );
    await app.upsertPlaceReview(
      { userId: "USER002" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 3, comment: "Noisy.", idempotencyKey: "b" },
    );
    const aggregate = await app.getPlaceRatingAggregate({ userId: "USER003" }, placeId);
    expect(aggregate.reviewCount).toBe(1);
    expect(aggregate.averageRating).toBe(5);
    expect(aggregate.source).toBe("user-generated");
  });

  it("paginates reviews in deterministic createdAtDescReviewIdAsc order", async () => {
    const { app, clock } = setup();
    clock.set("2026-07-20T08:00:01.000Z");
    await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 5, comment: null, idempotencyKey: "1" },
    );
    clock.set("2026-07-20T08:00:02.000Z");
    await app.upsertPlaceReview(
      { userId: "USER002" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 4, comment: null, idempotencyKey: "2" },
    );
    clock.set("2026-07-20T08:00:03.000Z");
    await app.upsertPlaceReview(
      { userId: "USER003" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 3, comment: null, idempotencyKey: "3" },
    );
    await app.setReviewModeration(
      { userId: "MOD001", authSource: "trusted-auth-context", roles: ["community-moderator"] },
      { schemaVersion: 1, reviewId: `review:${placeId}:USER002`, moderationState: "approved" },
    );

    const firstPage = await app.listPlaceReviews(
      { userId: "USER004" },
      { schemaVersion: 1, tascoPlaceId: placeId, limit: 2, cursor: null },
    );
    expect(firstPage.ordering).toBe("createdAtDescReviewIdAsc");
    expect(firstPage.items.map((item) => item.userId)).toEqual(["USER003", "USER002"]);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = await app.listPlaceReviews(
      { userId: "USER004" },
      { schemaVersion: 1, tascoPlaceId: placeId, limit: 2, cursor: firstPage.nextCursor },
    );
    expect(secondPage.items.map((item) => item.userId)).toEqual(["USER001"]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("soft-deletes a review and removes it from aggregates", async () => {
    const { app } = setup();
    await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 5, comment: null, idempotencyKey: "d" },
    );
    await app.deletePlaceReview({ userId: "USER001" }, placeId);
    const aggregate = await app.getPlaceRatingAggregate({ userId: "USER002" }, placeId);
    expect(aggregate.reviewCount).toBe(0);
    expect(await app.getMyPlaceReview({ userId: "USER001" }, placeId)).toBeNull();
  });
});

describe("travel presence", () => {
  it("stores opt-in public presence with approximate dates and optional shared places", async () => {
    const { app } = setup();
    const response = await app.upsertTravelPresence(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        city: "Ha Long",
        approximateStartDate: "2026-08-01",
        approximateEndDate: "2026-08-07",
        interests: ["seafood", "kayaking"],
        sharedPlaces: [{ tascoPlaceId: "tasco:poi:POI001", label: "Bai Chay rest area" }],
        visibility: "public",
        retentionDays: 30,
        idempotencyKey: "presence-1",
      },
    );
    expect(response.presence.visibility).toBe("public");
    expect(response.presence.sharedPlaces).toHaveLength(1);
  });

  it("lists only public, non-expired presence in deterministic order", async () => {
    const { app, clock } = setup();
    await app.upsertTravelPresence(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        city: "Da Nang",
        approximateStartDate: "2026-09-01",
        approximateEndDate: "2026-09-05",
        interests: ["beaches"],
        sharedPlaces: [],
        visibility: "public",
        retentionDays: 90,
        idempotencyKey: "p1",
      },
    );
    await app.upsertTravelPresence(
      { userId: "USER002" },
      {
        schemaVersion: 1,
        city: "Ha Long",
        approximateStartDate: "2026-08-01",
        approximateEndDate: "2026-08-07",
        interests: ["caves"],
        sharedPlaces: [],
        visibility: "private",
        retentionDays: 90,
        idempotencyKey: "p2",
      },
    );
    await app.upsertTravelPresence(
      { userId: "USER003" },
      {
        schemaVersion: 1,
        city: "Ha Long",
        approximateStartDate: "2026-08-01",
        approximateEndDate: "2026-08-07",
        interests: ["boats"],
        sharedPlaces: [],
        visibility: "public",
        retentionDays: 1,
        idempotencyKey: "p3",
      },
    );
    clock.set("2026-07-22T00:00:00.000Z");

    const listed = await app.listPublicTravelPresence(
      { userId: "USER004" },
      { schemaVersion: 1, city: null, limit: 20, cursor: null },
    );
    expect(listed.items.map((item) => item.userId)).toEqual(["USER001"]);
    expect(listed.ordering).toBe("cityAscStartDateAscUserIdAsc");
  });
});

describe("blocking and reporting", () => {
  it("hides blocked users from review and presence listings", async () => {
    const { app } = setup();
    await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 5, comment: null, idempotencyKey: "r1" },
    );
    await app.upsertPlaceReview(
      { userId: "USER002" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 4, comment: null, idempotencyKey: "r2" },
    );
    await app.blockUser({ userId: "USER003" }, "USER001");

    const reviews = await app.listPlaceReviews(
      { userId: "USER003" },
      { schemaVersion: 1, tascoPlaceId: placeId, limit: 20, cursor: null },
    );
    expect(reviews.items.map((item) => item.userId)).toEqual(["USER002"]);
  });

  it("hides authors who blocked the viewer from review and presence listings", async () => {
    const { app } = setup();
    await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 5, comment: null, idempotencyKey: "rb1" },
    );
    await app.upsertTravelPresence(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        city: "Ha Long",
        approximateStartDate: "2026-08-01",
        approximateEndDate: "2026-08-07",
        interests: ["seafood"],
        sharedPlaces: [],
        visibility: "public",
        retentionDays: 30,
        idempotencyKey: "rb-presence",
      },
    );
    await app.blockUser({ userId: "USER001" }, "USER003");

    const reviews = await app.listPlaceReviews(
      { userId: "USER003" },
      { schemaVersion: 1, tascoPlaceId: placeId, limit: 20, cursor: null },
    );
    const presence = await app.listPublicTravelPresence(
      { userId: "USER003" },
      { schemaVersion: 1, city: "Ha Long", limit: 20, cursor: null },
    );
    expect(reviews.items).toHaveLength(0);
    expect(presence.items).toHaveLength(0);
  });

  it("queues reported reviews for moderation", async () => {
    const { app } = setup();
    const created = await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 2, comment: null, idempotencyKey: "report-me" },
    );
    const report = await app.reportContent(
      { userId: "USER002" },
      {
        schemaVersion: 1,
        targetType: "place-review",
        targetId: created.review.reviewId,
        reasonCode: "misleading",
        details: "Not accurate.",
        idempotencyKey: "report-1",
      },
    );
    expect(report.report.status).toBe("open");
    const ownerView = await app.getMyPlaceReview({ userId: "USER001" }, placeId);
    expect(ownerView?.moderationState).toBe("pending");
  });

  it("returns the exact report for repeated idempotent report requests after moderation state changes", async () => {
    const { app, repositories } = setup();
    const created = await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 2, comment: null, idempotencyKey: "report-idem-review" },
    );
    const payload = {
      schemaVersion: 1 as const,
      targetType: "place-review" as const,
      targetId: created.review.reviewId,
      reasonCode: "misleading" as const,
      details: "Not accurate.",
      idempotencyKey: "report-repeat",
    };

    const first = await app.reportContent({ userId: "USER002" }, payload);
    await repositories.reports.save({ ...first.report, status: "resolved" });

    const second = await app.reportContent({ userId: "USER002" }, payload);
    expect(second.report).toEqual({ ...first.report, status: "resolved" });
  });
});

describe("idempotency storage", () => {
  it("keeps scope and idempotency key boundaries distinct when values contain separators", async () => {
    const repository = new MemoryIdempotencyRepository();
    await repository.save("review:USER001", "place:key", {
      fingerprint: "first",
      resultRef: "review-1",
      expiresAt: "2026-07-21T08:00:00.000Z",
    });

    await expect(repository.get("review:USER001:place", "key", now)).resolves.toBeNull();
  });
});

describe("error handling", () => {
  it("throws CommunityError for invalid travel presence privacy fields", async () => {
    const { app } = setup();
    await expect(app.upsertTravelPresence(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        city: "Hotel room 1204",
        approximateStartDate: "2026-08-01",
        approximateEndDate: "2026-08-02",
        interests: ["travel"],
        sharedPlaces: [],
        visibility: "public",
        retentionDays: 30,
        idempotencyKey: "bad-city",
      },
    )).rejects.toBeInstanceOf(CommunityError);
  });
});
