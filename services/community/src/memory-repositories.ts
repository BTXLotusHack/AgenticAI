import type {
  ContentReportV1,
  LocationVisibilityPolicyV1,
  PlaceRatingAggregateV1,
  PlaceReviewV1,
  TravelPresenceV1,
  UserTravelProfileV1,
} from "./contracts";
import type {
  AggregateRepository,
  BlockRepository,
  CommunityRepositories,
  IdempotencyRecord,
  IdempotencyRepository,
  PrivacyPolicyRepository,
  ReportRepository,
  ReviewLookupKey,
  ReviewRepository,
  TravelPresenceRepository,
  UserProfileRepository,
} from "./repositories";

function reviewKey(key: ReviewLookupKey): string {
  return `${key.tascoPlaceId}#${key.userId}`;
}

export class MemoryReviewRepository implements ReviewRepository {
  private readonly byUserPlace = new Map<string, PlaceReviewV1>();
  private readonly byId = new Map<string, PlaceReviewV1>();

  constructor(initial: readonly PlaceReviewV1[] = []) {
    for (const review of initial) {
      this.byUserPlace.set(reviewKey({ tascoPlaceId: review.tascoPlaceId, userId: review.userId }), structuredClone(review));
      this.byId.set(review.reviewId, structuredClone(review));
    }
  }

  async getByUserAndPlace(key: ReviewLookupKey): Promise<PlaceReviewV1 | null> {
    const review = this.byUserPlace.get(reviewKey(key));
    return review ? structuredClone(review) : null;
  }

  async getById(reviewId: string): Promise<PlaceReviewV1 | null> {
    const review = this.byId.get(reviewId);
    return review ? structuredClone(review) : null;
  }

  async listByPlace(tascoPlaceId: string): Promise<readonly PlaceReviewV1[]> {
    return [...this.byUserPlace.values()]
      .filter((review) => review.tascoPlaceId === tascoPlaceId)
      .map((review) => structuredClone(review));
  }

  async save(review: PlaceReviewV1): Promise<void> {
    const copy = structuredClone(review);
    this.byUserPlace.set(reviewKey({ tascoPlaceId: review.tascoPlaceId, userId: review.userId }), copy);
    this.byId.set(review.reviewId, copy);
  }
}

export class MemoryAggregateRepository implements AggregateRepository {
  private readonly aggregates = new Map<string, PlaceRatingAggregateV1>();

  constructor(initial: readonly PlaceRatingAggregateV1[] = []) {
    for (const aggregate of initial) {
      this.aggregates.set(aggregate.tascoPlaceId, structuredClone(aggregate));
    }
  }

  async get(tascoPlaceId: string): Promise<PlaceRatingAggregateV1 | null> {
    const aggregate = this.aggregates.get(tascoPlaceId);
    return aggregate ? structuredClone(aggregate) : null;
  }

  async save(aggregate: PlaceRatingAggregateV1): Promise<void> {
    this.aggregates.set(aggregate.tascoPlaceId, structuredClone(aggregate));
  }
}

export class MemoryTravelPresenceRepository implements TravelPresenceRepository {
  private readonly byUser = new Map<string, TravelPresenceV1>();
  private readonly byId = new Map<string, TravelPresenceV1>();

  constructor(initial: readonly TravelPresenceV1[] = []) {
    for (const presence of initial) {
      this.byUser.set(presence.userId, structuredClone(presence));
      this.byId.set(presence.presenceId, structuredClone(presence));
    }
  }

  async getByUserId(userId: string): Promise<TravelPresenceV1 | null> {
    const presence = this.byUser.get(userId);
    return presence ? structuredClone(presence) : null;
  }

  async getById(presenceId: string): Promise<TravelPresenceV1 | null> {
    const presence = this.byId.get(presenceId);
    return presence ? structuredClone(presence) : null;
  }

  async listActive(now: string): Promise<readonly TravelPresenceV1[]> {
    const parsedNow = Date.parse(now);
    return [...this.byUser.values()]
      .filter((presence) => !presence.deletedAt && Date.parse(presence.expiresAt) > parsedNow)
      .map((presence) => structuredClone(presence));
  }

  async listBySharedPlace(tascoPlaceId: string, now: string): Promise<readonly TravelPresenceV1[]> {
    const parsedNow = Date.parse(now);
    return [...this.byUser.values()]
      .filter((presence) => !presence.deletedAt && Date.parse(presence.expiresAt) > parsedNow)
      .filter((presence) => presence.sharedPlaces.some((place) => place.tascoPlaceId === tascoPlaceId))
      .map((presence) => structuredClone(presence));
  }

  async save(presence: TravelPresenceV1): Promise<void> {
    const copy = structuredClone(presence);
    this.byUser.set(presence.userId, copy);
    this.byId.set(presence.presenceId, copy);
  }
}

export class MemoryBlockRepository implements BlockRepository {
  private readonly blocked = new Map<string, Set<string>>();

  constructor(initial: ReadonlyArray<{ blockerUserId: string; blockedUserId: string }> = []) {
    for (const entry of initial) {
      const set = this.blocked.get(entry.blockerUserId) ?? new Set<string>();
      set.add(entry.blockedUserId);
      this.blocked.set(entry.blockerUserId, set);
    }
  }

  async listBlockedBy(userId: string): Promise<readonly string[]> {
    return [...(this.blocked.get(userId) ?? [])];
  }

  async listBlockedUsersOf(userId: string): Promise<readonly string[]> {
    const blockedBy = new Set<string>();
    for (const [blockerUserId, blockedUsers] of this.blocked) {
      if (blockedUsers.has(userId)) blockedBy.add(blockerUserId);
    }
    return [...blockedBy];
  }

