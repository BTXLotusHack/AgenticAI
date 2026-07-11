import type { PlaceResult, RouteResult } from "@loopin/tasco-maps";

export const TASCO_PLACE_IDS = {
  minhChauRestStop: "poi:poi001-minh-chau-rest-stop",
  highwayShoulderKm62: "poi:poi002-highway-shoulder-km62",
  haLongServiceArea: "poi:poi003-ha-long-service-area",
  coffeeHouse: "poi:coffee-house",
  hoanKiemLake: "poi:hoan-kiem-lake",
  landmark72: "poi:landmark-72",
  phamHung: "address:pham-hung",
} as const;

export const GOLDEN_ROUTE_R001 = {
  origin: { lat: 21.0285, lon: 105.8542 },
  destination: { lat: 20.9507, lon: 107.0732 },
} as const;

export const MOCK_PLACES: readonly PlaceResult[] = [
  {
    id: TASCO_PLACE_IDS.minhChauRestStop,
    type: "poi",
    name: "Minh Chau Rest Stop",
    label: "Minh Chau Rest Stop",
    address: "QL5, Km 62, Hung Yen",
    category: "rest_stop",
    coordinates: { lat: 20.8724, lon: 106.0518 },
    distanceMeters: 0,
    score: 0.95,
    source: "mock",
    tags: ["rest_stop", "parking", "restroom", "fuel"],
    rating: 4.4,
    openingHours: "00:00-24:00",
    aiSummary: "Safe rest stop on the Ha Noi to Ha Long route for convoy regrouping.",
  },
  {
    id: TASCO_PLACE_IDS.highwayShoulderKm62,
    type: "poi",
    name: "Highway Shoulder KM62",
    label: "Highway Shoulder KM62",
    address: "QL5, Km 62, Hung Yen",
    category: "road_shoulder",
    coordinates: { lat: 20.8719, lon: 106.0509 },
    distanceMeters: 120,
    score: 0.25,
    source: "mock",
    tags: ["shoulder", "unsafe_stop"],
    rating: 1.2,
    openingHours: "00:00-24:00",
    aiSummary: "Road shoulder, unsuitable for a convoy regroup stop.",
  },
  {
    id: TASCO_PLACE_IDS.haLongServiceArea,
    type: "poi",
    name: "Ha Long Service Area",
    label: "Ha Long Service Area",
    address: "QL18, Ha Long, Quang Ninh",
    category: "rest_stop",
    coordinates: { lat: 20.9571, lon: 107.0426 },
    distanceMeters: 0,
    score: 0.88,
    source: "mock",
    tags: ["rest_stop", "parking", "fuel"],
    rating: 4.1,
    openingHours: "06:00-22:00",
    aiSummary: "Service area near Ha Long with parking and fuel.",
  },
  {
    id: TASCO_PLACE_IDS.coffeeHouse,
    type: "poi",
    name: "The Coffee House",
    label: "The Coffee House",
    address: "Thai Ha, Dong Da, Ha Noi",
    category: "cafe",
    coordinates: { lat: 21.0129, lon: 105.8194 },
    distanceMeters: 1800,
    score: 0.93,
    source: "mock",
    tags: ["cafe"],
    rating: 4.3,
    openingHours: "07:00-22:00",
  },
  {
    id: TASCO_PLACE_IDS.hoanKiemLake,
    type: "poi",
    name: "Hoan Kiem Lake",
    label: "Hoan Kiem Lake",
    address: "Hoan Kiem, Ha Noi",
    category: "landmark",
    coordinates: { lat: 21.0287, lon: 105.8521 },
    distanceMeters: 950,
    score: 0.91,
    source: "mock",
    tags: ["landmark", "lake"],
    rating: 4.8,
    openingHours: "00:00-24:00",
  },
  {
    id: TASCO_PLACE_IDS.landmark72,
    type: "poi",
    name: "Landmark 72",
    label: "Landmark 72",
    address: "Pham Hung, Nam Tu Liem, Ha Noi",
    category: "landmark",
    coordinates: { lat: 21.0166, lon: 105.7833 },
    distanceMeters: 420,
    score: 0.97,
    source: "mock",
    tags: ["building", "landmark"],
    rating: 4.5,
    openingHours: "09:00-22:00",
    aiSummary: "Large mixed-use landmark complex in Nam Tu Liem.",
  },
  {
    id: TASCO_PLACE_IDS.phamHung,
    type: "address",
    name: "Pham Hung",
    label: "Pham Hung, Nam Tu Liem",
    address: "Pham Hung, Nam Tu Liem, Ha Noi",
    category: "address",
    coordinates: { lat: 21.0166, lon: 105.7833 },
    distanceMeters: 12,
    score: 0.88,
    source: "mock",
    tags: ["address"],
  },
];

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h))));
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFC")
    .replace(/[,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function rankPlaces(
  places: readonly PlaceResult[],
  query: {
    readonly q?: string;
    readonly lat?: number;
    readonly lon?: number;
    readonly category?: string;
    readonly radiusMeters?: number;
  },
): PlaceResult[] {
  const normalizedQuery = query.q ? normalizeSearchText(query.q) : "";
  const focus = query.lat !== undefined && query.lon !== undefined ? { lat: query.lat, lon: query.lon } : undefined;
  return [...places]
    .filter((place) => {
      if (query.category && place.category !== query.category) return false;
      if (!normalizedQuery) return true;
      const haystack = normalizeSearchText(`${place.name} ${place.label} ${place.address} ${place.category}`);
      return haystack.includes(normalizedQuery);
    })
    .map((place) => ({
      ...place,
      distanceMeters: focus ? haversineMeters(focus, place.coordinates) : place.distanceMeters,
    }))
    .filter((place) => (query.radiusMeters === undefined ? true : (place.distanceMeters ?? 0) <= query.radiusMeters))
    .sort((left, right) => {
      const leftName = normalizeSearchText(left.name);
      const rightName = normalizeSearchText(right.name);
      const leftMatch = normalizedQuery.includes(leftName) || leftName.includes(normalizedQuery) ? 1 : 0;
      const rightMatch = normalizedQuery.includes(rightName) || rightName.includes(normalizedQuery) ? 1 : 0;
      if (rightMatch !== leftMatch) return rightMatch - leftMatch;
      return (right.score ?? 0) - (left.score ?? 0) || (left.distanceMeters ?? 0) - (right.distanceMeters ?? 0);
    });
}

export function findPlaceById(id: string): PlaceResult | undefined {
  return MOCK_PLACES.find((place) => place.id === id);
}

export function buildRankQuery(query: {
  q?: string | undefined;
  lat?: number | undefined;
  lon?: number | undefined;
  category?: string | undefined;
  radiusMeters?: number | undefined;
}) {
  return {
    ...(query.q !== undefined ? { q: query.q } : {}),
    ...(query.lat !== undefined ? { lat: query.lat } : {}),
    ...(query.lon !== undefined ? { lon: query.lon } : {}),
    ...(query.category !== undefined ? { category: query.category } : {}),
    ...(query.radiusMeters !== undefined ? { radiusMeters: query.radiusMeters } : {}),
  };
}

function routeCoordinates(locations: readonly { lat: number; lon: number }[]): Array<[number, number]> {
  return locations.map((location) => [location.lon, location.lat]);
}

function routeDistanceMeters(locations: readonly { lat: number; lon: number }[]): number {
  let total = 0;
  for (let index = 1; index < locations.length; index += 1) {
    total += haversineMeters(locations[index - 1]!, locations[index]!);
  }
  return total;
}

function routeDurationSeconds(distanceMeters: number): number {
  return Math.max(60, Math.round((distanceMeters / 1_000 / 60) * 3_600));
}

function alternateCoordinates(locations: readonly { lat: number; lon: number }[]): Array<[number, number]> {
  return locations.map((location, index) => {
    if (index === 0 || index === locations.length - 1) return [location.lon, location.lat];
    return [
      Math.round((location.lon + 0.015) * 10_000) / 10_000,
      Math.round((location.lat + 0.01) * 10_000) / 10_000,
    ];
  });
}

export function buildGoldenRoutes(
  requestedAlternates: number,
  locations: readonly { lat: number; lon: number }[] = [GOLDEN_ROUTE_R001.origin, GOLDEN_ROUTE_R001.destination],
): RouteResult[] {
  const distanceMeters = routeDistanceMeters(locations);
  const durationSeconds = routeDurationSeconds(distanceMeters);
  const primaryGeometry = {
    type: "LineString" as const,
    coordinates: routeCoordinates(locations),
  };
  const alternateGeometry = {
    type: "LineString" as const,
    coordinates: alternateCoordinates(locations),
  };
  const routes: RouteResult[] = [
    {
      routeId: "route:r001-primary",
      sourceIndex: 0,
      summary: { distanceMeters, durationSeconds },
      geometry: primaryGeometry,
      maneuvers: [
        {
          instruction: "Continue safely on the requested route.",
          distanceMeters,
          durationSeconds,
          beginShapeIndex: 0,
          endShapeIndex: primaryGeometry.coordinates.length - 1,
          streetNames: ["QL5"],
        },
      ],
    },
  ];
  if (requestedAlternates >= 1) {
    const alternateDistanceMeters = Math.round(distanceMeters * 1.04);
    const alternateDurationSeconds = Math.round(durationSeconds * 1.05);
    routes.push({
      routeId: "route:r001-alternate-1",
      sourceIndex: 1,
      summary: { distanceMeters: alternateDistanceMeters, durationSeconds: alternateDurationSeconds },
      geometry: alternateGeometry,
      maneuvers: [
        {
          instruction: "Use the alternate route if it remains appropriate for the convoy.",
          distanceMeters: alternateDistanceMeters,
          durationSeconds: alternateDurationSeconds,
          beginShapeIndex: 0,
          endShapeIndex: alternateGeometry.coordinates.length - 1,
          streetNames: ["QL5", "Ring Road 3"],
        },
      ],
    });
  }
  return routes;
}
