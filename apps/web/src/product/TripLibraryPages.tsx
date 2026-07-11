import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTrips } from '../api/hooks';
import type { TripPlanSummary } from '../api/types';
import { AppShell } from '../app/shell/AppShell';
import { PageHeader } from '../shared/product/PageHeader';
import { StatusNotice } from '../shared/product/StatusNotice';
import { TripPreview } from '../shared/product/TripPreview';

const lifecycleStates = ['All', 'Draft', 'Ready', 'Active', 'Completed', 'Archived'] as const;
type TripFilter = (typeof lifecycleStates)[number];
function matchesFilter(trip: TripPlanSummary, filter: TripFilter) { return filter === 'All' || trip.lifecycleState === filter.toLowerCase(); }

export function DashboardPage() {
  const trips = useTrips();
  const nextTrip = trips.data?.[0];
  return <AppShell context="Home" status="Fixture workspace">
    <PageHeader eyebrow="Sunday, 12 July" title="Good morning, Mai." description="Your next shared road trip is ready for a final check." actions={<Link className="button button--primary" to="/app/trips/new">Plan a trip <ArrowRight aria-hidden="true" /></Link>} />
    {trips.isLoading ? <StatusNotice tone="loading" title="Loading trips" /> : null}
    {trips.isError ? <StatusNotice tone="error" title="Trip service unavailable">Try again when the fixture service is available.</StatusNotice> : null}
    {nextTrip ? <section className="dashboard-next" aria-labelledby="next-trip-title"><div className="product-section-heading"><p className="product-kicker">Leaving next</p><h2 id="next-trip-title">Next trip</h2></div><TripPreview emphasis trip={nextTrip} /></section> : null}
    <div className="dashboard-support">
      <section aria-labelledby="planning-prompt-title" className="dashboard-prompt"><Sparkles aria-hidden="true" /><div><p className="product-kicker">Loopin assistant</p><h2 id="planning-prompt-title">Planning prompt</h2><p>Find a quiet food stop ahead with group parking and less than a 10-minute detour.</p><label><span>Ask about this route</span><textarea defaultValue="Find rest stops ahead of the group with parking and food." /></label><button className="button button--primary" type="button">Suggest stops</button></div></section>
      <section aria-labelledby="route-places-title" className="dashboard-places"><p className="product-kicker">Tasco place candidates</p><h2 id="route-places-title">Places for this route</h2><ol><li><span>01</span><div><strong>Minh Châu Rest Stop</strong><small>Parking · food · 8 min ahead</small></div></li><li><span>02</span><div><strong>Hạ Long Service Area</strong><small>Fuel · parking · 42 min ahead</small></div></li></ol><Link to="/app/explore">Explore Tasco places <ArrowRight aria-hidden="true" /></Link></section>
    </div>
  </AppShell>;
}

export function TripsPage() {
  const trips = useTrips();
  const [filter, setFilter] = useState<TripFilter>('All');
  const filteredTrips = (trips.data ?? []).filter((trip) => matchesFilter(trip, filter));
  return <AppShell context="Trips" status={`${trips.data?.length ?? 0} saved trips`}>
    <PageHeader eyebrow="Trip library" title="Every journey, in one place." description="Plan, coordinate and revisit the routes you share." actions={<Link className="button button--primary" to="/app/trips/new">Plan a trip <ArrowRight aria-hidden="true" /></Link>} />
    <div aria-label="Trip lifecycle" className="trip-filters" role="toolbar">{lifecycleStates.map((state) => <button aria-pressed={filter === state} key={state} onClick={() => setFilter(state)} type="button">{state}</button>)}</div>
    {trips.isLoading ? <StatusNotice tone="loading" title="Loading trip library" /> : null}
    <section aria-label="Saved trips" className="trip-library-list">{filteredTrips.map((trip) => <TripPreview key={trip.id} trip={trip} />)}</section>
    {!trips.isLoading && filteredTrips.length === 0 ? <StatusNotice tone="empty" title={`No ${filter.toLowerCase()} trips`}>Choose another lifecycle or start a new trip.</StatusNotice> : null}
  </AppShell>;
}
