# Loopin Web Trip Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the landing CTA into a complete React journey that sets up TRIP001, renders the tested golden convoy replay, approves a verified regroup point, reconnects, and displays a measured summary.

**Architecture:** Extract the golden fixture and frame generation from the simulator app into a pure `@loopin/demo-scenarios` package consumed by both CLI and web. React Router owns landing/setup/live/summary routes; a validated session-storage adapter and replay hook own local demo state, while all graph, incident, notification, and regroup authority remains in `@loopin/convoy-core`.

**Tech Stack:** React 19, React Router 7, Vite 8, TypeScript 5.9 strict mode, Zod 4, Motion 12, Vitest 4, Testing Library, Playwright 1.61, axe-core, npm workspaces.

## Global Constraints

- Work remains on `codex/web-trip-demo`; every independently verifiable task ends in a focused commit; any pull request targets `dev`.
- Preserve the existing landing art direction, imagery, analytics, accessibility, responsive behavior, and production budgets.
- Product routes use Bricolage Grotesque and Figtree only, Loopin green as the normal accent, and amber only for uncertainty, separation, or review.
- Product UI begins with the working surface and utility copy; no marketing hero, dashboard-card mosaic, fabricated proof, fake map precision, or nonfunctional production controls.
- React never calculates route order, edge state, component membership, incidents, notification policy, or candidate scores.
- Web and CLI consume identical immutable `schemaVersion: 1` golden frames from `@loopin/demo-scenarios`.
- An unverified or excluded POI can never render an approval control.
- No message instructs speeding, rushing, sudden braking, or stopping at an unverified place.
- Low-confidence GPS displays degraded state but cannot open the confirmed-split inspector.
- Route rendering is provider-neutral and labeled `Simulated route projection`; Tasco/MapLibre remains a later adapter.
- Session restore validates `demo-session-v1`; invalid or incompatible data is removed and returns to setup.
- Motion uses transforms and opacity, respects `prefers-reduced-motion`, and never gates content or controls.
- All controls are keyboard accessible, use visible focus, and are at least 44 CSS pixels where practical.
- Validate widths 360, 390, 768, 1024, 1280, and 1440 with zero horizontal overflow.

## File Structure

```text
packages/demo-scenarios/
├── package.json
├── tsconfig.json
├── src/golden-r001.fixture.ts
├── src/golden-r001-replay.ts
├── src/replay-controller.ts
├── src/index.ts
└── test/
    ├── golden-r001-replay.test.ts
    └── replay-controller.test.ts
apps/simulator/src/
├── run-golden-scenario.ts        # compatibility wrapper over shared frames
└── cli.ts                        # console adapter
apps/web/src/
├── app/App.tsx                   # route tree
├── demo-session/{schema,storage,audit}.ts
├── trip-setup/{TripSetupPage,RouteSummary,ReadinessList}.tsx
├── live-trip/{LiveTripPage,useReplayController,TripTopBar,ConvoyRail,RouteWorkspace,SchematicRouteRenderer,SituationInspector,RegroupReview}.tsx
├── trip-summary/{TripSummaryPage,TripTimeline}.tsx
├── shared/{ProductBrand,StatusLabel,NotFoundPage}.tsx
└── product.css
apps/web/e2e/trip-demo.spec.ts
```

---

### Task 1: Shared Golden Replay Frames

**Files:**
- Create: `packages/demo-scenarios/package.json`
- Create: `packages/demo-scenarios/tsconfig.json`
- Create: `packages/demo-scenarios/src/golden-r001.fixture.ts`
- Create: `packages/demo-scenarios/src/golden-r001-replay.ts`
- Create: `packages/demo-scenarios/src/index.ts`
- Create: `packages/demo-scenarios/test/golden-r001-replay.test.ts`
- Modify: `apps/simulator/package.json`
- Modify: `apps/simulator/src/run-golden-scenario.ts`
- Delete: `apps/simulator/src/golden-r001.fixture.ts`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: public exports from `@loopin/convoy-core`.
- Produces: `GOLDEN_R001`, `GoldenReplayFrameV1`, `createGoldenR001Replay(): GoldenReplayFrameV1[]`, and the existing `runGoldenScenario()` compatibility result.

