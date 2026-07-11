import type { ReactNode } from 'react';
import { Bell, BriefcaseBusiness, Compass, House, MapPinned, Menu, Settings, Users } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

import { ProductBrand } from '../../shared/ProductBrand';

const primaryItems = [
  { icon: House, label: 'Home', to: '/app', end: true },
  { icon: BriefcaseBusiness, label: 'Trips', to: '/app/trips', end: false },
  { icon: Compass, label: 'Explore', to: '/app/explore', end: false },
  { icon: MapPinned, label: 'Now', to: '/app/now', end: false },
  { icon: Users, label: 'Community', to: '/app/community', end: false },
] as const;

const utilityItems = [
  { icon: Settings, label: 'Settings', to: '/app/settings' },
  { icon: BriefcaseBusiness, label: 'Partners', to: '/app/partners' },
] as const;

const mobileItems = primaryItems.slice(0, 4);

function RailLink({ end, icon: Icon, label, to }: (typeof primaryItems)[number]) {
  return (
    <NavLink className="product-rail__link" end={end} to={to}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export function AppShell({
  actions,
  children,
  context = 'Travel workspace',
  status = 'Fixture data',
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly context?: string;
  readonly status?: string;
}) {
  return (
    <div className="product-shell">
      <a className="skip-link" href="#product-content">Skip to workspace</a>
      <aside className="product-rail">
        <div className="product-rail__brand"><ProductBrand /></div>
        <nav aria-label="Primary" className="product-rail__nav">
          {primaryItems.map((item) => <RailLink key={item.to} {...item} />)}
        </nav>
        <nav aria-label="Workspace utilities" className="product-rail__utility">
          {utilityItems.map((item) => (
            <NavLink className="product-rail__link" key={item.to} to={item.to}>
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <Link aria-label="Open Mai's profile" className="product-rail__profile" to="/app/profile">
          <span aria-hidden="true">M</span>
          <strong>Mai</strong>
          <small>Trip organizer</small>
        </Link>
      </aside>

      <header aria-label="Loopin product" className="product-context-bar">
        <button aria-label="Open navigation" className="product-context-bar__menu" type="button"><Menu aria-hidden="true" /></button>
        <div>
          <span>{context}</span>
          <strong>{status}</strong>
        </div>
        <div className="product-context-bar__actions">
          {actions}
          <Link aria-label="Notification settings" className="product-context-bar__icon" to="/app/settings/notifications"><Bell aria-hidden="true" /></Link>
          <Link aria-label="Open profile" className="product-context-bar__avatar" to="/app/profile">M</Link>
        </div>
      </header>

      <main className="product-workspace" id="product-content">{children}</main>

      <nav aria-label="Mobile primary" className="product-mobile-nav">
        {mobileItems.map(({ icon: Icon, label, to }) => (
          <NavLink end={to === '/app'} key={to} to={to}><Icon aria-hidden="true" /><span>{label}</span></NavLink>
        ))}
        <NavLink to="/app/profile"><span aria-hidden="true" className="product-mobile-nav__avatar">M</span><span>Profile</span></NavLink>
      </nav>
    </div>
  );
}
