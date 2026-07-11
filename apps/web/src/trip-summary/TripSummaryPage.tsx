import { GOLDEN_R001, createGoldenR001Replay } from '@loopin/demo-scenarios';
import { Link, useNavigate } from 'react-router-dom';
import { clearDemoSession, readDemoSession, writeDemoSession } from '../demo-session/storage';
import { ProductBrand } from '../shared/ProductBrand';
import { TripTimeline } from './TripTimeline';

export function TripSummaryPage() {
  const navigate = useNavigate();
  const frames = createGoldenR001Replay();
  const completed = frames.at(-1);
  const session = readDemoSession(window.sessionStorage);
  const valid = session?.setupComplete && session.frameIndex >= frames.length - 1 && session.approvedCandidateId === 'POI001' && completed?.summary;
  if (!valid || !session || !completed.summary) {
    return <main className="product-empty"><p className="product-kicker">Summary unavailable</p><h1>Complete the trip to view its summary.</h1><p>Loopin only reports measured facts from a completed replay.</p><Link className="button button--primary" to="/trip/new">Set up trip</Link></main>;
  }
  const facts = completed.summary.measuredFacts;
  const replay = () => {
    writeDemoSession(window.sessionStorage, { ...session, frameIndex: 0, approvedCandidateId: null, auditEntries: [] });
    navigate('/trips/TRIP001/live');
  };
  const reset = () => {
    clearDemoSession(window.sessionStorage);
    navigate('/trip/new');
  };
  return (
    <div className="product-shell summary-page">
      <header className="product-header"><ProductBrand /><span>Measured trip summary</span><Link to="/">Back to Loopin</Link></header>
      <main>
        <section className="summary-hero"><p className="product-kicker">TRIP001 · Completed</p><h1>The convoy is together again.</h1><p>{GOLDEN_R001.trip.origin} → {GOLDEN_R001.trip.destination}</p></section>
        <section aria-labelledby="measured-facts-title" className="summary-facts"><div className="setup-section-heading"><div><p className="product-kicker">Authoritative record</p><h2 id="measured-facts-title">Measured facts</h2></div><p>Derived from versioned graph and incident events.</p></div><dl><div><dt>Duration</dt><dd>{facts.durationSeconds} seconds</dd></div><div><dt>Convoy splits</dt><dd>{facts.confirmedSplitCount} confirmed · {facts.resolvedSplitCount} resolved</dd></div><div><dt>Peak route gap</dt><dd>{facts.maximumConfirmedRouteGapMeters} m</dd></div><div><dt>Regroup</dt><dd>Minh Châu Rest Stop · POI001</dd></div><div><dt>Delivery</dt><dd>{facts.notificationRequestCount} notification requests</dd></div><div><dt>Telemetry quality</dt><dd>1 duplicate · 1 stale · 1 history replay</dd></div></dl></section>
        <section aria-labelledby="timeline-title" className="summary-history"><div><p className="product-kicker">Event history</p><h2 id="timeline-title">How the trip changed</h2><TripTimeline frames={frames} /></div><aside><span>Template summary</span><blockquote>{completed.summary.narrative.text}</blockquote><p>Measured facts remain separate from future AI explanation.</p></aside></section>
        <section className="summary-actions"><button className="button button--primary" onClick={replay} type="button">Replay trip</button><button className="button summary-actions__quiet" onClick={reset} type="button">Start another demo</button><Link className="text-link" to="/">Back to Loopin</Link></section>
      </main>
    </div>
  );
}
