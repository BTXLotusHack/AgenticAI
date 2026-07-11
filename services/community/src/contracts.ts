import { z } from "zod";

const IdentifierSchema = z.string().min(1).max(160);
const IsoDateTimeSchema = z.iso.datetime();
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const TascoPlaceIdSchema = IdentifierSchema;
export type TascoPlaceId = z.infer<typeof TascoPlaceIdSchema>;

export const CommunityIdentitySchema = z
  .object({
    userId: IdentifierSchema,
    authSource: z.enum(["trusted-auth-context", "local-fixture"]).default("local-fixture"),
    roles: z.array(z.enum(["community-moderator"])).default([]),
    isModerator: z.boolean().optional(),
  })
  .strict();

export type CommunityIdentity = z.input<typeof CommunityIdentitySchema>;
export type ParsedCommunityIdentity = z.infer<typeof CommunityIdentitySchema>;

export const ModerationStateSchema = z.enum(["pending", "approved", "rejected", "hidden"]);
export type ModerationState = z.infer<typeof ModerationStateSchema>;

export const VisibilityPolicySchema = z.enum(["public", "connections", "private"]);
export type VisibilityPolicy = z.infer<typeof VisibilityPolicySchema>;

export const StarRatingSchema = z.number().int().min(1).max(5);
export type StarRating = z.infer<typeof StarRatingSchema>;

export const ReviewEditHistoryEntrySchema = z
  .object({
    rating: StarRatingSchema,
    comment: z.string().max(2_000).nullable(),
    editedAt: IsoDateTimeSchema,
  })
  .strict();

export type ReviewEditHistoryEntry = z.infer<typeof ReviewEditHistoryEntrySchema>;

export const PlaceReviewV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    reviewId: IdentifierSchema,
    tascoPlaceId: TascoPlaceIdSchema,
    userId: IdentifierSchema,
    rating: StarRatingSchema,
    comment: z.string().max(2_000).nullable(),
    moderationState: ModerationStateSchema,
    editHistory: z.array(ReviewEditHistoryEntrySchema),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    deletedAt: IsoDateTimeSchema.nullable(),
    expiresAt: IsoDateTimeSchema.nullable(),
    source: z.literal("user-generated"),
  })
  .strict();

export type PlaceReviewV1 = z.infer<typeof PlaceReviewV1Schema>;

export const PublicPlaceReviewV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    reviewId: IdentifierSchema,
    tascoPlaceId: TascoPlaceIdSchema,
    userId: IdentifierSchema,
    rating: StarRatingSchema,
    comment: z.string().max(2_000).nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    source: z.literal("user-generated"),
  })
  .strict();

export type PublicPlaceReviewV1 = z.infer<typeof PublicPlaceReviewV1Schema>;

export const UpsertPlaceReviewRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tascoPlaceId: TascoPlaceIdSchema,
    rating: StarRatingSchema,
    comment: z.string().max(2_000).nullable(),
    idempotencyKey: IdentifierSchema,
  })
  .strict();

export type UpsertPlaceReviewRequestV1 = z.infer<typeof UpsertPlaceReviewRequestV1Schema>;

export const UpsertPlaceReviewResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    review: PlaceReviewV1Schema,
  })
  .strict();

export type UpsertPlaceReviewResponseV1 = z.infer<typeof UpsertPlaceReviewResponseV1Schema>;

export const PlaceRatingAggregateV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tascoPlaceId: TascoPlaceIdSchema,
    averageRating: z.number().gte(1).lte(5).nullable(),
    reviewCount: z.number().int().nonnegative(),
    starDistribution: z
      .object({
        one: z.number().int().nonnegative(),
        two: z.number().int().nonnegative(),
        three: z.number().int().nonnegative(),
        four: z.number().int().nonnegative(),
        five: z.number().int().nonnegative(),
      })
      .strict(),
    updatedAt: IsoDateTimeSchema,
    source: z.literal("user-generated"),
  })
  .strict();

export type PlaceRatingAggregateV1 = z.infer<typeof PlaceRatingAggregateV1Schema>;

export const ListPlaceReviewsRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tascoPlaceId: TascoPlaceIdSchema,
    limit: z.number().int().min(1).max(50).default(20),
    cursor: z.string().min(1).max(512).nullable(),
  })
  .strict();

export type ListPlaceReviewsRequestV1 = z.infer<typeof ListPlaceReviewsRequestV1Schema>;

export const ListPlaceReviewsResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tascoPlaceId: TascoPlaceIdSchema,
    items: z.array(PublicPlaceReviewV1Schema),
    nextCursor: z.string().min(1).max(512).nullable(),
    ordering: z.literal("createdAtDescReviewIdAsc"),
  })
  .strict();

export type ListPlaceReviewsResponseV1 = z.infer<typeof ListPlaceReviewsResponseV1Schema>;

export const SharedPlannedPlaceSchema = z
  .object({
    tascoPlaceId: TascoPlaceIdSchema,
    label: z.string().min(1).max(120),
  })
  .strict();

