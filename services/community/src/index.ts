import { randomUUID } from "node:crypto";

import { calculatePlaceAggregate } from "./aggregates";
import {
  BlockUserRequestV1Schema,
  CommunityIdentitySchema,
  ListPlaceReviewsRequestV1Schema,
  ListPlaceReviewsResponseV1Schema,
  ListTravelPresenceRequestV1Schema,
  ListTravelPresenceResponseV1Schema,
  PlaceRatingAggregateV1Schema,
  PlaceReviewV1Schema,
  ReportContentRequestV1Schema,
  ReportContentResponseV1Schema,
  SetReviewModerationRequestV1Schema,
  TravelPresenceV1Schema,
  UpsertPlaceReviewRequestV1Schema,
  UpsertPlaceReviewResponseV1Schema,
  UpsertTravelPresenceRequestV1Schema,
  UpsertTravelPresenceResponseV1Schema,
  type CommunityIdentity,
  type ListPlaceReviewsRequestV1,
  type ListTravelPresenceRequestV1,
  type PlaceReviewV1,
  type PublicPlaceReviewV1,
  type ReportContentRequestV1,
  type SetReviewModerationRequestV1,
  type UpsertPlaceReviewRequestV1,
  type UpsertTravelPresenceRequestV1,
} from "./contracts";
import { CommunityError } from "./errors";
import {
  comparePresence,
  compareReviews,
  decodePresenceCursor,
  decodeReviewCursor,
  encodePresenceCursor,
  encodeReviewCursor,
  PRESENCE_ORDERING,
  REVIEW_ORDERING,
  presenceAfterCursor,
  reviewAfterCursor,
} from "./ordering";
import {
  assertPublicPayloadHasNoPrivateFields,
  assertTravelPresenceInputSafe,
  authorVisibleToViewer,
  createViewerPrivacyContext,
  toPublicPresence,
  toPublicReview,
} from "./privacy";
import type { Clock, CommunityRepositories } from "./repositories";

type CommunityDependencies = {
  readonly repositories: CommunityRepositories;
  readonly clock: Clock;
};

function requireModerator(identity: CommunityIdentity): void {
  if (!identity.isModerator) {
    throw new CommunityError("forbidden", "Moderator privileges are required.");
  }
}

function initialModerationState(comment: string | null): PlaceReviewV1["moderationState"] {
  return comment && comment.trim().length > 0 ? "pending" : "approved";
}

function idempotencyExpiresAt(now: string): string {
  return new Date(Date.parse(now) + 24 * 60 * 60_000).toISOString();
}

export class LoopinCommunityApplication {
  constructor(private readonly dependencies: CommunityDependencies) {}

  async upsertPlaceReview(
    identity: CommunityIdentity,
    rawRequest: UpsertPlaceReviewRequestV1,
  ) {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const request = UpsertPlaceReviewRequestV1Schema.parse(rawRequest);
    const now = this.dependencies.clock.now();
    const scope = `review:${parsedIdentity.userId}:${request.tascoPlaceId}`;
    const fingerprint = JSON.stringify({
      tascoPlaceId: request.tascoPlaceId,
      rating: request.rating,
      comment: request.comment,
    });
    const existingIdempotency = await this.dependencies.repositories.idempotency.get(scope, request.idempotencyKey, now);
    if (existingIdempotency) {
      if (existingIdempotency.fingerprint !== fingerprint) {
        throw new CommunityError("conflict", "The idempotency key was already used for a different review payload.");
      }
      const review = await this.dependencies.repositories.reviews.getById(existingIdempotency.resultRef);
      if (!review) throw new CommunityError("conflict", "The prior idempotent review result is unavailable.");
      return UpsertPlaceReviewResponseV1Schema.parse({ schemaVersion: 1, review });
    }

    const existing = await this.dependencies.repositories.reviews.getByUserAndPlace({
      tascoPlaceId: request.tascoPlaceId,
      userId: parsedIdentity.userId,
    });
    let review: PlaceReviewV1;
    if (existing) {
      if (existing.deletedAt) {
        throw new CommunityError("conflict", "Deleted reviews cannot be edited. Create a new review instead.");
      }
      const changed = existing.rating !== request.rating || existing.comment !== request.comment;
      review = PlaceReviewV1Schema.parse({
        ...existing,
        rating: request.rating,
        comment: request.comment,
        moderationState: changed ? initialModerationState(request.comment) : existing.moderationState,
        editHistory: changed
          ? [...existing.editHistory, { rating: existing.rating, comment: existing.comment, editedAt: now }]
          : existing.editHistory,
        updatedAt: now,
      });
    } else {
      review = PlaceReviewV1Schema.parse({
        schemaVersion: 1,
        reviewId: `review:${request.tascoPlaceId}:${parsedIdentity.userId}`,
        tascoPlaceId: request.tascoPlaceId,
        userId: parsedIdentity.userId,
        rating: request.rating,
        comment: request.comment,
        moderationState: initialModerationState(request.comment),
        editHistory: [],
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        expiresAt: null,
        source: "user-generated",
      });
    }

    await this.dependencies.repositories.reviews.save(review);
    await this.dependencies.repositories.idempotency.save(scope, request.idempotencyKey, {
      fingerprint,
      resultRef: review.reviewId,
      expiresAt: idempotencyExpiresAt(now),
    });
    await this.refreshAggregate(request.tascoPlaceId, now);
    return UpsertPlaceReviewResponseV1Schema.parse({ schemaVersion: 1, review });
  }