- [ ] **Step 1: Write the failing shared-frame test** asserting the frame phases contain `together`, `degraded`, `stretched`, `split`, `recovering`, and `completed`; the split frame has graph boundary M003–M004 and notifications; POI001 wins while POI002 is excluded; the final frame contains one resolved situation and a 900 m maximum gap.

```ts
const frames = createGoldenR001Replay()
const split = frames.find((frame) => frame.phase === "split")!
expect(split.graph.components.map((component) => component.memberIds)).toEqual([
  ["M001", "M002", "M003"], ["M004"],
])
expect(split.situation?.situationId).toBe("split:TRIP001:M003:M004")
expect(split.regroupRanking?.selectedCandidate?.poiId).toBe("POI001")
expect(frames.at(-1)?.summary?.measuredFacts.maximumConfirmedRouteGapMeters).toBe(900)
```

- [ ] **Step 2: Run `npm.cmd test --workspace @loopin/demo-scenarios -- --run test/golden-r001-replay.test.ts`** and verify failure because the package/export does not exist.
- [ ] **Step 3: Add workspace configuration and move the fixture without changing workbook values.** Define `GoldenReplayFrameV1` exactly as the approved spec, including full `graph`, `nodes`, transition, notifications, optional ranking/approval, and optional summary.
- [ ] **Step 4: Refactor the current simulator reducer loop into `createGoldenR001Replay`** so each calculation appends an immutable frame; preserve duplicate, stale, history-only, and weak-GPS injections. Map recovering graph output to phase `recovering`; append a final `completed` frame containing the summary.
- [ ] **Step 5: Replace simulator orchestration with a compatibility reducer** that derives its existing result fields from shared frames; do not duplicate core calls.
- [ ] **Step 6: Run the shared test, existing simulator test, typechecks, and `npm.cmd run simulate`**; verify identical split, POI001, final together state, and summary.
- [ ] **Step 7: Commit** with `git commit -m "refactor(demo): share golden replay frames"`.

### Task 2: Deterministic Replay Controller

**Files:**
- Create: `packages/demo-scenarios/src/replay-controller.ts`
- Create: `packages/demo-scenarios/test/replay-controller.test.ts`
- Modify: `packages/demo-scenarios/src/index.ts`

**Interfaces:**
- Consumes: `readonly GoldenReplayFrameV1[]` and injected `ReplayScheduler`.
- Produces: `createReplayController(options): ReplayController` with `getSnapshot`, `subscribe`, `play`, `pause`, `stepForward`, `stepBackward`, `seek`, `setSpeed`, `restart`, `approveRegroup`, and `destroy`.

- [ ] **Step 1: Write failing controller tests** with a manual scheduler proving initial paused state, play advances frames, pause cancels scheduling, speeds are exactly `1 | 2 | 4`, bounds do not overflow, restart returns to zero, subscribers receive one notification per state change, and destroy cancels pending work.
- [ ] **Step 2: Add failing approval tests** proving approval throws `regroup-not-available` before a split, rejects POI002 and unknown IDs with `candidate-not-eligible`, accepts POI001 only at a confirmed split, records graph revision/policy/timestamp, and jumps only to the first recovery frame.

```ts
expect(() => controller.approveRegroup("POI002")).toThrow("candidate-not-eligible")
controller.approveRegroup("POI001")
expect(controller.getSnapshot()).toMatchObject({ approvedCandidateId: "POI001", phase: "recovering" })
```

- [ ] **Step 3: Run the focused test** and verify missing exports fail.
- [ ] **Step 4: Implement the controller as a closure over immutable frames** with no global timer; scheduler contract is `{ schedule(callback, delayMs): unknown; cancel(handle): void; now(): string }`. Default frame duration is 900 ms at `1×`, divided by speed.
- [ ] **Step 5: Run focused tests, shared-package typecheck, and simulator regression** and verify all pass.
- [ ] **Step 6: Commit** with `git commit -m "feat(demo): add deterministic replay controller"`.

