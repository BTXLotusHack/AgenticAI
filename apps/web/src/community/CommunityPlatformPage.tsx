import { Bell, Building2, ChevronRight, EyeOff, Flag, Heart, MapPin, MessageCircle, ShieldCheck, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../app/shell/AppShell';
import { PageHeader } from '../shared/product/PageHeader';

const activity = [
  { initials: 'AN', meta: 'An · shared with friends', place: 'Bãi Cháy Rest Area', text: 'Saved this stop for the coastal drive. Parking looked easy for a four-car group.', time: '24 min ago' },
  { initials: 'DU', meta: 'Duy · public review', place: 'Minh Châu Rest Stop', text: 'A calm regroup point with clear access from the route.', time: '1 hr ago' },
];

export function CommunityPage() {
  return <AppShell context="Community" status="Approximate presence only"><PageHeader eyebrow="Opt-in social layer" title="Community signals" description="Place presence is approximate, opt-in, and revocable. Trip-scoped location stays with the trip." />
    <div className="community-layout"><section aria-labelledby="travel-activity-title" className="community-feed"><div className="community-section-heading"><p className="product-kicker">From people you follow</p><h2 id="travel-activity-title">Travel activity</h2></div>{activity.map((item) => <article key={item.meta} className="activity-entry"><span>{item.initials}</span><div><header><strong>{item.meta}</strong><time>{item.time}</time></header><div className="activity-place"><MapPin aria-hidden="true" /><span>{item.place}</span></div><p>{item.text}</p><footer><button type="button"><Heart aria-hidden="true" /> Save</button><button type="button"><MessageCircle aria-hidden="true" /> Comment</button></footer></div></article>)}</section><aside className="community-presence"><p className="product-kicker">Coming to places</p><h2>Shared plans nearby</h2><p>Place presence is approximate, opt-in, and revocable.</p><ul><li><span>MA</span><div><strong>Mai</strong><small>Hạ Long · Bãi Cháy stop</small></div><em>Public until Aug 7</em></li><li><span>AN</span><div><strong>An</strong><small>Đà Nẵng · coast coffee</small></div><em>Friends only</em></li></ul><div className="community-privacy"><EyeOff aria-hidden="true" /><p><strong>Private until shared</strong>Your live trip location never appears here.</p></div></aside></div>
  </AppShell>;
}

export function PlaceReviewsPage() {
  return <AppShell context="Place reviews" status="Community-generated"><PageHeader eyebrow="Community reviews" title="Bai Chay Rest Area reviews" description="Tasco facts stay separate from user comments, so provider data remains authoritative." actions={<button className="button button--primary" type="button">Write a review</button>} />
    <div className="reviews-layout"><aside className="reviews-summary"><p className="product-kicker">Loopin community</p><strong>4.5</strong><span>2 moderated reviews</span><div aria-label="Rating distribution"><i style={{ width: '88%' }} /><i style={{ width: '64%' }} /><i style={{ width: '18%' }} /></div><p>Tasco facts stay separate from community ratings and comments.</p></aside><section aria-label="Place reviews" className="review-list">{[['Mai','5','Clean stop, easy parking, and the entrance was simple to find.'],['Duy','4','Good for a regroup, but check opening hours before relying on it late.']].map(([name,rating,comment]) => <article key={name}><header><span>{name?.slice(0,1)}</span><div><strong>{name}</strong><small>Verified trip context · {rating} stars</small></div><div aria-label={`${rating} stars`} className="review-stars"><Star aria-hidden="true" />{rating}</div></header><p>{comment}</p><button type="button"><Flag aria-hidden="true" /> {name === 'Mai' ? 'Report review' : `Report ${name} review`}</button></article>)}</section></div>
  </AppShell>;
}

export function ProfilePage() {
  return <AppShell context="Profile" status="Visible to trip members"><PageHeader eyebrow="Your travel context" title="Travel profile" description="Preferences make recommendations relevant without exposing precise movement." actions={<button className="button button--primary" type="button">Save changes</button>} />
    <div className="profile-layout"><aside className="profile-identity"><div className="profile-cover" /><span className="profile-avatar">M</span><h2>Mai</h2><p>Hà Nội · Trip organizer</p><dl><div><dt>Trips</dt><dd>2</dd></div><div><dt>Reviews</dt><dd>1</dd></div><div><dt>Saved</dt><dd>8</dd></div></dl><Link to="/app/settings/privacy">Privacy settings <ChevronRight aria-hidden="true" /></Link><Link to="/app/settings/notifications">Notification settings <ChevronRight aria-hidden="true" /></Link></aside><form className="profile-form"><p className="product-kicker">Personal details</p><label>Display name<input defaultValue="Mai" /></label><label>Home city<input defaultValue="Hà Nội" /></label><label>Travel style<input defaultValue="Family trips, food stops" /></label><label>Interests<textarea defaultValue="Seafood, quiet routes, coastal views" /></label><fieldset><legend>Profile visibility</legend><label><input defaultChecked name="profileVisibility" type="radio" /> Trip members</label><label><input name="profileVisibility" type="radio" /> Private</label></fieldset></form></div>
  </AppShell>;
}

export function PrivacySettingsPage() {
  return <AppShell context="Privacy" status="Trip-scoped by default"><PageHeader eyebrow="Consent controls" title="Privacy settings" description="Choose who can see live, approximate and historical location context." />
    <div className="privacy-grid"><fieldset><legend>Trip visibility</legend><p>Who can see your position while a convoy is active.</p><label><input name="tripVisibility" type="radio" /> Group visible <span>Every authorized trip member</span></label><label><input checked name="tripVisibility" readOnly type="radio" /> Leader only <span>Only the active trip coordinator</span></label><label><input name="tripVisibility" type="radio" /> Paused <span>No new position updates</span></label></fieldset><fieldset><legend>Place presence</legend><p>Approximate plans shown outside active trips.</p><label><input name="presenceVisibility" type="radio" /> Public approximate presence <span>Never a live route trace</span></label><label><input checked name="presenceVisibility" readOnly type="radio" /> Place presence private <span>Nothing appears in Community</span></label><label><input name="presenceVisibility" type="radio" /> Connections only <span>Approved people only</span></label></fieldset></div><section className="blocked-users"><div><p className="product-kicker">Visibility denylist</p><h2>Blocked users</h2></div><article><span>U2</span><div><strong>USER002</strong><small>Cannot see reviews or opt-in place presence</small></div><button type="button">Unblock</button></article></section>
  </AppShell>;
}

const notificationGroups = [
  { name: 'Convoy-critical', note: 'Separation, low-confidence GPS and regroup decisions.', options: ['Safety alerts', 'Leader instructions'] },
  { name: 'Planning', note: 'Invitations, readiness and itinerary changes.', options: ['Trip invitations', 'Readiness reminders'] },
  { name: 'Community', note: 'Replies, saves and moderation outcomes.', options: ['Review replies', 'Place presence requests'] },
  { name: 'Marketing', note: 'Optional product and partner news.', options: ['Loopin product updates'] },
];
export function NotificationSettingsPage() {
  return <AppShell context="Notifications" status="Safety alerts remain active"><PageHeader eyebrow="Notification settings" title="Notification settings" description="Keep road-critical alerts distinct from planning and social updates." /><form className="notification-groups">{notificationGroups.map((group, groupIndex) => <fieldset key={group.name}><legend>{group.name}</legend><p>{group.note}</p>{group.options.map((option,index) => <label key={option}><span>{option}</span><input defaultChecked={groupIndex < 2 || index === 0} type="checkbox" /></label>)}</fieldset>)}</form></AppShell>;
}

export function ModerationPage() {
  return <AppShell context="Moderation" status="1 open report"><PageHeader eyebrow="Trusted moderator" title="Moderation queue" description="Review evidence, protect privacy and leave an auditable decision." /><div className="moderation-layout"><section aria-label="Open reports" className="moderation-queue"><header><h2>Open reports</h2><button type="button">All reasons</button></header><article aria-current="true"><span><Flag aria-hidden="true" /></span><div><strong>Privacy violation</strong><p>Review may expose private trip details.</p><small>Reported 18 minutes ago · High priority</small></div></article></section><aside className="moderation-evidence"><p className="product-kicker">Evidence context</p><h2>Review report</h2><blockquote>“The rear group stopped near our family home…”</blockquote><dl><div><dt>Surface</dt><dd>Place review</dd></div><div><dt>Reporter</dt><dd>Trip member</dd></div><div><dt>Policy</dt><dd>Private trip details</dd></div></dl><button className="button button--primary" type="button"><ShieldCheck aria-hidden="true" /> Resolve report</button><button className="button moderation-secondary" type="button">Dismiss with note</button></aside></div></AppShell>;
}

export function PartnersPage() {
  return <AppShell context="Partners" status="Future pilot model"><PageHeader eyebrow="Responsible platform model" title="Partner platform" description="Support managed road groups while consumer trust remains the product boundary." />
    <section className="partner-story"><div><Building2 aria-hidden="true" /><p className="product-kicker">For tourism and mobility teams</p><h2>Coordinate the journey without owning the traveler.</h2><p>Loopin can support organized groups, event transport and fleet pilots through role-aware coordination and approved regroup points.</p></div><ol><li><span>01</span><div><strong>Managed groups</strong><p>Trip templates, role assignment and readiness policies.</p></div></li><li><span>02</span><div><strong>Privacy-safe insight</strong><p>Aggregated or anonymized demand patterns, never public movement traces.</p></div></li><li><span>03</span><div><strong>Provider integration</strong><p>Tasco routes and places stay identified at every decision surface.</p></div></li></ol></section><section className="partner-boundary"><Users aria-hidden="true" /><div><p className="product-kicker">Consumer trust first</p><h2>No raw public movement feed.</h2></div><p>Partners receive only the access and aggregate context a validated use case requires.</p></section>
  </AppShell>;
}
