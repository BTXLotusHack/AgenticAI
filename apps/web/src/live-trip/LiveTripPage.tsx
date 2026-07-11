import { Link } from 'react-router-dom';
import { readDemoSession } from '../demo-session/storage';
import { ConvoyRail } from './ConvoyRail';
import { RouteWorkspace } from './RouteWorkspace';
import { TripTopBar } from './TripTopBar';
import { useReplayController } from './useReplayController';

function ActiveTrip({ session }: { readonly session: NonNullable<ReturnType<typeof readDemoSession>> }) {
  const { controller, snapshot } = useReplayController(session);
  return (
    <div className="product-shell live-trip-page" data-phase={snapshot.phase}>
      <TripTopBar controller={controller} snapshot={snapshot} />
      <main className="live-workspace">
        <ConvoyRail frame={snapshot.frame} />
        <RouteWorkspace frame={snapshot.frame} />
        <aside className="trip-inspector"><p className="product-kicker">Trip context</p><h2>Convoy on R001</h2><p>Step through the replay to inspect confidence, separation, and regroup decisions.</p></aside>
      </main>
    </div>
  );
}

export function LiveTripPage() {
  const session = readDemoSession(window.sessionStorage);
  if (!session?.setupComplete) {
    return <main className="product-empty"><p className="product-kicker">Setup required</p><h1>Complete trip setup to begin.</h1><p>Location consent and member readiness must be confirmed before live tracking.</p><Link className="button button--primary" to="/trip/new">Set up trip</Link></main>;
  }
  return <ActiveTrip session={session} />;
}
