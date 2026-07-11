import { render, screen } from '@testing-library/react';
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
  });
});
