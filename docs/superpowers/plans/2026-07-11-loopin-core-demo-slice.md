# Loopin Core Demo Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, dataset-backed convoy simulation that accepts versioned telemetry, forms a route-ordered vehicle graph, confirms a persistent split, sends safe role-specific alerts, selects a verified regroup point, resolves after reconnection, and emits an auditable summary.

**Architecture:** Add one pure TypeScript package, `@loopin/convoy-core`, with focused modules for contracts, ingestion, graph state, situations, regrouping, notifications, and summaries. Add a thin `@loopin/simulator` CLI that converts a checked-in normalized fixture derived from the supplied workbook into events and prints the golden Hà Nội–Hạ Long journey; AWS handlers and UI will later call the same package APIs.

**Tech Stack:** Node.js 20.19+, TypeScript 5 strict mode, Zod 4, Vitest 3, fast-check 4, tsx, npm workspaces.

## Global Constraints

- Branches use the `codex/` prefix; every independently verifiable task ends in a focused commit; any future pull request targets `main`.
- Domain code remains free of React, AWS SDKs, databases, timers, environment variables, and network access.
- External and asynchronous contracts use numeric `schemaVersion: 1`; events are immutable and state carries explicit revisions.
- All timestamps are UTC ISO 8601 strings; distance, duration, speed, accuracy, and ETA fields include explicit units.
- Duplicate `eventId` and non-newer member sequences do not mutate authoritative state or graph revision.
- Offline replay can enrich history but cannot create a live situation.
- Low-confidence or stale GPS cannot independently confirm a split.
- Separation uses adjacent route-progress gaps and component boundaries, never straight-line or leader-to-tail distance.
- A driver message never tells someone to speed up, brake suddenly, or stop at an unverified location.
- Regroup candidates pass hard safety exclusions before deterministic scoring; AI cannot invent or authorize a candidate.
- Proposed policy defaults are versioned as `convoy-v1`: stretched/broken/reconnect thresholds of 250/400/280 m under 60 km/h, 400/600/420 m at 60–80 km/h, 550/800/560 m at 80–100 km/h, and 700/1000/700 m at 100–120 km/h; persistence is 15 seconds stretched, 30 seconds broken, 30 seconds reconnected, and 12 seconds reordered.

## File Structure

```text
packages/convoy-core/
├── package.json                 # Workspace scripts and public package entry
├── tsconfig.json                # Strict package type checking
├── src/
│   ├── contracts.ts             # Zod boundary schemas and inferred public types
│   ├── policy.ts                # Immutable versioned convoy/regroup defaults
│   ├── ingestion.ts             # Validation, idempotency, sequence and replay rules
│   ├── ordering.ts              # Stable route-progress ordering across overtakes
│   ├── graph.ts                 # Uncertainty-aware edges, hysteresis and components
│   ├── situations.ts            # Stable split lifecycle and structured evidence
│   ├── notifications.ts         # Recipient selection, safe templates and dedupe keys
│   ├── regroup.ts               # Hard exclusions and normalized weighted scoring
│   ├── summary.ts               # Measured-fact post-trip summary
│   └── index.ts                 # Explicit public exports
└── test/
    ├── contracts.test.ts
    ├── ingestion.test.ts
    ├── ordering.test.ts
    ├── graph.test.ts
    ├── graph.property.test.ts
    ├── situations.test.ts
    ├── notifications.test.ts
    ├── regroup.test.ts
    └── summary.test.ts
apps/simulator/
├── package.json
├── tsconfig.json
├── src/golden-r001.fixture.ts   # Normalized workbook provenance and scenario inputs
├── src/run-golden-scenario.ts   # Pure scenario runner returning structured result
├── src/cli.ts                   # Console adapter only
└── test/golden-scenario.test.ts # End-to-end golden assertions
```

---

### Task 1: Versioned Contracts and Policy

