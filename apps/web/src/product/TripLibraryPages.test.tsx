import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DashboardPage, TripsPage } from './TripLibraryPages';

function renderPage(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter>{page}</MemoryRouter></QueryClientProvider>);
}

describe('home and trip library', () => {
  it('leads the dashboard with the next trip and its useful actions', async () => {
    renderPage(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: 'Next trip' })).toBeVisible();
    expect(screen.getByRole('link', { name: /continue planning/i })).toHaveAttribute('href', '/app/trips/TRIP001');
    expect(screen.getByRole('heading', { name: 'Planning prompt' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Places for this route' })).toBeVisible();
  });

  it('filters the trip library by lifecycle without losing the plan action', async () => {
    const user = userEvent.setup();
    renderPage(<TripsPage />);

    expect(await screen.findByRole('link', { name: /hà nội to hạ long/i })).toHaveAttribute('href', '/app/trips/TRIP001');
    const draft = screen.getByRole('button', { name: 'Draft' });
    await user.click(draft);
    expect(draft).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: /weekend food loop/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /plan a trip/i })).toHaveAttribute('href', '/app/trips/new');
  });
});
