import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../app/App';
import { createInitialDemoSession } from '../demo-session/schema';
import { writeDemoSession } from '../demo-session/storage';

function renderLive(withSession = true) {
  if (withSession) writeDemoSession(window.sessionStorage, createInitialDemoSession());
  return render(
    <MemoryRouter initialEntries={['/trips/TRIP001/live']}>
      <App />
    </MemoryRouter>,
  );
}

describe('LiveTripPage', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('requires trip setup instead of fabricating a live session', () => {
    renderLive(false);
    expect(screen.getByRole('heading', { name: /complete trip setup to begin/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /set up trip/i })).toHaveAttribute('href', '/trip/new');
  });

  it('renders the authoritative initial convoy order and route state', () => {
    renderLive();
    expect(screen.getByRole('heading', { name: /hà nội.*hạ long/i })).toBeVisible();
    expect(screen.getByText(/TRIP001 · live demo/i)).toBeVisible();
    expect(screen.getByText(/simulated route projection/i)).toBeVisible();
    expect(screen.getByRole('status', { name: /convoy state/i })).toHaveTextContent(/together/i);
    const rail = screen.getByRole('list', { name: /ordered convoy/i });
    expect(within(rail).getAllByRole('listitem').map((item) => item.getAttribute('data-member-id'))).toEqual([
      'M001', 'M002', 'M003', 'M004',
    ]);
    expect(screen.getAllByLabelText(/vehicle node/i)).toHaveLength(4);
  });

  it('supports stepping, restart, playback, and exact speed controls', async () => {
    const user = userEvent.setup();
    renderLive();

    await user.click(screen.getByRole('button', { name: /next frame/i }));
    expect(screen.getByRole('status', { name: /convoy state/i })).toHaveTextContent(/degraded/i);
    await user.click(screen.getByRole('button', { name: /restart replay/i }));
    expect(screen.getByRole('status', { name: /convoy state/i })).toHaveTextContent(/together/i);
    await user.click(screen.getByRole('button', { name: /^play replay$/i }));
    expect(screen.getByRole('button', { name: /pause replay/i })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /pause replay/i }));
    for (const speed of ['1×', '2×', '4×']) expect(screen.getByRole('button', { name: `Playback speed ${speed}` })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Playback speed 2×' }));
    expect(screen.getByRole('button', { name: 'Playback speed 2×' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows weak GPS as degraded without claiming a split', async () => {
    const user = userEvent.setup();
    renderLive();
    await user.click(screen.getByRole('button', { name: /next frame/i }));

    const member = screen.getByRole('listitem', { name: /chú sơn/i });
    expect(member).toHaveTextContent(/low confidence/i);
    expect(member).toHaveTextContent(/100 m accuracy/i);
    expect(screen.getAllByText(/location confidence is degraded/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: /convoy split/i })).not.toBeInTheDocument();
  });
});
