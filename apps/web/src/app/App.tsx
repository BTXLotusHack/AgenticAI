import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ConvoyStory } from '../components/ConvoyStory';
import { EditorialSections } from '../components/EditorialSections';
import { HeroRoute } from '../components/HeroRoute';
import { LandingFooter } from '../components/LandingFooter';
import { LandingNav } from '../components/LandingNav';
import { NotFoundPage } from '../shared/NotFoundPage';
import { useLandingAnalytics } from './analytics';

const TripSetupPage = lazy(() => import('../trip-setup/TripSetupPage').then((module) => ({ default: module.TripSetupPage })));
const LiveTripPage = lazy(() => import('../live-trip/LiveTripPage').then((module) => ({ default: module.LiveTripPage })));
const TripSummaryPage = lazy(() => import('../trip-summary/TripSummaryPage').then((module) => ({ default: module.TripSummaryPage })));

function LandingPage() {
  const handleAnalyticsClick = useLandingAnalytics();
  return <div className="app-shell" onClickCapture={handleAnalyticsClick}><a className="skip-link" href="#main-content">Skip to content</a><LandingNav /><main id="main-content"><HeroRoute /><ConvoyStory /><EditorialSections /></main><LandingFooter /></div>;
}

function ProductFallback() {
  return <main aria-label="Loading Loopin trip" className="product-loading"><span>Loopin</span><p>Loading trip workspace…</p></main>;
}

export function App() {
  return (
    <Routes>
      <Route element={<LandingPage />} path="/" />
      <Route element={<Suspense fallback={<ProductFallback />}><TripSetupPage /></Suspense>} path="/trip/new" />
      <Route element={<Suspense fallback={<ProductFallback />}><LiveTripPage /></Suspense>} path="/trips/TRIP001/live" />
      <Route element={<Suspense fallback={<ProductFallback />}><TripSummaryPage /></Suspense>} path="/trips/TRIP001/summary" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