**Files:**
- Create: `packages/convoy-core/package.json`
- Create: `packages/convoy-core/tsconfig.json`
- Create: `packages/convoy-core/src/contracts.ts`
- Create: `packages/convoy-core/src/policy.ts`
- Create: `packages/convoy-core/src/index.ts`
- Test: `packages/convoy-core/test/contracts.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `LocationTelemetryV1Schema`, `ProjectedLocationV1Schema`, `VehicleNode`, `ConvoyEdge`, `ConvoyComponent`, `ConvoyGraph`, `Situation`, `PlaceCandidate`, `NotificationRequest`, `EventEnvelopeSchema`, and `CONVOY_POLICY_V1`.
- `LocationTelemetryV1` exactly mirrors `docs/realtime-telemetry.md`; route projection is a separate validated `ProjectedLocationV1` so device input never claims authoritative map matching.

- [ ] **Step 1: Write failing schema tests** proving a valid `schemaVersion: 1` telemetry envelope parses, version 2 and invalid coordinates fail, event envelopes retain correlation fields, and policy weights sum to exactly `1`.

```ts
expect(LocationTelemetryV1Schema.safeParse(validTelemetry).success).toBe(true)
expect(LocationTelemetryV1Schema.safeParse({ ...validTelemetry, schemaVersion: 2 }).success).toBe(false)
expect(LocationTelemetryV1Schema.safeParse({ ...validTelemetry, latitude: 91 }).success).toBe(false)
expect(Object.values(CONVOY_POLICY_V1.regroupWeights).reduce((a, b) => a + b, 0)).toBe(1)
```

- [ ] **Step 2: Run `npm.cmd test --workspace @loopin/convoy-core -- --run test/contracts.test.ts`** and verify failure because the package and schemas do not exist.

- [ ] **Step 3: Implement strict schemas and immutable policy** with `z.literal(1)`, bounded coordinates/accuracy/battery, ISO datetime validation, discriminated enums, explicit units, and the documented four speed bands and persistence windows.

```ts
export const LocationTelemetryV1Schema = z.object({
  schemaVersion: z.literal(1), eventId: z.string().min(1), tripId: z.string().min(1),
  memberId: z.string().min(1), deviceId: z.string().min(1), sequence: z.number().int().nonnegative(),
  observedAt: z.iso.datetime(), sentAt: z.iso.datetime(), latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180), accuracyMeters: z.number().nonnegative().lte(5000),
  speedKmh: z.number().nonnegative().lte(300).nullable(), headingDegrees: z.number().gte(0).lt(360).nullable(),
  batteryPercent: z.number().gte(0).lte(100).nullable(), networkQuality: z.enum(["good", "weak", "offline-replay"]),
  source: z.enum(["gps", "simulator"]),
}).strict()
```

- [ ] **Step 4: Run the focused test and `npm.cmd run typecheck --workspace @loopin/convoy-core`** and verify both pass.

- [ ] **Step 5: Commit** with `git commit -m "feat(core): add versioned convoy contracts"`.

### Task 2: Idempotent Telemetry Ingestion

**Files:**
- Create: `packages/convoy-core/src/ingestion.ts`
- Test: `packages/convoy-core/test/ingestion.test.ts`
- Modify: `packages/convoy-core/src/index.ts`

**Interfaces:**
- Consumes: `LocationTelemetryV1`, `ProjectedLocationV1`.
- Produces: `acceptProjectedLocation(state, input, receivedAt): IngestionResult`, where status is `accepted | duplicate | stale-sequence | history-only | rejected` and accepted live state contains the newest sequence and `VehicleNode`.

- [ ] **Step 1: Write failing tests** for first acceptance, duplicate `eventId`, equal/lower sequence rejection, a newer live sample, a replay marked `history-only`, and low/medium/high confidence classification at 10/30-second freshness and 20/50-metre accuracy boundaries.
- [ ] **Step 2: Run the focused test** and verify imports fail.
- [ ] **Step 3: Implement a pure reducer** whose state owns `seenEventIds`, latest member sequences, current nodes, and history event IDs; parse both schemas before mutation; classify confidence from accuracy, age, and map-match confidence; never insert `offline-replay` into live nodes.

```ts
export function acceptProjectedLocation(
  state: TelemetryState,
  input: { telemetry: unknown; projection: unknown },
  receivedAt: string,
): IngestionResult
```

- [ ] **Step 4: Run focused tests and typecheck** and verify all pass.
- [ ] **Step 5: Commit** with `git commit -m "feat(core): enforce telemetry ordering and replay safety"`.

### Task 3: Stable Ordering and Convoy Graph

**Files:**
- Create: `packages/convoy-core/src/ordering.ts`
- Create: `packages/convoy-core/src/graph.ts`
- Test: `packages/convoy-core/test/ordering.test.ts`
- Test: `packages/convoy-core/test/graph.test.ts`
- Test: `packages/convoy-core/test/graph.property.test.ts`
- Modify: `packages/convoy-core/src/index.ts`

**Interfaces:**
- Produces: `updateStableOrder(previous, nodes, calculatedAt, reorderWindowSeconds): StableOrderState`.
- Produces: `calculateGraph(previous, nodes, calculatedAt, policy): GraphCalculationResult` with `graph`, internal edge trackers, and `changed`.
- Edge uncertainty is `sqrt(ahead.accuracyMeters² + behind.accuracyMeters²)`; confident lower gap is `max(0, routeGapMeters - combinedUncertaintyMeters)`.

- [ ] **Step 1: Write failing ordering tests** proving join order is ignored, a one-frame overtake does not reorder, a 12-second stable overtake does reorder, a member ahead of the leader remains ordered ahead, and lost nodes are excluded.
- [ ] **Step 2: Run ordering tests** and verify failure.
- [ ] **Step 3: Implement stable ordering** with one candidate order and `candidateSince`; unchanged candidate order is accepted only when elapsed time reaches the policy window.
- [ ] **Step 4: Write failing graph tests** for adjacent-only gaps, Car 3–Car 4 component boundary, 15-second stretched and 30-second broken persistence, uncertainty overlap retaining prior state, low confidence not breaking an edge, reconnect hysteresis, and graph revision changing only on authoritative output changes.
- [ ] **Step 5: Write property tests** proving shuffled input produces the same ordered IDs/components, adding a healthy internal edge cannot increase components, and duplicate calculations do not change revision.
- [ ] **Step 6: Implement graph calculation** using speed-band thresholds, per-edge pending transitions, nonbroken connected components, deterministic component IDs from ordered member IDs, and overall state precedence `degraded → split → stretched → together`.

```ts
const confidentLowerGapMeters = Math.max(0, routeGapMeters - Math.hypot(ahead.accuracyMeters, behind.accuracyMeters))
const boundaryPair = `${ahead.memberId}:${behind.memberId}`
```

- [ ] **Step 7: Run graph tests, property tests, and typecheck** and verify all pass.
- [ ] **Step 8: Commit** with `git commit -m "feat(core): calculate persistent convoy components"`.

### Task 4: Stable Split Situations

**Files:**
- Create: `packages/convoy-core/src/situations.ts`
- Test: `packages/convoy-core/test/situations.test.ts`
- Modify: `packages/convoy-core/src/index.ts`

**Interfaces:**
- Produces: `reduceSplitSituation(previous, graph, sourceEventIds): SituationTransition`.
- Stable ID format: `split:{tripId}:{frontBoundaryMemberId}:{rearBoundaryMemberId}`.
- Lifecycle used in this slice: `confirmed → notified → resolved`; repeated graph updates amend evidence, not identity.

- [ ] **Step 1: Write failing tests** that no situation exists before an edge is broken, one confirmed split is created at the exact boundary with graph revision and confidence evidence, repeats retain ID, a notification transition occurs once, and one-component recovery resolves it once.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Implement the reducer** with structured `SituationEvidence`, policy version, affected component IDs, `confirmedAt`, `updatedAt`, optional `notifiedAt`, and optional `resolvedAt`; reject degraded/unknown evidence as a new confirmation source.
- [ ] **Step 4: Run focused tests and typecheck** and verify all pass.
- [ ] **Step 5: Commit** with `git commit -m "feat(core): track stable split situations"`.

### Task 5: Safe Notifications

**Files:**
- Create: `packages/convoy-core/src/notifications.ts`
- Test: `packages/convoy-core/test/notifications.test.ts`
- Modify: `packages/convoy-core/src/index.ts`

**Interfaces:**
- Produces: `createSplitNotifications(situation, graph, localeByMember): NotificationRequest[]` and `createResolutionNotifications(...)`.
- Dedupe key format: `{situationId}:{transition}:{recipientMemberId}:{locale}`.

- [ ] **Step 1: Write failing tests** asserting leaders, front-section members, rear-section members, front boundary, and rear boundary receive distinct approved templates; Vietnamese and English are supported; messages contain route gap and never match `/speed up|hurry|brake suddenly|tăng tốc|phanh gấp/i`; duplicate calls produce identical dedupe keys.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Implement deterministic templates** that say maintain a safe pace, continue safely on the planned route, do not stop suddenly, or wait only at an approved stop. Set `expiresAt`, severity, channel eligibility, and evidence revision on every request.
- [ ] **Step 4: Run focused tests and typecheck** and verify all pass.
- [ ] **Step 5: Commit** with `git commit -m "feat(core): add role-specific safe convoy alerts"`.

### Task 6: Regroup Candidate Exclusion and Ranking

**Files:**
- Create: `packages/convoy-core/src/regroup.ts`
- Test: `packages/convoy-core/test/regroup.test.ts`
- Modify: `packages/convoy-core/src/index.ts`

**Interfaces:**
- Produces: `rankRegroupCandidates(candidates, context, policy): RegroupRanking` with excluded candidates and reason codes, eligible candidates with seven score components, selected candidate, and `policyVersion`.

- [ ] **Step 1: Write failing tests** proving illegal/unsafe shoulders, closed/inaccessible places, reverse direction, inadequate parking, excessive detour, and low source confidence are excluded before scoring; normalized score math matches policy weights; POI001 beats POI003 and POI002 can never win.
- [ ] **Step 2: Add a fast-check property** generating arbitrary scores and exclusions and asserting any hard-excluded candidate is absent from ranked candidates.
- [ ] **Step 3: Run focused tests** and verify failure.
- [ ] **Step 4: Implement hard filters and weighted scoring** with every input normalized to `[0,1]`, score rounded to four decimals only after summation, deterministic ties resolved by lower maximum ETA then `poiId`, and an explicit `no-safe-candidate` result.
- [ ] **Step 5: Run focused tests and typecheck** and verify all pass.
- [ ] **Step 6: Commit** with `git commit -m "feat(core): rank verified regroup candidates"`.

### Task 7: Reconnection Summary and Golden Dataset Simulator

**Files:**
- Create: `packages/convoy-core/src/summary.ts`
- Test: `packages/convoy-core/test/summary.test.ts`
- Create: `apps/simulator/package.json`
- Create: `apps/simulator/tsconfig.json`
- Create: `apps/simulator/src/golden-r001.fixture.ts`
- Create: `apps/simulator/src/run-golden-scenario.ts`
- Create: `apps/simulator/src/cli.ts`
- Test: `apps/simulator/test/golden-scenario.test.ts`
- Modify: `packages/convoy-core/src/index.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `summarizeTrip(facts): TripSummaryV1`, separating measured counters/timestamps from deterministic narrative text.
- Produces: `runGoldenScenario(): GoldenScenarioResult` containing ordered steps, confirmed split, alerts, regroup ranking, resolution, and summary.