### Task 3: Versioned Demo Session and Product Routes

**Files:**
- Create: `apps/web/src/demo-session/schema.ts`
- Create: `apps/web/src/demo-session/storage.ts`
- Create: `apps/web/src/demo-session/audit.ts`
- Create: `apps/web/src/demo-session/storage.test.ts`
- Create: `apps/web/src/shared/ProductBrand.tsx`
- Create: `apps/web/src/shared/NotFoundPage.tsx`
- Create: `apps/web/src/trip-setup/TripSetupPage.tsx`
- Create: `apps/web/src/trip-setup/RouteSummary.tsx`
- Create: `apps/web/src/trip-setup/ReadinessList.tsx`
- Create: `apps/web/src/trip-setup/TripSetupPage.test.tsx`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `DemoSessionV1Schema`, `readDemoSession(storage)`, `writeDemoSession(storage, session)`, `clearDemoSession(storage)`, and `appendAuditEntry`.
- Routes: `/`, `/trip/new`, `/trips/TRIP001/live`, `/trips/TRIP001/summary`, and `*`.

- [ ] **Step 1: Write failing storage tests** proving valid round-trip, malformed JSON removal, schema-version rejection, restore as paused, immutable audit append, and no precise coordinates in stored audit payloads.
- [ ] **Step 2: Run the storage test** and verify missing modules fail.
- [ ] **Step 3: Implement strict Zod session schemas** with `schemaVersion: 1`, setup completion, frame index, speed, approved candidate, and audit entries. Accept only known audit event types and ISO timestamps.
- [ ] **Step 4: Write failing setup component tests** proving workbook route/member data renders, required location consent defaults on for the fixture, disabling one required consent disables `Start trip`, voice-disabled M004 remains startable, launch writes `DemoTripStarted`, and navigation reaches the live route.
- [ ] **Step 5: Run the setup test** and verify the route/page does not exist.
- [ ] **Step 6: Implement the route tree and setup page** using a single main-column composition, semantic readiness table/list, simulation disclosure, and one dominant start action. Keep the existing `App` landing behavior at `/`.
- [ ] **Step 7: Run setup/storage tests, existing landing tests, lint, and web typecheck** and verify all pass.
- [ ] **Step 8: Commit** with `git commit -m "feat(web): add trip setup and demo session"`.

### Task 4: Live Trip Workspace and Replay Controls

**Files:**
- Create: `apps/web/src/live-trip/useReplayController.ts`
- Create: `apps/web/src/live-trip/TripTopBar.tsx`
- Create: `apps/web/src/live-trip/ConvoyRail.tsx`
- Create: `apps/web/src/live-trip/RouteWorkspace.tsx`
- Create: `apps/web/src/live-trip/SchematicRouteRenderer.tsx`
- Create: `apps/web/src/live-trip/LiveTripPage.tsx`
- Create: `apps/web/src/live-trip/LiveTripPage.test.tsx`
- Create: `apps/web/src/shared/StatusLabel.tsx`
- Create: `apps/web/src/product.css`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**
- Consumes: `createGoldenR001Replay`, `createReplayController`, and valid `DemoSessionV1`.
- Produces: live route screen, semantic convoy rail, and replay controls. `useReplayController` uses `useSyncExternalStore` and destroys its controller on unmount.

- [ ] **Step 1: Write failing live-page tests** proving missing setup shows a setup-required action, valid setup renders TRIP001 and all four ordered members, initial state is together, play/pause/previous/next/restart and `1×/2×/4×` controls work, degraded state labels weak GPS without a split, and stale nodes expose age/confidence text.
- [ ] **Step 2: Run the live test** and verify missing page/components fail.
- [ ] **Step 3: Implement the replay hook and top bar** with labeled buttons, pressed play/pause state, polite frame status, and session persistence after each frame. Restore always paused.
- [ ] **Step 4: Implement the convoy rail** from `frame.graph.orderedMemberIds` joined to `frame.nodes`; show leader/member, component, speed, confidence, connectivity, and boundary role in text.
- [ ] **Step 5: Implement the schematic route renderer** as responsive SVG with a single route path, nodes positioned from normalized route progress, adjacent edge segments keyed by ahead/behind IDs, component labels, and a visible `Simulated route projection` caption.
- [ ] **Step 6: Add product styling** with desktop rail/canvas/inspector regions, tablet horizontal rail, mobile stacked canvas and bottom context, dark road surface, warm bone shell, and amber only for degraded/stretched/broken states. Add reduced-motion overrides.
- [ ] **Step 7: Run live tests, lint, typecheck, and production build** and verify all pass.
- [ ] **Step 8: Commit** with `git commit -m "feat(web): render the live convoy workspace"`.

