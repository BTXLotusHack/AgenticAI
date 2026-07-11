import type { ReactNode } from 'react';
import { Bell, Building2, EyeOff, Flag, ShieldCheck, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductBrand } from '../shared/ProductBrand';

const placePresence = [
  ['Mai', 'Ha Long', 'Bai Chay stop', 'Public until Aug 7'],
  ['An', 'Da Nang', 'Coffee near the coast', 'Friends only'],
];

const reviews = [
  ['Mai', '5', 'Clean stop, easy parking, and the entrance was simple to find.'],
  ['Duy', '4', 'Good for a regroup, but check opening hours before relying on it late.'],
];

function PlatformShell({ children, eyebrow, title, summary }: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  summary: string;
}) {
  return (
    <div className="platform-shell">
      <header className="product-header">
        <ProductBrand />
        <nav aria-label="Platform">
          <Link to="/app/community">Community</Link>
          <Link to="/app/profile">Profile</Link>
          <Link to="/app/settings/privacy">Privacy</Link>
          <Link to="/app/partners">Partners</Link>
        </nav>
      </header>
      <main className="platform-main">
        <section className="platform-hero">
          <p className="product-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{summary}</p>
        </section>
        {children}
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="platform-metric">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function CommunityPage() {
  return (
    <PlatformShell
      eyebrow="Opt-in social layer"
      summary="Place presence is approximate, opt-in, and revocable. Trip-scoped location stays with the trip."
      title="Community signals"
    >
      <section className="platform-grid" aria-label="Community overview">
        <Metric icon={Users} label="Visible travelers" value="2 near shared stops" />
        <Metric icon={Star} label="Place ratings" value="4.5 average" />
        <Metric icon={EyeOff} label="Privacy default" value="Private until shared" />
      </section>
      <section className="platform-section">
        <div>
          <p className="product-kicker">Coming to places</p>
          <h2>See who has shared plans around a stop.</h2>
        </div>
        <ul className="platform-list">
          {placePresence.map(([name, city, stop, visibility]) => (
            <li key={name}>
              <strong>{name}</strong>
              <span>{city} · {stop}</span>
              <em>{visibility}</em>
            </li>
          ))}
        </ul>
      </section>
    </PlatformShell>
  );
}

export function PlaceReviewsPage() {
  return (
    <PlatformShell
      eyebrow="Community reviews"
      summary="Tasco facts stay separate from user comments, so map data remains provider-sourced while ratings stay clearly community-generated."
      title="Bai Chay Rest Area reviews"
    >
      <section className="platform-section platform-section--split">
        <div>
          <p className="product-kicker">Tasco place</p>
          <h2>Bai Chay Rest Area</h2>
          <p>Provider facts, route actions, coordinates, opening signals, and map display belong to the Tasco-backed place contract.</p>
        </div>
        <div>
          <p className="product-kicker">Community summary</p>
          <h2>4.5 from 2 reviews</h2>
          <p>User-generated ratings and comments are moderated separately from provider metadata.</p>
        </div>
      </section>
      <section className="platform-section" aria-label="Place reviews">
        <ul className="platform-list">
          {reviews.map(([name, rating, comment]) => (
            <li key={name}>
              <strong>{rating} stars · {name}</strong>
              <span>{comment}</span>
              <button className="platform-icon-button" type="button"><Flag aria-hidden="true" /> {name === 'Mai' ? 'Report review' : `Report ${name} review`}</button>
            </li>
          ))}
        </ul>
      </section>
    </PlatformShell>
  );
}

export function ProfilePage() {
  return (
    <PlatformShell
      eyebrow="Your travel context"
      summary="Profile details help recommendations feel relevant without exposing trip membership or precise movement outside the trip."
      title="Travel profile"
    >
      <form className="platform-form">
        <label>
          Display name
          <input defaultValue="Mai" />
        </label>
        <label>
          Home city
          <input defaultValue="Ha Noi" />
        </label>
        <label>
          Travel style
          <input defaultValue="Family trips, food stops" />
        </label>
        <label>
          Interests
          <input defaultValue="Seafood, quiet routes, coastal views" />
        </label>
      </form>
    </PlatformShell>
  );
}

export function PrivacySettingsPage() {
  return (
    <PlatformShell
      eyebrow="Consent controls"
      summary="These settings control what is visible outside an active trip. Active convoy sharing still follows trip membership and role rules."
      title="Privacy settings"
    >
      <section className="platform-section platform-section--split">
        <fieldset className="platform-fieldset">
          <legend>Trip visibility</legend>
          <label><input name="tripVisibility" type="radio" /> Group visible</label>
          <label><input checked name="tripVisibility" readOnly type="radio" /> Leader only</label>
          <label><input name="tripVisibility" type="radio" /> Paused</label>
        </fieldset>
        <fieldset className="platform-fieldset">
          <legend>Place presence</legend>
          <label><input name="presenceVisibility" type="radio" /> Public approximate presence</label>
          <label><input checked name="presenceVisibility" readOnly type="radio" /> Place presence private</label>
          <label><input name="presenceVisibility" type="radio" /> Connections only</label>
        </fieldset>
      </section>
      <section className="platform-section">
        <div>
          <p className="product-kicker">Visibility denylist</p>
          <h2>Blocked users</h2>
          <p>Blocked people cannot see your reviews or opt-in place presence, and their public community content is hidden from you.</p>
        </div>
        <ul className="platform-list">
          <li><strong>USER002</strong><span>Blocked from community surfaces</span><em>Active</em></li>
        </ul>
      </section>
    </PlatformShell>
  );
}

export function NotificationSettingsPage() {
  return (
    <PlatformShell
      eyebrow="Notification settings"
      summary="Community notifications stay separate from low-distraction driving alerts."
      title="Notification settings"
    >
      <form className="platform-form">
        <label><input defaultChecked type="checkbox" /> Trip safety alerts</label>
        <label><input defaultChecked type="checkbox" /> Review moderation updates</label>
        <label><input type="checkbox" /> Place presence requests</label>
      </form>
    </PlatformShell>
  );
}

export function ModerationPage() {
  return (
    <PlatformShell
      eyebrow="Trusted moderator"
      summary="Reports are reviewed from a trusted auth context; user-submitted role flags never grant moderation authority."
      title="Moderation queue"
    >
      <section aria-label="Open reports" className="platform-section">
        <ul className="platform-list">
          <li>
            <strong>Privacy violation</strong>
            <span>Review reported for exposing private trip details.</span>
            <button className="platform-icon-button" type="button"><ShieldCheck aria-hidden="true" /> Resolve report</button>
          </li>
        </ul>
      </section>
    </PlatformShell>
  );
}

export function PartnersPage() {
  return (
    <PlatformShell
      eyebrow="Pilot model"
      summary="A future partner layer can support tourism groups, event transport, and fleet pilots while keeping consumer trust first."
      title="Partner platform"
    >
      <section className="platform-section platform-section--split">
        <div>
          <Building2 aria-hidden="true" className="platform-section__icon" />
          <h2>For trip operators</h2>
          <p>Coordinate multi-vehicle movement, approved regroup points, and role-specific summaries without exposing individual location outside authorized trips.</p>
        </div>
        <div>
          <Bell aria-hidden="true" className="platform-section__icon" />
          <h2>For partners</h2>
          <p>Business insights use aggregated or anonymized demand patterns, never raw public movement traces or fabricated proof.</p>
        </div>
      </section>
    </PlatformShell>
  );
}
