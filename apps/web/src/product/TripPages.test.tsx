import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ItineraryPage, ShareTripPage, TripOverviewPage, TripPlannerPage } from './TripPages';

function renderRoute(path: string, element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route element={element} path="*" /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('redesigned trip workflow', () => {
  it('shows six planning stages and keeps the Tasco fallback visible', async () => {
    renderRoute('/app/trips/new', <TripPlannerPage />);
    expect(screen.getByRole('navigation', { name: 'Planning stages' })).toBeVisible();
    expect(screen.getAllByText(/tasco/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: 'Route preview' })).toBeVisible();
    expect(screen.getByText(/route refresh failed/i)).toBeVisible();
    expect(await screen.findByText('Minh Châu Rest Stop')).toBeVisible();
  });

  it('makes overview the hub for route, readiness and trip actions', async () => {
    renderRoute('/app/trips/TRIP001', <TripOverviewPage />);
    expect(await screen.findByRole('heading', { name: 'Hà Nội to Hạ Long' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Trip route' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Group readiness' })).toBeVisible();
    expect(screen.getByRole('link', { name: /open live trip/i })).toHaveAttribute('href', '/app/trips/TRIP001/live');
    expect(screen.getByRole('link', { name: /edit itinerary/i })).toHaveAttribute('href', '/app/trips/TRIP001/itinerary');
  });

  it('renders route legs and trip-scoped sharing permissions', async () => {
    const itinerary = renderRoute('/app/trips/TRIP001/itinerary', <ItineraryPage />);
    expect(await screen.findByRole('heading', { name: 'Itinerary editor' })).toBeVisible();
    expect((await screen.findAllByText('Route leg')).length).toBeGreaterThan(0);
    itinerary.unmount();
    renderRoute('/app/trips/TRIP001/share', <ShareTripPage />);
    expect(screen.getByRole('img', { name: /qr representation for trip001/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'What invitees can see' })).toBeVisible();
    expect(screen.getByText(/precise location is visible only during the active trip/i)).toBeVisible();
  });
});
