import type {
  ContentReportV1,
  LocationVisibilityPolicyV1,
  PlaceRatingAggregateV1,
  PlaceReviewV1,
  TravelPresenceV1,
  UserTravelProfileV1,
} from "./contracts";

export type ReviewLookupKey = {
  readonly tascoPlaceId: string;
  readonly userId: string;
};

export type IdempotencyRecord = {
  readonly fingerprint: string;
  readonly resultRef: string;
  readonly expiresAt: string;
};

export interface ReviewRepository {
  getByUserAndPlace(key: ReviewLookupKey): Promise<PlaceReviewV1 | null>;
  getById(reviewId: string): Promise<PlaceReviewV1 | null>;
  listByPlace(tascoPlaceId: string): Promise<readonly PlaceReviewV1[]>;
  save(review: PlaceReviewV1): Promise<void>;
}

export interface AggregateRepository {
  get(tascoPlaceId: string): Promise<PlaceRatingAggregateV1 | null>;
  save(aggregate: PlaceRatingAggregateV1): Promise<void>;
}

export interface TravelPresenceRepository {
  getByUserId(userId: string): Promise<TravelPresenceV1 | null>;
  getById(presenceId: string): Promise<TravelPresenceV1 | null>;
  listActive(now: string): Promise<readonly TravelPresenceV1[]>;
  listBySharedPlace(tascoPlaceId: string, now: string): Promise<readonly TravelPresenceV1[]>;
  save(presence: TravelPresenceV1): Promise<void>;
}

export interface BlockRepository {
  listBlockedBy(userId: string): Promise<readonly string[]>;
  listBlockedUsersOf(userId: string): Promise<readonly string[]>;
  setBlockedBy(userId: string, blockedUserIds: readonly string[]): Promise<void>;
  block(blockerUserId: string, blockedUserId: string): Promise<void>;
  unblock(blockerUserId: string, blockedUserId: string): Promise<void>;
}

export interface ReportRepository {
  getById(reportId: string): Promise<ContentReportV1 | null>;
  list(status: ContentReportV1["status"] | null): Promise<readonly ContentReportV1[]>;
  findOpenByReporterAndTarget(
    reporterUserId: string,
    targetType: ContentReportV1["targetType"],
    targetId: string,
  ): Promise<ContentReportV1 | null>;
  save(report: ContentReportV1): Promise<void>;
}

export interface UserProfileRepository {
  get(userId: string): Promise<UserTravelProfileV1 | null>;
  save(profile: UserTravelProfileV1): Promise<void>;
}

export interface PrivacyPolicyRepository {
  get(userId: string): Promise<LocationVisibilityPolicyV1 | null>;
  save(policy: LocationVisibilityPolicyV1): Promise<void>;
}

export interface IdempotencyRepository {
  get(scope: string, idempotencyKey: string, now: string): Promise<IdempotencyRecord | null>;
  save(scope: string, idempotencyKey: string, record: IdempotencyRecord): Promise<void>;
}

export interface CommunityRepositories {
  readonly reviews: ReviewRepository;
  readonly aggregates: AggregateRepository;
  readonly presence: TravelPresenceRepository;
  readonly blocks: BlockRepository;
  readonly reports: ReportRepository;
  readonly profiles: UserProfileRepository;
  readonly privacyPolicies: PrivacyPolicyRepository;
  readonly idempotency: IdempotencyRepository;
}

export interface Clock {
  now(): string;
}

export class FixedClock implements Clock {
  constructor(private current: string) {}

  now(): string {
    return this.current;
  }

  set(current: string): void {
    this.current = current;
  }
}
