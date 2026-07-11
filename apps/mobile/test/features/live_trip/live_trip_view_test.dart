import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/app/loopin_theme.dart';
import 'package:loopin_mobile/features/live_trip/live_trip_view.dart';
import 'package:loopin_mobile/features/live_trip/live_trip_view_model.dart';

void main() {
  testWidgets('renders a low-distraction member alert with acknowledgement', (
    tester,
  ) async {
    const presentation = LiveTripPresentation(
      statusLabel: 'Split',
      primaryAction:
          'The front section is about 900 m ahead. Maintain a safe pace and do not rush to catch up.',
      confidenceLabel: 'High confidence',
      connectivityLabel: 'Healthy',
      freshnessLabel: 'Updated 5s ago',
      requiresAcknowledgement: true,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: LoopinTheme.light,
        home: Scaffold(
          body: LiveTripView(
            presentation: presentation,
            onAcknowledge: () {},
            onReportIssue: () {},
            onLeaveFormation: () {},
          ),
        ),
      ),
    );

    expect(find.text('Split'), findsOneWidget);
    expect(find.textContaining('Maintain a safe pace'), findsOneWidget);
    expect(find.text('High confidence'), findsOneWidget);
    expect(find.text('Updated 5s ago'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Acknowledge'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Report issue'), findsOneWidget);
    expect(
      find.widgetWithText(OutlinedButton, 'Leave formation'),
      findsOneWidget,
    );
    expect(
      find.textContaining(
        RegExp('speed up|brake suddenly', caseSensitive: false),
      ),
      findsNothing,
    );
  });
}