  async setBlockedBy(userId: string, blockedUserIds: readonly string[]): Promise<void> {
    const next = new Set(blockedUserIds.filter((blockedUserId) => blockedUserId !== userId));
    if (next.size === 0) {
      this.blocked.delete(userId);
      return;
    }
    this.blocked.set(userId, next);
  }

  async block(blockerUserId: string, blockedUserId: string): Promise<void> {
    if (blockerUserId === blockedUserId) return;
    const set = this.blocked.get(blockerUserId) ?? new Set<string>();
    set.add(blockedUserId);
    this.blocked.set(blockerUserId, set);
  }

  async unblock(blockerUserId: string, blockedUserId: string): Promise<void> {
    const set = this.blocked.get(blockerUserId);
    if (!set) return;
    set.delete(blockedUserId);
    if (set.size === 0) this.blocked.delete(blockerUserId);
  }
}

export class MemoryReportRepository implements ReportRepository {
  private readonly reports = new Map<string, ContentReportV1>();

  constructor(initial: readonly ContentReportV1[] = []) {
    for (const report of initial) {
      this.reports.set(report.reportId, structuredClone(report));
    }
  }

  async getById(reportId: string): Promise<ContentReportV1 | null> {
    const report = this.reports.get(reportId);
    return report ? structuredClone(report) : null;
  }

  async list(status: ContentReportV1["status"] | null): Promise<readonly ContentReportV1[]> {
    return [...this.reports.values()]
      .filter((report) => !status || report.status === status)
      .sort((left, right) => {
        const createdAtDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
        if (createdAtDelta !== 0) return createdAtDelta;
        return left.reportId.localeCompare(right.reportId);
      })
      .map((report) => structuredClone(report));
  }

  async findOpenByReporterAndTarget(
    reporterUserId: string,
    targetType: ContentReportV1["targetType"],
    targetId: string,
  ): Promise<ContentReportV1 | null> {
    for (const report of this.reports.values()) {
      if (
        report.reporterUserId === reporterUserId
        && report.targetType === targetType
        && report.targetId === targetId
        && report.status === "open"
      ) {
        return structuredClone(report);
      }
    }
    return null;
  }

  async save(report: ContentReportV1): Promise<void> {
    this.reports.set(report.reportId, structuredClone(report));
  }
}

export class MemoryUserProfileRepository implements UserProfileRepository {
  private readonly profiles = new Map<string, UserTravelProfileV1>();

  constructor(initial: readonly UserTravelProfileV1[] = []) {
    for (const profile of initial) {
      this.profiles.set(profile.userId, structuredClone(profile));
    }
  }

  async get(userId: string): Promise<UserTravelProfileV1 | null> {
    const profile = this.profiles.get(userId);
    return profile ? structuredClone(profile) : null;
  }

  async save(profile: UserTravelProfileV1): Promise<void> {
    this.profiles.set(profile.userId, structuredClone(profile));
  }
}

export class MemoryPrivacyPolicyRepository implements PrivacyPolicyRepository {
  private readonly policies = new Map<string, LocationVisibilityPolicyV1>();

  constructor(initial: readonly LocationVisibilityPolicyV1[] = []) {
    for (const policy of initial) {
      this.policies.set(policy.userId, structuredClone(policy));
    }
  }

  async get(userId: string): Promise<LocationVisibilityPolicyV1 | null> {
    const policy = this.policies.get(userId);
    return policy ? structuredClone(policy) : null;
  }

  async save(policy: LocationVisibilityPolicyV1): Promise<void> {
    this.policies.set(policy.userId, structuredClone(policy));
  }
}

export class MemoryIdempotencyRepository implements IdempotencyRepository {
  private readonly records = new Map<string, IdempotencyRecord>();

  private key(scope: string, idempotencyKey: string): string {
    return JSON.stringify([scope, idempotencyKey]);
  }

  async get(scope: string, idempotencyKey: string, now: string): Promise<IdempotencyRecord | null> {
    const parsedNow = Date.parse(now);
    for (const [key, record] of this.records) {
      if (Date.parse(record.expiresAt) <= parsedNow) this.records.delete(key);
    }
    const record = this.records.get(this.key(scope, idempotencyKey));
    return record ? { ...record } : null;
  }

  async save(scope: string, idempotencyKey: string, record: IdempotencyRecord): Promise<void> {
    this.records.set(this.key(scope, idempotencyKey), { ...record });
  }
}

export function createMemoryCommunityRepositories(options: {
  readonly reviews?: readonly PlaceReviewV1[];
  readonly aggregates?: readonly PlaceRatingAggregateV1[];
  readonly presence?: readonly TravelPresenceV1[];
  readonly blocks?: ReadonlyArray<{ blockerUserId: string; blockedUserId: string }>;
  readonly reports?: readonly ContentReportV1[];
  readonly profiles?: readonly UserTravelProfileV1[];
  readonly privacyPolicies?: readonly LocationVisibilityPolicyV1[];
} = {}): CommunityRepositories {
  return {
    reviews: new MemoryReviewRepository(options.reviews),
    aggregates: new MemoryAggregateRepository(options.aggregates),
    presence: new MemoryTravelPresenceRepository(options.presence),
    blocks: new MemoryBlockRepository(options.blocks),
    reports: new MemoryReportRepository(options.reports),
    profiles: new MemoryUserProfileRepository(options.profiles),
    privacyPolicies: new MemoryPrivacyPolicyRepository(options.privacyPolicies),
    idempotency: new MemoryIdempotencyRepository(),
  };
}
