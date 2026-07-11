import type {
  LiveTripSnapshot,
  LocationVisibilityPolicy,
  PlaceCommunitySummary,
  PlaceSearchResult,
  TascoPlaceRef,
  TeamMember,
  TeamSummary,
  TripPlanSummary,
} from './types';

export const places: readonly TascoPlaceRef[] = [
  {
    id: 'ORIGIN-HANOI',
    provider: 'tasco',
    name: 'Hà Nội',
    address: 'Hoàn Kiếm, Hà Nội',
    coordinates: { lat: 21.0278, lng: 105.8342 },
    categories: ['city', 'origin'],
    sourceVersion: 'tasco-fixture-v1',
  },
  {
    id: 'DEST-HALONG',
    provider: 'tasco',
    name: 'Hạ Long',
    address: 'Bãi Cháy, Quảng Ninh',
    coordinates: { lat: 20.9511, lng: 107.08 },
    categories: ['city', 'destination'],
    sourceVersion: 'tasco-fixture-v1',
  },
  {
    id: 'POI001',
    provider: 'tasco',
    name: 'Minh Châu Rest Stop',
    address: 'QL18, Hải Dương',
    coordinates: { lat: 20.9474, lng: 106.3168 },
    categories: ['rest-stop', 'parking', 'food'],
    ratingSummary: { average: 4.6, count: 128 },
    sourceVersion: 'tasco-fixture-v1',
  },
  {
    id: 'POI003',
    provider: 'tasco',
    name: 'Hạ Long Service Area',
    address: 'Cao tốc Hạ Long, Quảng Ninh',
    coordinates: { lat: 20.9987, lng: 106.8204 },
    categories: ['service-area', 'fuel', 'parking'],
    ratingSummary: { average: 4.2, count: 84 },
    sourceVersion: 'tasco-fixture-v1',
  },
];

const hanoi = places[0]!;
const haLong = places[1]!;
const minhChauRestStop = places[2]!;
const haLongServiceArea = places[3]!;

export const trips: readonly TripPlanSummary[] = [
  {
    id: 'TRIP001',
    title: 'Hà Nội to Hạ Long',
    lifecycleState: 'active',
    route: {
      origin: hanoi,
      destination: haLong,
      stops: [
        {
          id: 'STOP001',
          place: minhChauRestStop,
          plannedWindow: '10:15-10:35',
          notes: 'Verified forward regroup candidate with parking.',
          locked: true,
          source: 'tasco',
        },
      ],
      distanceMeters: 156_000,
      durationMinutes: 155,
    },
    departureTime: '2026-07-20T01:00:00.000Z',
    policyId: 'convoy-policy-v1',
    memberCount: 4,
    readinessSummary: '4 ready · voice optional · GPS verified',
    stale: false,
  },
  {
    id: 'TRIP002',
    title: 'Weekend food loop',
    lifecycleState: 'draft',
    route: {
      origin: hanoi,
      destination: haLongServiceArea,
      stops: [],
      distanceMeters: 74_000,
      durationMinutes: 86,
    },
    departureTime: '2026-08-02T02:30:00.000Z',
    policyId: 'convoy-policy-v1',
    memberCount: 2,
    readinessSummary: 'Draft · route refresh needed',
    stale: true,
  },
];

export const liveTrip: LiveTripSnapshot = {
  tripId: 'TRIP001',
  state: 'together',
  lastUpdatedAt: '2026-07-20T01:00:18.000Z',
  members: [
    {
      memberId: 'M001',
      displayName: 'Chị Linh',
      vehicleLabel: 'Lead car',
      role: 'leader',
      routeProgress: 0.32,
      speedKph: 72,
      accuracyMeters: 8,
      freshnessSeconds: 18,
      freshnessLabel: 'freshness 18 s',
      confidence: 'high',
      componentId: 'front',
    },
    {
      memberId: 'M002',
      displayName: 'Anh Minh',
      vehicleLabel: 'Car 2',
      role: 'driver',
      routeProgress: 0.3,
      speedKph: 70,
      accuracyMeters: 9,
      freshnessSeconds: 20,
      freshnessLabel: 'freshness 20 s',
      confidence: 'high',
      componentId: 'front',
    },
    {
      memberId: 'M003',
      displayName: 'Chú Sơn',
      vehicleLabel: 'Car 3',
      role: 'driver',
      routeProgress: 0.28,
      speedKph: 68,
      accuracyMeters: 12,
      freshnessSeconds: 24,
      freshnessLabel: 'freshness 24 s',
      confidence: 'medium',
      componentId: 'front',
    },
    {
      memberId: 'M004',
      displayName: 'Cô Mai',
      vehicleLabel: 'Car 4',
      role: 'driver',
      routeProgress: 0.25,
      speedKph: 66,
      accuracyMeters: 11,
      freshnessSeconds: 26,
      freshnessLabel: 'freshness 26 s',
      confidence: 'medium',
      componentId: 'rear',
    },
  ],
};

