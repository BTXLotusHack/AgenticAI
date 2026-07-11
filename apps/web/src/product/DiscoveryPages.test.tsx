import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ExplorePage, NowPage, PlaceDetailPage, SettingsPage } from './DiscoveryPages';

function renderRoute(path: string, element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route element={element} path="*" /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('discovery and day-of-trip pages', () => {
  it('pairs Tasco search results with an accessible provider-labeled map', async () => {
    renderRoute('/app/explore', <ExplorePage />);
    expect(screen.getByRole('region', { name: 'Tasco map preview' })).toBeVisible();
    expect(screen.getByRole('toolbar', { name: 'Place filters' })).toBeVisible();
    expect(await screen.findByRole('link', { name: /^minh châu rest stop$/i })).toHaveAttribute('href', '/app/places/POI001');
    expect(screen.getByText(/fixture geometry/i)).toBeVisible();
  });

  it('keeps provider facts separate from Loopin community data', async () => {
    renderRoute('/app/places/POI001', <PlaceDetailPage />);
    expect(await screen.findByRole('region', { name: 'Tasco place facts' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Loopin community' })).toBeVisible();
  });

  it('links day-of-trip and settings actions to their focused routes', async () => {
    const now = renderRoute('/app/now', <NowPage />);
    expect(screen.getByRole('link', { name: /open live trip/i })).toHaveAttribute('href', '/app/trips/TRIP001/live');
    now.unmount();
    renderRoute('/app/settings', <SettingsPage />);
    expect(screen.getByRole('link', { name: /privacy and location/i })).toHaveAttribute('href', '/app/settings/privacy');
    expect(screen.getByRole('link', { name: /notifications/i })).toHaveAttribute('href', '/app/settings/notifications');
  });
});
