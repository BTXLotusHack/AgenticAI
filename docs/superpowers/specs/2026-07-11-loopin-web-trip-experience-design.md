# Loopin Web Trip Experience Design

**Status:** Approved direction; written implementation specification

**Date:** 2026-07-11

**Owning requirements:** `docs/product-spec.md` F-01 through F-07 and F-09, `docs/frontend-standards.md`, `docs/convoy-intelligence.md`, and `docs/core-demo-slice.md`

## 1. Goal and scope

Build the first authenticated-style React product experience behind the public landing page. A user can configure the supplied Hà Nội–Hạ Long group trip, verify four members are ready, launch a live replay, observe the authoritative convoy graph move from together through degraded, stretched and split states, approve a safe regroup recommendation, observe reconnection, and review a measured summary.

This slice is a complete local product journey and judge demonstration. It consumes the same deterministic engine and golden scenario as the CLI. It does not imitate a production backend, fabricate map precision, or place safety authority in React.

## 2. Chosen approach

The chosen approach combines a short setup flow with the full live-trip workspace:

```text
Landing CTA
→ Trip setup and readiness
→ Live R001 convoy replay
→ Confirmed M003–M004 split
→ Leader reviews and approves POI001
→ Stable reconnection
→ Trip summary
```

This is preferred over opening directly on a dashboard because it demonstrates real user intent, consent, membership, and readiness. It is preferred over building a broad multi-trip CRUD interface because the golden journey remains the most important hackathon proof and already has auditable domain behavior.

## 3. Experience thesis

### Visual thesis

A restrained road-operations workspace cut from the landing page’s editorial identity: warm bone navigation and typography surround a dark route canvas, Loopin green represents coordinated travel, and safety amber appears only for uncertainty, stretching, separation, or an action requiring review.

The product surface follows Linear-style restraint. It is not a dashboard-card mosaic. The route workspace is dominant; navigation, convoy context, and incident controls are secondary planes separated by spacing, dividers, tone, and typography.

### Content plan

1. **Trip setup:** identify the route, departure, leader, members, consent, and readiness; primary action is `Start trip`.
2. **Live trip:** orient the user with trip state, freshness, route direction, ordered vehicles, and replay controls.
3. **Incident:** explain the exact broken boundary, confidence, persistence, front/rear components, and recipient messages.
4. **Regroup:** compare eligible candidates, expose exclusions, let the leader approve POI001, and show the approved action.
5. **Summary:** show measured duration, split, reconnection, recommendation, notification, and telemetry-quality facts; primary action returns to the landing page or replays the journey.

### Interaction thesis

- Vehicle markers glide between route-progress positions while fresh; stale or degraded nodes stop extrapolating and gain a labeled accuracy treatment.
- The M003–M004 edge expands and changes from green to amber only as the tested state moves through stretched and broken. The incident inspector enters after confirmation, not on the first large sample.
- Approving POI001 adds a forward regroup marker and advances the replay into recovery. Reconnection collapses the component separation and reveals a measured completion summary.
- `prefers-reduced-motion` replaces glides, pulses, and inspector transitions with immediate state changes while preserving every fact and control.

## 4. Information architecture and routes

React Router owns these browser routes:

| Route | Purpose |
|---|---|
| `/` | Existing public landing page |
| `/trip/new` | R001 setup, member readiness, consent, and launch |
| `/trips/TRIP001/live` | Live golden replay workspace |
| `/trips/TRIP001/summary` | Post-trip measured summary |

The existing fragment links on `/` remain unchanged. Primary `Start a group trip` actions navigate to `/trip/new`. A secondary `Watch the demo` action may navigate directly to `/trips/TRIP001/live?autoplay=true`, but it does not replace the complete setup flow.

Unknown routes render a small product-consistent not-found state with links to the landing page and trip setup. They do not silently redirect because silent redirects hide broken shared links.

## 5. Shared scenario architecture

The web UI and CLI must not maintain separate golden logic. The current fixture and scenario orchestration move from `apps/simulator` into a pure shared workspace package:

