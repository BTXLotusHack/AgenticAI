import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { benefits, organizationAudiences } from '../app/content';

function Reveal({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 36 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ amount: 0.2, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}

function BenefitSequence() {
  return (
    <section aria-labelledby="benefits-title" className="benefit-sequence">
      <div className="benefit-sequence__heading">
        <p className="section-kicker">The shared drive, made legible</p>
        <h2 id="benefits-title">Stay connected without staying on your phone.</h2>
      </div>
      <ol className="benefit-list">
        {benefits.map((benefit) => (
          <li key={benefit.number}>
            <span className="benefit-list__number">{benefit.number}</span>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
            <span aria-hidden="true" className="benefit-list__arrow">
              ↗
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SocialJourney() {
  const mediaRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ['start end', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ['-4%', '4%']);

  return (
    <section aria-labelledby="social-title" className="social-journey">
      <div className="social-journey__media" ref={mediaRef}>
        <picture>
          <source
            sizes="100vw"
            srcSet="/images/loopin-convoy-960.webp 960w, /images/loopin-convoy-1600.webp 1600w"
            type="image/webp"
          />
          <motion.img
            alt="Five cars traveling together on a winding green mountain road"
            height="1013"
            loading="lazy"
            src="/images/loopin-convoy.jpg"
            style={{ y: reduceMotion ? 0 : imageY }}
            width="1800"
          />
        </picture>
        <div aria-hidden="true" className="social-journey__wash" />
        <div className="social-journey__copy">
          <p>Private coordination for people who travel together</p>
          <h2
            aria-label="Less “Where are you?” More “We’ve got you.”"
            id="social-title"
          >
            Less “Where are you?”
            <em>More “We’ve got you.”</em>
          </h2>
        </div>
        <div aria-hidden="true" className="social-journey__stamp">
          <span>One route</span>
          <strong>5</strong>
          <span>cars together</span>
        </div>
      </div>
    </section>
  );
}

function VoiceSafety() {
  return (
    <section aria-labelledby="safety-title" className="voice-safety" id="safety">
      <div aria-hidden="true" className="voice-safety__ambient">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <Reveal className="voice-safety__copy">
        <p className="section-kicker">Designed for moving moments</p>
        <h2 id="safety-title">Eyes forward. The right message finds you.</h2>
        <p>
          Short voice alerts give each part of the group one calm next action, with
          less screen time while moving.
        </p>
      </Reveal>
      <Reveal className="voice-alert">
        <div className="voice-alert__topline">
          <span className="voice-alert__speaker" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Loopin voice · now</span>
        </div>
        <blockquote>
          “Cars 4 and 5 are behind. Maintain a safe pace while the leader
          coordinates.”
        </blockquote>
        <div className="voice-alert__meta">
          <span>Front group</span>
          <span>Low-distraction alert</span>
        </div>
      </Reveal>
    </section>
  );
}

const privacyPrinciples = [
  ['Trip-scoped', 'Location sharing begins with the drive and expires with it.'],
  ['Consent-led', 'Each person chooses when they join and when they stop sharing.'],
  ['Honestly live', 'Stale, inaccurate, or offline positions are labeled—not hidden.'],
] as const;

function PrivacyStatement() {
  return (
    <section aria-labelledby="privacy-title" className="privacy" id="privacy">
      <Reveal className="privacy__headline">
        <p className="section-kicker">Private by default</p>
        <h2 id="privacy-title">Your trip stays with your group.</h2>
      </Reveal>
      <div className="privacy__principles">
        {privacyPrinciples.map(([title, description], index) => (
          <Reveal className="privacy-principle" key={title}>
            <span>0{index + 1}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function OrganizationPath() {
  return (
    <section
      aria-labelledby="organizations-title"
      className="organizations"
      id="organizations"
    >
      <div className="organizations__intro">
        <p className="section-kicker">One coordination layer, many journeys</p>
        <h2 id="organizations-title">Built for your people. Ready for your operation.</h2>
        <p>
          Start with a simple group drive. Add managed groups, policy profiles,
          operator views, analytics, and integrations when the journey grows.
        </p>
        <a
          className="text-link"
          data-analytics="organization_cta_clicked"
          href="#start"
        >
          Bring Loopin to your organization <span aria-hidden="true">→</span>
        </a>
      </div>
      <ul className="organizations__audiences">
        {organizationAudiences.map((audience, index) => (
          <li key={audience}>
            <span>0{index + 1}</span>
            <strong>{audience}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FinalCta() {
  return (
    <section aria-labelledby="start-title" className="final-cta" id="start">
      <div aria-hidden="true" className="final-cta__route">
        <svg viewBox="0 0 1200 420">
          <path d="M-20 345C179 262 237 398 427 277C616 156 677 288 823 160C930 65 1048 73 1221 2" />
          {[164, 368, 598, 836, 1072].map((cx, index) => (
            <circle cx={cx} cy={[303, 302, 218, 149, 48][index]} key={cx} r="8" />
          ))}
        </svg>
      </div>
      <Reveal className="final-cta__inner">
        <p>Next trip</p>
        <h2 id="start-title">Keep the journey together.</h2>
        <p>Start your first group drive with the people already going your way.</p>
        <a
          className="button button--light route-link"
          data-analytics="primary_cta_clicked"
          href="#top"
        >
          Start a group drive <span aria-hidden="true">→</span>
        </a>
      </Reveal>
    </section>
  );
}

export function EditorialSections() {
  return (
    <>
      <BenefitSequence />
      <SocialJourney />
      <VoiceSafety />
      <PrivacyStatement />
      <OrganizationPath />
      <FinalCta />
    </>
  );
}