  async deletePlaceReview(identity: CommunityIdentity, tascoPlaceId: string): Promise<void> {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const now = this.dependencies.clock.now();
    const review = await this.requireOwnedReview(parsedIdentity.userId, tascoPlaceId);
    if (review.deletedAt) return;
    await this.dependencies.repositories.reviews.save({
      ...review,
      deletedAt: now,
      updatedAt: now,
    });
    await this.refreshAggregate(tascoPlaceId, now);
  }

  async getMyPlaceReview(identity: CommunityIdentity, tascoPlaceId: string): Promise<PlaceReviewV1 | null> {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const review = await this.dependencies.repositories.reviews.getByUserAndPlace({
      tascoPlaceId,
      userId: parsedIdentity.userId,
    });
    if (!review || review.deletedAt) return null;
    return structuredClone(review);
  }

  async listPlaceReviews(identity: CommunityIdentity, rawRequest: ListPlaceReviewsRequestV1) {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const request = ListPlaceReviewsRequestV1Schema.parse(rawRequest);
    const now = this.dependencies.clock.now();
    const cursor = request.cursor ? decodeReviewCursor(request.cursor) : null;
    const privacyContext = createViewerPrivacyContext(
      parsedIdentity.userId,
      new Set(await this.dependencies.repositories.blocks.listBlockedBy(parsedIdentity.userId)),
      new Set(await this.dependencies.repositories.blocks.listBlockedUsersOf(parsedIdentity.userId)),
    );

    const page = (await this.dependencies.repositories.reviews.listByPlace(request.tascoPlaceId))
      .filter((review) => !review.deletedAt)
      .filter((review) => review.moderationState === "approved" || review.userId === parsedIdentity.userId)
      .filter((review) => authorVisibleToViewer(review.userId, privacyContext))
      .sort(compareReviews)
      .map((review): PublicPlaceReviewV1 | null => {
        if (review.userId === parsedIdentity.userId) {
          return {
            schemaVersion: 1,
            reviewId: review.reviewId,
            tascoPlaceId: review.tascoPlaceId,
            userId: review.userId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            source: "user-generated",
          };
        }
        return toPublicReview(review);
      })
      .filter((review): review is PublicPlaceReviewV1 => review !== null)
      .filter((review) => (cursor ? reviewAfterCursor(review, cursor) : true))
      .slice(0, request.limit);

    for (const item of page) assertPublicPayloadHasNoPrivateFields(item);

    const nextCursor = page.length === request.limit && page.length > 0
      ? encodeReviewCursor(page.at(-1)!)
      : null;

    return ListPlaceReviewsResponseV1Schema.parse({
      schemaVersion: 1,
      tascoPlaceId: request.tascoPlaceId,
      items: page,
      nextCursor,
      ordering: REVIEW_ORDERING,
    });
  }

  async getPlaceRatingAggregate(identity: CommunityIdentity, tascoPlaceId: string) {
    CommunityIdentitySchema.parse(identity);
    const now = this.dependencies.clock.now();
    const stored = await this.dependencies.repositories.aggregates.get(tascoPlaceId);
    if (stored) return PlaceRatingAggregateV1Schema.parse(stored);
    const aggregate = calculatePlaceAggregate(
      tascoPlaceId,
      await this.dependencies.repositories.reviews.listByPlace(tascoPlaceId),
      now,
    );
    return PlaceRatingAggregateV1Schema.parse(aggregate);
  }

  async setReviewModeration(identity: CommunityIdentity, rawRequest: SetReviewModerationRequestV1) {
    requireModerator(CommunityIdentitySchema.parse(identity));
    const request = SetReviewModerationRequestV1Schema.parse(rawRequest);
    const now = this.dependencies.clock.now();
    const review = await this.dependencies.repositories.reviews.getById(request.reviewId);
    if (!review || review.deletedAt) throw new CommunityError("not-found", "The review does not exist.");
    const updated = PlaceReviewV1Schema.parse({
      ...review,
      moderationState: request.moderationState,
      updatedAt: now,
    });
    await this.dependencies.repositories.reviews.save(updated);
    await this.refreshAggregate(updated.tascoPlaceId, now);
    return PlaceReviewV1Schema.parse(updated);
  }

