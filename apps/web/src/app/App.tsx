import { HeroRoute } from '../components/HeroRoute';
import { LandingNav } from '../components/LandingNav';

export function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <LandingNav />
      <main id="main-content">
        <HeroRoute />
      </main>
    </>
  );
}
