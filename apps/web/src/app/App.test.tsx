import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('Loopin landing page', () => {
  it('gives visitors one dominant way to start a group drive', () => {
    render(<App />, { wrapper: MemoryRouter });

    expect(
      screen.getByRole('heading', { name: /every car\. one journey\./i }),
    ).toBeVisible();
    expect(
      screen.getAllByRole('link', { name: /start a group drive/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /plan together, stay connected, and regroup safely—without turning the drive into a group chat/i,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: /see how it works/i }),
    ).toHaveAttribute('href', '#how-it-works');
  });

  it('provides the main public routes and an operable mobile menu', async () => {
    const user = userEvent.setup();
    render(<App />, { wrapper: MemoryRouter });

    expect(screen.getByLabelText(/loopin home/i)).toBeVisible();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeVisible();
    expect(
      screen.getAllByRole('link', { name: /how it works/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /safety/i })).toBeVisible();
    expect(
      screen.getByRole('link', { name: /for organizations/i }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /log in/i })).toBeVisible();

    const menuButton = screen.getByRole('button', { name: /open menu/i });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: /mobile navigation/i })).toBeVisible();
  });

  it('explains a route-aware convoy split with safe role-specific messages', async () => {
    const user = userEvent.setup();
    render(<App />, { wrapper: MemoryRouter });

    expect(
      screen.getByRole('heading', {
        name: /loopin understands the whole group—not just your dot on a map/i,
      }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /together/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /gap detected/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /regrouped/i })).toBeVisible();
    expect(screen.getByLabelText(/car 3 vehicle node/i)).toBeVisible();
    expect(screen.getByText(/car 3.*car 4 boundary/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /gap detected/i }));

    expect(
      await screen.findByText(/cars 4 and 5 are behind.*maintain a safe pace/i),
    ).toBeVisible();
    expect(
      await screen.findByText(/continue safely to the shared regroup point/i),
    ).toBeVisible();
  });
});
