import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
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
import { ProductBrand } from '../shared/ProductBrand';

const navItems = [
  { label: 'Dashboard', to: '/app' },
  { label: 'Trips', to: '/app/trips' },
  { label: 'Explore', to: '/app/explore' },
  { label: 'Now', to: '/app/now' },
  { label: 'Settings', to: '/app/settings' },
] as const;

function ProductShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="product-shell platform-shell">
      <header aria-label="Loopin product" className="platform-topbar">
        <ProductBrand />
        <nav aria-label="App sections" className="platform-nav">
          {navItems.map((item) => (
            <NavLink end={item.to === '/app'} key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link className="platform-topbar__account" to="/app/settings">
          Fixture user
        </Link>
      </header>
      <main className="platform-main">{children}</main>
    </div>
  );
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
  return (
    <section className="platform-intro">
      <p className="product-kicker">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  );
}

function LoadingState({ label }: { readonly label: string }) {
  return <p className="platform-state platform-state--loading">{label}</p>;
}

function ErrorState({ label }: { readonly label: string }) {
  return <p className="platform-state platform-state--error">{label}</p>;
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

export function AuthPage({ mode }: { readonly mode: 'login' | 'signup' | 'forgot' | 'reset' }) {
  const [submitted, setSubmitted] = useState(false);
  const content = {
    login: {
      title: 'Log in to Loopin',
      body: 'Cognito-ready form boundary with local fixture auth for this branch.',
      button: 'Continue',
      showPassword: true,
    },
    signup: {
      title: 'Create your Loopin account',
      body: 'Collect only the fields needed to start trip planning.',
      button: 'Create account',
      showPassword: true,
    },
    forgot: {
      title: 'Recover your account',
      body: 'Request a recovery link through the future identity adapter.',
      button: 'Send recovery link',
      showPassword: false,
    },
    reset: {
      title: 'Set a new password',
      body: 'Local validation only; the identity adapter will own persistence.',
      button: 'Update password',
      showPassword: true,
    },
  }[mode];

  return (
    <main className="auth-page">
      <ProductBrand />
      <section aria-labelledby="auth-title" className="auth-panel">
        <p className="product-kicker">Fixture auth boundary</p>
        <h1 id="auth-title">{content.title}</h1>
        <p>{content.body}</p>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <label>
            Email
            <input autoComplete="email" name="email" type="email" />
          </label>
          {content.showPassword ? (
            <label>
              Password
              <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} name="password" type="password" />
            </label>
          ) : null}
          {submitted ? (
            <div aria-live="polite" className="auth-errors">
              <p>Email is required.</p>
              {content.showPassword ? <p>Password is required.</p> : null}
            </div>
          ) : null}
          <button className="button button--primary" type="submit">
            {content.button}
          </button>
        </form>
        <Link className="text-link" to="/onboarding">
          Continue in fixture mode
        </Link>
      </section>
    </main>
  );
}

export function OnboardingPage() {
  return (
    <ProductShell>
      <PageIntro eyebrow="Onboarding" title="Shape your travel profile.">
        Capture travel style, interests, destination preferences, budget, companions and dietary needs before planning.
      </PageIntro>
      <section className="platform-panel">
        <h2>Preference setup</h2>
        <div className="preference-grid">
          {['Family convoy', 'Food stops', 'Quiet routes', 'Motorcycle group', 'Sea views', 'Vegetarian friendly'].map((item) => (
            <label key={item}>
              <input type="checkbox" /> {item}
            </label>
          ))}
        </div>
        <button className="button button--primary" type="button">
          Save fixture profile
        </button>
      </section>
    </ProductShell>
  );
}

export function DashboardPage() {
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
              </li>
            ))}
          </ul>
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

export function TripsPage() {
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
            </li>
          ))}
        </ul>
      </section>
    </ProductShell>
  );
}

export function TripPlannerPage() {
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

export function TripOverviewPage() {
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
            <p>{live.data?.state ?? 'waiting for current snapshot'}</p>
            <p>Permission scoped to trip members.</p>
          </article>
        </section>
      ) : null}
    </ProductShell>
  );
}

export function ItineraryPage() {
  const { tripId = 'TRIP001' } = useParams();
  const trip = useTrip(tripId);
  return (
    <ProductShell>
      <PageIntro eyebrow={tripId} title="Itinerary editor.">
        Day and stop editing keeps Tasco facts separate from leader notes.
      </PageIntro>
      <section className="platform-panel">
        <h2>Day 1 stops</h2>
        <ol className="itinerary-list">
          {(trip.data?.route.stops ?? []).map((stop) => (
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

export function ShareTripPage() {
  const { tripId = 'TRIP001' } = useParams();
  return (
    <ProductShell>
      <PageIntro eyebrow={tripId} title="Share trip.">
        Invite links, QR handoff, roles, export and print surfaces remain trip-scoped.
      </PageIntro>
      <section className="platform-grid">
        <article className="platform-panel">
          <h2>Invite link</h2>
          <p>loopin.local/join/TRIP001-DEMO</p>
          <button className="button button--primary" type="button">Copy invite</button>
        </article>
        <article className="platform-panel">
          <h2>QR</h2>
          <div className="qr-block" aria-label="QR placeholder">TRIP001</div>
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
  return (
    <ProductShell>
      <PageIntro eyebrow={`${tripId} · Contract-driven live`} title={`${trip.data?.route.origin.name ?? 'Hà Nội'} → ${trip.data?.route.destination.name ?? 'Hạ Long'}`}>
        Current members are rendered from LiveMemberSnapshot fixture contracts with visible freshness and confidence.
      </PageIntro>
      <section className="platform-panel platform-panel--wide">
        <h2>Live members</h2>
        <ul className="platform-list">
          {(live.data?.members ?? []).map((member) => (
            <li key={member.memberId}>
              <span>{member.displayName}</span>
              <span>{member.vehicleLabel}</span>
              <span>{member.freshnessLabel}</span>
              <span>confidence {member.confidence}</span>
            </li>
          ))}
        </ul>
      </section>
    </ProductShell>
  );
}

export function DynamicSummaryPage() {
  const { tripId = 'TRIP001' } = useParams();
  const trip = useTrip(tripId);
  return (
    <ProductShell>
      <PageIntro eyebrow={`${tripId} · Contract summary`} title="The convoy is together again.">
        Summary-by-trip mode separates measured facts from future AI explanation.
      </PageIntro>
      <section className="platform-grid">
        <article className="platform-panel">
          <h2>Measured facts</h2>
          <p>1 confirmed split · 1 resolved split.</p>
          <p>Peak route gap 900 m.</p>
        </article>
        <article className="platform-panel">
          <h2>Approved regroup</h2>
          <p>{trip.data?.route.stops[0]?.place.name ?? 'Minh Châu Rest Stop'} · POI001.</p>
          <p>No arbitrary POI was created by the UI.</p>
        </article>
        <article className="platform-panel">
          <h2>Template summary</h2>
          <p>The group separated, approved a verified forward stop, and reconnected on the planned route.</p>
        </article>
      </section>
    </ProductShell>
  );
}

export function ExplorePage() {
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

export function PlaceDetailPage() {
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

export function NowPage() {
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

export function SettingsPage() {
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
