export type ConvoyPhase = 'together' | 'separated' | 'regrouped';

export interface VehicleScene {
  readonly id: string;
  readonly label: string;
  readonly progress: number;
  readonly component: 'front' | 'rear' | 'together';
}

export interface ConvoyScene {
  readonly phase: ConvoyPhase;
  readonly boundaryState: 'connected' | 'stretched' | 'reconnected';
  readonly vehicles: readonly VehicleScene[];
  readonly frontMessage: string;
  readonly rearMessage: string;
}

const togetherVehicles: readonly VehicleScene[] = [
  { id: 'car-1', label: 'Leader', progress: 82, component: 'together' },
  { id: 'car-2', label: 'Car 2', progress: 66, component: 'together' },
  { id: 'car-3', label: 'Car 3', progress: 50, component: 'together' },
  { id: 'car-4', label: 'Car 4', progress: 34, component: 'together' },
  { id: 'car-5', label: 'Car 5', progress: 18, component: 'together' },
];

const scenes: Readonly<Record<ConvoyPhase, ConvoyScene>> = {
  together: {
    phase: 'together',
    boundaryState: 'connected',
    vehicles: togetherVehicles,
    frontMessage: 'All five vehicles are connected on the shared route.',
    rearMessage: 'Positions include route progress and honest location freshness.',
  },
  separated: {
    phase: 'separated',
    boundaryState: 'stretched',
    vehicles: [
      { id: 'car-1', label: 'Leader', progress: 88, component: 'front' },
      { id: 'car-2', label: 'Car 2', progress: 75, component: 'front' },
      { id: 'car-3', label: 'Car 3', progress: 62, component: 'front' },
      { id: 'car-4', label: 'Car 4', progress: 28, component: 'rear' },
      { id: 'car-5', label: 'Car 5', progress: 14, component: 'rear' },
    ],
    frontMessage:
      'Cars 4 and 5 are behind. Maintain a safe pace while the leader coordinates.',
    rearMessage:
      'Your group is ahead. Continue safely to the shared regroup point.',
  },
  regrouped: {
    phase: 'regrouped',
    boundaryState: 'reconnected',
    vehicles: togetherVehicles.map((vehicle) => ({
      ...vehicle,
      progress: vehicle.progress + 4,
    })),
    frontMessage: 'A suitable forward regroup point brought the sections together.',
    rearMessage: 'The convoy is connected again. Continue at a safe pace.',
  },
};

export function getConvoyScene(phase: ConvoyPhase): ConvoyScene {
  const scene = scenes[phase];

  return {
    ...scene,
    vehicles: scene.vehicles.map((vehicle) => ({ ...vehicle })),
  };
}
