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
    name: "Minh Châu Rest Stop",
    label: "Minh Châu Rest Stop",
    address: "QL5, Km 62, Hưng Yên",
    category: "rest_stop",
    coordinates: { lat: 20.8724, lon: 106.0518 },
    distanceMeters: 0,
    score: 0.95,
    source: "mock",
    tags: ["rest_stop", "parking", "restroom", "fuel"],
    rating: 4.4,
    openingHours: "00:00-24:00",
    aiSummary: "Trạm nghỉ an toàn trên tuyến Hà Nội - Hạ Long, phù hợp cho đoàn xe tụ họp.",
  },
  {
    id: TASCO_PLACE_IDS.highwayShoulderKm62,
    type: "poi",
    name: "Highway Shoulder KM62",
    label: "Highway Shoulder KM62",
    address: "QL5, Km 62, Hưng Yên",
    category: "road_shoulder",
    coordinates: { lat: 20.8719, lon: 106.0509 },
    distanceMeters: 120,
    score: 0.25,
    source: "mock",
    tags: ["shoulder", "unsafe_stop"],
    rating: 1.2,
    openingHours: "00:00-24:00",
    aiSummary: "Lề đường cao tốc, không phù hợp để tụ tập đoàn xe.",
  },
  {
    id: TASCO_PLACE_IDS.haLongServiceArea,
    type: "poi",
    name: "Hạ Long Service Area",
    label: "Hạ Long Service Area",
    address: "QL18, Hạ Long, Quảng Ninh",
    category: "rest_stop",
    coordinates: { lat: 20.9571, lon: 107.0426 },
    distanceMeters: 0,
    score: 0.88,
    source: "mock",
    tags: ["rest_stop", "parking", "fuel"],
    rating: 4.1,
    openingHours: "06:00-22:00",
    aiSummary: "Khu dịch vụ gần Hạ Long, xa hơn so với điểm tụ tập tối ưu.",
  },
  {
    id: TASCO_PLACE_IDS.coffeeHouse,
    type: "poi",
    name: "The Coffee House",
    label: "The Coffee House",
    address: "Thái Hà, Đống Đa, Hà Nội",
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
    name: "Hồ Hoàn Kiếm",
    label: "Hồ Hoàn Kiếm",
    address: "Hoàn Kiếm, Hà Nội",
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
    address: "Phạm Hùng, Nam Từ Liêm, Hà Nội",
    category: "landmark",
    coordinates: { lat: 21.0166, lon: 105.7833 },
    distanceMeters: 420,
    score: 0.97,
    source: "mock",
    tags: ["building", "landmark"],
    rating: 4.5,
    openingHours: "09:00-22:00",
    aiSummary: "Large mixed-use landmark complex in Nam Từ Liêm.",
  },
  {
    id: TASCO_PLACE_IDS.phamHung,
    type: "address",
    name: "Phạm Hùng",
    label: "Phạm Hùng, Nam Từ Liêm",
    address: "Phạm Hùng, Nam Từ Liêm, Hà Nội",
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

export function buildGoldenRoutes(requestedAlternates: number): RouteResult[] {
  const { origin, destination } = GOLDEN_ROUTE_R001;
  const primaryGeometry = {
    type: "LineString" as const,
    coordinates: [
      [origin.lon, origin.lat],
      [105.92, 21.01],
      [106.05, 20.87],
      [106.78, 20.93],
      [destination.lon, destination.lat],
    ] as Array<[number, number]>,
  };
  const alternateGeometry = {
    type: "LineString" as const,
    coordinates: [
      [origin.lon, origin.lat],
      [105.98, 21.04],
      [106.12, 20.9],
      [106.55, 20.94],
      [destination.lon, destination.lat],
    ] as Array<[number, number]>,
  };
  const routes: RouteResult[] = [
    {
      routeId: "route:r001-primary",
      sourceIndex: 0,
      summary: { distanceMeters: 156_000, durationSeconds: 9_000 },
      geometry: primaryGeometry,
      maneuvers: [
        {
          instruction: "Tiếp tục an toàn theo QL5 về phía Hạ Long.",
          distanceMeters: 156_000,
          durationSeconds: 9_000,
          beginShapeIndex: 0,
          endShapeIndex: primaryGeometry.coordinates.length - 1,
          streetNames: ["QL5"],
        },
      ],
    },
  ];
  if (requestedAlternates >= 1) {
    routes.push({
      routeId: "route:r001-alternate-1",
      sourceIndex: 1,
      summary: { distanceMeters: 162_500, durationSeconds: 9_600 },
      geometry: alternateGeometry,
      maneuvers: [
        {
          instruction: "Đi theo tuyến thay thế qua Hưng Yên với ít điểm dừng hơn.",
          distanceMeters: 162_500,
          durationSeconds: 9_600,
          beginShapeIndex: 0,
          endShapeIndex: alternateGeometry.coordinates.length - 1,
          streetNames: ["QL5", "Đường vành đai 3"],
        },
      ],
    });
  }
  return routes;
}
