# 0001: Use Flutter for the driver client

Date: 2026-07-11
Status: accepted

## Context

Loopin needs a native mobile client for continuous trip-scoped location capture, offline telemetry buffering, voice and haptic alerts, navigation handoff, acknowledgements and safe degraded behavior. A browser cannot provide reliable background GPS. The original design selected Expo/React Native, but the product owner changed the mobile direction to Flutter before mobile implementation began.

The mobile client must not become a second convoy authority. Graph revisions, situation lifecycle, recipient policy and regroup eligibility remain deterministic server/domain outputs. The client must also consume the same versioned contracts as TypeScript services without relying on hand-maintained equivalent shapes.

## Decision

- Build the driver client in Flutter and Dart under `apps/mobile`.
- Follow Flutter's layered architecture: views and view models in the UI layer; repositories as sources of truth; services around platform and network APIs; focused use-cases only where coordination spans repositories.
- Use Riverpod for dependency injection and observable application state, `go_router` for navigation, immutable generated DTOs, and Drift/SQLite for the offline telemetry and acknowledgement queues.
- Use Amplify Flutter Auth for Cognito session and credential lifecycle. Keep HTTP, MQTT over WSS with SigV4, AppSync Events, maps, location, notifications, TTS and haptics behind explicit Dart interfaces.
- Implement background location through a `LocationSource` boundary with Android foreground-service and iOS background-location configuration. Plugin/native-channel selection remains replaceable and requires device lifecycle validation before production claims.
- Publish `LocationTelemetryV1` through a `TelemetryTransport` adapter. Prefer AWS IoT Core MQTT/WSS with Cognito/SigV4 when connected, retain an HTTPS ingestion fallback, and drain the SQLite queue idempotently in member-sequence order.
- Generate language-neutral JSON Schema artifacts from the authoritative versioned Zod contracts. Dart models must validate against the same contract examples and golden TRIP001 fixtures; schema version changes fail both TypeScript and Flutter CI.
- Keep convoy calculation, incident confirmation, safe-stop exclusion/scoring and notification audience selection out of Flutter. Flutter renders permission-filtered snapshots/deltas and member-specific approved messages.

## Alternatives

- **Expo/React Native:** would share TypeScript skills, but is no longer the selected product direction and had not been implemented.
- **Separate Kotlin and Swift apps:** provide maximal platform control but double feature, contract and QA work for the current team.
- **Mobile web/PWA:** cannot meet the continuous background-location and native alert requirements reliably.
- **Flutter owning convoy logic:** rejected because cross-client safety authority would drift and conflict with server revisions.

## Consequences

- The mobile experience can share one UI codebase while retaining native platform-service access and AOT release builds.
- The repository gains a Dart/Flutter toolchain, generated cross-language contract artifacts and Android/iOS lifecycle tests.
- TypeScript implementation code is not shared with Flutter; behavior is shared through versioned schemas, golden fixtures and server authority.
- MQTT SigV4, AppSync Events and Tasco SDK coverage need adapter spikes because Flutter support may differ from web/native AWS examples.
- Background GPS behavior, battery use and process recovery must be proven on representative physical Android and iOS devices; emulator success is insufficient.

## Verification and rollback

Before the Flutter slice is complete:

1. `flutter analyze`, Dart formatting and unit/widget tests pass.
2. Contract tests parse valid shared examples and reject incompatible schema versions.
3. Android emulator integration tests prove foreground capture, offline queueing, reconnect drain and member-specific notifications.
4. Physical Android and iOS lifecycle tests prove permission changes, background capture, termination/relaunch, battery/degraded states and logout/deletion cleanup.
5. A cross-client golden trip proves Flutter telemetry produces the same server graph/situation revisions rendered by web.

Rollback affects only the mobile adapter: the backend, web app and versioned contracts remain unchanged. A different native client can replace Flutter without moving authoritative safety logic.

## References

- Flutter app architecture: <https://docs.flutter.dev/app-architecture/guide>
- Flutter isolates and platform plugins: <https://docs.flutter.dev/perf/isolates>
- Amplify Flutter authentication: <https://docs.amplify.aws/flutter/frontend/auth/>
- AWS IoT Core protocols and SigV4: <https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html>
