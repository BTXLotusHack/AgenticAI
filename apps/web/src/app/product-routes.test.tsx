import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './App';

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('Agent 1 product routes', () => {
  beforeEach(() => window.sessionStorage.clear());

  it.each([
    ['/login', /log in to loopin/i],
    ['/signup', /create your loopin account/i],
    ['/forgot-password', /recover your account/i],
    ['/reset-password', /set a new password/i],
    ['/onboarding', /shape your travel profile/i],
    ['/app', /today's trips/i],
    ['/app/trips', /trip library/i],
    ['/app/trips/new', /build a tasco-backed trip/i],
    ['/app/trips/TRIP001', /hà nội to hạ long/i],
    ['/app/trips/TRIP001/itinerary', /itinerary editor/i],
    ['/app/trips/TRIP001/share', /share trip/i],
    ['/app/trips/TRIP001/live', /hà nội.*hạ long/i],
    ['/app/trips/TRIP001/summary', /the convoy is together again/i],
    ['/app/explore', /tasco explore/i],
    ['/app/places/POI001', /minh châu rest stop/i],
    ['/app/now', /day-of-trip command center/i],
    ['/app/settings', /settings/i],
  ])('renders %s', async (path, heading) => {
    if (path.endsWith('/summary')) {
      window.sessionStorage.setItem(
        'loopin:demo-session-v1',
        JSON.stringify({
          schemaVersion: 1,
          tripId: 'TRIP001',
          setupComplete: true,
          frameIndex: 7,
          approvedCandidateId: 'POI001',
          auditEntries: [
            {
              schemaVersion: 1,
              eventType: 'DemoTripCompleted',
              occurredAt: '2026-07-20T00:01:15.000Z',
              tripId: 'TRIP001',
              frameIndex: 7,
              graphRevision: 7,
            },
          ],
        }),
      );
    }
    renderRoute(path);

    expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
  });

  it('wraps authenticated routes in a keyboard-accessible product shell', async () => {
    renderRoute('/app/trips/TRIP001');

    expect(await screen.findByRole('banner', { name: /loopin product/i })).toBeVisible();
    const nav = screen.getByRole('navigation', { name: /^primary$/i });
    for (const label of ['Home', 'Trips', 'Explore', 'Now', 'Community']) {
      expect(within(nav).getByRole('link', { name: label })).toBeVisible();
    }
    expect(within(nav).getByRole('link', { name: 'Trips' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('navigation', { name: /workspace utilities/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /open mai's profile/i })).toBeVisible();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'product-content');
    expect(screen.getByRole('link', { name: /open live trip/i })).toHaveAttribute(
      'href',
      '/app/trips/TRIP001/live',
    );
    expect(screen.getByText(/freshness 18 s/i)).toBeVisible();
    expect(screen.getByText(/confidence high/i)).toBeVisible();
  });

  it('keeps auth forms fixture-backed and validates required fields locally', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    expect(await screen.findByText(/fixture auth boundary/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/email is required/i)).toBeVisible();
    expect(screen.getByText(/password is required/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/signup');
    expect(screen.queryByText(/token|secret|credential/i)).not.toBeInTheDocument();
  });

  it('shows trip planning, explore, and settings degraded states instead of blank pages', async () => {
    renderRoute('/app/trips/new');
    expect(await screen.findByText(/tasco fixture mode/i)).toBeVisible();
    expect(screen.getByText(/route refresh failed/i)).toBeVisible();

    renderRoute('/app/explore');
    expect(await screen.findByText(/loading tasco places/i)).toBeVisible();
    expect(screen.getByText(/no hidden gems match/i)).toBeVisible();

    renderRoute('/app/settings');
    expect(await screen.findByText(/location visibility/i)).toBeVisible();
    expect(screen.getByText(/retention preference/i)).toBeVisible();
    expect(screen.getByText(/notification quiet hours/i)).toBeVisible();
  });

  it.each([
    ['/app/community', /community signals/i],
    ['/app/places/POI001/reviews', /bai chay rest area reviews/i],
    ['/app/profile', /travel profile/i],
    ['/app/settings/privacy', /privacy settings/i],
    ['/app/settings/notifications', /notification settings/i],
    ['/app/admin/moderation', /moderation queue/i],
    ['/app/partners', /partner platform/i],
  ])('renders integrated Agent 4 page %s', async (path, heading) => {
    renderRoute(path);

    expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
    expect(screen.queryByText(/permission boundary/i)).not.toBeInTheDocument();
  });

  it('does not fall back to TRIP001 facts for unknown dynamic trip ids', async () => {
    const liveRoute = renderRoute('/app/trips/TRIP404/live');

    expect(await screen.findByRole('heading', { name: /live trip unavailable/i })).toBeVisible();
    expect(screen.getByText(/trip not found or live access is unavailable/i)).toBeVisible();
    expect(screen.queryByRole('heading', { name: /live members/i })).not.toBeInTheDocument();

    liveRoute.unmount();
    renderRoute('/app/trips/TRIP404/summary');

    expect(await screen.findByRole('heading', { name: /summary unavailable/i })).toBeVisible();
    expect(screen.getByText(/no measured summary is available for this trip fixture/i)).toBeVisible();
    expect(screen.queryByText(/the convoy is together again/i)).not.toBeInTheDocument();
  });

  it('labels stale and empty trip data from the typed fixture contracts', async () => {
    const tripRoute = renderRoute('/app/trips/TRIP002');

    expect(await screen.findByRole('heading', { name: /weekend food loop/i })).toBeVisible();
    expect(screen.getByText(/stale route plan/i)).toBeVisible();

    tripRoute.unmount();
    renderRoute('/app/trips/TRIP002/itinerary');

    expect(await screen.findByText(/no tasco stops are staged for this trip/i)).toBeVisible();
  });
});
