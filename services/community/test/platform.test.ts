import { describe, expect, it } from "vitest";

import {
  FixedClock,
  LoopinCommunityApplication,
  createMemoryCommunityRepositories,
} from "../src/index";

const now = "2026-07-20T08:00:00.000Z";
const placeId = "tasco:poi:POI001";

function setup(clock = new FixedClock(now)) {
  const repositories = createMemoryCommunityRepositories();
  const app = new LoopinCommunityApplication({ repositories, clock });
  return { app, repositories, clock };
}

const trustedModerator = {
  userId: "MOD001",
  authSource: "trusted-auth-context" as const,
  roles: ["community-moderator" as const],
};

describe("profile and privacy platform", () => {
  it("stores the viewer travel profile without accepting another user id", async () => {
    const { app } = setup();

    const updated = await app.updateMyProfile(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        displayName: "Mai",
        homeCity: "Ha Noi",
        travelStyles: ["family trips", "food stops"],
        interests: ["seafood", "quiet routes"],
        preferredLanguages: ["vi", "en"],
        dietaryPreferences: ["vegetarian-friendly"],
        accessibilityPreferences: ["step-free stops"],
      },
    );

    expect(updated.profile).toMatchObject({
      userId: "USER001",
      displayName: "Mai",
      homeCity: "Ha Noi",
    });
    await expect(app.updateMyProfile(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        userId: "USER999",
        displayName: "Imposter",
        homeCity: null,
        travelStyles: [],
        interests: [],
        preferredLanguages: ["en"],
        dietaryPreferences: [],
        accessibilityPreferences: [],
      },
    )).rejects.toMatchObject({ code: "invalid-request" });
    await expect(app.getMyProfile({ userId: "USER001" })).resolves.toEqual(updated.profile);
  });

  it("updates privacy policy and applies the block list to community reads", async () => {
    const { app } = setup();
    await app.upsertPlaceReview(
      { userId: "USER002" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 5, comment: null, idempotencyKey: "blocked-review" },
    );

    const updated = await app.updateMyPrivacy(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        tripVisibility: "leader-only",
        placePresenceVisibility: "private",
        retentionPreference: "minimal",
        blockedUserIds: ["USER002"],
      },
    );

    expect(updated.policy).toMatchObject({
      userId: "USER001",
      tripVisibility: "leader-only",
      placePresenceVisibility: "private",
      retentionPreference: "minimal",
      blockedUserIds: ["USER002"],
    });
    const reviews = await app.listPlaceReviews(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, limit: 20, cursor: null },
    );
    expect(reviews.items).toHaveLength(0);
  });
});

describe("community summaries and place presence", () => {
  it("summarizes user-generated place ratings separately from Tasco facts", async () => {
    const { app } = setup();
    await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 5, comment: "Clean stop.", idempotencyKey: "summary-1" },
    );
    await app.setReviewModeration(
      trustedModerator,
      { schemaVersion: 1, reviewId: `review:${placeId}:USER001`, moderationState: "approved" },
    );
    await app.upsertPlaceReview(
      { userId: "USER002" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 3, comment: null, idempotencyKey: "summary-2" },
    );

    const summary = await app.getPlaceCommunitySummary({ userId: "USER002" }, placeId);
    expect(summary).toEqual({
      schemaVersion: 1,
      tascoPlaceId: placeId,
      averageRating: 4,
      reviewCount: 2,
      commentCount: 1,
      viewerCanReview: true,
      viewerHasReviewed: true,
      source: "user-generated",
    });
  });

  it("lists opt-in place presence for a Tasco place without exposing private presence", async () => {
    const { app } = setup();
    await app.upsertTravelPresence(
      { userId: "USER001" },
      {
        schemaVersion: 1,
        city: "Ha Long",
        approximateStartDate: "2026-08-01",
        approximateEndDate: "2026-08-07",
        interests: ["seafood"],
        sharedPlaces: [{ tascoPlaceId: placeId, label: "Bai Chay stop" }],
        visibility: "public",
        retentionDays: 30,
        idempotencyKey: "presence-place-1",
      },
    );
    await app.upsertTravelPresence(
      { userId: "USER002" },
      {
        schemaVersion: 1,
        city: "Ha Long",
        approximateStartDate: "2026-08-01",
        approximateEndDate: "2026-08-07",
        interests: ["coffee"],
        sharedPlaces: [{ tascoPlaceId: placeId, label: "Private stop" }],
        visibility: "private",
        retentionDays: 30,
        idempotencyKey: "presence-place-2",
      },
    );

    const listed = await app.listPlacePresence(
      { userId: "USER003" },
      { schemaVersion: 1, tascoPlaceId: placeId, limit: 20, cursor: null },
    );
    expect(listed.items.map((item) => item.userId)).toEqual(["USER001"]);
  });
});

describe("moderation reports", () => {
  it("lists open reports and resolves them only for trusted moderators", async () => {
    const { app } = setup();
    const created = await app.upsertPlaceReview(
      { userId: "USER001" },
      { schemaVersion: 1, tascoPlaceId: placeId, rating: 1, comment: null, idempotencyKey: "moderation-review" },
    );
    const report = await app.reportContent(
      { userId: "USER002" },
      {
        schemaVersion: 1,
        targetType: "place-review",
        targetId: created.review.reviewId,
        reasonCode: "misleading",
        details: "Wrong place.",
        idempotencyKey: "moderation-report",
      },
    );

    await expect(app.listModerationReports(
      { userId: "USER003", isModerator: true },
      { schemaVersion: 1, status: "open", limit: 20, cursor: null },
    )).rejects.toMatchObject({ code: "forbidden" });

    const listed = await app.listModerationReports(
      trustedModerator,
      { schemaVersion: 1, status: "open", limit: 20, cursor: null },
    );
    expect(listed.items.map((item) => item.reportId)).toEqual([report.report.reportId]);

    const resolved = await app.applyModerationAction(
      trustedModerator,
      {
        schemaVersion: 1,
        reportId: report.report.reportId,
        action: "resolve-report",
        reviewModerationState: "hidden",
      },
    );
    expect(resolved.report).toMatchObject({
      reportId: report.report.reportId,
      status: "resolved",
      resolution: "resolve-report",
      resolvedByUserId: "MOD001",
    });
    await expect(app.listModerationReports(
      trustedModerator,
      { schemaVersion: 1, status: "open", limit: 20, cursor: null },
    )).resolves.toMatchObject({ items: [] });
  });
});