export const communitySummaries: readonly PlaceCommunitySummary[] = [
  {
    placeId: 'POI001',
    starAverage: 4.5,
    reviewCount: 42,
    commentCount: 11,
    viewerCanReview: true,
    viewerCanReport: true,
  },
];

export const locationVisibilityPolicy: LocationVisibilityPolicy = {
  userId: 'fixture-user',
  tripVisibility: 'trip-members',
  placePresenceVisibility: 'off',
  retentionPreference: '30-days',
  blockedUsers: ['redacted-user'],
  updatedAt: '2026-07-20T00:00:00.000Z',
};

export const teams: readonly TeamSummary[] = [
  {
    id: 'TEAM001',
    name: 'Ha Long family convoy',
    myRole: 'LEADER',
    memberCount: 4,
    activeTripId: 'TRIP001',
    inviteState: 'ready',
  },
  {
    id: 'TEAM002',
    name: 'Weekend food loop',
    myRole: 'MEMBER',
    memberCount: 2,
    activeTripId: 'TRIP002',
    inviteState: 'pending',
  },
];

export const teamMembers: Record<string, readonly TeamMember[]> = {
  TEAM001: [
    {
      userId: 'u1',
      displayName: 'Chi Linh',
      email: 'linh@example.com',
      role: 'LEADER',
      joinedAt: '2026-07-18T03:00:00.000Z',
      readiness: 'ready',
    },
    {
      userId: 'u2',
      displayName: 'Anh Minh',
      email: 'minh@example.com',
      role: 'MEMBER',
      joinedAt: '2026-07-18T03:05:00.000Z',
      readiness: 'ready',
    },
    {
      userId: 'u3',
      displayName: 'Chu Son',
      email: 'son@example.com',
      role: 'MEMBER',
      joinedAt: '2026-07-18T03:08:00.000Z',
      readiness: 'needs-check',
    },
    {
      userId: 'u4',
      displayName: 'Co Mai',
      email: 'mai@example.com',
      role: 'MEMBER',
      joinedAt: '2026-07-18T03:10:00.000Z',
      readiness: 'ready',
    },
  ],
  TEAM002: [
    {
      userId: 'u1',
      displayName: 'Chi Linh',
      email: 'linh@example.com',
      role: 'MEMBER',
      joinedAt: '2026-07-22T02:00:00.000Z',
      readiness: 'invited',
    },
    {
      userId: 'u5',
      displayName: 'Tuan',
      email: 'tuan@example.com',
      role: 'LEADER',
      joinedAt: '2026-07-22T01:55:00.000Z',
      readiness: 'ready',
    },
  ],
};

export async function listTrips() {
  return trips;
}

export async function getTrip(tripId: string) {
  return trips.find((trip) => trip.id === tripId) ?? null;
}

export async function searchPlaces(query: string): Promise<PlaceSearchResult> {
  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? places.filter((place) =>
        [place.name, place.address, ...place.categories].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
    : places;
  return { query, results };
}

export async function getPlace(placeId: string) {
  return places.find((place) => place.id === placeId) ?? null;
}

export async function getLiveTrip(tripId: string) {
  return tripId === liveTrip.tripId ? liveTrip : null;
}

export async function getPlaceCommunitySummary(placeId: string) {
  return communitySummaries.find((summary) => summary.placeId === placeId) ?? {
    placeId,
    starAverage: 0,
    reviewCount: 0,
    commentCount: 0,
    viewerCanReview: false,
    viewerCanReport: false,
  };
}

export async function getLocationVisibilityPolicy() {
  return locationVisibilityPolicy;
}

export async function listTeams() {
  return teams;
}

export async function listTeamMembers(teamId: string) {
  return teamMembers[teamId] ?? null;
}
