import { Route, Routes } from 'react-router-dom';
import { ConvoyStory } from '../components/ConvoyStory';
import { EditorialSections } from '../components/EditorialSections';
import { HeroRoute } from '../components/HeroRoute';
import { LandingFooter } from '../components/LandingFooter';
import { LandingNav } from '../components/LandingNav';
import { NotFoundPage } from '../shared/NotFoundPage';
import { TripSetupPage } from '../trip-setup/TripSetupPage';
import { useLandingAnalytics } from './analytics';

function LandingPage() {
  const handleAnalyticsClick = useLandingAnalytics();
  return (
    <div className="app-shell" onClickCapture={handleAnalyticsClick}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <LandingNav />
      <main id="main-content"><HeroRoute /><ConvoyStory /><EditorialSections /></main>
      <LandingFooter />
    </div>
  );
}

function LiveTripPlaceholder() {
  return <main className="product-empty"><h1>TRIP001 live trip</h1><p>The convoy workspace is loading.</p></main>;
}

function SummaryPlaceholder() {
  return <main className="product-empty"><h1>TRIP001 summary</h1></main>;
}

export function App() {
  return (
    <Routes>
      <Route element={<LandingPage />} path="/" />
      <Route element={<TripSetupPage />} path="/trip/new" />
      <Route element={<LiveTripPlaceholder />} path="/trips/TRIP001/live" />
      <Route element={<SummaryPlaceholder />} path="/trips/TRIP001/summary" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
