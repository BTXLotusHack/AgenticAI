# Loopin Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the complete consumer-first Loopin landing page as the first runnable vertical slice of the repository.

**Architecture:** Add an npm-workspace React/Vite application at `apps/web` so later clients and packages can join the repository without restructuring the landing page. Static content and deterministic convoy scene data remain separate from React presentation; Motion provides progressive enhancement, while semantic HTML and CSS preserve the complete story when JavaScript animation or motion is unavailable.

**Tech Stack:** React 19.2, Vite 8, TypeScript 5.9 strict mode, React Router 7, Tailwind CSS 4, Motion 12, Vitest, Testing Library, Playwright, axe-core, ESLint 10, locally bundled Fontsource variable fonts.

## Global Constraints

- Work only on `codex/landing-page-design` in the existing isolated worktree.
- Use the approved visual thesis: “A warm editorial road-trip poster where one living green route thread keeps every person part of the journey.”
- Preserve the approved hero copy, primary CTA `Start a group drive`, secondary CTA `See how it works`, and partner CTA `Bring Loopin to your organization`.
- Use Loopin green `#18724B`, deep road ink `#13251C`, warm bone `#F4F1E8`, soft sage `#DCE8DE`, white, and safety amber only for semantic separation.
- Use no more than Bricolage Grotesque and Figtree, bundled locally through Fontsource.
- Use a full-bleed, image-led hero; do not add hero cards, statistic strips, logo clouds, fabricated proof, a generic feature-card grid, or premature pricing.
- Never tell a driver to speed, brake suddenly, or stop at an unverified place.
- Meet WCAG 2.2 AA behavior, logical headings, keyboard navigation, visible focus, useful alternative text, and 44px practical touch targets.
- Honor `prefers-reduced-motion` with the same connected, separated, and regrouped facts in readable static content.
- Validate 360, 390, 768, 1024, 1280, and 1440 CSS-pixel widths with no horizontal overflow.
- Keep the page S3/CloudFront compatible and independent of a runtime backend.
- Record every image source, author, page URL, and license URL in `apps/web/public/assets/ATTRIBUTION.md`.
- Use test-first red-green cycles for behavior and commit every independently verifiable task.

---

## File Structure

```text
package.json                                  # workspace commands and Node version floor
package-lock.json                             # reproducible dependency graph
apps/web/package.json                         # web dependencies and scripts
apps/web/index.html                           # metadata and React mount point
apps/web/tsconfig.json                        # strict browser TypeScript
apps/web/vite.config.ts                       # React, Tailwind, Vitest configuration
apps/web/eslint.config.js                     # React/TypeScript lint rules
apps/web/playwright.config.ts                 # desktop/mobile/reduced-motion browser projects
apps/web/e2e/landing.spec.ts                  # navigation, accessibility, overflow, CTA tests
apps/web/public/assets/ATTRIBUTION.md          # external asset provenance
apps/web/public/images/loopin-hero.jpg         # licensed hero road image
apps/web/public/images/loopin-convoy.jpg       # licensed convoy image
apps/web/src/main.tsx                          # app bootstrap and router
apps/web/src/styles.css                        # Tailwind import, tokens, layout, responsive states
apps/web/src/test/setup.ts                     # jest-dom setup
apps/web/src/app/App.tsx                       # route and page composition
apps/web/src/app/App.test.tsx                  # public content and CTA contract
apps/web/src/app/content.ts                    # immutable navigation and section content
apps/web/src/app/story.ts                      # deterministic convoy phase model
apps/web/src/app/story.test.ts                 # scene transition contract
apps/web/src/components/BrandMark.tsx          # accessible Loopin route-loop mark
apps/web/src/components/LandingNav.tsx         # desktop/mobile navigation
apps/web/src/components/HeroRoute.tsx          # full-bleed hero and route entrance
apps/web/src/components/ConvoyStory.tsx        # sticky separation narrative
apps/web/src/components/EditorialSections.tsx  # benefits through organization path
apps/web/src/components/LandingFooter.tsx      # final navigation and attribution link
```

## Task 1: Runnable Web Workspace and Test Harness

**Files:**

