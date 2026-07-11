import type { PlaceReviewV1, TravelPresenceV1 } from "./contracts";

export const REVIEW_ORDERING = "createdAtDescReviewIdAsc" as const;
export const PRESENCE_ORDERING = "cityAscStartDateAscUserIdAsc" as const;

export function compareReviews(left: PlaceReviewV1, right: PlaceReviewV1): number {
  const createdAtDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  if (createdAtDelta !== 0) return createdAtDelta;
  return left.reviewId.localeCompare(right.reviewId);
}

export function comparePresence(left: TravelPresenceV1, right: TravelPresenceV1): number {
  const cityDelta = left.city.localeCompare(right.city);
  if (cityDelta !== 0) return cityDelta;
  const startDelta = left.approximateStartDate.localeCompare(right.approximateStartDate);
  if (startDelta !== 0) return startDelta;
  return left.userId.localeCompare(right.userId);
}

export function encodeReviewCursor(review: Pick<PlaceReviewV1, "createdAt" | "reviewId">): string {
  return Buffer.from(JSON.stringify({ createdAt: review.createdAt, reviewId: review.reviewId }), "utf8").toString("base64url");
}

export function decodeReviewCursor(cursor: string): { createdAt: string; reviewId: string } {
  const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
    createdAt?: unknown;
    reviewId?: unknown;
  };
  if (typeof parsed.createdAt !== "string" || typeof parsed.reviewId !== "string") {
    throw new Error("Invalid review cursor.");
  }
  return { createdAt: parsed.createdAt, reviewId: parsed.reviewId };
}

export function reviewAfterCursor(review: Pick<PlaceReviewV1, "createdAt" | "reviewId">, cursor: { createdAt: string; reviewId: string }): boolean {
  const createdAtDelta = Date.parse(review.createdAt) - Date.parse(cursor.createdAt);
  if (createdAtDelta < 0) return true;
  if (createdAtDelta > 0) return false;
  return review.reviewId.localeCompare(cursor.reviewId) > 0;
}

export function encodePresenceCursor(presence: Pick<TravelPresenceV1, "city" | "approximateStartDate" | "userId" | "presenceId">): string {
  return Buffer.from(JSON.stringify({
    city: presence.city,
    approximateStartDate: presence.approximateStartDate,
    userId: presence.userId,
    presenceId: presence.presenceId,
  }), "utf8").toString("base64url");
}

export function decodePresenceCursor(cursor: string): {
  city: string;
  approximateStartDate: string;
  userId: string;
  presenceId: string;
} {
  const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
    city?: unknown;
    approximateStartDate?: unknown;
    userId?: unknown;
    presenceId?: unknown;
  };
  if (
    typeof parsed.city !== "string"
    || typeof parsed.approximateStartDate !== "string"
    || typeof parsed.userId !== "string"
    || typeof parsed.presenceId !== "string"
  ) {
    throw new Error("Invalid presence cursor.");
  }
  return {
    city: parsed.city,
    approximateStartDate: parsed.approximateStartDate,
    userId: parsed.userId,
    presenceId: parsed.presenceId,
  };
}

export function presenceAfterCursor(
  presence: Pick<TravelPresenceV1, "city" | "approximateStartDate" | "userId" | "presenceId">,
  cursor: { city: string; approximateStartDate: string; userId: string; presenceId: string },
): boolean {
  const cityDelta = presence.city.localeCompare(cursor.city);
  if (cityDelta > 0) return true;
  if (cityDelta < 0) return false;
  const startDelta = presence.approximateStartDate.localeCompare(cursor.approximateStartDate);
  if (startDelta > 0) return true;
  if (startDelta < 0) return false;
  const userDelta = presence.userId.localeCompare(cursor.userId);
  if (userDelta > 0) return true;
  if (userDelta < 0) return false;
  return presence.presenceId.localeCompare(cursor.presenceId) > 0;
}
