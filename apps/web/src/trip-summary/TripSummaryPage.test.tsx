import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { createGoldenR001Replay } from '@loopin/demo-scenarios';

import { App } from '../app/App';
import { appendAuditEntry } from '../demo-session/audit';
import { createInitialDemoSession } from '../demo-session/schema';
import { writeDemoSession } from '../demo-session/storage';

function renderSummary() {
  return render(<MemoryRouter initialEntries={['/trips/TRIP001/summary']}><App /></MemoryRouter>);
}

function completedSession() {
  const frames = createGoldenR001Replay();
  return appendAuditEntry(
    { ...createInitialDemoSession(), frameIndex: frames.length - 1, approvedCandidateId: 'POI001' },
    { eventType: 'DemoTripCompleted', occurredAt: '2026-07-20T00:01:15.000Z', frameIndex: frames.length - 1, graphRevision: frames.at(-1)!.graph.graphRevision },
  );
}

describe('TripSummaryPage', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('does not fabricate a summary for a missing or incomplete session', async () => {
    renderSummary();
    expect(await screen.findByRole('heading', { name: /complete the trip to view its summary/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /set up trip/i })).toHaveAttribute('href', '/trip/new');
  });

  it('renders measured facts, approved POI, and a factual timeline', async () => {
    writeDemoSession(window.sessionStorage, completedSession());
    renderSummary();

    expect(await screen.findByRole('heading', { name: /the convoy is together again/i })).toBeVisible();
    expect(screen.getByText(/75 seconds/i)).toBeVisible();
    expect(screen.getByText(/1 confirmed · 1 resolved/i)).toBeVisible();
    expect(screen.getByText(/^900 m$/i)).toBeVisible();
    expect(screen.getAllByText(/Minh Châu Rest Stop/i)).toHaveLength(2);
    expect(screen.getByText(/8 notification requests/i)).toBeVisible();
    expect(screen.getByText(/1 duplicate · 1 stale · 1 history replay/i)).toBeVisible();
    expect(screen.getByText(/template summary/i)).toBeVisible();
    expect(screen.getByText(/1 confirmed convoy split/i)).toBeVisible();
    const timeline = screen.getByRole('list', { name: /trip event timeline/i });
    for (const phase of ['Together', 'Weak GPS', 'Stretched', 'Split', 'Regroup approved', 'Reconnected']) {
      expect(timeline).toHaveTextContent(phase);
    }
    expect(screen.getByRole('button', { name: /replay trip/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /start another demo/i })).toBeVisible();
    for (const link of screen.getAllByRole('link', { name: /back to loopin/i })) {
      expect(link).toHaveAttribute('href', '/');
    }
  });
});
