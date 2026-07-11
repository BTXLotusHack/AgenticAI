export type TascoPlaceRef = {
  readonly id: string;
  readonly provider: 'tasco';
  readonly name: string;
  readonly address: string;
  readonly coordinates: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly categories: readonly string[];
  readonly ratingSummary?: {
    readonly average: number;
    readonly count: number;
  };
  readonly sourceVersion: string;
};

export type TripStop = {
  readonly id: string;
  readonly place: TascoPlaceRef;
  readonly plannedWindow: string;
  readonly notes: string;
  readonly locked: boolean;
  readonly source: 'tasco' | 'leader';
};

export type TripPlanSummary = {
  readonly id: string;
  readonly title: string;
  readonly lifecycleState: 'draft' | 'ready' | 'active' | 'completed' | 'archived';
  readonly route: {
    readonly origin: TascoPlaceRef;
    readonly destination: TascoPlaceRef;
    readonly stops: readonly TripStop[];
    readonly distanceMeters: number;
    readonly durationMinutes: number;
  };
  readonly departureTime: string;
  readonly policyId: string;
  readonly memberCount: number;
  readonly readinessSummary: string;
  readonly stale: boolean;
};

export type LiveMemberSnapshot = {
  readonly memberId: string;
  readonly displayName: string;
  readonly vehicleLabel: string;
  readonly role: 'leader' | 'driver' | 'observer';
  readonly routeProgress: number;
  readonly speedKph: number;
  readonly accuracyMeters: number;
  readonly freshnessSeconds: number;
  readonly freshnessLabel: string;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly componentId: string;
};

export type LiveTripSnapshot = {
  readonly tripId: string;
  readonly state: 'together' | 'stretched' | 'split' | 'degraded';
  readonly lastUpdatedAt: string;
  readonly members: readonly LiveMemberSnapshot[];
};

export type PlaceCommunitySummary = {
  readonly placeId: string;
  readonly starAverage: number;
  readonly reviewCount: number;
  readonly commentCount: number;
  readonly viewerCanReview: boolean;
  readonly viewerCanReport: boolean;
};

export type LocationVisibilityPolicy = {
  readonly userId: string;
  readonly tripVisibility: 'trip-members' | 'coordinators-only';
  readonly placePresenceVisibility: 'off' | 'friends' | 'public';
  readonly retentionPreference: '30-days' | '90-days' | 'delete-after-trip';
  readonly blockedUsers: readonly string[];
  readonly updatedAt: string;
};

export type PlaceSearchResult = {
  readonly query: string;
  readonly results: readonly TascoPlaceRef[];
};
