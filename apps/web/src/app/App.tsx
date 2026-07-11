import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { ConvoyStory } from '../components/ConvoyStory';
import { EditorialSections } from '../components/EditorialSections';
import { HeroRoute } from '../components/HeroRoute';
import { LandingFooter } from '../components/LandingFooter';
import { LandingNav } from '../components/LandingNav';
import {
  AuthPage,
  CommunityRouteSlotPage,
  DashboardPage,
  DynamicLiveTripPage,
  DynamicSummaryPage,
  ExplorePage,
  ItineraryPage,
  ModerationRouteSlotPage,
  NowPage,
  OnboardingPage,
  NotificationSettingsRouteSlotPage,
  PartnersRouteSlotPage,
  PlaceDetailPage,
  PlaceReviewsRouteSlotPage,
  PrivacySettingsRouteSlotPage,
  ProfileRouteSlotPage,
  SettingsPage,
  ShareTripPage,
  TripOverviewPage,
  TripPlannerPage,
  TripsPage,
} from '../product/ProductPages';
import { NotFoundPage } from '../shared/NotFoundPage';
import { useLandingAnalytics } from './analytics';
import { loopinQueryClient } from './queryClient';

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
    <QueryClientProvider client={loopinQueryClient}>
      <Routes>
        <Route element={<LandingPage />} path="/" />
        <Route element={<AuthPage mode="login" />} path="/login" />
        <Route element={<AuthPage mode="signup" />} path="/signup" />
        <Route element={<AuthPage mode="forgot" />} path="/forgot-password" />
        <Route element={<AuthPage mode="reset" />} path="/reset-password" />
        <Route element={<OnboardingPage />} path="/onboarding" />
        <Route element={<DashboardPage />} path="/app" />
        <Route element={<TripsPage />} path="/app/trips" />
        <Route element={<TripPlannerPage />} path="/app/trips/new" />
        <Route element={<TripOverviewPage />} path="/app/trips/:tripId" />
        <Route element={<ItineraryPage />} path="/app/trips/:tripId/itinerary" />
        <Route element={<ShareTripPage />} path="/app/trips/:tripId/share" />
        <Route element={<DynamicLiveTripPage />} path="/app/trips/:tripId/live" />
        <Route element={<DynamicSummaryPage />} path="/app/trips/:tripId/summary" />
        <Route element={<ExplorePage />} path="/app/explore" />
        <Route element={<PlaceDetailPage />} path="/app/places/:placeId" />
        <Route element={<NowPage />} path="/app/now" />
        <Route element={<SettingsPage />} path="/app/settings" />
        <Route element={<CommunityRouteSlotPage />} path="/app/community" />
        <Route element={<PlaceReviewsRouteSlotPage />} path="/app/places/:placeId/reviews" />
        <Route element={<ProfileRouteSlotPage />} path="/app/profile" />
        <Route element={<PrivacySettingsRouteSlotPage />} path="/app/settings/privacy" />
        <Route element={<NotificationSettingsRouteSlotPage />} path="/app/settings/notifications" />
        <Route element={<ModerationRouteSlotPage />} path="/app/admin/moderation" />
        <Route element={<PartnersRouteSlotPage />} path="/app/partners" />
        <Route element={<Suspense fallback={<ProductFallback />}><TripSetupPage /></Suspense>} path="/trip/new" />
        <Route element={<Suspense fallback={<ProductFallback />}><LiveTripPage /></Suspense>} path="/trips/TRIP001/live" />
        <Route element={<Suspense fallback={<ProductFallback />}><TripSummaryPage /></Suspense>} path="/trips/TRIP001/summary" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </QueryClientProvider>
  );
}
