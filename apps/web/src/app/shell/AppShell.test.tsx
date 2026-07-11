import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('orients desktop and mobile users around the active product route', () => {
    render(
      <MemoryRouter initialEntries={['/app/trips']}>
        <AppShell context="Trip library">
          <h1>Trips</h1>
        </AppShell>
      </MemoryRouter>,
    );

    const primary = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(primary).getByRole('link', { name: 'Trips' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('navigation', { name: 'Mobile primary' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Open Mai's profile" })).toHaveAttribute('href', '/app/profile');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'product-content');
    expect(screen.getByRole('link', { name: 'Skip to workspace' })).toHaveAttribute('href', '#product-content');
  });
});
