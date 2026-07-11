import type { GoldenReplayFrameV1 } from '@loopin/demo-scenarios';
import { SchematicRouteRenderer } from './SchematicRouteRenderer';

export function RouteWorkspace({ frame }: { readonly frame: GoldenReplayFrameV1 }) {
  return (
    <section aria-labelledby="route-workspace-title" className="route-workspace">
      <div className="workspace-heading"><div><p>R001 · Eastbound</p><h2 id="route-workspace-title">Shared route</h2></div><span>Simulated route projection</span></div>
      <div className="route-workspace__canvas" data-state={frame.graph.overallState}><SchematicRouteRenderer frame={frame} /></div>
      <div aria-live="polite" className="route-workspace__caption">
        {frame.phase === 'degraded' ? <><strong>Location confidence is degraded.</strong><span>No convoy split is confirmed; weak GPS is shown with its 100 m accuracy halo.</span></> : <><strong>{frame.graph.components.length} connected component{frame.graph.components.length === 1 ? '' : 's'}.</strong><span>Vehicle order follows progress along R001.</span></>}
      </div>
    </section>
  );
}
