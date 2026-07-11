import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/app/app_environment.dart';
import 'package:loopin_mobile/app/loopin_app.dart';
import 'package:loopin_mobile/auth/auth_controller.dart';
import 'package:loopin_mobile/auth/auth_state.dart';

/// Seeds [AuthController] with a fixed state so widget tests never touch real
/// Cognito or secure storage.
class _StubAuthController extends AuthController {
  _StubAuthController(this._state);

  final AuthState _state;

  @override
  AuthState build() => _state;
}

List<Override> _auth(AuthState state) => <Override>[
  authControllerProvider.overrideWith(() => _StubAuthController(state)),
];

final _signedIn = AuthAuthenticated(
  const AuthUser(userId: 'u1', email: 'driver@example.com'),
);

void main() {
  final config = AppEnvironmentConfig.forName('local');

  testWidgets('authenticated shell presents the ready foundation state', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Loopin'), findsOneWidget);
    expect(find.text('Ha Noi to Ha Long'), findsOneWidget);
    expect(find.text('Rear section observing'), findsOneWidget);
    expect(find.text('Join TRIP001'), findsOneWidget);
    expect(find.text('LOCAL'), findsOneWidget);
  });

  testWidgets('unauthenticated users land on the sign-in screen', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        overrides: _auth(const AuthUnauthenticated()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Create an account'), findsOneWidget);
  });

  testWidgets('ready workspace explains server-authorized live guidance', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Server approved'), findsOneWidget);
    expect(
      find.textContaining('Regroup navigation appears only after the leader'),
      findsOneWidget,
    );
    expect(find.text('Control API'), findsOneWidget);
    expect(find.text('Telemetry path'), findsOneWidget);
    expect(find.text('Realtime graph'), findsOneWidget);
  });

  testWidgets('driver workspace keeps mobile as capture and queue surface', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Trip-scoped location consent'), findsOneWidget);
    expect(find.text('Offline buffer'), findsOneWidget);
    expect(
      find.text('Ordered telemetry waits in SQLite when disconnected.'),
      findsOneWidget,
    );
  });

  testWidgets('non-production environment has one concise announcement', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        LoopinApp(
          config: config,
          initialState: AppViewState.ready,
          overrides: _auth(_signedIn),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        tester.getSemantics(find.text('LOCAL')).label,
        'local environment',
      );
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('production does not expose an environment badge', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: AppEnvironmentConfig.forName('prod'),
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('PROD'), findsNothing);
  });

  for (final scenario in <({AppViewState state, String message})>[
    (state: AppViewState.loading, message: 'Preparing your trip'),
    (state: AppViewState.error, message: 'Loopin needs attention'),
    (state: AppViewState.degraded, message: 'Connection is limited'),
  ]) {
    testWidgets('presents an explicit ${scenario.state.name} state', (
      tester,
    ) async {
      await tester.pumpWidget(
        LoopinApp(
          config: config,
          initialState: scenario.state,
          overrides: _auth(_signedIn),
        ),
      );
      await tester.pump();

      expect(find.text(scenario.message), findsOneWidget);
    });
  }

  testWidgets('degraded state explains offline delivery', (tester) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.degraded,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pump();

    expect(
      find.text('Saved updates will send when the connection returns.'),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.cloud_off_outlined), findsOneWidget);
  });
}
