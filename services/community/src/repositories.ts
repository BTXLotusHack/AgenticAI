import type {
  ContentReportV1,
  PlaceRatingAggregateV1,
  PlaceReviewV1,
  TravelPresenceV1,
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
  save(presence: TravelPresenceV1): Promise<void>;
}

export interface BlockRepository {
  listBlockedBy(userId: string): Promise<readonly string[]>;
  listBlockedUsersOf(userId: string): Promise<readonly string[]>;
  block(blockerUserId: string, blockedUserId: string): Promise<void>;
  unblock(blockerUserId: string, blockedUserId: string): Promise<void>;
}

export interface ReportRepository {
  getById(reportId: string): Promise<ContentReportV1 | null>;
  findOpenByReporterAndTarget(
    reporterUserId: string,
    targetType: ContentReportV1["targetType"],
    targetId: string,
  ): Promise<ContentReportV1 | null>;
  save(report: ContentReportV1): Promise<void>;
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
