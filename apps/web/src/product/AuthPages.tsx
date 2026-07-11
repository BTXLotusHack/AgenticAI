import { useState } from 'react';
import { ArrowRight, Check, MapPin, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppShell } from '../app/shell/AppShell';
import { ProductBrand } from '../shared/ProductBrand';
import { PageHeader } from '../shared/product/PageHeader';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const authContent: Record<AuthMode, { button: string; body: string; showPassword: boolean; title: string }> = {
  login: { button: 'Continue', body: 'Use the local fixture boundary to explore the complete Loopin trip experience.', showPassword: true, title: 'Log in to Loopin' },
  signup: { button: 'Create account', body: 'Start with only the details needed to plan and coordinate a shared journey.', showPassword: true, title: 'Create your Loopin account' },
  forgot: { button: 'Send recovery link', body: 'Recovery remains local until the identity adapter is connected.', showPassword: false, title: 'Recover your account' },
  reset: { button: 'Update password', body: 'Choose a new password for this local validation boundary.', showPassword: true, title: 'Set a new password' },
};

export function AuthPage({ mode }: { readonly mode: AuthMode }) {
  const [submitted, setSubmitted] = useState(false);
  const content = authContent[mode];

  return (
    <main className="auth-page auth-page--redesigned">
      <section aria-label="Loopin road journey" className="auth-visual">
        <div className="auth-visual__brand"><ProductBrand /></div>
        <div className="auth-visual__copy">
          <p className="product-kicker">Travel together</p>
          <h2>Plan the road.<br />Keep the group.</h2>
          <p><MapPin aria-hidden="true" /> Hà Nội → Hạ Long</p>
        </div>
        <div className="auth-visual__status"><ShieldCheck aria-hidden="true" /><span>Location stays trip-scoped by default.</span></div>
      </section>

      <section aria-labelledby="auth-title" className="auth-panel auth-panel--redesigned">
        <div className="auth-panel__mobile-brand"><ProductBrand /></div>
        <p className="product-kicker">Fixture auth boundary</p>
        <h1 id="auth-title">{content.title}</h1>
        <p>{content.body}</p>
        <form noValidate onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
          <label>Email<input autoComplete="email" name="email" placeholder="you@example.com" type="email" /></label>
          {content.showPassword ? <label>Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} name="password" placeholder="••••••••" type="password" /></label> : null}
          {submitted ? <div aria-live="polite" className="auth-errors"><p>Email is required.</p>{content.showPassword ? <p>Password is required.</p> : null}</div> : null}
          <button className="button button--primary auth-panel__submit" type="submit">{content.button}<ArrowRight aria-hidden="true" /></button>
        </form>
        <nav aria-label="Other auth options" className="auth-links">
          {mode === 'login' ? <><Link className="text-link auth-links__action" to="/forgot-password">Forgot password?</Link><p>New to Loopin? <Link to="/signup">Create an account</Link></p></> : null}
          {mode === 'signup' ? <p>Already have an account? <Link to="/login">Log in</Link></p> : null}
          {mode === 'forgot' || mode === 'reset' ? <Link className="text-link auth-links__action" to="/login">Back to log in</Link> : null}
        </nav>
        <Link className="auth-fixture-link" to="/onboarding">Continue in fixture mode <ArrowRight aria-hidden="true" /></Link>
      </section>
    </main>
  );
}

const stages = [
  { label: 'Travel style', options: ['Family convoy', 'Quiet routes', 'Motorcycle group'] },
  { label: 'Interests', options: ['Food stops', 'Sea views', 'Hidden gems'] },
  { label: 'Budget', options: ['Value', 'Balanced', 'Comfort'] },
  { label: 'Group', options: ['Couple', 'Family', 'Friends'] },
  { label: 'Dietary needs', options: ['No preference', 'Vegetarian friendly', 'Halal friendly'] },
  { label: 'Privacy', options: ['Leader only', 'Trip group', 'Pause sharing'] },
] as const;

export function OnboardingPage() {
  const [activeStage, setActiveStage] = useState(0);
  const stage = stages[activeStage]!;

  return (
    <AppShell context="Profile setup" status={`Step ${activeStage + 1} of ${stages.length}`}>
      <PageHeader eyebrow="Onboarding" title="Shape your travel profile." description="A few preferences help Loopin suggest better routes, stops and group settings." />
      <div className="onboarding-layout">
        <nav aria-label="Preference stages" className="onboarding-stages">
          <p>Step {activeStage + 1} of {stages.length}</p>
          {stages.map((item, index) => (
            <button aria-current={index === activeStage ? 'step' : undefined} aria-label={item.label} key={item.label} onClick={() => setActiveStage(index)} type="button">
              <span>{index < activeStage ? <Check aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span>{item.label}
            </button>
          ))}
        </nav>
        <section className="onboarding-stage" aria-labelledby="onboarding-stage-title">
          <p className="product-kicker">Personalize recommendations</p>
          <h2 id="onboarding-stage-title">{stage.label}</h2>
          <p>Choose the option that best fits this profile. You can change it later.</p>
          <div className="onboarding-options">
            {stage.options.map((option, index) => <label key={option}><input defaultChecked={index === 1} name={stage.label} type="radio" /> <span>{option}</span></label>)}
          </div>
          <div className="onboarding-actions">
            <button className="button onboarding-back" disabled={activeStage === 0} onClick={() => setActiveStage((value) => Math.max(0, value - 1))} type="button">Back</button>
            {activeStage < stages.length - 1 ? <button className="button button--primary" onClick={() => setActiveStage((value) => Math.min(stages.length - 1, value + 1))} type="button">Continue <ArrowRight aria-hidden="true" /></button> : <Link className="button button--primary" to="/app">Save profile and continue <ArrowRight aria-hidden="true" /></Link>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
