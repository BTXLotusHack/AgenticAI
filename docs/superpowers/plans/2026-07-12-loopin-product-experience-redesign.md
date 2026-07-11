# Loopin Product Experience Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign every non-landing Loopin web route into one responsive travel-planning and live-convoy product while preserving deep links, truthful Tasco/community boundaries and landing typography.

**Architecture:** Add a route-aware application shell and small shared product primitives, then migrate route families from the monolithic product and community files into focused modules. Preserve typed fixture hooks and demo-session behavior; scope new styling to product routes so the landing composition remains unchanged.

**Tech Stack:** React 19, React Router 7, TypeScript 5.9, Vite 8, TanStack Query, Motion 12, Lucide React, Vitest, Testing Library and Playwright.

## Global Constraints

- Do not redesign the public landing page.
- Correct landing typography only where loading or inheritance has regressed.
- Use Bricolage Grotesque for expressive titles and Figtree for product UI.
- Keep Tasco facts separate from Loopin community reviews.
- Label missing, stale and low-confidence data truthfully.
- Preserve existing dynamic and demo routes.
- Do not deploy AWS, merge to `main` or use a worktree.
- Work on `codex/product-experience-redesign`.
- Integrate the existing uncommitted auth-route link changes intentionally.
- Follow TDD for behavior changes and commit each verified unit.

## File structure

```text
apps/web/src/
├── app/shell/AppShell.tsx
├── product/
│   ├── AuthPages.tsx
│   ├── DiscoveryPages.tsx
│   ├── ProductPages.tsx
│   ├── TripLibraryPages.tsx
│   └── TripPages.tsx
├── shared/product/
│   ├── PageHeader.tsx
│   ├── PlacePreview.tsx
│   ├── RouteTimeline.tsx
│   ├── StatusNotice.tsx
│   └── TripPreview.tsx
└── styles/
    ├── product-pages.css
    ├── product-shell.css
    └── product-tokens.css
```

`ProductPages.tsx` remains the compatibility export surface used by `App.tsx`. New route modules consume typed hooks directly; the shell never owns route data.

---

### Task 1: Lock route and shell behavior

**Files:**
- Modify: `apps/web/src/app/product-routes.test.tsx`
- Create: `apps/web/src/app/shell/AppShell.test.tsx`
- Commit existing: `apps/web/src/components/LandingNav.tsx`, `apps/web/src/product/ProductPages.tsx`, `apps/web/src/product.css`

**Interfaces:**
- Consumes: `App`, `MemoryRouter` and existing route assertions.
- Produces: navigation and accessibility contract for `AppShell`.

- [ ] Add failing assertions for a `Primary` navigation, active `aria-current="page"`, `Open Mai's profile` link and `<main id="product-content">`.
- [ ] Run `npm.cmd test --workspace @loopin/web -- --run src/app/product-routes.test.tsx`; expect failure on the new shell semantics.
- [ ] Preserve route matrix, fixture validation, stale state, unknown-trip behavior and source-separation assertions.
- [ ] Commit the pre-existing auth-link unit with `git commit -m "fix(web): wire authentication route links"`.

---

### Task 2: Build responsive shell, primitives and tokens

