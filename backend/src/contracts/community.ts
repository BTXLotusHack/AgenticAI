import { z } from "zod";
import { Id, IsoTimestamp } from "./common.js";

export const TascoPlaceId = Id;

export const CommunityVisibilityPolicy = z.enum(["public", "connections", "private"]);

export const LocationVisibilityPolicyV1 = z.object({
  schemaVersion: z.literal(1),
  userId: Id,
  tripVisibility: z.enum(["group", "leader-only", "paused"]),
  placePresenceVisibility: CommunityVisibilityPolicy,
  retentionPreference: z.enum(["minimal", "standard", "extended"]),
  blockedUserIds: z.array(Id).max(200),
  updatedAt: IsoTimestamp,
});
export type LocationVisibilityPolicyV1 = z.infer<typeof LocationVisibilityPolicyV1>;

export const UserTravelProfileV1 = z.object({
  schemaVersion: z.literal(1),
  userId: Id,
  displayName: z.string().trim().min(1).max(80),
  homeCity: z.string().trim().min(1).max(120).nullable(),
  travelStyles: z.array(z.string().trim().min(1).max(80)).max(12),
  interests: z.array(z.string().trim().min(1).max(80)).max(24),
  preferredLanguages: z.array(z.enum(["en", "vi"])).min(1).max(2),
  dietaryPreferences: z.array(z.string().trim().min(1).max(80)).max(12),
  accessibilityPreferences: z.array(z.string().trim().min(1).max(120)).max(12),
  updatedAt: IsoTimestamp,
});
export type UserTravelProfileV1 = z.infer<typeof UserTravelProfileV1>;

export const PlaceCommunitySummaryV1 = z.object({
  schemaVersion: z.literal(1),
  tascoPlaceId: TascoPlaceId,
  averageRating: z.number().gte(1).lte(5).nullable(),
  reviewCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  viewerCanReview: z.boolean(),
  viewerHasReviewed: z.boolean(),
  source: z.literal("user-generated"),
});
export type PlaceCommunitySummaryV1 = z.infer<typeof PlaceCommunitySummaryV1>;

export const ContentReportV1 = z.object({
  schemaVersion: z.literal(1),
  reportId: Id,
  reporterUserId: Id,
  targetType: z.enum(["place-review", "travel-presence"]),
  targetId: Id,
  reasonCode: z.enum(["spam", "harassment", "privacy-violation", "misleading", "other"]),
  details: z.string().max(1_000).nullable(),
  createdAt: IsoTimestamp,
  status: z.enum(["open", "resolved"]),
  resolvedAt: IsoTimestamp.nullable(),
  resolvedByUserId: Id.nullable(),
  resolution: z.enum(["resolve-report", "hide-target", "approve-target"]).nullable(),
});
export type ContentReportV1 = z.infer<typeof ContentReportV1>;
