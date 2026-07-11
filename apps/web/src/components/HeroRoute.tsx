import { motion, useReducedMotion } from 'motion/react';

const nodes = [
  { cx: 92, cy: 302, delay: 0.75 },
  { cx: 190, cy: 272, delay: 0.88 },
  { cx: 308, cy: 220, delay: 1.01 },
  { cx: 430, cy: 184, delay: 1.14 },
  { cx: 566, cy: 92, delay: 1.27 },
] as const;

export function HeroRoute() {
  const reduceMotion = useReducedMotion();

  const reveal = reduceMotion
    ? undefined
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section className="hero" id="top">
      <picture>
        <source
          sizes="100vw"
          srcSet="/images/loopin-hero-960.webp 960w, /images/loopin-hero-1600.webp 1600w"
          type="image/webp"
        />
        <img
          alt="A winding mountain road through the green valleys of northern Vietnam"
          className="hero__image"
          decoding="async"
          fetchPriority="high"
          height="1600"
          src="/images/loopin-hero.jpg"
          width="2400"
        />
      </picture>
      <div aria-hidden="true" className="hero__wash" />

      <div className="hero__route" aria-hidden="true">
        <svg viewBox="0 0 680 400">
          <motion.path
            animate={{ pathLength: 1, opacity: 1 }}
            className="hero__route-shadow"
            d="M52 338C118 292 158 314 221 263C280 215 326 240 376 205C450 153 486 139 613 55"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.path
            animate={{ pathLength: 1, opacity: 1 }}
            className="hero__route-line"
            d="M52 338C118 292 158 314 221 263C280 215 326 240 376 205C450 153 486 139 613 55"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
          {nodes.map((node, index) => (
            <motion.g
              animate={{ opacity: 1, scale: 1 }}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.5 }}
              key={`${node.cx}-${node.cy}`}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              transition={{ duration: 0.45, delay: node.delay, ease: 'backOut' }}
            >
              <circle className="hero__node-halo" cx={node.cx} cy={node.cy} r="14" />
              <circle className="hero__node" cx={node.cx} cy={node.cy} r="7" />
              <text className="hero__node-label" x={node.cx + 13} y={node.cy - 13}>
                {index === 0 ? 'You' : `0${index + 1}`}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>

      <div className="hero__content">
        <motion.p
          {...reveal}
          className="hero__eyebrow"
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Loopin group drives
        </motion.p>
        <motion.h1
          {...reveal}
          aria-label="Every car. One journey."
          transition={{ duration: 0.85, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          Every car.
          <br />
          One journey.
        </motion.h1>
        <motion.p
          {...reveal}
          className="hero__lede"
          transition={{ duration: 0.75, delay: 0.3 }}
        >
          Plan together, stay connected, and regroup safely—without turning the
          drive into a group chat.
        </motion.p>
        <motion.div
          {...reveal}
          className="hero__actions"
          transition={{ duration: 0.75, delay: 0.4 }}
        >
          <a
            className="button button--primary"
            data-analytics="primary_cta_clicked"
            href="#start"
          >
            Start a group drive <span aria-hidden="true">→</span>
          </a>
          <a
            className="button button--quiet"
            data-analytics="how_it_works_started"
            href="#how-it-works"
          >
            See how it works <span aria-hidden="true">↓</span>
          </a>
        </motion.div>
      </div>

      <div aria-hidden="true" className="hero__scroll-cue">
        <span>Scroll to follow the route</span>
        <span className="hero__scroll-line" />
      </div>
    </section>
  );
}
