# Loopin Flutter Driver Client Implementation Plan

**Date:** 2026-07-11

**Status:** Approved stack change; execute after the local/AWS service vertical slice

**Decision:** [ADR 0001](../../adr/0001-use-flutter-for-driver-client.md)

## Objective

Build a production-shaped Flutter driver client that joins TRIP001, publishes versioned location telemetry, survives intermittent connectivity through an ordered SQLite queue, renders only server-authorized convoy state and member-specific notifications, and proves the complete web/backend/mobile journey without duplicating convoy safety logic.

## Non-negotiable boundaries

- Flutter owns device capture, driver presentation, offline delivery and acknowledgements.
- `@loopin/convoy-core` and the backend own graph revisions, situation lifecycle, regroup eligibility and notification audience selection.
- Dart contracts are generated from language-neutral artifacts exported from the authoritative Zod schemas. Generated files are never hand-edited.
- Phone GPS remains coordination data, not collision-avoidance precision.
- No message instructs speeding, sudden braking or stopping at an unverified place.
- Background tracking is not considered complete from unit tests or an emulator alone.
- Each independently verifiable unit uses a new `codex/` branch, a focused commit, and a PR targeting `dev` only after explicit authorization.

## Target stack

| Concern | Choice |
|---|---|
| Framework | Flutter stable 3.44.x, Dart 3.12.x |
| Architecture | Views + view models, repositories, services, focused use-cases |
| State/DI | Riverpod |
| Navigation | go_router |
| Models | Generated null-safe Dart DTOs plus immutable application models |
| Local database | Drift over SQLite |
| Auth | Amplify Flutter Auth with Cognito |
| Telemetry | `TelemetryTransport` with local HTTP and AWS IoT MQTT/WSS SigV4 adapters |
| Realtime | `RealtimeTripClient` with local WebSocket and AppSync Events adapters |
| Location | `LocationSource` wrapping permission, foreground and background platform behavior |
| Native output | Platform TTS, haptics and local/push notification adapters |
| Maps/navigation | `MapsSurface`/`NavigationLauncher` interfaces; Tasco adapter after SDK validation |
| Testing | Dart unit tests, Flutter widget/golden tests, integration_test, Android emulator, physical Android/iOS lifecycle matrix |

## Planned file structure

```text
apps/mobile/
|-- android/
|-- ios/
|-- integration_test/
|-- lib/
|   |-- app/                       # bootstrap, router, theme and environment
|   |-- contracts/generated/       # generated; never hand-edited
|   |-- core/                      # clock, result/error and lifecycle primitives
|   |-- features/
|   |   |-- auth/
|   |   |-- trip_setup/
|   |   |-- tracking/
|   |   |-- live_trip/
|   |   `-- notifications/
|   |-- repositories/
|   `-- services/                  # location, database, HTTP/MQTT, realtime, TTS/haptics
|-- test/
|-- analysis_options.yaml
`-- pubspec.yaml