```text
packages/demo-scenarios
├── golden-r001.fixture.ts
├── golden-r001-replay.ts
├── replay-controller.ts
└── index.ts
```

`@loopin/demo-scenarios` depends on `@loopin/convoy-core`. It produces immutable, versioned replay frames containing the current graph, ingestion status delta, situation transition, notifications, regroup ranking, and optional summary. It owns no DOM, browser timer, React state, console output, AWS client, or mutable singleton.

`apps/simulator` becomes a thin CLI adapter over the shared scenario package. `apps/web` consumes the same frames through a React hook. This guarantees the dashboard is a presentation of tested domain output rather than a hand-authored animation that only resembles it.

## 6. Replay contract

```ts
type GoldenReplayFrameV1 = {
  schemaVersion: 1
  frameIndex: number
  occurredAt: string
  elapsedSeconds: number
  phase: "ready" | "together" | "degraded" | "stretched" | "split" | "regroup-approved" | "recovering" | "completed"
  graph: ConvoyGraph
  nodes: VehicleNode[]
  ingestionStatusDelta: Partial<Record<IngestionStatus, number>>
  situationTransition: SituationTransition["transition"]
  situation?: Situation
  notifications: NotificationRequest[]
  regroupRanking?: RegroupRanking
  approvedCandidateId?: string
  summary?: TripSummaryV1
}
```

The replay exports:

```ts
createGoldenR001Replay(): GoldenReplayFrameV1[]
createReplayController(frames: readonly GoldenReplayFrameV1[]): ReplayController
```

The controller exposes `getSnapshot`, `play`, `pause`, `stepForward`, `stepBackward`, `seek`, `restart`, `approveRegroup`, and `subscribe`. It uses an injected scheduler so unit tests use a fake scheduler and React uses browser timers. Approval is permitted only when a selected verified candidate exists and the current frame is a confirmed split. The approved candidate is always one from the engine’s ranking.

## 7. Trip setup screen

The setup screen is a calm, single-page readiness flow rather than a modal wizard.

### Header

- Inverted Loopin brand link to `/`.
- `Demo trip` environment label.
- `Exit setup` link to the landing page.

### Route identity

- Hà Nội → Hạ Long.
- Planned departure and expected duration from the workbook.
- Four vehicles, R001, and a concise statement that the route is a simulation fixture.
- A narrow route-line illustration establishes direction without pretending to be a detailed map.

### Readiness list

One row per M001–M004 with display name, role, vehicle label, location-sharing scope, GPS, connectivity, voice, and battery readiness. Rows use semantic status text plus an icon; color is supplemental.

The user can toggle location consent for the local demo. `Start trip` remains disabled until all members have consent and required GPS readiness. Voice readiness is informative and does not block members whose workbook setting is `No`.

### Launch

`Start trip` creates local demo session state, records a deterministic audit entry, and navigates to `/trips/TRIP001/live`. Refreshing the live route restores the current demo session and replay position from versioned session storage; malformed or incompatible storage is ignored safely and setup is shown again.

## 8. Live trip workspace

Desktop layout uses three stable regions:

```text
┌ top bar: trip / state / freshness / replay controls ┐
├ convoy rail ┬ dominant route canvas ┬ inspector     ┤
│ ordered     │ nodes, edges, POIs     │ incident /    │
│ members     │ and component labels   │ regroup       │
└─────────────┴────────────────────────┴───────────────┘
```

On tablets, the convoy rail becomes a horizontal ordered strip. On mobile, the route canvas remains first, the vehicle strip follows, and the inspector becomes a bottom sheet with an explicit close control. No desktop region is merely shrunk below readable or tappable size.

### Top bar

- Loopin brand and back link.
- `Hà Nội → Hạ Long` and `TRIP001`.
- Trip state and last authoritative frame age.
- Play/pause, previous, next, restart, and speed controls at `1×`, `2×`, and `4×`.
- `End demo` requires confirmation and routes to summary only after a completed or explicitly ended replay.

### Convoy rail

