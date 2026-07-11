import type {
  PlaceReviewV1,
  PublicPlaceReviewV1,
  PublicTravelPresenceV1,
  TravelPresenceV1,
  UpsertTravelPresenceRequestV1,
} from "./contracts";
import { CommunityError } from "./errors";

const FORBIDDEN_PRESENCE_PATTERNS = [
  /\blatitude\b/i,
  /\blongitude\b/i,
  /\bcoordinates?\b/i,
  /\baccommodation\b/i,
  /\bhotel room\b/i,
  /\bcheck[- ]in time\b/i,
  /\bitinerary\b/i,
  /\blive location\b/i,
  /\bexact address\b/i,
  /\bstreet address\b/i,
];

export function assertTravelPresenceInputSafe(request: UpsertTravelPresenceRequestV1): void {
  if (Date.parse(request.approximateEndDate) < Date.parse(request.approximateStartDate)) {
    throw new CommunityError("invalid-request", "Approximate travel dates must not end before they start.");
  }
  const fields = [
    request.city,
    ...request.interests,
    ...request.sharedPlaces.map((place) => place.label),
  ];
  for (const value of fields) {
    for (const pattern of FORBIDDEN_PRESENCE_PATTERNS) {
      if (pattern.test(value)) {
        throw new CommunityError(
          "invalid-request",
          "Travel presence must not include exact accommodation, live coordinates, or full itinerary details.",
        );
      }
    }
  }
}

export function toPublicReview(review: PlaceReviewV1): PublicPlaceReviewV1 | null {
  if (review.deletedAt || review.moderationState !== "approved") return null;
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

export function toPublicPresence(presence: TravelPresenceV1, now: string): PublicTravelPresenceV1 | null {
  if (presence.deletedAt) return null;
  if (presence.visibility !== "public") return null;
  if (Date.parse(presence.expiresAt) <= Date.parse(now)) return null;
  return {
    schemaVersion: 1,
    presenceId: presence.presenceId,
    userId: presence.userId,
    city: presence.city,
    approximateStartDate: presence.approximateStartDate,
    approximateEndDate: presence.approximateEndDate,
    interests: [...presence.interests],
    sharedPlaces: presence.sharedPlaces.map((place) => ({ ...place })),
    updatedAt: presence.updatedAt,
  };
}

export function assertPublicPayloadHasNoPrivateFields(payload: unknown): void {
  const forbiddenKeys = new Set([
    "latitude",
    "longitude",
    "accuracyMeters",
    "accommodation",
    "itinerary",
    "liveCoordinates",
    "exactAddress",
    "checkInTime",
  ]);
  const stack = [payload];
  while (stack.length > 0) {
    const value = stack.pop();
    if (!value || typeof value !== "object") continue;
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) {
        throw new CommunityError("invalid-request", "Public community payloads must not expose private location fields.");
      }
      if (entry && typeof entry === "object") stack.push(entry);
    }
  }
}

export type ViewerPrivacyContext = {
  readonly viewerUserId: string;
  readonly blockedByViewer: ReadonlySet<string>;
  readonly blockedViewer: ReadonlySet<string>;
};

export function createViewerPrivacyContext(
  viewerUserId: string,
  blockedByViewer: ReadonlySet<string>,
  blockedViewer: ReadonlySet<string>,
): ViewerPrivacyContext {
  return {
    viewerUserId,
    blockedByViewer,
    blockedViewer,
  };
}

export function authorVisibleToViewer(
  authorUserId: string,
  context: ViewerPrivacyContext,
): boolean {
  return !usersBlocked(context.viewerUserId, authorUserId, context.blockedByViewer, context.blockedViewer);
}

export function usersBlocked(
  viewerUserId: string,
  authorUserId: string,
  blockedByViewer: ReadonlySet<string>,
  blockedViewer: ReadonlySet<string>,
): boolean {
  if (viewerUserId === authorUserId) return false;
  return blockedByViewer.has(authorUserId) || blockedViewer.has(authorUserId);
}
