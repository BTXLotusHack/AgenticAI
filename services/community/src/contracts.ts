import { z } from "zod";

const IdentifierSchema = z.string().min(1).max(160);
const IsoDateTimeSchema = z.iso.datetime();
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const TascoPlaceIdSchema = IdentifierSchema;
export type TascoPlaceId = z.infer<typeof TascoPlaceIdSchema>;

export const CommunityIdentitySchema = z
  .object({
    userId: IdentifierSchema,
    isModerator: z.boolean().optional(),
  })
  .strict();

export type CommunityIdentity = z.infer<typeof CommunityIdentitySchema>;

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
