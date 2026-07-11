import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createInitialDemoSession } from '../demo-session/schema';
import { readDemoSession } from '../demo-session/storage';
import { ConvoyRail } from './ConvoyRail';
import { RouteWorkspace } from './RouteWorkspace';
import { TripTopBar } from './TripTopBar';
import { SituationInspector } from './SituationInspector';
import { useReplayController } from './useReplayController';

function ActiveTrip({ autoplay, session }: { readonly autoplay: boolean; readonly session: NonNullable<ReturnType<typeof readDemoSession>> }) {
  const navigate = useNavigate();
  const { approveRegroup, completeTrip, controller, snapshot } = useReplayController(session);
  useEffect(() => {
    if (autoplay) controller.play();
  }, [autoplay, controller]);
  useEffect(() => {
    if (snapshot.phase !== 'completed') return;
    completeTrip();
    navigate('/trips/TRIP001/summary');
  }, [completeTrip, navigate, snapshot.phase]);
  return (
    <div className="product-shell live-trip-page" data-phase={snapshot.phase}>
      <TripTopBar controller={controller} snapshot={snapshot} />
      <main className="live-workspace">
        <ConvoyRail frame={snapshot.frame} />
        <RouteWorkspace frame={snapshot.frame} />
        <SituationInspector onApprove={approveRegroup} snapshot={snapshot} />
      </main>
    </div>
  );
}

export function LiveTripPage() {
  const [searchParams] = useSearchParams();
  const autoplay = searchParams.get('autoplay') === 'true';
  const [session] = useState(() =>
    readDemoSession(window.sessionStorage) ?? (autoplay ? createInitialDemoSession() : null),
  );
  if (!session?.setupComplete) {
    return <main className="product-empty"><p className="product-kicker">Setup required</p><h1>Complete trip setup to begin.</h1><p>Location consent and member readiness must be confirmed before live tracking.</p><Link className="button button--primary" to="/trip/new">Set up trip</Link></main>;
  }
  return <ActiveTrip autoplay={autoplay} session={session} />;
}