- Members appear in stable route order, not join order.
- Each row shows alias, vehicle, role, component, speed, freshness, confidence, connectivity, and current boundary role.
- A member ahead of the leader is labeled without being automatically described as split.
- A stale member is visibly static with the age shown; the UI never continues animating it as fresh.

### Route canvas

The first slice uses a provider-neutral schematic route canvas driven by real route progress rather than external map tiles. It contains:

- Direction of travel and route name.
- Scaled R001 route line.
- Vehicle nodes positioned by normalized route progress.
- Adjacent edges, with edge state and measured boundary gap.
- Component labels after separation.
- Minh Châu, highway shoulder, and Hạ Long service-area candidates only when regroup review opens.
- An explicit `Simulated route projection` label.

The canvas is implemented behind `RouteWorkspace` and `RouteRenderer` interfaces so the Tasco/MapLibre adapter can replace the schematic renderer without changing trip, replay, incident, or inspector state.

### Inspector

Before an incident, the inspector shows route context and the next planned waypoint. During weak GPS, it explains that the display is degraded and that no split is confirmed. When split is confirmed, it shows:

- `Convoy split` and severity.
- M003 → M004 boundary.
- Current and maximum route gap.
- Persistence duration, confidence, graph revision, and policy version.
- Front and rear component membership.
- The exact leader/front-boundary/rear-boundary recipient messages.
- A `Review regroup points` action.

## 9. Regroup review and approval

The regroup view is part of the inspector, not a blocking full-screen modal.

POI001 and POI003 appear as eligible rows with safety, route compatibility, maximum-member ETA, parking, detour, and total score. POI002 appears separately under `Excluded`, with `Unsafe stop` and `Insufficient convoy parking` reason codes. An excluded candidate has no approval control.

POI001 is preselected because the deterministic engine ranks it first. The leader must explicitly press `Approve Minh Châu Rest Stop`. Approval records candidate ID, graph revision, policy version, and timestamp. It then shows the confirmed bilingual-safe action and moves the replay into recovery. No UI control can construct or approve an arbitrary POI.

## 10. Summary screen

The summary leads with measured facts:

- Duration.
- One confirmed and resolved convoy split.
- Maximum confirmed route gap.
- One regroup recommendation and approved POI.
- Notification request count.
- Duplicate, stale, replay, and degraded telemetry facts.

Below the facts, a compact event timeline identifies together, weak GPS, stretched, split, POI approval, recovering, and together states. Deterministic narrative is labeled `Template summary`; a future AI explanation would appear as a separate, non-authoritative field.

Actions are `Replay trip`, `Start another demo`, and `Back to Loopin`. Export and deletion are visibly outside this local slice rather than shown as nonfunctional controls.

## 11. State, persistence, and audit

React owns presentation state only:

- Current route and drawer visibility.
- Replay controller subscription snapshot.
- Selected eligible candidate before approval.
- Local setup consent inputs.

The shared scenario package owns replay and domain-derived state. A small `demo-session-v1` session-storage adapter stores setup completion, current frame index, play state as paused on restore, approved candidate ID, and audit entries. It validates the schema before restoring.

Audit entries are immutable local facts: `DemoTripStarted`, `ReplayPaused`, `RegroupApproved`, `DemoTripCompleted`, and `DemoSessionReset`. They include ISO timestamps, trip ID, frame/graph revision, and relevant approved IDs. Precise coordinates are not logged.

## 12. Error and degraded behavior

- Missing session: route to `/trip/new` with `Complete trip setup to begin`.
- Invalid session schema: discard the local value and show setup; do not crash.
- Replay revision gap: pause and show `Replay state needs to be restored`; restarting reconstructs from deterministic frames.
- Low-confidence GPS: show degraded graph and accuracy/freshness; do not open split inspector.
- No safe regroup candidate: keep the incident open, show that no verified stop is available, and provide no approval button.
- Unexpected renderer error: retain the ordered convoy rail and incident facts in text, with a retry control for the canvas.
- Reduced motion: controls and every state remain available; only interpolation and decorative transitions are removed.

## 13. Components and boundaries

