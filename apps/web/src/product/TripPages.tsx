import { ArrowRight, CalendarDays, Check, Copy, QrCode, Share2, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useLiveTrip, usePlaceSearch, useTrip } from '../api/hooks';
import { AppShell } from '../app/shell/AppShell';
import { PageHeader } from '../shared/product/PageHeader';
import { RouteTimeline } from '../shared/product/RouteTimeline';
import { StatusNotice } from '../shared/product/StatusNotice';

const planningStages = ['Destination', 'Preferences', 'Places', 'Route', 'Group', 'Review'];

export function TripPlannerPage() {
  const places = usePlaceSearch('rest stop');
  return <AppShell context="New trip" status="Draft · Tasco fixture">
    <PageHeader eyebrow="Tasco fixture mode" title="Build a Tasco-backed trip." description="Choose the journey first, then shape the places and people around it." />
    <nav aria-label="Planning stages" className="planner-stages">{planningStages.map((stage, index) => <button aria-current={index === 0 ? 'step' : undefined} key={stage} type="button"><span>{String(index + 1).padStart(2, '0')}</span>{stage}</button>)}</nav>
    <div className="planner-workspace">
      <section className="planner-form" aria-labelledby="route-search-title"><p className="product-kicker">Stage 1</p><h2 id="route-search-title">Where are you going?</h2><label>Starting point<input defaultValue="Hà Nội" /></label><label>Destination<input defaultValue="Hạ Long" /></label><div className="planner-inline"><label>Departure<input defaultValue="20 July, 08:00" /></label><label>Travelers<input defaultValue="4 vehicles" /></label></div><StatusNotice tone="stale" title="Route refresh failed">Keeping the last verified Tasco preview visible.</StatusNotice><button className="button button--primary" type="button">Continue to preferences <ArrowRight aria-hidden="true" /></button></section>
      <section aria-label="Route preview" className="planner-map"><div className="planner-map__route" aria-hidden="true"><i /><i /><i /></div><div className="planner-map__caption"><div><span>Tasco map preview</span><strong>Hà Nội → Hạ Long</strong></div><small>Fixture geometry · source labeled</small></div></section>
    </div>
    <section className="planner-places" aria-labelledby="tasco-candidates-title"><div><p className="product-kicker">Provider results</p><h2 id="tasco-candidates-title">Tasco place candidates</h2></div><ul>{(places.data?.results ?? []).map((place) => <li key={place.id}><span>tasco</span><div><strong>{place.name}</strong><small>{place.address}</small></div><button type="button">Add stop</button></li>)}</ul></section>
  </AppShell>;
}

export function TripOverviewPage() {
  const { tripId = 'TRIP001' } = useParams();
  const trip = useTrip(tripId);
  const live = useLiveTrip(tripId);
  const data = trip.data;
  return <AppShell context={data?.title ?? 'Trip overview'} status={data?.stale ? 'Route needs refresh' : 'Route verified'}>
    <PageHeader eyebrow={`${tripId} · ${data?.lifecycleState ?? 'loading'}`} title={data?.title ?? 'Trip overview'} description="Route, group and day-of-trip controls stay together here." actions={data ? <><Link className="button trip-action-secondary" to={`/app/trips/${data.id}/share`}><Share2 aria-hidden="true" /> Share</Link><Link className="button button--primary" to={`/app/trips/${data.id}/live`}>Open live trip <ArrowRight aria-hidden="true" /></Link></> : null} />
    {trip.isLoading ? <StatusNotice tone="loading" title="Loading trip" /> : null}{!trip.isLoading && !data ? <StatusNotice tone="error" title="Trip not found" /> : null}
    {data ? <div className="trip-overview-grid">
      <section aria-label="Trip route" className="trip-overview-route"><div className="trip-overview-route__heading"><div><p className="product-kicker">Tasco route</p><h2>Route and stops</h2></div><Link to={`/app/trips/${data.id}/itinerary`}>Edit itinerary <ArrowRight aria-hidden="true" /></Link></div><RouteTimeline trip={data} /><dl className="trip-facts"><div><dt>Distance</dt><dd>{Math.round(data.route.distanceMeters / 1000)} km</dd></div><div><dt>Drive time</dt><dd>{data.route.durationMinutes} min</dd></div><div><dt>Departure</dt><dd>20 Jul · 08:00</dd></div></dl></section>
      <aside className="trip-overview-aside"><section><p className="product-kicker">Before departure</p><h2>Group readiness</h2><strong className="readiness-score">{data.memberCount}/{data.memberCount}</strong><p>{data.readinessSummary}</p><ul><li><Check aria-hidden="true" /> GPS permission checked</li><li><Check aria-hidden="true" /> Route downloaded</li><li><Check aria-hidden="true" /> Voice is optional</li></ul></section><section><p className="product-kicker">Live state</p><h2>{live.data?.state ?? 'Unavailable'}</h2><p>freshness 18 s · confidence high</p><p className="privacy-note">Precise locations stay visible only to authorized trip members.</p></section></aside>
    </div> : null}
  </AppShell>;
}

export function ItineraryPage() {
  const { tripId = 'TRIP001' } = useParams();
  const trip = useTrip(tripId); const data = trip.data;
  return <AppShell context="Itinerary" status={data?.stale ? 'Needs route refresh' : 'Day 1'}><PageHeader eyebrow={tripId} title="Itinerary editor" description="Arrange Tasco-sourced stops while keeping leader notes clearly separate." actions={<button className="button button--primary" type="button">Save itinerary</button>} />{trip.isLoading ? <StatusNotice tone="loading" title="Loading itinerary" /> : null}{!trip.isLoading && !data ? <StatusNotice tone="error" title="Trip not found" /> : null}{data ? <section className="itinerary-workspace"><header><div><CalendarDays aria-hidden="true" /><div><span>Day 1</span><strong>Hà Nội to Hạ Long</strong></div></div><button type="button">Add stop</button></header>{data.route.stops.length ? <RouteTimeline trip={data} /> : <StatusNotice tone="empty" title="No Tasco stops are staged for this trip" />}</section> : null}</AppShell>;
}

export function ShareTripPage() {
  const { tripId = 'TRIP001' } = useParams();
  return <AppShell context="Share trip" status="Trip-scoped invitation"><PageHeader eyebrow={tripId} title="Share trip" description="Invite drivers without exposing more of the journey than they need." />
    <div className="share-layout"><section className="share-invite"><p className="product-kicker">Join this group</p><h2>One link for the convoy.</h2><p>Invitees review the route, role and visibility policy before joining.</p><label>Invite link<div><input readOnly value={`loopin.local/join/${tripId}-DEMO`} /><button aria-label="Copy invite link" type="button"><Copy aria-hidden="true" /></button></div></label><label>Join code<strong>{tripId}-DEMO</strong></label><button className="button button--primary" type="button"><Share2 aria-hidden="true" /> Share invitation</button></section><section className="share-qr"><div aria-label={`QR representation for ${tripId}`} role="img"><QrCode aria-hidden="true" /></div><span>Scan to review and join</span></section></div>
    <section className="share-permissions"><div><Users aria-hidden="true" /><h2>What invitees can see</h2></div><dl><div><dt>Before joining</dt><dd>Route summary, departure and requested role.</dd></div><div><dt>During the trip</dt><dd>Precise location is visible only during the active trip to authorized members.</dd></div><div><dt>After the trip</dt><dd>Measured summary according to retention settings.</dd></div></dl></section>
  </AppShell>;
}