- [ ] **Step 1: Create normalized R001 fixture** with workbook provenance, members M001–M004, route R001, POI001/POI002/POI003 attributes, 5-second projected samples that begin together, hold the M003–M004 gap above 600 m for 30 seconds, and hold it below 420 m for 30 seconds to reconnect. Include a duplicate sample, stale sequence, low-confidence sample, and offline replay sample.
- [ ] **Step 2: Write failing end-to-end test** asserting one split ID, front component `[M001,M002,M003]`, rear component `[M004]`, exact boundary M003–M004, no duplicate notifications, POI001 selected and POI002 excluded, one resolution, and summary counters of one split and one regroup recommendation.
- [ ] **Step 3: Run simulator test** and verify failure.
- [ ] **Step 4: Implement scenario runner and summary** by composing public core reducers; the runner must not duplicate graph or safety logic. The CLI accepts `--json` for machine output and defaults to a concise human timeline.
- [ ] **Step 5: Add root scripts**: `simulate`, `test:core`, and workspace-aware `lint`, `typecheck`, `test`, and `build` scripts that keep existing web commands green.
- [ ] **Step 6: Run `npm.cmd run simulate -- --json`** and verify JSON includes `overallState: "split"`, `selectedCandidateId: "POI001"`, and final `overallState: "together"`.
- [ ] **Step 7: Run simulator and core tests plus typecheck** and verify all pass.
- [ ] **Step 8: Commit** with `git commit -m "feat(simulator): replay the golden convoy journey"`.

