import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';

function renderRoute(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('community platform routes', () => {
  it('shows the opt-in community overview without exposing live trip location', async () => {
    renderRoute('/app/community');

    expect(await screen.findByRole('heading', { name: /community signals/i })).toBeVisible();
    expect(screen.getByText(/place presence is approximate, opt-in, and revocable/i)).toBeVisible();
    expect(screen.queryByText(/public live location/i)).not.toBeInTheDocument();
  });

  it('separates Tasco place facts from community reviews', async () => {
    renderRoute('/app/places/tasco:poi:POI001/reviews');

    expect(await screen.findByRole('heading', { name: /bai chay rest area reviews/i })).toBeVisible();
    expect(screen.getByText(/tasco facts stay separate/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /report review/i })).toBeVisible();
  });

  it('renders profile and privacy settings with explicit visibility controls', async () => {
    renderRoute('/app/settings/privacy');

    expect(await screen.findByRole('heading', { name: /privacy settings/i })).toBeVisible();
    expect(screen.getByLabelText(/leader only/i)).toBeChecked();
    expect(screen.getByLabelText(/place presence private/i)).toBeChecked();
    expect(screen.getByText(/blocked users/i)).toBeVisible();

    renderRoute('/app/profile');

    expect(await screen.findByRole('heading', { name: /travel profile/i })).toBeVisible();
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Mai');
  });

  it('shows moderation and partner surfaces without fabricated proof', async () => {
    renderRoute('/app/admin/moderation');

    expect(await screen.findByRole('heading', { name: /moderation queue/i })).toBeVisible();
    const queue = screen.getByRole('region', { name: /open reports/i });
    expect(within(queue).getByText(/privacy violation/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /resolve report/i })).toBeVisible();

    renderRoute('/app/partners');

    expect(await screen.findByRole('heading', { name: /partner platform/i })).toBeVisible();
    expect(screen.getByText(/aggregated or anonymized/i)).toBeVisible();
    expect(screen.queryByText(/\d+%|trusted by|pricing|testimonial/i)).not.toBeInTheDocument();
  });
});
