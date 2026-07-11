import { useEffect, useId, useState } from 'react';
import { navigationItems } from '../app/content';
import { BrandMark } from './BrandMark';

function MenuGlyph({ open }: { readonly open: boolean }) {
  return (
    <span aria-hidden="true" className="menu-glyph">
      <span className="menu-glyph__line" data-open={open ? 'true' : 'false'} />
      <span className="menu-glyph__line" data-open={open ? 'true' : 'false'} />
    </span>
  );
}

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="landing-nav">
      <nav aria-label="Primary" className="landing-nav__inner">
        <a aria-label="Loopin home" className="landing-nav__brand" href="#top">
          <BrandMark inverted />
        </a>

        <div className="landing-nav__links">
          {navigationItems.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="landing-nav__actions">
          <a className="landing-nav__login" href="#login">
            Log in
          </a>
          <a className="button button--nav" href="#start">
            Start a drive
          </a>
        </div>

        <button
          aria-controls={menuId}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="landing-nav__menu-button"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <MenuGlyph open={open} />
        </button>
      </nav>

      {open ? (
        <div
          aria-label="Mobile navigation"
          className="mobile-menu"
          id={menuId}
          role="dialog"
        >
          <div className="mobile-menu__links">
            {navigationItems.map((item) => (
              <a href={item.href} key={item.href} onClick={() => setOpen(false)}>
                {item.label}
                <span aria-hidden="true">↗</span>
              </a>
            ))}
            <a href="#login" onClick={() => setOpen(false)}>
              Log in <span aria-hidden="true">↗</span>
            </a>
          </div>
          <a
            className="button button--primary mobile-menu__cta"
            href="#start"
            onClick={() => setOpen(false)}
          >
            Start a group drive <span aria-hidden="true">→</span>
          </a>
        </div>
      ) : null}
    </header>
  );
}
