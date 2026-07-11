import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../app/App';
import { DEMO_SESSION_KEY } from '../demo-session/storage';

function renderSetup() {
  return render(
    <MemoryRouter initialEntries={['/trip/new']}>
      <App />
    </MemoryRouter>,
  );
}

describe('TripSetupPage', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('renders the workbook route and all four readiness rows', () => {
    renderSetup();

    expect(screen.getByRole('heading', { name: /set up the hà nội.*hạ long drive/i })).toBeVisible();
    expect(screen.getByText(/TRIP001 · R001/i)).toBeVisible();
    expect(screen.getByText(/20 jul 2026.*07:30/i)).toBeVisible();
    const readiness = screen.getByRole('table', { name: /member readiness/i });
    for (const name of ['Anh Minh', 'Chị Lan', 'Anh Huy', 'Chú Sơn']) {
      expect(within(readiness).getByText(name)).toBeVisible();
    }
    expect(within(readiness).getByText(/voice off/i)).toBeVisible();
    expect(screen.getByText(/simulated route projection/i)).toBeVisible();
  });

  it('blocks launch when required location consent is disabled', async () => {
    const user = userEvent.setup();
    renderSetup();
    const start = screen.getByRole('button', { name: /start trip/i });
    const consent = screen.getByRole('checkbox', { name: /share location for anh huy/i });

    expect(start).toBeEnabled();
    await user.click(consent);
    expect(start).toBeDisabled();
    await user.click(consent);
    expect(start).toBeEnabled();
  });

  it('writes an auditable session and navigates into the live trip', async () => {
    const user = userEvent.setup();
    renderSetup();

    await user.click(screen.getByRole('button', { name: /start trip/i }));

    expect(await screen.findByRole('heading', { name: /TRIP001 live trip/i })).toBeVisible();
    const stored = JSON.parse(window.sessionStorage.getItem(DEMO_SESSION_KEY) ?? '{}');
    expect(stored).toMatchObject({ schemaVersion: 1, tripId: 'TRIP001', setupComplete: true, frameIndex: 0 });
    expect(stored.auditEntries).toHaveLength(1);
    expect(stored.auditEntries[0]).toMatchObject({ eventType: 'DemoTripStarted' });
  });
});