export type SharedPlannedPlace = z.infer<typeof SharedPlannedPlaceSchema>;

export const TravelPresenceV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    presenceId: IdentifierSchema,
    userId: IdentifierSchema,
    city: z.string().min(1).max(120),
    approximateStartDate: IsoDateSchema,
    approximateEndDate: IsoDateSchema,
    interests: z.array(z.string().min(1).max(80)).max(12),
    sharedPlaces: z.array(SharedPlannedPlaceSchema).max(8),
    visibility: VisibilityPolicySchema,
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    deletedAt: IsoDateTimeSchema.nullable(),
    expiresAt: IsoDateTimeSchema,
  })
  .strict();

export type TravelPresenceV1 = z.infer<typeof TravelPresenceV1Schema>;

export const PublicTravelPresenceV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    presenceId: IdentifierSchema,
    userId: IdentifierSchema,
    city: z.string().min(1).max(120),
    approximateStartDate: IsoDateSchema,
    approximateEndDate: IsoDateSchema,
    interests: z.array(z.string().min(1).max(80)).max(12),
    sharedPlaces: z.array(SharedPlannedPlaceSchema).max(8),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export type PublicTravelPresenceV1 = z.infer<typeof PublicTravelPresenceV1Schema>;

export const UpsertTravelPresenceRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    city: z.string().min(1).max(120),
    approximateStartDate: IsoDateSchema,
    approximateEndDate: IsoDateSchema,
    interests: z.array(z.string().min(1).max(80)).max(12),
    sharedPlaces: z.array(SharedPlannedPlaceSchema).max(8),
    visibility: VisibilityPolicySchema,
    retentionDays: z.number().int().min(1).max(365).default(90),
    idempotencyKey: IdentifierSchema,
  })
  .strict();

export type UpsertTravelPresenceRequestV1 = z.infer<typeof UpsertTravelPresenceRequestV1Schema>;

export const UpsertTravelPresenceResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    presence: TravelPresenceV1Schema,
  })
  .strict();


export type UpsertTravelPresenceResponseV1 = z.infer<typeof UpsertTravelPresenceResponseV1Schema>;

export const ListTravelPresenceRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    city: z.string().min(1).max(120).nullable(),
    limit: z.number().int().min(1).max(50).default(20),
    cursor: z.string().min(1).max(512).nullable(),
  })
  .strict();

export type ListTravelPresenceRequestV1 = z.infer<typeof ListTravelPresenceRequestV1Schema>;

export const ListTravelPresenceResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    items: z.array(PublicTravelPresenceV1Schema),
    nextCursor: z.string().min(1).max(512).nullable(),
    ordering: z.literal("cityAscStartDateAscUserIdAsc"),
  })
  .strict();

export type ListTravelPresenceResponseV1 = z.infer<typeof ListTravelPresenceResponseV1Schema>;

export const UserTravelProfileV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    userId: IdentifierSchema,
    displayName: z.string().trim().min(1).max(80),
    homeCity: z.string().trim().min(1).max(120).nullable(),
    travelStyles: z.array(z.string().trim().min(1).max(80)).max(12),
    interests: z.array(z.string().trim().min(1).max(80)).max(24),
    preferredLanguages: z.array(z.enum(["en", "vi"])).min(1).max(2),
    dietaryPreferences: z.array(z.string().trim().min(1).max(80)).max(12),
    accessibilityPreferences: z.array(z.string().trim().min(1).max(120)).max(12),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export type UserTravelProfileV1 = z.infer<typeof UserTravelProfileV1Schema>;

export const UpdateUserTravelProfileRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    userId: IdentifierSchema.optional(),
    displayName: z.string().trim().min(1).max(80),
    homeCity: z.string().trim().min(1).max(120).nullable(),
    travelStyles: z.array(z.string().trim().min(1).max(80)).max(12),
    interests: z.array(z.string().trim().min(1).max(80)).max(24),
    preferredLanguages: z.array(z.enum(["en", "vi"])).min(1).max(2),
    dietaryPreferences: z.array(z.string().trim().min(1).max(80)).max(12),
    accessibilityPreferences: z.array(z.string().trim().min(1).max(120)).max(12),
  })
  .strict();

export type UpdateUserTravelProfileRequestV1 = z.infer<typeof UpdateUserTravelProfileRequestV1Schema>;

export const UpdateUserTravelProfileResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    profile: UserTravelProfileV1Schema,
  })
  .strict();

export type UpdateUserTravelProfileResponseV1 = z.infer<typeof UpdateUserTravelProfileResponseV1Schema>;

export const LocationVisibilityPolicyV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    userId: IdentifierSchema,
    tripVisibility: z.enum(["group", "leader-only", "paused"]),
    placePresenceVisibility: VisibilityPolicySchema,
    retentionPreference: z.enum(["minimal", "standard", "extended"]),
    blockedUserIds: z.array(IdentifierSchema).max(200),
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export type LocationVisibilityPolicyV1 = z.infer<typeof LocationVisibilityPolicyV1Schema>;

export const UpdateLocationVisibilityPolicyRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tripVisibility: z.enum(["group", "leader-only", "paused"]),
    placePresenceVisibility: VisibilityPolicySchema,
    retentionPreference: z.enum(["minimal", "standard", "extended"]),
    blockedUserIds: z.array(IdentifierSchema).max(200),
  })
  .strict();

export type UpdateLocationVisibilityPolicyRequestV1 = z.infer<typeof UpdateLocationVisibilityPolicyRequestV1Schema>;

export const UpdateLocationVisibilityPolicyResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    policy: LocationVisibilityPolicyV1Schema,
  })
  .strict();

export type UpdateLocationVisibilityPolicyResponseV1 = z.infer<typeof UpdateLocationVisibilityPolicyResponseV1Schema>;

export const PlaceCommunitySummaryV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tascoPlaceId: TascoPlaceIdSchema,
    averageRating: z.number().gte(1).lte(5).nullable(),
    reviewCount: z.number().int().nonnegative(),
    commentCount: z.number().int().nonnegative(),
    viewerCanReview: z.boolean(),
    viewerHasReviewed: z.boolean(),
    source: z.literal("user-generated"),
  })
  .strict();

export type PlaceCommunitySummaryV1 = z.infer<typeof PlaceCommunitySummaryV1Schema>;

export const ListPlacePresenceRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    tascoPlaceId: TascoPlaceIdSchema,
    limit: z.number().int().min(1).max(50).default(20),
    cursor: z.string().min(1).max(512).nullable(),
  })
  .strict();

export type ListPlacePresenceRequestV1 = z.infer<typeof ListPlacePresenceRequestV1Schema>;

export const BlockUserRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    blockedUserId: IdentifierSchema,
  })
  .strict();

export type BlockUserRequestV1 = z.infer<typeof BlockUserRequestV1Schema>;

export const ReportTargetTypeSchema = z.enum(["place-review", "travel-presence"]);
export type ReportTargetType = z.infer<typeof ReportTargetTypeSchema>;

export const ReportContentRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    targetType: ReportTargetTypeSchema,
    targetId: IdentifierSchema,
    reasonCode: z.enum(["spam", "harassment", "privacy-violation", "misleading", "other"]),
    details: z.string().max(1_000).nullable(),
    idempotencyKey: IdentifierSchema,
  })
  .strict();

export type ReportContentRequestV1 = z.infer<typeof ReportContentRequestV1Schema>;

export const ContentReportV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    reportId: IdentifierSchema,
    reporterUserId: IdentifierSchema,
    targetType: ReportTargetTypeSchema,
    targetId: IdentifierSchema,
    reasonCode: z.enum(["spam", "harassment", "privacy-violation", "misleading", "other"]),
    details: z.string().max(1_000).nullable(),
    createdAt: IsoDateTimeSchema,
    status: z.enum(["open", "resolved"]),
    resolvedAt: IsoDateTimeSchema.nullable(),
    resolvedByUserId: IdentifierSchema.nullable(),
    resolution: z.enum(["resolve-report", "hide-target", "approve-target"]).nullable(),
  })
  .strict();

export type ContentReportV1 = z.infer<typeof ContentReportV1Schema>;

export const ReportContentResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    report: ContentReportV1Schema,
  })
  .strict();

export type ReportContentResponseV1 = z.infer<typeof ReportContentResponseV1Schema>;

export const SetReviewModerationRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    reviewId: IdentifierSchema,
    moderationState: ModerationStateSchema,
  })
  .strict();

export type SetReviewModerationRequestV1 = z.infer<typeof SetReviewModerationRequestV1Schema>;

export const ListModerationReportsRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(["open", "resolved"]).nullable(),
    limit: z.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(512).nullable(),
  })
  .strict();

export type ListModerationReportsRequestV1 = z.infer<typeof ListModerationReportsRequestV1Schema>;

export const ListModerationReportsResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    items: z.array(ContentReportV1Schema),
    nextCursor: z.string().min(1).max(512).nullable(),
    ordering: z.literal("createdAtDescReportIdAsc"),
  })
  .strict();

export type ListModerationReportsResponseV1 = z.infer<typeof ListModerationReportsResponseV1Schema>;

export const ApplyModerationActionRequestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    reportId: IdentifierSchema,
    action: z.enum(["resolve-report", "hide-target", "approve-target"]),
    reviewModerationState: ModerationStateSchema.nullable().optional(),
  })
  .strict();

export type ApplyModerationActionRequestV1 = z.infer<typeof ApplyModerationActionRequestV1Schema>;

export const ApplyModerationActionResponseV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    report: ContentReportV1Schema,
  })
  .strict();

export type ApplyModerationActionResponseV1 = z.infer<typeof ApplyModerationActionResponseV1Schema>;
