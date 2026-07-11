# Loopin mobile

Flutter foundation for Loopin's low-distraction driver experience. The client
owns device presentation, telemetry capture boundaries and offline delivery
coordination. It does not own convoy detection, regroup authorization, or other
safety policy.

## Implemented slices

- Generated Dart models consume the authoritative `packages/contracts` schemas,
  including `MemberTelemetryInputV1`, `LiveMemberSnapshotV1`,
  `LiveSnapshotV1`, `DriverAlertV1`, `DriverAlertAcknowledgementV1` and
  `RealtimeEventV1`.
- `features/tracking` builds `LocationTelemetryV1` with monotonic member
  sequences, packages publish-ready MQTT/WSS/simulator telemetry envelopes and
  keeps an ordered offline queue boundary.
- `features/trip_setup` models join-trip readiness and foreground/background
  location permission gates.
- `features/live_trip` renders member-authorized alerts and deterministic safe
  fallback guidance from server snapshots, surfaces acknowledge/report/leave
  actions, and provides TTS/haptic adapter ports. It never creates convoy
  instructions locally.

Physical Android/iOS background capture, native permission prompts, AppSync/IoT
credentials, concrete TTS/haptics implementations and local notification
adapters remain external validation gates before production use.

## Environments

The app accepts `local`, `dev`, and `prod` through the public `LOOPIN_ENV` Dart
define. Configuration contains public service URLs and application identifiers
only. Credentials, access tokens, private keys, and other secrets must never be
passed through Dart defines or bundled assets.

```powershell
flutter run --dart-define=LOOPIN_ENV=local
```

The default is `local`. Unknown names fail closed during bootstrap.

## Checks

Run the mobile scripts from the repository root:

```powershell
npm.cmd run mobile:format-check
npm.cmd run mobile:analyze
npm.cmd run mobile:test
```

Android debug builds run on supported Windows/Linux/macOS hosts. The generated
iOS scaffold requires Xcode and must be built and tested on macOS.
