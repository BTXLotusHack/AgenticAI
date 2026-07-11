import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReplayController, ReplaySnapshot, ReplaySpeed } from '@loopin/demo-scenarios';
import { ProductBrand } from '../shared/ProductBrand';
import { StatusLabel } from '../shared/StatusLabel';

export function TripTopBar({ controller, snapshot }: { readonly controller: ReplayController; readonly snapshot: ReplaySnapshot }) {
  const speeds: ReplaySpeed[] = [1, 2, 4];
  return (
    <header className="trip-topbar">
      <div className="trip-topbar__identity">
        <ProductBrand />
        <div><span>TRIP001 · Live demo</span><h1>Hà Nội → Hạ Long</h1></div>
      </div>
      <div className="trip-topbar__state">
        <StatusLabel state={snapshot.frame.graph.overallState} />
        <span>Frame {snapshot.frameIndex + 1} / {snapshot.frame.frameIndex >= 0 ? 16 : 16}</span>
      </div>
      <div aria-label="Replay controls" className="replay-controls" role="group">
        <button aria-label="Previous frame" onClick={controller.stepBackward} type="button"><SkipBack aria-hidden="true" /></button>
        <button aria-label={snapshot.isPlaying ? 'Pause replay' : 'Play replay'} className="replay-controls__primary" onClick={snapshot.isPlaying ? controller.pause : controller.play} type="button">
          {snapshot.isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
        <button aria-label="Next frame" onClick={controller.stepForward} type="button"><SkipForward aria-hidden="true" /></button>
        <button aria-label="Restart replay" onClick={controller.restart} type="button"><RotateCcw aria-hidden="true" /></button>
        <div className="speed-controls">
          {speeds.map((speed) => <button aria-label={`Playback speed ${speed}×`} aria-pressed={snapshot.speed === speed} key={speed} onClick={() => controller.setSpeed(speed)} type="button">{speed}×</button>)}
        </div>
      </div>
      <Link className="trip-topbar__exit" to="/">Exit demo</Link>
    </header>
  );
}