  async upsertTravelPresence(identity: CommunityIdentity, rawRequest: UpsertTravelPresenceRequestV1) {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const request = UpsertTravelPresenceRequestV1Schema.parse(rawRequest);
    assertTravelPresenceInputSafe(request);
    const now = this.dependencies.clock.now();
    const scope = `presence:${parsedIdentity.userId}`;
    const fingerprint = JSON.stringify(request);
    const existingIdempotency = await this.dependencies.repositories.idempotency.get(scope, request.idempotencyKey, now);
    if (existingIdempotency) {
      if (existingIdempotency.fingerprint !== fingerprint) {
        throw new CommunityError("conflict", "The idempotency key was already used for a different presence payload.");
      }
      const presence = await this.dependencies.repositories.presence.getById(existingIdempotency.resultRef);
      if (!presence) throw new CommunityError("conflict", "The prior idempotent presence result is unavailable.");
      return UpsertTravelPresenceResponseV1Schema.parse({ schemaVersion: 1, presence });
    }

    const existing = await this.dependencies.repositories.presence.getByUserId(parsedIdentity.userId);
    const expiresAt = new Date(Date.parse(now) + request.retentionDays * 24 * 60 * 60_000).toISOString();
    const presence = TravelPresenceV1Schema.parse({
      schemaVersion: 1,
      presenceId: existing?.presenceId ?? `presence:${parsedIdentity.userId}`,
      userId: parsedIdentity.userId,
      city: request.city.trim(),
      approximateStartDate: request.approximateStartDate,
      approximateEndDate: request.approximateEndDate,
      interests: request.interests.map((interest) => interest.trim()),
      sharedPlaces: request.sharedPlaces.map((place) => ({
        tascoPlaceId: place.tascoPlaceId,
        label: place.label.trim(),
      })),
      visibility: request.visibility,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
      expiresAt,
    });

    await this.dependencies.repositories.presence.save(presence);
    await this.dependencies.repositories.idempotency.save(scope, request.idempotencyKey, {
      fingerprint,
      resultRef: presence.presenceId,
      expiresAt: idempotencyExpiresAt(now),
    });
    return UpsertTravelPresenceResponseV1Schema.parse({ schemaVersion: 1, presence });
  }

  async deleteTravelPresence(identity: CommunityIdentity): Promise<void> {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const now = this.dependencies.clock.now();
    const presence = await this.dependencies.repositories.presence.getByUserId(parsedIdentity.userId);
    if (!presence || presence.deletedAt) return;
    await this.dependencies.repositories.presence.save({
      ...presence,
      deletedAt: now,
      updatedAt: now,
    });
  }

  async getMyTravelPresence(identity: CommunityIdentity) {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const presence = await this.dependencies.repositories.presence.getByUserId(parsedIdentity.userId);
    if (!presence || presence.deletedAt) return null;
    return TravelPresenceV1Schema.parse(structuredClone(presence));
  }

  async listPublicTravelPresence(identity: CommunityIdentity, rawRequest: ListTravelPresenceRequestV1) {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const request = ListTravelPresenceRequestV1Schema.parse(rawRequest);
    const now = this.dependencies.clock.now();
    const cursor = request.cursor ? decodePresenceCursor(request.cursor) : null;
    const privacyContext = createViewerPrivacyContext(
      parsedIdentity.userId,
      new Set(await this.dependencies.repositories.blocks.listBlockedBy(parsedIdentity.userId)),
      new Set(await this.dependencies.repositories.blocks.listBlockedUsersOf(parsedIdentity.userId)),
    );

    const page = (await this.dependencies.repositories.presence.listActive(now))
      .filter((presence) => presence.visibility === "public")
      .filter((presence) => !request.city || presence.city === request.city)
      .filter((presence) => authorVisibleToViewer(presence.userId, privacyContext))
      .sort(comparePresence)
      .map((presence) => toPublicPresence(presence, now))
      .filter((presence): presence is NonNullable<typeof presence> => presence !== null)
      .filter((presence) => (cursor ? presenceAfterCursor(presence, cursor) : true))
      .slice(0, request.limit);

    for (const item of page) assertPublicPayloadHasNoPrivateFields(item);

    const nextCursor = page.length === request.limit && page.length > 0
      ? encodePresenceCursor(page.at(-1)!)
      : null;

    return ListTravelPresenceResponseV1Schema.parse({
      schemaVersion: 1,
      items: page,
      nextCursor,
      ordering: PRESENCE_ORDERING,
    });
  }

