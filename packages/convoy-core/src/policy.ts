export type CohesionBand = {
  readonly minimumSpeedKmh: number;
  readonly maximumSpeedKmh: number;
  readonly stretchedMeters: number;
  readonly brokenMeters: number;
  readonly reconnectMeters: number;
};

export const CONVOY_POLICY_V1 = {
  version: "convoy-v1",
  cohesionBands: [
    { minimumSpeedKmh: 0, maximumSpeedKmh: 60, stretchedMeters: 250, brokenMeters: 400, reconnectMeters: 280 },
    { minimumSpeedKmh: 60, maximumSpeedKmh: 80, stretchedMeters: 400, brokenMeters: 600, reconnectMeters: 420 },
    { minimumSpeedKmh: 80, maximumSpeedKmh: 100, stretchedMeters: 550, brokenMeters: 800, reconnectMeters: 560 },
    { minimumSpeedKmh: 100, maximumSpeedKmh: 120, stretchedMeters: 700, brokenMeters: 1_000, reconnectMeters: 700 },
  ],
  persistenceSeconds: { stretched: 15, broken: 30, reconnect: 30, reorder: 12 },
  regroupWeights: {
    safety: 0.35,
    routeCompatibility: 0.2,
    etaFairness: 0.15,
    parking: 0.1,
    detour: 0.1,
    fuelOrCharging: 0.05,
    amenities: 0.05,
  },
  maximumRegroupDetourMeters: 5_000,
} as const;

export type ConvoyPolicy = typeof CONVOY_POLICY_V1;
