import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthPage, OnboardingPage } from './AuthPages';

describe('redesigned authentication and onboarding', () => {
  it('pairs fixture authentication with a road-journey visual and clear alternate routes', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><AuthPage mode="login" /></MemoryRouter>);

    expect(screen.getByRole('region', { name: 'Loopin road journey' })).toBeVisible();
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/signup');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Email is required.')).toBeVisible();
    expect(screen.getByText('Password is required.')).toBeVisible();
  });

  it('explains all six preference stages before entering the workspace', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);

    expect(screen.getAllByText('Step 1 of 6')).toHaveLength(2);
    for (const stage of ['Travel style', 'Interests', 'Budget', 'Group', 'Dietary needs', 'Privacy']) {
      expect(screen.getByRole('button', { name: stage })).toBeVisible();
    }
    await user.click(screen.getByRole('button', { name: 'Privacy' }));
    expect(screen.getByRole('link', { name: 'Save profile and continue' })).toHaveAttribute('href', '/app');
  });
});