  async blockUser(identity: CommunityIdentity, blockedUserId: string): Promise<void> {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const request = BlockUserRequestV1Schema.parse({ schemaVersion: 1, blockedUserId });
    if (parsedIdentity.userId === request.blockedUserId) {
      throw new CommunityError("invalid-request", "Users cannot block themselves.");
    }
    await this.dependencies.repositories.blocks.block(parsedIdentity.userId, request.blockedUserId);
  }

  async unblockUser(identity: CommunityIdentity, blockedUserId: string): Promise<void> {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    await this.dependencies.repositories.blocks.unblock(parsedIdentity.userId, blockedUserId);
  }

  async reportContent(identity: CommunityIdentity, rawRequest: ReportContentRequestV1) {
    const parsedIdentity = CommunityIdentitySchema.parse(identity);
    const request = ReportContentRequestV1Schema.parse(rawRequest);
    const now = this.dependencies.clock.now();
    const scope = `report:${parsedIdentity.userId}:${request.targetType}:${request.targetId}`;
    const fingerprint = JSON.stringify(request);
    const existingIdempotency = await this.dependencies.repositories.idempotency.get(scope, request.idempotencyKey, now);
    if (existingIdempotency) {
      if (existingIdempotency.fingerprint !== fingerprint) {
        throw new CommunityError("conflict", "The idempotency key was already used for a different report payload.");
      }
      const report = await this.dependencies.repositories.reports.findOpenByReporterAndTarget(
        parsedIdentity.userId,
        request.targetType,
        request.targetId,
      );
      if (!report) throw new CommunityError("conflict", "The prior idempotent report result is unavailable.");
      return ReportContentResponseV1Schema.parse({ schemaVersion: 1, report });
    }

    await this.requireReportTarget(request.targetType, request.targetId, parsedIdentity.userId);

    const existing = await this.dependencies.repositories.reports.findOpenByReporterAndTarget(
      parsedIdentity.userId,
      request.targetType,
      request.targetId,
    );
    if (existing) {
      return ReportContentResponseV1Schema.parse({ schemaVersion: 1, report: existing });
    }

    const report = {
      schemaVersion: 1 as const,
      reportId: randomUUID(),
      reporterUserId: parsedIdentity.userId,
      targetType: request.targetType,
      targetId: request.targetId,
      reasonCode: request.reasonCode,
      details: request.details,
      createdAt: now,
      status: "open" as const,
    };
    await this.dependencies.repositories.reports.save(report);
    await this.dependencies.repositories.idempotency.save(scope, request.idempotencyKey, {
      fingerprint,
      resultRef: report.reportId,
      expiresAt: idempotencyExpiresAt(now),
    });

    if (request.targetType === "place-review") {
      const review = await this.dependencies.repositories.reviews.getById(request.targetId);
      if (review && !review.deletedAt && review.moderationState === "approved") {
        await this.dependencies.repositories.reviews.save({
          ...review,
          moderationState: "pending",
          updatedAt: now,
        });
        await this.refreshAggregate(review.tascoPlaceId, now);
      }
    }

    return ReportContentResponseV1Schema.parse({ schemaVersion: 1, report });
  }

  private async requireOwnedReview(userId: string, tascoPlaceId: string): Promise<PlaceReviewV1> {
    const review = await this.dependencies.repositories.reviews.getByUserAndPlace({ tascoPlaceId, userId });
    if (!review) throw new CommunityError("not-found", "The review does not exist.");
    return review;
  }

  private async requireReportTarget(
    targetType: ReportContentRequestV1["targetType"],
    targetId: string,
    reporterUserId: string,
  ): Promise<void> {
    if (targetType === "place-review") {
      const review = await this.dependencies.repositories.reviews.getById(targetId);
      if (!review || review.deletedAt) throw new CommunityError("not-found", "The reported review does not exist.");
      if (review.userId === reporterUserId) {
        throw new CommunityError("invalid-request", "Users cannot report their own review.");
      }
      return;
    }
    const presence = await this.dependencies.repositories.presence.getById(targetId);
    if (!presence || presence.deletedAt) throw new CommunityError("not-found", "The reported travel presence does not exist.");
    if (presence.userId === reporterUserId) {
      throw new CommunityError("invalid-request", "Users cannot report their own travel presence.");
    }
  }

  private async refreshAggregate(tascoPlaceId: string, now: string): Promise<void> {
    const aggregate = calculatePlaceAggregate(
      tascoPlaceId,
      await this.dependencies.repositories.reviews.listByPlace(tascoPlaceId),
      now,
    );
    await this.dependencies.repositories.aggregates.save(aggregate);
  }
}

export * from "./aggregates";
export * from "./contracts";
export * from "./errors";
export * from "./memory-repositories";
export * from "./ordering";
export * from "./privacy";
export * from "./repositories";
