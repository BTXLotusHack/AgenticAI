import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useLiveTrip,
  useLocationVisibilityPolicy,
  usePlace,
  usePlaceCommunitySummary,
  usePlaceSearch,
  useTrip,
  useTrips,
} from '../api/hooks';
import type { TripPlanSummary } from '../api/types';
import { AppShell } from '../app/shell/AppShell';
import { PageHeader } from '../shared/product/PageHeader';

export { AuthPage, OnboardingPage } from './AuthPages';
export { DashboardPage, TripsPage } from './TripLibraryPages';
export { ItineraryPage, ShareTripPage, TripOverviewPage, TripPlannerPage } from './TripPages';
export { ExplorePage, NowPage, PlaceDetailPage, SettingsPage } from './DiscoveryPages';

function ProductShell({ children }: { readonly children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

function PageIntro({
  eyebrow,
  title,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return <PageHeader description={children} eyebrow={eyebrow} title={title} />;
}

function LoadingState({ label }: { readonly label: string }) {
  return <p className="platform-state platform-state--loading">{label}</p>;
}

function ErrorState({ label }: { readonly label: string }) {
  return <p className="platform-state platform-state--error">{label}</p>;
}

function EmptyState({ label }: { readonly label: string }) {
  return <p className="platform-state platform-state--empty">{label}</p>;
}

function PermissionState({ label }: { readonly label: string }) {
  return <p className="platform-state platform-state--permission">{label}</p>;
}

function TripRouteLine({ trip }: { readonly trip: TripPlanSummary }) {
  return (
    <div className="platform-route-line" aria-label={`${trip.route.origin.name} to ${trip.route.destination.name}`}>
      <span>{trip.route.origin.name}</span>
      <i />
      {trip.route.stops.map((stop) => (
        <strong key={stop.id}>{stop.place.name}</strong>
      ))}
      <i />
      <span>{trip.route.destination.name}</span>
    </div>
  );
}

export function LegacyDashboardPage() {
  const trips = useTrips();
  return (
    <ProductShell>
      <PageIntro eyebrow="Dashboard" title="Today's trips.">
        Work from planned drives, readiness reminders, and a planner prompt without claiming a live backend.
      </PageIntro>
      {trips.isLoading ? <LoadingState label="Loading trips." /> : null}
      {trips.isError ? <ErrorState label="Trip service unavailable." /> : null}
      <section className="platform-grid">
        <article className="platform-panel platform-panel--wide">
          <h2>Upcoming trips</h2>
          <ul className="platform-list">
            {(trips.data ?? []).map((trip) => (
              <li key={trip.id}>
                <Link to={`/app/trips/${trip.id}`}>{trip.title}</Link>
                <span>{trip.lifecycleState}</span>
                <span>{trip.readinessSummary}</span>
                <span>{trip.stale ? 'stale route plan' : 'fresh fixture'}</span>
              </li>
            ))}
          </ul>
          {trips.data?.length === 0 ? <EmptyState label="No trips match the current workspace." /> : null}
        </article>
        <article className="platform-panel">
          <h2>AI planner prompt</h2>
          <p>Plan a safe Hạ Long food stop loop from Tasco-sourced places.</p>
          <label>
            Prompt
            <textarea defaultValue="Find rest stops ahead of the group with parking and food." />
          </label>
        </article>
        <article className="platform-panel">
          <h2>Readiness reminders</h2>
          <p>2 members need final voice or battery checks before the next trip.</p>
          <p className="platform-state">Stale trip data is labeled before action.</p>
        </article>
      </section>
    </ProductShell>
  );
}

export function LegacyTripsPage() {
  const trips = useTrips();
  return (
    <ProductShell>
      <PageIntro eyebrow="Trips" title="Trip library.">
        Draft, ready, active, completed and archived trips stay visible with lifecycle state.
      </PageIntro>
      <div className="platform-filterbar" role="toolbar" aria-label="Trip states">
        {['Draft', 'Ready', 'Active', 'Completed', 'Archived'].map((state) => (
          <button key={state} type="button">{state}</button>
        ))}
      </div>
      <section className="platform-panel">
        <h2>All trips</h2>
        <ul className="platform-list">
          {(trips.data ?? []).map((trip) => (
            <li key={trip.id}>
              <Link to={`/app/trips/${trip.id}`}>{trip.title}</Link>
              <span>{trip.lifecycleState}</span>
              <span>{trip.memberCount} members</span>
              <span>{trip.stale ? 'stale route plan' : 'fresh fixture'}</span>
            </li>
          ))}
        </ul>
        {trips.data?.length === 0 ? <EmptyState label="No trips are available in fixture mode." /> : null}
      </section>
    </ProductShell>
  );
}

export function LegacyTripPlannerPage() {
  const places = usePlaceSearch('rest stop');
  return (
    <ProductShell>
      <PageIntro eyebrow="Tasco fixture mode" title="Build a Tasco-backed trip.">
        Search, preview, and stage route stops through Tasco-shaped place contracts.
      </PageIntro>
      <section className="platform-grid">
        <article className="platform-panel">
          <h2>Route search</h2>
          <label>
            Destination
            <input defaultValue="Hạ Long" />
          </label>
          <p className="platform-state platform-state--error">Route refresh failed. Keeping the last verified preview visible.</p>
        </article>
        <article className="platform-panel platform-panel--wide">
          <h2>Tasco place candidates</h2>
          {places.isLoading ? <LoadingState label="Loading Tasco places." /> : null}
          <ul className="platform-list">
            {(places.data?.results ?? []).map((place) => (
              <li key={place.id}>
                <span>{place.name}</span>
                <span>{place.provider}</span>
                <span>{place.sourceVersion}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </ProductShell>
  );
}

export function LegacyTripOverviewPage() {
  const { tripId = 'TRIP001' } = useParams();
  const trip = useTrip(tripId);
  const live = useLiveTrip(tripId);
  const data = trip.data;
  return (
    <ProductShell>
      <PageIntro eyebrow={tripId} title={data?.title ?? 'Trip overview'}>
        Route, members, stops, join code, readiness and lifecycle actions use the shared trip contract.
      </PageIntro>
      {trip.isLoading ? <LoadingState label="Loading trip." /> : null}
      {!data && !trip.isLoading ? <ErrorState label="Trip not found." /> : null}
      {data ? (
        <section className="platform-grid">
          <article className="platform-panel platform-panel--wide">
            <h2>Route and stops</h2>
            <TripRouteLine trip={data} />
            {data.stale ? <p className="platform-state platform-state--stale">Stale route plan. Refresh required before departure.</p> : null}
            <dl className="platform-metrics">
              <div><dt>Distance</dt><dd>{Math.round(data.route.distanceMeters / 1000)} km</dd></div>
              <div><dt>Duration</dt><dd>{data.route.durationMinutes} min</dd></div>
              <div><dt>Policy</dt><dd>{data.policyId}</dd></div>
            </dl>
          </article>
          <article className="platform-panel">
            <h2>Members</h2>
            <p>{data.memberCount} members · {data.readinessSummary}</p>
            <p>freshness 18 s</p>
            <p>confidence high</p>
            <Link className="button button--primary" to={`/app/trips/${data.id}/live`}>
              Open live trip
            </Link>
          </article>
          <article className="platform-panel">
            <h2>Live snapshot</h2>
            {live.isLoading ? <LoadingState label="Loading current snapshot." /> : null}
            {live.data ? <p>{live.data.state}</p> : null}
            {!live.isLoading && !live.data ? <ErrorState label="Live snapshot unavailable." /> : null}
            <PermissionState label="Permission boundary: live locations stay scoped to authorized trip members." />
          </article>
        </section>
      ) : null}
    </ProductShell>
  );
}

export function LegacyItineraryPage() {
  const { tripId = 'TRIP001' } = useParams();
  const trip = useTrip(tripId);
  const stops = trip.data?.route.stops ?? [];
  return (
    <ProductShell>
      <PageIntro eyebrow={tripId} title="Itinerary editor.">
        Day and stop editing keeps Tasco facts separate from leader notes.
      </PageIntro>
      <section className="platform-panel">
        <h2>Day 1 stops</h2>
        {trip.isLoading ? <LoadingState label="Loading itinerary." /> : null}
        {!trip.isLoading && !trip.data ? <ErrorState label="Trip not found." /> : null}
        {!trip.isLoading && trip.data && stops.length === 0 ? <EmptyState label="No Tasco stops are staged for this trip." /> : null}
        <ol className="itinerary-list">
          {stops.map((stop) => (
            <li key={stop.id}>
              <strong>{stop.place.name}</strong>
              <span>{stop.plannedWindow}</span>
              <button type="button">Move</button>
              <button type="button">Swap stop</button>
              <button type="button">Remove</button>
            </li>
          ))}
        </ol>
      </section>
    </ProductShell>
  );
}

export function LegacyShareTripPage() {
  const { tripId = 'TRIP001' } = useParams();
  return (
    <ProductShell>
      <PageIntro eyebrow={tripId} title="Share trip.">
        Invite links, QR handoff, roles, export and print surfaces remain trip-scoped.
      </PageIntro>
      <section className="platform-grid">
        <article className="platform-panel">
          <h2>Invite link</h2>
          <p>loopin.local/join/{tripId}-DEMO</p>
          <button className="button button--primary" type="button">Copy invite</button>
        </article>
        <article className="platform-panel">
          <h2>QR</h2>
          <div className="qr-block" aria-label="QR placeholder">{tripId}</div>
        </article>
        <article className="platform-panel">
          <h2>Roles</h2>
          <p>Leader, driver and observer permissions are separated before sharing.</p>
        </article>
      </section>
    </ProductShell>
  );
}

export function DynamicLiveTripPage() {
  const { tripId = 'TRIP001' } = useParams();
  const trip = useTrip(tripId);
  const live = useLiveTrip(tripId);
  const data = trip.data;
  const snapshot = live.data;
  const isLoading = trip.isLoading || live.isLoading;
  const title = data
    ? `${data.route.origin.name} -> ${data.route.destination.name}`
    : isLoading
      ? 'Loading live trip.'
      : 'Live trip unavailable';
  return (
    <ProductShell>
      <PageIntro eyebrow={`${tripId} - Contract-driven live`} title={title}>
        Current members are rendered from LiveMemberSnapshot fixture contracts with visible freshness and confidence.
      </PageIntro>
      {isLoading ? <LoadingState label="Loading live trip." /> : null}
      {!isLoading && (!data || !snapshot) ? (
        <section className="platform-panel platform-panel--wide">
          <h2>Permission boundary</h2>
          <ErrorState label="Trip not found or live access is unavailable." />
          <p>Live state requires a matching trip fixture and trip-scoped authorization.</p>
        </section>
      ) : null}
      {data && snapshot ? (
        <section className="platform-panel platform-panel--wide">
          <h2>Live members</h2>
          {snapshot.members.length === 0 ? <EmptyState label="No live members are available for this trip." /> : null}
          <ul className="platform-list">
            {snapshot.members.map((member) => (
              <li key={member.memberId}>
                <span>{member.displayName}</span>
                <span>{member.vehicleLabel}</span>
                <span>{member.freshnessLabel}</span>
                <span>confidence {member.confidence}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </ProductShell>
  );
}

export function DynamicSummaryPage() {
  const { tripId = 'TRIP001' } = useParams();
  const trip = useTrip(tripId);
  const data = trip.data;
  const hasMeasuredSummary = data?.id === 'TRIP001';
  const title = trip.isLoading
    ? 'Loading summary.'
    : hasMeasuredSummary
      ? 'The convoy is together again.'
      : 'Summary unavailable';
  return (
    <ProductShell>
      <PageIntro eyebrow={`${tripId} - Contract summary`} title={title}>
        Summary-by-trip mode separates measured facts from future AI explanation.
      </PageIntro>
      {trip.isLoading ? <LoadingState label="Loading summary." /> : null}
      {!trip.isLoading && !hasMeasuredSummary ? (
        <section className="platform-panel platform-panel--wide">
          <h2>Measured facts</h2>
          <EmptyState label="No measured summary is available for this trip fixture." />
          <PermissionState label="Permission boundary: completed trip history is visible only for authorized members." />
        </section>
      ) : null}
      {hasMeasuredSummary ? (
        <section className="platform-grid">
          <article className="platform-panel">
            <h2>Measured facts</h2>
            <p>1 confirmed split - 1 resolved split.</p>
            <p>Peak route gap 900 m.</p>
          </article>
          <article className="platform-panel">
            <h2>Approved regroup</h2>
            <p>{data?.route.stops[0]?.place.name ?? 'Minh Chau Rest Stop'} - POI001.</p>
            <p>No arbitrary POI was created by the UI.</p>
          </article>
          <article className="platform-panel">
            <h2>Template summary</h2>
            <p>The group separated, approved a verified forward stop, and reconnected on the planned route.</p>
          </article>
        </section>
      ) : null}
    </ProductShell>
  );
}

export function LegacyExplorePage() {
  const places = usePlaceSearch('rest stop');
  return (
    <ProductShell>
      <PageIntro eyebrow="Explore" title="Tasco Explore.">
        Search, categories, nearby places, hidden gems and map/list modes stay Tasco-backed.
      </PageIntro>
      <section className="platform-grid">
        <article className="platform-panel">
          <h2>Search</h2>
          <p>Loading Tasco places.</p>
          <div className="platform-filterbar" role="toolbar" aria-label="Place categories">
            {['Rest stops', 'Food', 'Fuel', 'Views'].map((category) => (
              <button key={category} type="button">{category}</button>
            ))}
          </div>
        </article>
        <article className="platform-panel platform-panel--wide">
          <h2>Results</h2>
          <ul className="platform-list">
            {(places.data?.results ?? []).map((place) => (
              <li key={place.id}>
                <Link to={`/app/places/${place.id}`}>{place.name}</Link>
                <span>{place.address}</span>
                <span>{place.sourceVersion}</span>
              </li>
            ))}
          </ul>
          <p className="platform-state">No hidden gems match the current filters.</p>
        </article>
      </section>
    </ProductShell>
  );
}

export function LegacyPlaceDetailPage() {
  const { placeId = 'POI001' } = useParams();
  const place = usePlace(placeId);
  const community = usePlaceCommunitySummary(placeId);
  const data = place.data;
  return (
    <ProductShell>
      <PageIntro eyebrow="Tasco place" title={data?.name ?? 'Place detail'}>
        Tasco facts, route actions, ratings summary and comments remain separate.
      </PageIntro>
      {data ? (
        <section className="platform-grid">
          <article className="platform-panel platform-panel--wide">
            <h2>Tasco facts</h2>
            <p>{data.address}</p>
            <p>{data.categories.join(' · ')}</p>
            <p>{data.sourceVersion}</p>
          </article>
          <article className="platform-panel">
            <h2>Community slot</h2>
            <p>{community.data?.starAverage ?? 0} stars · {community.data?.reviewCount ?? 0} reviews</p>
            <p>Review text is not merged into Tasco metadata.</p>
          </article>
        </section>
      ) : (
        <ErrorState label="Place not found." />
      )}
    </ProductShell>
  );
}

function ReservedRouteSlotPage({
  eyebrow,
  title,
  body,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
}) {
  return (
    <ProductShell>
      <PageIntro eyebrow={eyebrow} title={title}>
        {body}
      </PageIntro>
      <section className="platform-grid">
        <article className="platform-panel platform-panel--wide">
          <h2>Permission boundary</h2>
          <PermissionState label="Permission boundary: this surface stays read-only in fixture mode." />
          <p>Authorized route, place, profile and settings data are not connected in fixture mode.</p>
        </article>
        <article className="platform-panel">
          <h2>Fixture state</h2>
          <p>Review, profile and partner actions are unavailable in this fixture.</p>
        </article>
      </section>
    </ProductShell>
  );
}

export function CommunityRouteSlotPage() {
  return (
    <ReservedRouteSlotPage
      body="Group activity, trip notes and place discussion are held behind a permission boundary in this build."
      eyebrow="Community"
      title="Community workspace."
    />
  );
}

export function PlaceReviewsRouteSlotPage() {
  const { placeId = 'POI001' } = useParams();
  const place = usePlace(placeId);
  const community = usePlaceCommunitySummary(placeId);
  const data = place.data;
  return (
    <ProductShell>
      <PageIntro eyebrow={placeId} title="Place reviews.">
        Review summaries stay separate from Tasco place facts and route actions.
      </PageIntro>
      {place.isLoading ? <LoadingState label="Loading Tasco place." /> : null}
      {!place.isLoading && !data ? <ErrorState label="Place not found." /> : null}
      {data ? (
        <section className="platform-grid">
          <article className="platform-panel platform-panel--wide">
            <h2>{data.name}</h2>
            <p>{data.address}</p>
            <p>{data.sourceVersion}</p>
          </article>
          <article className="platform-panel">
            <h2>Review status</h2>
            <p>{community.data?.starAverage ?? 0} stars - {community.data?.reviewCount ?? 0} reviews.</p>
            <PermissionState label="Permission boundary: review creation is not enabled in fixture mode." />
          </article>
        </section>
      ) : null}
    </ProductShell>
  );
}

export function ProfileRouteSlotPage() {
  return (
    <ReservedRouteSlotPage
      body="Identity, preferences and trip history are visible only through the fixture profile boundary."
      eyebrow="Profile"
      title="Profile."
    />
  );
}

export function PrivacySettingsRouteSlotPage() {
  const policy = useLocationVisibilityPolicy();
  return (
    <ProductShell>
      <PageIntro eyebrow="Settings" title="Privacy settings.">
        Location visibility and retention preferences remain explicit before production identity is connected.
      </PageIntro>
      <section className="platform-grid">
        <article className="platform-panel">
          <h2>Location sharing</h2>
          <p>{policy.data?.tripVisibility ?? 'trip-members'}</p>
          <PermissionState label="Permission boundary: live location is trip-scoped." />
        </article>
        <article className="platform-panel">
          <h2>Place presence</h2>
          <p>{policy.data?.placePresenceVisibility ?? 'off'}</p>
        </article>
        <article className="platform-panel">
          <h2>Retention</h2>
          <p>{policy.data?.retentionPreference ?? '30-days'}</p>
        </article>
      </section>
    </ProductShell>
  );
}

export function NotificationSettingsRouteSlotPage() {
  return (
    <ReservedRouteSlotPage
      body="Trip safety alerts stay visible while noncritical updates can be quieted by preference."
      eyebrow="Settings"
      title="Notification settings."
    />
  );
}

export function ModerationRouteSlotPage() {
  return (
    <ReservedRouteSlotPage
      body="Administrative queues require an authorized role; moderation actions are unavailable in fixture mode."
      eyebrow="Admin"
      title="Moderation queue."
    />
  );
}

export function PartnersRouteSlotPage() {
  return (
    <ReservedRouteSlotPage
      body="Organization onboarding and partner controls are reserved for authorized partner users."
      eyebrow="Partners"
      title="Partner workspace."
    />
  );
}

export function LegacyNowPage() {
  return (
    <ProductShell>
      <PageIntro eyebrow="Now" title="Day-of-trip command center.">
        Current plan, near-me recommendations and safe quick actions are grouped for the leader.
      </PageIntro>
      <section className="platform-grid">
        <article className="platform-panel">
          <h2>Current plan</h2>
          <p>Proceed on the planned route; next verified stop is Minh Châu Rest Stop.</p>
        </article>
        <article className="platform-panel">
          <h2>Near me</h2>
          <p>Only verified forward places can become action candidates.</p>
        </article>
        <article className="platform-panel">
          <h2>Safe quick actions</h2>
          <button type="button">Request status check</button>
          <button type="button">Review regroup options</button>
        </article>
      </section>
    </ProductShell>
  );
}

export function LegacySettingsPage() {
  const policy = useLocationVisibilityPolicy();
  return (
    <ProductShell>
      <PageIntro eyebrow="Profile and preferences" title="Settings.">
        Profile, privacy, notifications, language, accessibility and data retention entry points.
      </PageIntro>
      <section className="platform-grid">
        <article className="platform-panel">
          <h2>Location visibility</h2>
          <p>{policy.data?.tripVisibility ?? 'trip-members'}</p>
          <label><input type="checkbox" defaultChecked /> Share only during active trips</label>
        </article>
        <article className="platform-panel">
          <h2>Retention preference</h2>
          <p>{policy.data?.retentionPreference ?? '30-days'}</p>
          <button type="button">Request data export</button>
        </article>
        <article className="platform-panel">
          <h2>Notification quiet hours</h2>
          <p>Trip safety alerts remain visible; community notifications can pause.</p>
          <label><input type="checkbox" /> Pause community notifications overnight</label>
        </article>
      </section>
    </ProductShell>
  );
}