**Files:**
- Create: `apps/web/src/app/shell/AppShell.tsx`
- Create: `apps/web/src/app/shell/AppShell.test.tsx`
- Create: `apps/web/src/shared/product/PageHeader.tsx`
- Create: `apps/web/src/shared/product/StatusNotice.tsx`
- Create: `apps/web/src/styles/product-tokens.css`
- Create: `apps/web/src/styles/product-shell.css`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/product/ProductPages.tsx`
- Modify: `apps/web/src/community/CommunityPlatformPage.tsx`

**Interfaces:**
- Produces: `AppShell({ children, context?, status?, actions? })`, `PageHeader({ eyebrow, title, description?, actions? })` and `StatusNotice({ tone, title, children })`.

- [ ] Create a failing `AppShell` test at `/app/trips` asserting desktop/mobile navigation, active state, profile link and product-content landmark.
- [ ] Run `npm.cmd test --workspace @loopin/web -- --run src/app/shell/AppShell.test.tsx`; expect module-not-found failure.
- [ ] Implement a desktop rail with Home, Trips, Explore, Now, Community, Settings and Partners; implement mobile Home, Trips, Explore, Now and Profile navigation.
- [ ] Add a skip link, contextual top bar and stable workspace landmark.
- [ ] Define product-scoped bone, paper, ink, green, forest, amber, red, muted, divider and layout tokens.
- [ ] Collapse the rail below 980px and show fixed mobile navigation below 720px.
- [ ] Verify font imports precede CSS, root UI remains Figtree and landing display selectors remain Bricolage.
- [ ] Run the shell test, `src/app/App.test.tsx`, and the web build; expect all to pass.
- [ ] Commit with `git commit -m "feat(web): add responsive Loopin product shell"`.

---

### Task 3: Redesign authentication and onboarding

**Files:**
- Create: `apps/web/src/product/AuthPages.tsx`
- Create: `apps/web/src/product/AuthPages.test.tsx`
- Create: `apps/web/src/styles/product-pages.css`
- Modify: `apps/web/src/product/ProductPages.tsx`
- Modify: `apps/web/src/app/App.tsx`

**Interfaces:**
- Produces: `AuthPage({ mode })` and `OnboardingPage()`.

- [ ] Write tests for the road-journey visual region, local required validation, alternate auth links and six onboarding preference stages.
- [ ] Run the focused test; expect failure because the visual region and staged flow are absent.
- [ ] Implement a photographic split composition using existing optimized Loopin assets and a narrow accessible form.
- [ ] Implement local onboarding stages for travel style, interests, budget, group, dietary needs and privacy; final action links to `/app`.
- [ ] Preserve fixture wording and do not imply Cognito is active.
- [ ] Run auth and full product-route tests; expect pass.
- [ ] Commit with `git commit -m "feat(web): redesign authentication and onboarding"`.

---

### Task 4: Redesign dashboard and trip library

**Files:**
- Create: `apps/web/src/shared/product/TripPreview.tsx`
- Create: `apps/web/src/product/TripLibraryPages.tsx`
- Create: `apps/web/src/product/TripLibraryPages.test.tsx`
- Modify: `apps/web/src/product/ProductPages.tsx`
- Modify: `apps/web/src/styles/product-pages.css`

**Interfaces:**
- Consumes: `useTrips`, `TripPlanSummary`, `AppShell`, `PageHeader`, `StatusNotice`.
- Produces: `DashboardPage`, `TripsPage`, `TripPreview({ trip, emphasis? })`.

- [ ] Write tests for `Next trip`, `Planning prompt`, `Places for this route`, direct continuation and lifecycle filters.
- [ ] Run the focused test; expect failure on the new named regions.
- [ ] Implement one dominant next-trip object with readiness, freshness, members and next action.
- [ ] Add compact prompt and place recommendations without a metric-card grid.
- [ ] Implement pressed-state lifecycle filtering and an actionable empty state.
- [ ] Run focused and route tests; expect pass.
- [ ] Commit with `git commit -m "feat(web): redesign home and trip library"`.

---

### Task 5: Redesign planning, overview, itinerary and sharing

**Files:**
- Create: `apps/web/src/product/TripPages.tsx`
- Create: `apps/web/src/product/TripPages.test.tsx`
- Create: `apps/web/src/shared/product/RouteTimeline.tsx`
- Modify: `apps/web/src/product/ProductPages.tsx`
- Modify: `apps/web/src/trip-setup/TripSetupPage.tsx`
- Modify: `apps/web/src/styles/product-pages.css`
- Modify: `apps/web/src/product.css`

**Interfaces:**
- Consumes: trip/live/place hooks, shared contracts and demo-session storage.
- Produces: planner, overview, itinerary and share page exports plus `RouteTimeline`.

- [ ] Write failing tests for planner stages, Tasco source labels, route legs, readiness/actions, permission explanation and QR text alternative.
- [ ] Run the focused test; expect failure on staged planning and timeline semantics.
- [ ] Implement six planning stages with Tasco results and a dark retained route preview when refresh fails.
- [ ] Implement overview as the trip hub with route, readiness, itinerary, sharing and live actions.
- [ ] Implement itinerary as semantic day/stops/legs lists and sharing with link, code, QR, visibility and invitee permissions.
- [ ] Align `/trip/new` visually without changing demo-session behavior.
- [ ] Run trip workflow, legacy setup and route tests; expect pass.
- [ ] Commit with `git commit -m "feat(web): redesign trip planning workflow"`.

---

### Task 6: Redesign discovery, place detail, Now and settings

**Files:**
- Create: `apps/web/src/shared/product/PlacePreview.tsx`
- Create: `apps/web/src/product/DiscoveryPages.tsx`
- Create: `apps/web/src/product/DiscoveryPages.test.tsx`
- Modify: `apps/web/src/product/ProductPages.tsx`
- Modify: `apps/web/src/styles/product-pages.css`

**Interfaces:**
- Consumes: place search/detail/community and visibility hooks.
- Produces: Explore, place detail, Now and Settings page exports.

- [ ] Write tests for an accessible map region, filter toolbar, provider labels, separate Tasco/community regions, live-trip action and settings links.
- [ ] Run the focused test; expect failure on new regions and links.
- [ ] Implement map-and-feed discovery with an explicit `Tasco map preview` fixture/fallback caption.
- [ ] Implement selectable place results and strict provider/community separation.
- [ ] Make Now lead with the current trip action; make Settings a divided route index retaining policy summaries.
- [ ] Run discovery and route tests; expect pass.
- [ ] Commit with `git commit -m "feat(web): redesign discovery and day-of-trip pages"`.

---

### Task 7: Redesign community, profile, privacy, moderation and partners

**Files:**
- Modify: `apps/web/src/community/CommunityPlatformPage.tsx`
- Modify: `apps/web/src/community/CommunityPlatformPage.test.tsx`
- Modify: `apps/web/src/styles/product-pages.css`

**Interfaces:**
- Consumes: shared shell/primitives and existing fixture data.
- Produces: unchanged named route exports with new composition.

- [ ] Expand tests for feed semantics, approximate presence, source separation, profile settings links, audience explanations, notification categories, moderation evidence/actions and truthful partner copy.
- [ ] Run community tests; expect failure on new semantics.
- [ ] Replace generic hero/panel repetition with utility headers, divided feeds, profile history and explicit privacy/notification groups.
- [ ] Use a dense moderation queue plus inspector and a claim-safe partner editorial layout.
- [ ] Run community and full route tests; expect pass.
- [ ] Commit with `git commit -m "feat(web): redesign community and platform settings"`.

---

### Task 8: Align live coordination and trip summary

**Files:**
- Modify: `apps/web/src/live-trip/LiveTripPage.tsx`
- Modify: `apps/web/src/live-trip/TripTopBar.tsx`
- Modify: `apps/web/src/live-trip/RouteWorkspace.tsx`
- Modify: `apps/web/src/live-trip/SituationInspector.tsx`
- Modify: `apps/web/src/trip-summary/TripSummaryPage.tsx`
- Modify: `apps/web/src/product.css`

**Interfaces:**
- Consumes: existing replay snapshot, graph evidence, demo session and regroup behavior.
- Produces: unchanged convoy logic with clearer hierarchy and responsive semantics.

- [ ] Add failing assertions for a named route/convoy region, current instruction, freshness/confidence status, named summary timeline and simulation disclosure.
- [ ] Run live and summary tests; expect failure on the new semantics.
- [ ] Keep the map dominant, surface the current instruction first on mobile and retain all graph evidence and regroup controls.
- [ ] Align summary typography and divided timeline while preserving session gating and measured values.
- [ ] Run live, inspector, summary and route tests; expect pass.
- [ ] Commit with `git commit -m "feat(web): refine live convoy workspace"`.

---

### Task 9: Full browser and project verification

**Files:**
- Modify: `apps/web/e2e/product-app.spec.ts`
- Modify: `apps/web/e2e/trip-journey.spec.ts`
- Modify: `apps/web/e2e/landing.spec.ts`

**Interfaces:**
- Consumes: all rendered routes.
- Produces: responsive, accessibility, typography and route-integrity evidence.

- [ ] Add computed-style checks for Figtree body/UI and Bricolage landing display headings.
- [ ] Cover desktop and mobile route navigation, visible focus, no horizontal overflow, no console errors and reduced-motion stability.
- [ ] Run `npm.cmd run test:e2e --workspace @loopin/web`; diagnose every failure systematically.
- [ ] Run `npm.cmd run contracts:check`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run typecheck --workspaces --if-present`.
- [ ] Run `npm.cmd test --workspaces --if-present -- --run`.
- [ ] Run `npm.cmd run build --workspace @loopin/web`.
- [ ] Run `npm.cmd run test:e2e --workspace @loopin/web` again.
- [ ] Run `git diff --check`; expect no output.
- [ ] Commit with `git commit -m "test(web): verify redesigned product experience"`.

## Completion review

- Every non-landing route uses the responsive system or aligned live/demo equivalent.
- Landing composition is unchanged and computed typography matches its intended fonts.
- Dynamic, stale, unknown, permission, loading, empty and error states remain truthful.
- Tasco facts and community reviews stay separate in code and rendered language.
- Desktop, mobile, keyboard and reduced-motion checks pass.
- No AWS deployment, `main` merge, worktree or unrelated file mutation occurs.
