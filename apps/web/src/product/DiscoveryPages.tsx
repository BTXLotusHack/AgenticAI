import { ArrowRight, Bell, ChevronRight, Eye, LocateFixed, MapPin, Navigation, Settings2, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useLocationVisibilityPolicy, usePlace, usePlaceCommunitySummary, usePlaceSearch } from '../api/hooks';
import { AppShell } from '../app/shell/AppShell';
import { PageHeader } from '../shared/product/PageHeader';
import { PlacePreview } from '../shared/product/PlacePreview';
import { StatusNotice } from '../shared/product/StatusNotice';

export function ExplorePage() {
  const places = usePlaceSearch('rest stop');
  return <AppShell context="Explore" status="Tasco fixture results"><PageHeader eyebrow="Discover along the route" title="Tasco Explore." description="Find practical stops and memorable places without losing the journey around them." />
    <div aria-label="Place filters" className="explore-filters" role="toolbar"><button className="explore-filter-search" type="button"><LocateFixed aria-hidden="true" /> Near current route</button>{['Rest stops', 'Food', 'Fuel', 'Views', 'Parking'].map((filter, index) => <button aria-pressed={index === 0} key={filter} type="button">{filter}</button>)}<button aria-label="More filters" type="button"><SlidersHorizontal aria-hidden="true" /></button></div>
    <div className="explore-layout"><section aria-label="Tasco map preview" className="explore-map"><div className="explore-map__road" aria-hidden="true" /><span className="explore-map__pin explore-map__pin--one">1</span><span className="explore-map__pin explore-map__pin--two">2</span><div className="explore-map__caption"><strong>Tasco map preview</strong><span>Fixture geometry · replace with configured Tasco renderer</span></div></section><section className="explore-results" aria-labelledby="explore-results-title"><div><p className="product-kicker">Along Hà Nội → Hạ Long</p><h2 id="explore-results-title">Useful places ahead</h2></div>{places.isLoading ? <StatusNotice tone="loading" title="Loading Tasco places" /> : null}<div className="explore-place-list">{(places.data?.results ?? []).map((place) => <PlacePreview key={place.id} place={place} />)}</div><StatusNotice tone="empty" title="No hidden gems match the current filters">The provider results above remain available.</StatusNotice></section></div>
  </AppShell>;
}

export function PlaceDetailPage() {
  const { placeId = 'POI001' } = useParams(); const place = usePlace(placeId); const community = usePlaceCommunitySummary(placeId); const data = place.data;
  return <AppShell context="Place" status="Tasco facts + Loopin community"><PageHeader eyebrow="Tasco place" title={data?.name ?? 'Place detail'} description={data?.address ?? 'Loading provider details.'} actions={data ? <button className="button button--primary" type="button">Add to trip <ArrowRight aria-hidden="true" /></button> : null} />
    {!place.isLoading && !data ? <StatusNotice tone="error" title="Place not found" /> : null}{data ? <div className="place-detail-layout"><section aria-label="Tasco place facts" className="place-facts"><div className="place-detail-photo" aria-hidden="true" /><div><p className="product-kicker">Provider facts</p><h2>Tasco place facts</h2><dl><div><dt>Address</dt><dd>{data.address}</dd></div><div><dt>Categories</dt><dd>{data.categories.join(' · ')}</dd></div><div><dt>Coordinates</dt><dd>{data.coordinates.lat}, {data.coordinates.lng}</dd></div><div><dt>Source</dt><dd>{data.sourceVersion}</dd></div></dl></div></section><section aria-label="Loopin community" className="place-community"><p className="product-kicker">User-generated</p><h2>Loopin community</h2><strong>{community.data?.starAverage ?? 0}</strong><span>from {community.data?.reviewCount ?? 0} reviews</span><p>Ratings and comments stay separate from Tasco provider metadata.</p><Link to={`/app/places/${placeId}/reviews`}>Read community reviews <ArrowRight aria-hidden="true" /></Link></section></div> : null}
  </AppShell>;
}

export function NowPage() {
  return <AppShell context="Now" status="Departure day"><PageHeader eyebrow="20 July · 07:42" title="Day-of-trip command center." description="One place for the route, the group and the next safe action." actions={<Link className="button button--primary" to="/app/trips/TRIP001/live">Open live trip <Navigation aria-hidden="true" /></Link>} />
    <section className="now-journey"><div className="now-journey__map" aria-hidden="true"><i /><i /><i /></div><div className="now-journey__detail"><p className="product-kicker">Departure in 18 minutes</p><h2>Hà Nội → Hạ Long</h2><p><MapPin aria-hidden="true" /> Next verified stop: Minh Châu Rest Stop</p><dl><div><dt>Group</dt><dd>4 of 4 ready</dd></div><div><dt>Route</dt><dd>156 km · verified</dd></div><div><dt>Sharing</dt><dd>Trip members only</dd></div></dl><div className="now-actions"><button type="button">Request status check</button><button type="button">Review regroup points</button></div></div></section>
  </AppShell>;
}

const settingLinks = [
  { icon: ShieldCheck, label: 'Privacy and location', detail: 'Trip members · 30-day retention', to: '/app/settings/privacy' },
  { icon: Bell, label: 'Notifications', detail: 'Safety alerts on · community quiet', to: '/app/settings/notifications' },
  { icon: Eye, label: 'Accessibility', detail: 'Motion and display preferences', to: '/app/settings' },
  { icon: Settings2, label: 'Account and data', detail: 'Profile, export and deletion', to: '/app/profile' },
];
export function SettingsPage() {
  const policy = useLocationVisibilityPolicy();
  return <AppShell context="Settings" status="Fixture profile"><PageHeader eyebrow="Profile and preferences" title="Settings." description="Control what Loopin can show, remember and interrupt you with." />
    <section className="settings-index" aria-label="Settings areas">{settingLinks.map(({ icon: Icon, label, detail, to }) => <Link key={label} to={to}><Icon aria-hidden="true" /><div><strong>{label}</strong><span>{label === 'Privacy and location' ? `${policy.data?.tripVisibility ?? 'trip-members'} · ${policy.data?.retentionPreference ?? '30-days'}` : detail}</span></div><ChevronRight aria-hidden="true" /></Link>)}</section><p className="settings-disclosure">Live convoy safety notifications may override quiet hours while a trip is active. Location visibility and retention preference remain explicit.</p>
  </AppShell>;
}
