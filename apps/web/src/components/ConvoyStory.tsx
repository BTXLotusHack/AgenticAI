import { useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'motion/react';
import {
  type ConvoyPhase,
  type VehicleScene,
  getConvoyScene,
} from '../app/story';

const phases: readonly {
  readonly id: ConvoyPhase;
  readonly label: string;
  readonly step: string;
}[] = [
  { id: 'together', label: 'Together', step: '01' },
  { id: 'separated', label: 'Gap detected', step: '02' },
  { id: 'regrouped', label: 'Regrouped', step: '03' },
] as const;

const boundaryLabels = {
  connected: 'Car 3 ↔ Car 4 boundary · connected',
  stretched: 'Car 3 ↔ Car 4 boundary · gap detected',
  reconnected: 'Car 3 ↔ Car 4 boundary · reconnected',
} as const;

function VehicleNode({ vehicle }: { readonly vehicle: VehicleScene }) {
  return (
    <motion.div
      animate={{ left: `${vehicle.progress}%` }}
      aria-label={`${vehicle.label} vehicle node`}
      className="vehicle-node"
      data-component={vehicle.component}
      initial={false}
      layout
      role="img"
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
    >
      <span aria-hidden="true" className="vehicle-node__pulse" />
      <span aria-hidden="true" className="vehicle-node__dot" />
      <span className="vehicle-node__label">{vehicle.label}</span>
    </motion.div>
  );
}

function PhaseControls({
  phase,
  onSelect,
}: {
  readonly phase: ConvoyPhase;
  readonly onSelect: (phase: ConvoyPhase) => void;
}) {
  return (
    <div aria-label="Convoy story phases" className="story-controls" role="group">
      {phases.map((item) => (
        <button
          aria-pressed={item.id === phase}
          className="story-controls__button"
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <span>{item.step}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ConvoyStory() {
  const [phase, setPhase] = useState<ConvoyPhase>('together');
  const scrollRegion = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const scene = getConvoyScene(phase);
  const { scrollYProgress } = useScroll({
    target: scrollRegion,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    if (reduceMotion) return;
    const nextPhase: ConvoyPhase =
      progress < 0.34 ? 'together' : progress < 0.7 ? 'separated' : 'regrouped';
    setPhase((current) => (current === nextPhase ? current : nextPhase));
  });

  const frontCount = scene.vehicles.filter(
    (vehicle) => vehicle.component === 'front',
  ).length;
  const rearCount = scene.vehicles.filter(
    (vehicle) => vehicle.component === 'rear',
  ).length;

  return (
    <section className="convoy-story" id="how-it-works">
      <div className="section-intro">
        <p className="section-kicker">Route-aware, group-aware</p>
        <h2>
          Loopin understands the whole group—
          <em>not just your dot on a map.</em>
        </h2>
        <p>
          Every car becomes a node on the shared route. When the edge between two
          adjacent cars stretches for long enough, Loopin sees two real groups—not
          five unrelated GPS pins.
        </p>
      </div>

      <div className="convoy-story__scroll" ref={scrollRegion}>
        <div className="convoy-story__stage">
          <div className="convoy-story__stage-inner">
            <div className="convoy-story__topline">
              <div>
                <span>Live convoy model</span>
                <strong>Hà Giang loop · 5 vehicles</strong>
              </div>
              <span className="convoy-story__direction">
                Direction of travel <span aria-hidden="true">→</span>
              </span>
            </div>

            <PhaseControls onSelect={setPhase} phase={phase} />

            <div
              className="route-stage"
              data-boundary={scene.boundaryState}
            >
              <div aria-hidden="true" className="route-stage__line" />
              <div aria-hidden="true" className="route-stage__travel" />
              {scene.vehicles.map((vehicle) => (
                <VehicleNode key={vehicle.id} vehicle={vehicle} />
              ))}
              <div className="route-stage__boundary">
                <span aria-hidden="true" className="route-stage__boundary-line" />
                <span>{boundaryLabels[scene.boundaryState]}</span>
              </div>
            </div>

            <div aria-live="polite" className="story-status">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="story-status__message"
                  exit={{ opacity: 0, y: -8 }}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  key={`${phase}-front`}
                  transition={{ duration: 0.25 }}
                >
                  <span className="story-status__role">
                    {phase === 'separated' ? `Front group · ${frontCount} cars` : 'Group view'}
                  </span>
                  <p>{scene.frontMessage}</p>
                </motion.div>
              </AnimatePresence>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="story-status__message"
                  data-rear="true"
                  exit={{ opacity: 0, y: -8 }}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  key={`${phase}-rear`}
                  transition={{ duration: 0.25 }}
                >
                  <span className="story-status__role">
                    {phase === 'separated' ? `Rear group · ${rearCount} cars` : 'Location confidence'}
                  </span>
                  <p>{scene.rearMessage}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <p className="convoy-story__note">
              Phone GPS supports group coordination—not collision avoidance. Every
              state also carries freshness and confidence.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