### Task 5: Incident Inspector and Safe Regroup Approval

**Files:**
- Create: `apps/web/src/live-trip/SituationInspector.tsx`
- Create: `apps/web/src/live-trip/RegroupReview.tsx`
- Create: `apps/web/src/live-trip/SituationInspector.test.tsx`
- Modify: `apps/web/src/live-trip/LiveTripPage.tsx`
- Modify: `apps/web/src/live-trip/RouteWorkspace.tsx`
- Modify: `apps/web/src/product.css`

**Interfaces:**
- Consumes: current replay snapshot and `approveRegroup(candidateId)`.
- Produces: degraded explanation, confirmed incident evidence, role-specific messages, eligible/excluded candidate views, and auditable approval.

- [ ] **Step 1: Write failing incident tests** proving degraded state says no split is confirmed; split state renders M003 → M004, 900 m, confidence, graph revision, policy version, component membership, and the exact domain notification messages.
- [ ] **Step 2: Write failing regroup tests** proving POI001/POI003 display score inputs, POI002 appears under `Excluded` with both reason codes and no button, POI001 is selected, arbitrary IDs cannot be submitted, and approving POI001 persists `RegroupApproved` before recovery.
- [ ] **Step 3: Run the focused tests** and verify missing inspector/review fails.
- [ ] **Step 4: Implement inspector selection by phase**: ordinary route context for together, confidence explanation for degraded, evidence and messages for split, approval state for recovering/completed.
- [ ] **Step 5: Implement regroup review directly from `RegroupRanking`**; map reason codes to deterministic copy, render score breakdown with semantic definition lists, and call only the controller with the selected eligible ID.
- [ ] **Step 6: Add Motion presence/layout transitions** for inspector and selected candidate; use immediate static states when reduced motion is requested.
- [ ] **Step 7: Run incident/live/core tests, safety-copy scan, lint, typecheck, and build** and verify all pass.
- [ ] **Step 8: Commit** with `git commit -m "feat(web): approve safe convoy regrouping"`.

### Task 6: Summary, Landing Entry Points, and Navigation

**Files:**
- Create: `apps/web/src/trip-summary/TripSummaryPage.tsx`
- Create: `apps/web/src/trip-summary/TripTimeline.tsx`
- Create: `apps/web/src/trip-summary/TripSummaryPage.test.tsx`
- Modify: `apps/web/src/components/HeroRoute.tsx`
- Modify: `apps/web/src/components/LandingNav.tsx`
- Modify: `apps/web/src/components/EditorialSections.tsx`
- Modify: `apps/web/src/app/App.test.tsx`
- Modify: `apps/web/src/product.css`

**Interfaces:**
- Consumes: completed session and final `GoldenReplayFrameV1.summary`.
- Produces: measured summary route and landing links to `/trip/new` plus direct demo link `/trips/TRIP001/live?autoplay=true`.

- [ ] **Step 1: Write failing summary tests** proving incomplete/missing sessions cannot fabricate a summary; completed session renders duration, one confirmed/resolved split, maximum 900 m gap, approved POI001, notifications and telemetry-quality facts, plus labeled `Template summary`.
- [ ] **Step 2: Write failing landing regression** asserting every primary `Start a group drive` CTA uses `/trip/new` and the hero secondary action exposes `Watch the demo` without removing the how-it-works route from navigation.
- [ ] **Step 3: Run focused tests** and verify failures from missing summary/wrong hrefs.
- [ ] **Step 4: Implement summary and timeline** from shared frames/session only; `Replay trip` resets to frame zero, `Start another demo` clears session, and `Back to Loopin` returns `/`.
- [ ] **Step 5: Replace anchor-only primary CTA hrefs with product routes** while preserving analytics capture and fragment navigation. Direct demo initializes a valid local session before rendering autoplay.
- [ ] **Step 6: Run landing, summary, live, analytics, lint, typecheck, and build checks** and verify all pass.
- [ ] **Step 7: Commit** with `git commit -m "feat(web): complete the trip journey"`.