packages/contracts/
|-- src/export-schemas.ts
|-- src/generate-dart.ts
|-- generated/*.schema.json
`-- test/contract-generation.test.ts
```

## Task 1: Cross-language contract pipeline

**Branch:** `codex/flutter-contracts`

1. Add failing TypeScript tests that require deterministic JSON Schema exports for `LocationTelemetryV1`, event envelopes, projected locations, graph snapshots, situations and notification requests.
2. Implement `packages/contracts` using Zod 4 JSON Schema export with stable IDs, schema versions and sorted output.
3. Add a pinned `quicktype-core` generator that emits one null-safe Dart contract library with a generated-file header.
4. Export valid, invalid-version, duplicate, stale and history-only JSON examples from the existing core tests and golden scenario.
5. Add a drift check: regeneration must produce no Git diff; Dart parses every valid example and rejects incompatible versions before mobile feature work proceeds.
6. Add root scripts `contracts:generate` and `contracts:check`.
7. Verify TypeScript tests, generated output, `git diff --check`, then commit `feat(contracts): generate Flutter boundary models`.

## Task 2: Flutter application foundation

**Branch:** `codex/flutter-foundation`

1. Run `flutter create --platforms android,ios --org vn.loopin apps/mobile` with the detected stable toolchain.
2. Pin the Dart SDK to `>=3.12.0 <4.0.0`; enable strict analysis, trailing commas and generated-file exclusions.
3. Add Riverpod, go_router, immutable/model support, Drift, connectivity, logging and test dependencies with lockfile ownership.
4. Create app environments (`local`, `dev`, `prod`) that contain public endpoints/identifiers only; secrets never enter Dart defines or assets.
5. Implement the Loopin theme, router shell and explicit loading/error/degraded states.
6. Add smoke widget tests and root `mobile:analyze`, `mobile:test` and `mobile:format-check` scripts.
7. Verify `flutter analyze`, `flutter test`, Android debug build and generated contract import, then commit `feat(mobile): bootstrap Flutter driver app`.

## Task 3: Trip setup, identity seam and consent

**Branch:** `codex/flutter-trip-setup`

1. Add failing repository/view-model tests for signed-out, authenticating, ready, consent-denied and joined states.
2. Implement `AuthService` with fake/local and Amplify Cognito adapters; keep Amplify configuration outside feature code.
3. Implement `TripRepository` against the local/AWS HTTP contract for join code, member identity, readiness and snapshot fetch.
4. Build accessible setup screens for TRIP001, permission rationale, location scope, battery/GPS readiness and voice preference.
5. Persist only the minimum trip/member session; logout or trip end removes live location credentials and queued trip data.
6. Verify widget tests, contract tests and local service integration, then commit `feat(mobile): add trip setup and consent`.

## Task 4: Location capture and ordered offline queue

**Branch:** `codex/flutter-telemetry-queue`

1. Write failing tests with fake clock/location/connectivity for sequence monotonicity, adaptive interval, duplicate prevention, restart recovery, max-age rejection and ordered drain.
2. Implement `LocationSource` and `TrackingCoordinator`; convert platform observations into generated `LocationTelemetryV1` only after permission and trip checks.
3. Create Drift tables for telemetry, delivery attempts and acknowledgements with `(tripId, memberId, sequence)` uniqueness.
4. Encrypt sensitive database material through platform-keystore-backed key handling; coordinates never enter ordinary logs.
5. Apply bounded retry with jitter, queue size/age caps and explicit degraded state. Offline records remain history-only when too old for live authority.
6. Verify unit/database tests and process-restart recovery, then commit `feat(mobile): buffer ordered telemetry offline`.

## Task 5: Local and AWS telemetry/realtime adapters

**Branch:** `codex/flutter-realtime`

1. Add failing transport contract tests using the local service endpoints from the AWS vertical slice.
2. Implement local HTTP ingestion and WebSocket snapshot/delta adapters first; prove idempotency and revision-gap refetch.
3. Implement Cognito credential acquisition through Amplify Auth.
4. Implement AWS IoT Core MQTT/WSS QoS 1 with SigV4 behind `TelemetryTransport`; retain signed HTTPS fallback and never publish directly from UI code.
5. Implement AppSync Events behind `RealtimeTripClient`; apply only contiguous authorized revisions and refetch on reconnect/gap.
6. Add connection-state metrics, bounded reconnect, certificate/endpoint validation and no sensitive payload logs.
7. Verify local integration, mocked AWS protocol tests and reconnect behavior, then commit `feat(mobile): connect telemetry and trip realtime`.

## Task 6: Driver-safe live experience

**Branch:** `codex/flutter-live-trip`

1. Add failing view-model/widget tests for together, degraded GPS, stretched, split, regroup-approved, reconnected and offline states from shared fixtures.
2. Render the current member, freshness/confidence, component relationship and approved next action without exposing coordinator-only controls.
3. Present only the member's `NotificationRequest`; dedupe by notification ID and honor expiry, locale, channel and acknowledgement policy.
4. Add TTS, haptic and local notification presenters behind interfaces. Voice output is short, interruptible and disabled by preference.
5. Launch external/Tasco navigation only for a server-approved eligible POI; never synthesize a destination.
6. Add large-text, screen-reader, contrast, reduced-motion and low-distraction tests.
7. Verify shared-fixture parity and commit `feat(mobile): render member-safe live guidance`.

## Task 7: Background lifecycle and platform hardening

**Branch:** `codex/flutter-background-tracking`

1. Configure Android foreground service, notification channel, boot/process recovery and modern background-location permissions.
2. Configure iOS background location modes, permission strings, significant lifecycle transitions and termination/relaunch behavior.
3. Ensure the background callback initializes only background-safe services and communicates through persisted queue state rather than UI memory.
4. Add explicit behavior for permission revocation, low battery, GPS disabled, app force-stop, OS throttling, logout and trip completion.
5. Measure capture interval, battery use, observation age and drain latency on representative devices; tune through versioned policy, not UI constants.
6. Verify Android emulator flows, then execute and record the physical Android/iOS matrix. Do not mark complete if physical validation is unavailable.
7. Commit `feat(mobile): harden background trip tracking` only after the documented gates pass.

## Task 8: Cross-client golden journey and release gate

**Branch:** `codex/flutter-system-integration`

1. Start local services, React web and Flutter Android client with TRIP001 fixtures.
2. Prove Flutter publishes valid member telemetry; backend derives the authoritative split; web shows coordinator evidence; Flutter receives only its member alert; POI001 approval returns as navigation guidance; reconnection resolves everywhere.
3. Add failure cases for duplicates, stale sequence, offline replay, revision gaps, permission loss and transport reconnect.
4. Run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run contracts:check
Push-Location apps/mobile
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test
flutter build apk --debug
Pop-Location
```

5. Run Android integration tests and attach the physical-device validation record; document iOS build/test as a macOS CI requirement.
6. Run dependency/security audits for npm, Dart and Android; inspect generated artifacts and sensitive configuration exclusions.
7. Update README, system architecture, testing/operations and runbooks, then commit `test(system): verify Flutter convoy integration`.

## External validation gates

- Tasco Flutter SDK or platform-view support, authentication and license.
- AppSync Events client protocol support for Dart; adapter spike before committing to a community package.
- AWS IoT MQTT/WSS SigV4 interoperability and Cognito policy scope.
- Android and iOS background-location policy/store-review compliance.
- Vietnamese TTS quality and interruption behavior on supported devices.
- Battery consumption and capture reliability on representative hardware.

## Definition of done

The Flutter slice is complete only when generated contracts are drift-free, local/AWS adapters are replaceable, offline sequencing is deterministic, no safety authority lives in Dart, the cross-client golden trip passes, Android integration is automated, and physical Android/iOS background behavior is recorded. A rendered demo alone is not completion.
