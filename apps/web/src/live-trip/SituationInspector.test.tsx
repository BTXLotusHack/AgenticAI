import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../app/App';
import { createInitialDemoSession } from '../demo-session/schema';
import { DEMO_SESSION_KEY, writeDemoSession } from '../demo-session/storage';

function renderLive() {
  writeDemoSession(window.sessionStorage, createInitialDemoSession());
  return render(<MemoryRouter initialEntries={['/trips/TRIP001/live']}><App /></MemoryRouter>);
}

async function reachSplit(user: ReturnType<typeof userEvent.setup>) {
  const next = await screen.findByRole('button', { name: /next frame/i });
  for (let index = 0; index < 8; index += 1) await user.click(next);
}

describe('SituationInspector', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('explains degraded confidence without confirming a split', async () => {
    const user = userEvent.setup();
    renderLive();
    await user.click(await screen.findByRole('button', { name: /next frame/i }));
    const inspector = screen.getByRole('complementary', { name: /trip inspector/i });
    expect(within(inspector).getByRole('heading', { name: /signal check/i })).toBeVisible();
    expect(within(inspector).getByText(/no split is confirmed/i)).toBeVisible();
    expect(within(inspector).queryByRole('heading', { name: /convoy split/i })).not.toBeInTheDocument();
  });

  it('renders exact confirmed boundary evidence and recipient messages once', async () => {
    const user = userEvent.setup();
    renderLive();
    await reachSplit(user);
    const inspector = screen.getByRole('complementary', { name: /trip inspector/i });

    expect(within(inspector).getByRole('heading', { name: /convoy split/i })).toBeVisible();
    expect(inspector.querySelector('.inspector-boundary')).toHaveTextContent(/M003 → M004/);
    expect(within(inspector).getByText(/^900 m$/)).toBeVisible();
    expect(within(inspector).getByText(/high confidence/i)).toBeVisible();
    expect(within(inspector).getByText(/revision 5/i)).toBeVisible();
    expect(within(inspector).getByText(/convoy-v1/i)).toBeVisible();
    expect(within(inspector).getByText(/M001, M002, M003/)).toBeVisible();
    expect(within(inspector).getByText(/^M004$/)).toBeVisible();
    expect(within(inspector).getAllByRole('listitem', { name: /notification for/i })).toHaveLength(4);
    expect(within(inspector).getByText(/không vội đuổi theo/i)).toBeVisible();
  });

  it('shows hard exclusions and approves only the selected eligible POI', async () => {
    const user = userEvent.setup();
    renderLive();
    await reachSplit(user);
    await user.click(screen.getByRole('button', { name: /review regroup points/i }));

    const review = screen.getByRole('region', { name: /regroup points/i });
    expect(within(review).getByRole('radio', { name: /Minh Châu Rest Stop/i })).toBeVisible();
    expect(within(review).getByRole('radio', { name: /Hạ Long Service Area/i })).toBeVisible();
    const excluded = within(review).getByRole('listitem', { name: /Highway Shoulder KM62/i });
    expect(excluded).toHaveTextContent(/unsafe stop/i);
    expect(excluded).toHaveTextContent(/insufficient convoy parking/i);
    expect(within(excluded).queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve Minh Châu Rest Stop/i })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /approve Minh Châu Rest Stop/i }));

    expect(screen.getByText(/regroup approved/i)).toBeVisible();
    expect(screen.getByText(/Minh Châu Rest Stop/i)).toBeVisible();
    const stored = JSON.parse(window.sessionStorage.getItem(DEMO_SESSION_KEY) ?? '{}');
    expect(stored.approvedCandidateId).toBe('POI001');
    expect(stored.auditEntries.at(-1)).toMatchObject({ eventType: 'RegroupApproved', candidateId: 'POI001', graphRevision: 5 });
  });
});