### Task 7: Browser Journey, Accessibility, and Visual Verification

**Files:**
- Create: `apps/web/e2e/trip-demo.spec.ts`
- Modify: `apps/web/playwright.config.ts`
- Modify: `apps/web/e2e/landing.spec.ts`

**Interfaces:**
- Verifies the built user journey at desktop, mobile, and reduced-motion project configurations.

- [ ] **Step 1: Write the failing Playwright journey**: landing → setup → disable/enable consent → start → step through degraded/stretch/split → verify exact boundary and messages → verify POI002 has no approval → approve POI001 → reconnect → summary.
- [ ] **Step 2: Add axe assertions** on setup, live together, degraded, split/regroup, and summary states; fail only after reporting all serious/critical violations.
- [ ] **Step 3: Add responsive overflow assertions** at all six required widths and mobile bottom-sheet/control visibility checks.
- [ ] **Step 4: Add reduced-motion assertions** proving marker/inspector transition durations are at most 0.01 seconds while state and controls remain complete.
- [ ] **Step 5: Run `npm.cmd run test:e2e`** and verify all desktop/mobile/reduced-motion projects pass with no console errors.
- [ ] **Step 6: Start the production preview and inspect it in a real browser** at 1440×900 and 390×844; capture screenshots of setup, split/regroup, and summary, then inspect route geometry, cropping, labels, focus, inspector, and overflow.
- [ ] **Step 7: Run a production performance audit** and verify no new serious accessibility issue, route chunk error, or avoidable map/animation bundle was introduced.
- [ ] **Step 8: Commit** with `git commit -m "test(web): verify the complete trip demo"`.

### Task 8: Documentation and Full Release Gate

**Files:**
- Modify: `README.md`
- Modify: `docs/core-demo-slice.md`
- Modify: `docs/testing-and-operations.md`
- Modify: `docs/frontend-standards.md` only if verification reveals a reusable product-surface rule

**Interfaces:**
- Documents exact local commands, route behavior, fixture/shared-package ownership, limitations, AWS seam, and screenshot evidence paths.

- [ ] **Step 1: Update documentation** to describe setup/live/summary routes, `@loopin/demo-scenarios`, replay controls, session reset, and the unchanged production limitations.
- [ ] **Step 2: Run safety and placeholder scans** over product sources and new docs; only deliberate negative assertions or explicit prohibitions may match unsafe phrases.
- [ ] **Step 3: Run the complete gate**: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test -- --run`, `npm.cmd run build`, `npm.cmd run test:e2e`, `npm.cmd run simulate -- --json`, and `npm.cmd audit --audit-level=high`.
- [ ] **Step 4: Confirm CLI/web parity** by asserting both expose situation ID `split:TRIP001:M003:M004`, selected POI001, excluded POI002, final together state, one resolved split, and peak gap 900 m.
- [ ] **Step 5: Review `git diff --check`, `git status --short`, build output, and generated artifact exclusions**; do not stage screenshots, Playwright reports, `dist`, or source workbook.
- [ ] **Step 6: Commit** with `git commit -m "docs: document the web trip experience"`.

## Follow-on Integration

After this branch is complete, the next branch implements the AWS/local service vertical slice. It replaces the demo-session and replay adapters behind existing interfaces while preserving `LocationTelemetryV1`, `ProjectedLocationV1`, `ConvoyGraph`, `Situation`, `NotificationRequest`, `RegroupRanking`, and client revision behavior. The later Flutter slice publishes the same generated telemetry contract and renders member-specific notifications; it does not duplicate convoy-wide authority.
