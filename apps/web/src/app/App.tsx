import { ConvoyStory } from '../components/ConvoyStory';
import { EditorialSections } from '../components/EditorialSections';
import { HeroRoute } from '../components/HeroRoute';
import { LandingFooter } from '../components/LandingFooter';
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
        <ConvoyStory />
        <EditorialSections />
      </main>
      <LandingFooter />
    </>
  );
}
