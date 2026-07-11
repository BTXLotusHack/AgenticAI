export const landingEventNames = [
  'landing_viewed',
  'primary_cta_clicked',
  'how_it_works_started',
  'how_it_works_completed',
  'safety_section_viewed',
  'organization_cta_clicked',
  'login_clicked',
] as const;

export type LandingEventName = (typeof landingEventNames)[number];

export const LANDING_ANALYTICS_EVENT = 'loopin:analytics';

const landingEventSet = new Set<string>(landingEventNames);

export function trackLandingEvent(name: LandingEventName) {
  if (typeof window === 'undefined') return;

  try {
    window.dispatchEvent(
      new CustomEvent(LANDING_ANALYTICS_EVENT, {
        detail: { name },
      }),
    );
  } catch {
    // Public-page analytics never blocks navigation or interaction.
  }
}

export function useLandingAnalytics() {
  const observedEvents = useRef(new Set<LandingEventName>());
  const trackOnce = useCallback((name: LandingEventName) => {
    if (observedEvents.current.has(name)) return;
    observedEvents.current.add(name);
    trackLandingEvent(name);
  }, []);

  useEffect(() => {
    trackOnce('landing_viewed');

    if (typeof IntersectionObserver === 'undefined') return undefined;

    const sectionEvents = new Map<Element, LandingEventName>();
    const howItWorks = document.querySelector('#how-it-works');
    const safety = document.querySelector('#safety');
    if (howItWorks) sectionEvents.set(howItWorks, 'how_it_works_completed');
    if (safety) sectionEvents.set(safety, 'safety_section_viewed');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const eventName = sectionEvents.get(entry.target);
          if (eventName) trackOnce(eventName);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.45 },
    );

    for (const section of sectionEvents.keys()) observer.observe(section);
    return () => observer.disconnect();
  }, [trackOnce]);

  return useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const analyticsTarget = target.closest<HTMLElement>('[data-analytics]');
    const eventName = analyticsTarget?.dataset.analytics;
    if (eventName && landingEventSet.has(eventName)) {
      trackLandingEvent(eventName as LandingEventName);
    }
  }, []);
}
import { type MouseEvent, useCallback, useEffect, useRef } from 'react';
