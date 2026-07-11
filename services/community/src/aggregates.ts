import type { PlaceRatingAggregateV1, PlaceReviewV1 } from "./contracts";

export function emptyAggregate(tascoPlaceId: string, updatedAt: string): PlaceRatingAggregateV1 {
  return {
    schemaVersion: 1,
    tascoPlaceId,
    averageRating: null,
    reviewCount: 0,
    starDistribution: { one: 0, two: 0, three: 0, four: 0, five: 0 },
    updatedAt,
    source: "user-generated",
  };
}

export function isReviewCountable(review: PlaceReviewV1, now: string): boolean {
  if (review.deletedAt) return false;
  if (review.moderationState !== "approved") return false;
  if (review.expiresAt && Date.parse(review.expiresAt) <= Date.parse(now)) return false;
  return true;
}

export function calculatePlaceAggregate(
  tascoPlaceId: string,
  reviews: readonly PlaceReviewV1[],
  now: string,
): PlaceRatingAggregateV1 {
  const countable = reviews.filter((review) => review.tascoPlaceId === tascoPlaceId && isReviewCountable(review, now));
  if (countable.length === 0) {
    return emptyAggregate(tascoPlaceId, now);
  }
  const starDistribution = { one: 0, two: 0, three: 0, four: 0, five: 0 };
  let total = 0;
  for (const review of countable) {
    total += review.rating;
    if (review.rating === 1) starDistribution.one += 1;
    if (review.rating === 2) starDistribution.two += 1;
    if (review.rating === 3) starDistribution.three += 1;
    if (review.rating === 4) starDistribution.four += 1;
    if (review.rating === 5) starDistribution.five += 1;
  }
  return {
    schemaVersion: 1,
    tascoPlaceId,
    averageRating: Math.round((total / countable.length) * 100) / 100,
    reviewCount: countable.length,
    starDistribution,
    updatedAt: now,
    source: "user-generated",
  };
}
