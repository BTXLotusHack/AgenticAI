# Loopin mobile

Flutter foundation for Loopin's low-distraction driver experience. The client
owns device presentation and, in later slices, capture and offline delivery. It
does not own convoy detection, regroup authorization, or other safety policy.

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