```text
apps/web/src/
├── app/router.tsx
├── demo-session/
│   ├── schema.ts
│   ├── storage.ts
│   └── audit.ts
├── trip-setup/
│   ├── TripSetupPage.tsx
│   ├── RouteSummary.tsx
│   └── ReadinessList.tsx
├── live-trip/
│   ├── LiveTripPage.tsx
│   ├── useReplayController.ts
│   ├── TripTopBar.tsx
│   ├── ConvoyRail.tsx
│   ├── RouteWorkspace.tsx
│   ├── SchematicRouteRenderer.tsx
│   ├── SituationInspector.tsx
│   └── RegroupReview.tsx
├── trip-summary/
│   ├── TripSummaryPage.tsx
│   └── TripTimeline.tsx
└── shared/
    ├── ProductBrand.tsx
    ├── StatusLabel.tsx
    └── NotFoundPage.tsx
```

Files remain focused: route rendering does not select incidents, the inspector does not calculate gaps, the replay hook does not know CSS, and setup storage does not import React.

## 14. Accessibility and responsive requirements

- WCAG 2.2 AA contrast for text and controls.
- Semantic `header`, `nav`, `main`, `aside`, ordered lists, headings, and live status regions.
- Replay controls have names, visible focus, pressed state, and minimum 44-pixel touch targets.
- State changes use a polite live region; urgent safety text is never repeatedly announced on every frame.
- Route nodes are backed by a readable ordered list and component text; canvas geometry is not the only source of meaning.
- Keyboard flow follows top bar → convoy rail → route controls → inspector; no focus trap outside a real confirmation dialog.
- Desktop and mobile checks at 360, 390, 768, 1024, 1280, and 1440 CSS pixels.
- No horizontal overflow; mobile bottom sheet does not cover replay controls or the active route node.

## 15. Motion and performance

Motion uses the existing `motion` dependency. Marker movement, inspector presence, candidate selection, and component reconnection use transform and opacity. No new animation library is added.

The landing page remains code-split from product routes. The demo scenario package is loaded only for setup/live/summary routes. Below-the-fold landing assets remain lazy. The schematic canvas uses SVG and semantic HTML; a map provider bundle is not added until the maps vertical slice.

## 16. Verification and acceptance

### Domain and shared replay

- The CLI and web receive identical ordered frames, split identity, POI ranking, notifications, resolution, and summary.
- Duplicate, stale, replay, and low-confidence fixtures retain their tested behavior.
- Approval rejects POI002 and any ID not present in the eligible ranking.
- Pause, step, seek, restart, restore, and completion are deterministic under a fake scheduler.

### React behavior

- Landing CTA reaches setup.
- Setup cannot start without required consent/readiness.
- Starting reaches live trip and autoplay can be controlled.
- Weak GPS is degraded without split confirmation.
- Persistent M003–M004 gap opens the incident inspector exactly once.
- Each displayed alert matches the domain notification request.
- POI001 approval advances to recovery; POI002 cannot be approved.
- Stable reconnection routes to the correct summary.
- Refresh restores a valid paused session; invalid storage returns to setup.

### Release gate

- Unit and component tests.
- Strict type-check and lint.
- Production build and route chunk inspection.
- Playwright journey from landing through summary.
- Automated axe checks on setup, live, split inspector, regroup, and summary states.
- Keyboard-only and reduced-motion browser checks.
- Visual inspection and screenshots at desktop and mobile widths.
- No console errors, horizontal overflow, clipped inspector content, or fake proof claims.
- Existing landing and core tests remain green.

## 17. Explicitly deferred boundaries

- Cognito identity and real authorization.
- API Gateway, IoT, Kinesis, DynamoDB, EventBridge, SQS, AppSync, and S3 adapters.
- Flutter background GPS and native alert delivery.
- Tasco route geometry, map matching, ETA, traffic, and POI APIs.
- Production trip persistence, join codes, leadership transfer, export, and deletion.
- Bedrock explanation and Transcribe voice input.

Those follow as separate vertical slices and must consume the same versioned contracts. This web slice does not add empty services or present deferred capabilities as working.
