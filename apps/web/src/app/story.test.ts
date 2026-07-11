import { describe, expect, it } from 'vitest';
import { getConvoyScene } from './story';

describe('convoy story', () => {
  it('keeps all five vehicles in one component while together', () => {
    const scene = getConvoyScene('together');

    expect(new Set(scene.vehicles.map((vehicle) => vehicle.component))).toEqual(
      new Set(['together']),
    );
    expect(scene.boundaryState).toBe('connected');
  });

  it('splits at the Car 3 and Car 4 boundary without instructing speeding', () => {
    const scene = getConvoyScene('separated');

    expect(
      scene.vehicles
        .slice(0, 3)
        .every((vehicle) => vehicle.component === 'front'),
    ).toBe(true);
    expect(
      scene.vehicles.slice(3).every((vehicle) => vehicle.component === 'rear'),
    ).toBe(true);
    expect(scene.boundaryState).toBe('stretched');
    expect(`${scene.frontMessage} ${scene.rearMessage}`).not.toMatch(
      /speed up|hurry|brake/i,
    );
  });

  it('reconnects every vehicle after the safe regroup scene', () => {
    const scene = getConvoyScene('regrouped');

    expect(scene.boundaryState).toBe('reconnected');
    expect(
      scene.vehicles.every((vehicle) => vehicle.component === 'together'),
    ).toBe(true);
  });

  it('returns fresh scene data so a consumer cannot mutate later renders', () => {
    const first = getConvoyScene('separated');
    const second = getConvoyScene('separated');

    expect(first).not.toBe(second);
    expect(first.vehicles).not.toBe(second.vehicles);
  });
});
