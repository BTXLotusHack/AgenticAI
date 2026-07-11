import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createLoopinQueryClient } from '../app/queryClient';
import {
  useLiveTrip,
  usePlaceCommunitySummary,
  usePlaceSearch,
  useTrip,
  useTrips,
} from './hooks';

function wrapper({ children }: { readonly children: ReactNode }) {
  return (
    <QueryClientProvider client={createLoopinQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe('web API hooks', () => {
  it('returns fixture trips through the typed trip hooks without network access', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const trips = renderHook(() => useTrips(), { wrapper });
    const trip = renderHook(() => useTrip('TRIP001'), { wrapper });

    await waitFor(() => expect(trips.result.current.data?.[0]?.id).toBe('TRIP001'));
    await waitFor(() => expect(trip.result.current.data?.route.destination.name).toBe('Hạ Long'));

    const firstTrip = trips.result.current.data?.[0];
    expect(firstTrip).toBeDefined();
    expect(firstTrip!).toMatchObject({
      lifecycleState: 'active',
      route: { origin: { provider: 'tasco' } },
      memberCount: 4,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('exposes Tasco place search, community summary, and live freshness labels', async () => {
    const search = renderHook(() => usePlaceSearch('rest stop'), { wrapper });
    const community = renderHook(() => usePlaceCommunitySummary('POI001'), { wrapper });
    const live = renderHook(() => useLiveTrip('TRIP001'), { wrapper });

    await waitFor(() => expect(search.result.current.data?.results[0]?.name).toMatch(/Minh Châu/i));
    await waitFor(() => expect(community.result.current.data?.reviewCount).toBeGreaterThan(0));
    await waitFor(() => expect(live.result.current.data?.members).toHaveLength(4));

    const firstPlace = search.result.current.data?.results[0];
    expect(firstPlace).toBeDefined();
    expect(firstPlace!).toMatchObject({
      provider: 'tasco',
      sourceVersion: 'tasco-fixture-v1',
    });
    expect(live.result.current.data?.members[0]).toMatchObject({
      freshnessLabel: 'freshness 18 s',
      confidence: 'high',
    });
  });
});