- Create all root and `apps/web` configuration files listed above.
- Create `apps/web/src/test/setup.ts`.
- Test: `apps/web/src/app/App.test.tsx`.

**Interfaces:**

- Produces root commands `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
- Produces alias-free ES module imports so Vite, Vitest, and Playwright resolve the same files.

- [ ] **Step 1: Add the failing application smoke test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('Loopin landing page', () => {
  it('gives visitors one dominant way to start a group drive', () => {
    render(<App />, { wrapper: MemoryRouter });
    expect(screen.getByRole('heading', { name: /every car\. one journey\./i })).toBeVisible();
    expect(screen.getAllByRole('link', { name: /start a group drive/i }).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing application failure**

Run: `npm.cmd test -- --run src/app/App.test.tsx`

Expected: FAIL because the workspace or `App` module does not exist.

- [ ] **Step 3: Add the npm workspace and strict toolchain**

Root `package.json` exposes each command through `@loopin/web`:

```json
{
  "name": "loopin",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*", "services/*", "infrastructure/*"],
  "engines": { "node": ">=20.19.0" },
  "scripts": {
    "dev": "npm run dev --workspace @loopin/web",
    "build": "npm run build --workspace @loopin/web",
    "preview": "npm run preview --workspace @loopin/web",
    "lint": "npm run lint --workspace @loopin/web",
    "typecheck": "npm run typecheck --workspace @loopin/web",
    "test": "npm run test --workspace @loopin/web --",
    "test:e2e": "npm run test:e2e --workspace @loopin/web"
  }
}
```

`apps/web/package.json` pins React, Vite, TypeScript, Router, Tailwind, Motion, Fontsource, Vitest, Testing Library, Playwright, axe-core, and ESLint dependencies and exposes `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, and `test:e2e`. `vite.config.ts` registers `react()` and `tailwindcss()` and sets `test.environment` to `jsdom` with `src/test/setup.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

`main.tsx` imports the two Fontsource variable families, global styles, and mounts `App` inside `BrowserRouter`. `tsconfig.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules`, and bundler module resolution. `eslint.config.js` composes `@eslint/js`, `typescript-eslint`, React Hooks, and React Refresh recommended browser rules.

The initial `App.tsx` must contain only the semantic landing shell required by the smoke test:

```tsx
export function App() {
  return (
    <main>
      <h1>Every car. One journey.</h1>
      <a href="#start">Start a group drive</a>
    </main>
  );
}
```

- [ ] **Step 4: Install and verify the foundation**

Run:

```powershell
npm.cmd install
npm.cmd test -- --run src/app/App.test.tsx
npm.cmd run typecheck
npm.cmd run lint
```

Expected: one passing smoke test, TypeScript exit 0, ESLint exit 0.

- [ ] **Step 5: Commit the foundation**

```powershell
git add package.json package-lock.json apps/web
git commit -m "build: scaffold Loopin web app"
```

## Task 2: Full-Bleed Hero and Responsive Navigation

**Files:**

- Create: `apps/web/src/app/content.ts`.
- Create: `apps/web/src/components/BrandMark.tsx`.
- Create: `apps/web/src/components/LandingNav.tsx`.
- Create: `apps/web/src/components/HeroRoute.tsx`.
- Modify: `apps/web/src/app/App.tsx`.
- Modify: `apps/web/src/app/App.test.tsx`.
- Modify: `apps/web/src/styles.css`.
- Add: `apps/web/public/images/loopin-hero.jpg`.
- Add: `apps/web/public/assets/ATTRIBUTION.md`.

**Interfaces:**

- `navigationItems: readonly { label: string; href: string }[]` from `content.ts`.
- `LandingNav` renders one landmark label, keyboard-operable mobile disclosure, and the primary CTA.
- `HeroRoute` renders `#top`, links the secondary CTA to `#how-it-works`, and never depends on animation for content visibility.

- [ ] **Step 1: Extend the component contract test**

Add assertions for the `Loopin` brand, primary heading, hero description, `How it works`, `Safety`, `For organizations`, `Log in`, primary CTA, and `See how it works`. Add a user-event test that opens the mobile menu button and exposes its links.

- [ ] **Step 2: Run the test and verify the missing navigation and copy failures**

Run: `npm.cmd test -- --run src/app/App.test.tsx`

Expected: FAIL because the complete hero and navigation are not rendered.

- [ ] **Step 3: Implement the hero composition**

Use `LandingNav`, `BrandMark`, and `HeroRoute` from `App`. The hero markup must keep this order:

```tsx
<p className="hero__eyebrow">Loopin group drives</p>
<h1>Every car.<br />One journey.</h1>
<p>Plan together, stay connected, and regroup safely—without turning the drive into a group chat.</p>
<div className="hero__actions">
  <a className="button button--primary" href="#start">Start a group drive</a>
  <a className="button button--quiet" href="#how-it-works">See how it works</a>
</div>
```

The route visual is an `aria-hidden` SVG with one path and five circles; Motion draws the path and introduces nodes only when motion is allowed. The image receives a dark left-side overlay in CSS so contrast is independent of the crop.

- [ ] **Step 4: Add the licensed hero image and provenance**

Download Unsplash image `UB9qLuoWwTs` at a maximum 2400px width to `loopin-hero.jpg`. Record photographer Danish Prakash, the photo page, the local filename, and <https://unsplash.com/license>.

```powershell
curl.exe -L "https://unsplash.com/photos/UB9qLuoWwTs/download?force=true&w=2400" -o apps/web/public/images/loopin-hero.jpg
```

- [ ] **Step 5: Verify the hero**

Run:

```powershell
npm.cmd test -- --run src/app/App.test.tsx
npm.cmd run typecheck
npm.cmd run lint
```

Expected: component tests pass; TypeScript and ESLint exit 0.

- [ ] **Step 6: Commit the hero**

```powershell
git add apps/web
git commit -m "feat: build Loopin landing hero"
```

## Task 3: Deterministic Convoy Separation Story

**Files:**

- Create: `apps/web/src/app/story.ts`.
- Create: `apps/web/src/app/story.test.ts`.
- Create: `apps/web/src/components/ConvoyStory.tsx`.
- Modify: `apps/web/src/app/App.tsx`.
- Modify: `apps/web/src/styles.css`.

**Interfaces:**

```ts
export type ConvoyPhase = 'together' | 'separated' | 'regrouped';

export interface VehicleScene {
  readonly id: string;
  readonly label: string;
  readonly progress: number;
  readonly component: 'front' | 'rear' | 'together';
}

export interface ConvoyScene {
  readonly phase: ConvoyPhase;
  readonly boundaryState: 'connected' | 'stretched' | 'reconnected';
  readonly vehicles: readonly VehicleScene[];
  readonly frontMessage: string;
  readonly rearMessage: string;
}

export function getConvoyScene(phase: ConvoyPhase): ConvoyScene;
```

- [ ] **Step 1: Write the failing story model tests**

```ts
import { describe, expect, it } from 'vitest';
import { getConvoyScene } from './story';

describe('convoy story', () => {
  it('keeps all five vehicles in one component while together', () => {
    const scene = getConvoyScene('together');
    expect(new Set(scene.vehicles.map((vehicle) => vehicle.component))).toEqual(new Set(['together']));
    expect(scene.boundaryState).toBe('connected');
  });

  it('splits at the Car 3 and Car 4 boundary without instructing speeding', () => {
    const scene = getConvoyScene('separated');
    expect(scene.vehicles.slice(0, 3).every((vehicle) => vehicle.component === 'front')).toBe(true);
    expect(scene.vehicles.slice(3).every((vehicle) => vehicle.component === 'rear')).toBe(true);
    expect(`${scene.frontMessage} ${scene.rearMessage}`).not.toMatch(/speed up|hurry|brake/i);
  });

  it('reconnects every vehicle after the safe regroup scene', () => {
    const scene = getConvoyScene('regrouped');
    expect(scene.boundaryState).toBe('reconnected');
    expect(scene.vehicles.every((vehicle) => vehicle.component === 'together')).toBe(true);
  });
});
```

- [ ] **Step 2: Run and verify the missing model failure**

Run: `npm.cmd test -- --run src/app/story.test.ts`

Expected: FAIL because `story.ts` does not exist.

- [ ] **Step 3: Implement the immutable scene model**

Define explicit vehicle positions for the three phases. In the separated phase, Cars 1–3 are `front`, Cars 4–5 are `rear`, the boundary is `stretched`, the front message is `Cars 4 and 5 are behind. Maintain a safe pace while the leader coordinates.`, and the rear message is `Your group is ahead. Continue safely to the shared regroup point.` Return copied scene objects so consumers cannot mutate shared constants.

- [ ] **Step 4: Verify the model and commit it**

Run: `npm.cmd test -- --run src/app/story.test.ts`

Expected: three passing tests.

```powershell
git add apps/web/src/app/story.ts apps/web/src/app/story.test.ts
git commit -m "feat: model convoy landing story"
```

- [ ] **Step 5: Add the failing story presentation assertions**

Extend `App.test.tsx` to assert the heading `Loopin understands the whole group—not just your dot on a map.`, the three phase controls, boundary text, both role messages, and accessible vehicle labels.

- [ ] **Step 6: Run and verify the missing story UI failure**

Run: `npm.cmd test -- --run src/app/App.test.tsx`

Expected: FAIL because `ConvoyStory` is not mounted.

- [ ] **Step 7: Implement the sticky story**

`ConvoyStory` uses the deterministic model, an explicit three-button phase controller, and `useScroll`/`useTransform` progressive enhancement. The visual contains one route track, five labeled vehicle nodes, a boundary label, and two role-specific alerts. The textual phase summary remains visible in reduced-motion mode. Scroll progress may update the selected phase, but manual controls remain keyboard operable.

- [ ] **Step 8: Verify and commit the story UI**

Run:

```powershell
npm.cmd test -- --run src/app/App.test.tsx src/app/story.test.ts
npm.cmd run typecheck
npm.cmd run lint
```

Expected: all focused tests pass; TypeScript and ESLint exit 0.

```powershell
git add apps/web/src
git commit -m "feat: animate convoy separation story"
```

## Task 4: Complete Editorial Landing Journey

**Files:**

- Create: `apps/web/src/components/EditorialSections.tsx`.
- Create: `apps/web/src/components/LandingFooter.tsx`.
- Modify: `apps/web/src/app/content.ts`.
- Modify: `apps/web/src/app/App.tsx`.
- Modify: `apps/web/src/app/App.test.tsx`.
- Modify: `apps/web/src/styles.css`.
- Add: `apps/web/public/images/loopin-convoy.jpg`.
- Modify: `apps/web/public/assets/ATTRIBUTION.md`.

**Interfaces:**

- `EditorialSections` owns `#safety`, `#privacy`, `#organizations`, and `#start` landmarks.
- Content remains exported from `content.ts` as readonly arrays for benefits and audiences.
- `LandingFooter` links back to page landmarks and the attribution record.

- [ ] **Step 1: Add the failing complete-page content assertions**

Assert the three numbered benefits, social headline, safe voice alert, privacy heading, five audience labels, partner CTA, and final `Keep the journey together.` heading. Assert there are no `speed up`, fabricated percentage statistics, testimonial blockquotes, or pricing labels.

- [ ] **Step 2: Run and verify the missing sections failure**

Run: `npm.cmd test -- --run src/app/App.test.tsx`

Expected: FAIL because the editorial sections are absent.

- [ ] **Step 3: Implement the editorial sequence**

Create semantic sections in this order:

1. `BenefitSequence`: 01 Know the group, 02 Catch the gap, 03 Regroup safely.
2. `SocialJourney`: full-width licensed convoy image and `Less “Where are you?” More “We’ve got you.”`.
3. `VoiceSafety`: the approved role alert and low-distraction supporting copy.
4. `PrivacyStatement`: trip-scoped visibility, consent, expiry, stale/offline honesty.
5. `OrganizationPath`: Families, Clubs, Tours, Events, Fleets and the partner CTA.
6. `FinalCta`: full green field with `Keep the journey together.` and the primary CTA.
7. `LandingFooter`.

Use one scroll reveal for editorial headings and one route-arrow hover transition. Below-the-fold media uses `loading="lazy"`, explicit width and height, and meaningful alternative text.

- [ ] **Step 4: Add the licensed convoy image and provenance**

Download Unsplash image `UtynyKviqZM` at a maximum 1800px width to `loopin-convoy.jpg`. Record photographer Khai Hoan Chu, the photo page, the local filename, and the Unsplash license.

```powershell
curl.exe -L "https://unsplash.com/photos/UtynyKviqZM/download?force=true&w=1800" -o apps/web/public/images/loopin-convoy.jpg
```

- [ ] **Step 5: Verify the complete page**

Run:

```powershell
npm.cmd test -- --run
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Expected: all unit/component tests pass and the production build exits 0.

- [ ] **Step 6: Commit the complete content journey**

```powershell
git add apps/web
git commit -m "feat: complete Loopin landing journey"
```

## Task 5: Browser, Accessibility, Responsive, and Production Verification

**Files:**

- Create: `apps/web/playwright.config.ts`.
- Create: `apps/web/e2e/landing.spec.ts`.
- Modify: `apps/web/package.json` if a verification script is needed.
- Modify implementation files only when a failing browser test exposes a defect.

**Interfaces:**

- Playwright runs against `npm.cmd run dev -- --host 127.0.0.1` with desktop Chromium, 390px mobile Chromium, and reduced-motion Chromium projects.
- axe-core scans the rendered landing page with WCAG A/AA tags.

- [ ] **Step 1: Write the failing end-to-end suite**

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('landing journey is navigable and has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /every car\. one journey\./i })).toBeVisible();
  await page.getByRole('link', { name: /see how it works/i }).click();
  await expect(page.locator('#how-it-works')).toBeInViewport();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});

test('page has no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
});

test('convoy controls expose the separated state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /gap detected/i }).click();
  await expect(page.getByText(/cars 4 and 5 are behind/i)).toBeVisible();
  await expect(page.getByText(/continue safely to the shared regroup point/i)).toBeVisible();
});
```

- [ ] **Step 2: Run and verify browser tests expose any missing behavior**

Run:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Expected on the first run: tests fail if configuration, landmark scrolling, accessibility, overflow, or story controls are incomplete. Record the actual failure before fixing it.

- [ ] **Step 3: Fix only demonstrated browser defects and rerun**

For each defect, first preserve the failing assertion, then make the smallest semantic/CSS/interaction change that passes it. Rerun `npm.cmd run test:e2e` after each fix.

- [ ] **Step 4: Run the full verification pipeline**

Run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd run test:e2e
git diff --check
```

Expected: all commands exit 0 with zero test failures, zero serious/critical axe violations, and no patch whitespace errors.

- [ ] **Step 5: Launch and inspect the project in a real browser**

Start `npm.cmd run dev -- --host 127.0.0.1`, inspect desktop and mobile screenshots, exercise menu/CTA/story controls, verify reduced motion, and inspect the browser console. Correct any observed issue through a failing automated test where behavior is testable.

- [ ] **Step 6: Update repository run documentation**

Replace the README statement that the repository is specification-only with exact install, development, test, build, and preview commands. State precisely that the landing page is implemented while mobile, backend, simulator, and infrastructure remain designed but not yet runnable.

- [ ] **Step 7: Commit and push the verified landing page**

```powershell
git add README.md apps/web package.json package-lock.json docs/superpowers/plans/2026-07-11-loopin-landing-page.md
git commit -m "test: verify Loopin landing experience"
git push -u origin codex/landing-page-design
```

## Completion Evidence

- The branch contains the focused commits described above.
- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test -- --run`, `npm.cmd run build`, and `npm.cmd run test:e2e` all exit 0 in a fresh verification pass.
- Browser screenshots prove the hero, sticky story, and final CTA at desktop and mobile sizes.
- Reduced-motion browser verification presents the full route story without scroll-dependent meaning.
- The browser console contains no application errors.
- `apps/web/public/assets/ATTRIBUTION.md` accounts for every non-code external asset.
- README commands reproduce the runnable landing page from the repository root.
