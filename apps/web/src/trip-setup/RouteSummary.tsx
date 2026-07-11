import { GOLDEN_R001 } from '@loopin/demo-scenarios';

export function RouteSummary() {
  return (
    <section aria-labelledby="route-summary-title" className="setup-route">
      <div>
        <p className="product-kicker">Demo route</p>
        <h2 id="route-summary-title">{GOLDEN_R001.trip.origin} → {GOLDEN_R001.trip.destination}</h2>
        <p>{GOLDEN_R001.trip.tripId} · {GOLDEN_R001.trip.routeId}</p>
      </div>
      <dl>
        <div><dt>Departure</dt><dd>20 Jul 2026 · 07:30</dd></div>
        <div><dt>Expected</dt><dd>{GOLDEN_R001.trip.expectedDurationMinutes} min</dd></div>
        <div><dt>Vehicles</dt><dd>{GOLDEN_R001.members.length}</dd></div>
      </dl>
      <div aria-label="Simulated route projection" className="setup-route__line">
        <span>Hà Nội</span><i /><i /><i /><i /><span>Hạ Long</span>
      </div>
      <p className="setup-route__disclosure">Simulated route projection · workbook scenario</p>
    </section>
  );
}
