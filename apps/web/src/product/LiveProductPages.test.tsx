import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DynamicLiveTripPage, DynamicSummaryPage } from './LiveProductPages';

function renderRoute(path: string, element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route element={element} path="*" /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('dynamic live and summary pages', () => {
  it('prioritizes route position, freshness, confidence, and the current instruction', async () => {
    renderRoute('/app/trips/TRIP001/live', <DynamicLiveTripPage />);
    expect(await screen.findByRole('region', { name: 'Route and convoy position' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Current instruction' })).toBeVisible();
    expect(screen.getAllByText(/freshness/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/confidence/i).length).toBeGreaterThan(0);
  });

  it('discloses fixture measurement and gives the summary a trip timeline', async () => {
    renderRoute('/app/trips/TRIP001/summary', <DynamicSummaryPage />);
    expect(await screen.findByRole('heading', { name: 'The convoy is together again.' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Trip timeline' })).toBeVisible();
    expect(screen.getAllByText(/fixture measurement/i).length).toBeGreaterThan(0);
  });
});
