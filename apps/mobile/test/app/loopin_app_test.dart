import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/app/app_environment.dart';
import 'package:loopin_mobile/app/loopin_app.dart';

void main() {
  final config = AppEnvironmentConfig.forName('local');

  testWidgets('router shell presents the ready foundation state', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(config: config, initialState: AppViewState.ready),
    );
    await tester.pumpAndSettle();

    expect(find.text('Loopin'), findsOneWidget);
    expect(find.text('Ready for a safer group drive'), findsOneWidget);
    expect(find.text('LOCAL'), findsOneWidget);
  });

  testWidgets('non-production environment has one concise announcement', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        LoopinApp(config: config, initialState: AppViewState.ready),
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
        LoopinApp(config: config, initialState: scenario.state),
      );
      await tester.pump();

      expect(find.text(scenario.message), findsOneWidget);
    });
  }

  testWidgets('degraded state explains offline delivery', (tester) async {
    await tester.pumpWidget(
      LoopinApp(config: config, initialState: AppViewState.degraded),
    );
    await tester.pump();

    expect(
      find.text('Saved updates will send when the connection returns.'),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.cloud_off_outlined), findsOneWidget);
  });
}
