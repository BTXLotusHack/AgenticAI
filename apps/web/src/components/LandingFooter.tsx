import { navigationItems } from '../app/content';
import { BrandMark } from './BrandMark';

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer__topline">
        <a aria-label="Loopin home" href="#top">
          <BrandMark />
        </a>
        <p>Every car. One journey.</p>
      </div>
      <div className="landing-footer__bottomline">
        <nav aria-label="Footer">
          {navigationItems.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
          <a href="#privacy">Privacy</a>
        </nav>
        <p>
          © {new Date().getFullYear()} Loopin · Coordination support, not collision
          avoidance · <a href="/assets/ATTRIBUTION.md">Asset credits</a>
        </p>
      </div>
    </footer>
  );
}
