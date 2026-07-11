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
  DashboardPage,
  DynamicLiveTripPage,
  DynamicSummaryPage,
  ExplorePage,
  GroupDetailPage,
  GroupsPage,
  ItineraryPage,
  NowPage,
  OnboardingPage,
  PlaceDetailPage,
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
const CommunityPage = lazy(() => import('../community/CommunityPlatformPage').then((module) => ({ default: module.CommunityPage })));
const PlaceReviewsPage = lazy(() => import('../community/CommunityPlatformPage').then((module) => ({ default: module.PlaceReviewsPage })));
const ProfilePage = lazy(() => import('../community/CommunityPlatformPage').then((module) => ({ default: module.ProfilePage })));
const PrivacySettingsPage = lazy(() => import('../community/CommunityPlatformPage').then((module) => ({ default: module.PrivacySettingsPage })));
const NotificationSettingsPage = lazy(() => import('../community/CommunityPlatformPage').then((module) => ({ default: module.NotificationSettingsPage })));
const ModerationPage = lazy(() => import('../community/CommunityPlatformPage').then((module) => ({ default: module.ModerationPage })));
const PartnersPage = lazy(() => import('../community/CommunityPlatformPage').then((module) => ({ default: module.PartnersPage })));

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
        <Route element={<GroupsPage />} path="/app/groups" />
        <Route element={<GroupDetailPage />} path="/app/groups/:teamId" />
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
        <Route element={<Suspense fallback={<ProductFallback />}><CommunityPage /></Suspense>} path="/app/community" />
        <Route element={<Suspense fallback={<ProductFallback />}><PlaceReviewsPage /></Suspense>} path="/app/places/:placeId/reviews" />
        <Route element={<Suspense fallback={<ProductFallback />}><ProfilePage /></Suspense>} path="/app/profile" />
        <Route element={<Suspense fallback={<ProductFallback />}><PrivacySettingsPage /></Suspense>} path="/app/settings/privacy" />
        <Route element={<Suspense fallback={<ProductFallback />}><NotificationSettingsPage /></Suspense>} path="/app/settings/notifications" />
        <Route element={<Suspense fallback={<ProductFallback />}><ModerationPage /></Suspense>} path="/app/admin/moderation" />
        <Route element={<Suspense fallback={<ProductFallback />}><PartnersPage /></Suspense>} path="/app/partners" />
        <Route element={<Suspense fallback={<ProductFallback />}><TripSetupPage /></Suspense>} path="/trip/new" />
        <Route element={<Suspense fallback={<ProductFallback />}><LiveTripPage /></Suspense>} path="/trips/TRIP001/live" />
        <Route element={<Suspense fallback={<ProductFallback />}><TripSummaryPage /></Suspense>} path="/trips/TRIP001/summary" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </QueryClientProvider>
  );
}
