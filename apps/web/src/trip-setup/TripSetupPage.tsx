import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { appendAuditEntry } from '../demo-session/audit';
import { createInitialDemoSession, type DemoSessionV1 } from '../demo-session/schema';
import { writeDemoSession } from '../demo-session/storage';
import { ProductBrand } from '../shared/ProductBrand';
import { ReadinessList } from './ReadinessList';
import { RouteSummary } from './RouteSummary';

const initialConsents: DemoSessionV1['consents'] = { M001: true, M002: true, M003: true, M004: true };

export function TripSetupPage() {
  const navigate = useNavigate();
  const [consents, setConsents] = useState(initialConsents);
  const ready = Object.values(consents).every(Boolean);

  const startTrip = () => {
    const session = appendAuditEntry(createInitialDemoSession(consents), {
      eventType: 'DemoTripStarted',
      occurredAt: new Date().toISOString(),
      frameIndex: 0,
    });
    writeDemoSession(window.sessionStorage, session);
    navigate('/trips/TRIP001/live');
  };

  return (
    <div className="product-shell setup-page">
      <header className="product-header">
        <ProductBrand />
        <span>Demo trip</span>
        <Link to="/">Exit setup</Link>
      </header>
      <main>
        <section className="setup-intro">
          <p className="product-kicker">Trip setup</p>
          <h1>Set up the Hà Nội → Hạ Long drive.</h1>
          <p>Confirm the route and each member’s readiness before the shared trip starts.</p>
        </section>
        <RouteSummary />
        <ReadinessList
          consents={consents}
          onConsentChange={(memberId, checked) => setConsents((current) => ({ ...current, [memberId]: checked }))}
        />
        <section className="setup-launch">
          <div><strong>{ready ? '4 of 4 ready' : 'Location consent required'}</strong><p>Voice is optional; trip-scoped location consent is required for this demo.</p></div>
          <button className="button button--primary" disabled={!ready} onClick={startTrip} type="button">Start trip <span aria-hidden="true">→</span></button>
        </section>
      </main>
    </div>
  );
}