### Task 8: Documentation and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/testing-and-operations.md`
- Create: `docs/core-demo-slice.md`

**Interfaces:**
- Documents the runnable commands, fixture provenance, invariants, expected output, limitations, and the unchanged AWS integration seam.

- [ ] **Step 1: Document the implemented slice** including a sequence diagram from normalized telemetry to summary, module ownership, explicit demo limitations (fixture projection rather than Tasco map matching; no collision avoidance), and how telemetry Lambda/AppSync/mobile/web will consume the same contracts.
- [ ] **Step 2: Run safety-language scans** with `rg -n "speed up|tăng tốc|brake suddenly|phanh gấp" packages apps/simulator docs/core-demo-slice.md` and verify only deliberate negative tests/documented prohibitions match.
- [ ] **Step 3: Run focused verification** with `npm.cmd run test:core`, `npm.cmd run simulate -- --json`, and `npm.cmd run typecheck`.
- [ ] **Step 4: Run repository verification** with `npm.cmd run lint`, `npm.cmd test -- --run`, `npm.cmd run build`, and `npm.cmd audit --audit-level=high`; verify all pass with zero high/critical vulnerabilities.
- [ ] **Step 5: Review `git diff --check` and `git status --short`**, confirm generated output and source workbook are not staged, then commit with `git commit -m "docs: explain the runnable convoy demo"`.

## Follow-on Vertical Slices

The runnable core demo is the dependency for, but does not pretend to complete, these separately planned units:

1. Web product shell: auth, trip creation/join/readiness, MapLibre live snapshot/deltas, incidents, leader approval, and landing-to-app conversion.
2. Flutter driver app: consent/readiness, foreground/background capture, Drift/SQLite offline queue, MQTT, voice/haptic alert presentation, and native TTS.
3. AWS foundation: CDK accounts/stacks, Cognito, API Gateway, Lambda, DynamoDB, IoT, Kinesis, Firehose/S3, EventBridge/SQS, AppSync Events, alarms, budgets, and OIDC CI.
4. Maps/geospatial: Tasco adapter, route normalization, map matching, progress, ETA, POI normalization, PostGIS history, and deterministic fixture fallback.
5. Production hardening: authorization/privacy deletion, push delivery, runbooks, load/failure testing, shadow policy calibration, and migration triggers for ECS/Flink.

Each follow-on receives its own Obra plan and branch, targets `main`, and must preserve the contracts and deterministic safety authority delivered here.
