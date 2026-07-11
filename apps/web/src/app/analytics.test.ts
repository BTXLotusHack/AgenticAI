import { describe, expect, it, vi } from 'vitest';
import {
  LANDING_ANALYTICS_EVENT,
  trackLandingEvent,
} from './analytics';

describe('landing analytics', () => {
  it('emits only the approved event name without trip or location data', () => {
    const listener = vi.fn();
    window.addEventListener(LANDING_ANALYTICS_EVENT, listener);

    trackLandingEvent('primary_cta_clicked');

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0]?.[0] as CustomEvent<unknown>;
    expect(event.detail).toEqual({ name: 'primary_cta_clicked' });
    window.removeEventListener(LANDING_ANALYTICS_EVENT, listener);
  });
});
