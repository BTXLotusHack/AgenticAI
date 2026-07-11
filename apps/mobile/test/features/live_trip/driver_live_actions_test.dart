import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/contracts/generated/loopin_contracts.dart';
import 'package:loopin_mobile/features/live_trip/driver_live_actions.dart';

DriverAlertV1 _alert({String severity = 'high'}) {
  return DriverAlertV1.fromJson({
    'schemaVersion': 1,
    'alertId': 'alert:notification:1',
    'tripId': 'TRIP001',
    'recipientMemberId': 'M004',
    'issuedAt': '2026-07-20T00:30:01.000Z',
    'expiresAt': '2026-07-20T00:35:01.000Z',
    'requiresAcknowledgement': severity != 'info',
    'notification': {
      'notificationId': 'notification:1',
      'dedupeKey': 'split:M004',
      'situationId': 'split:TRIP001:M003:M004',
      'recipientMemberId': 'M004',
      'locale': 'en',
      'audience': 'rear-boundary',
      'severity': severity,
      'message':
          'The front section is about 900 m ahead. Maintain a safe pace and do not rush to catch up.',
      'graphRevision': 9,
      'createdAt': '2026-07-20T00:30:01.000Z',
      'expiresAt': '2026-07-20T00:35:01.000Z',
      'channels': ['voice', 'haptic', 'visual'],
    },
  });
}

final class _FeedbackFake implements DriverAlertFeedback {
  final spoken = <String>[];
  final haptics = <AlertHapticPattern>[];

  @override
  Future<void> haptic(AlertHapticPattern pattern) async {
    haptics.add(pattern);
  }

  @override
  Future<void> speak(String message) async {
    spoken.add(message);
  }
}

void main() {
  test('builds idempotent alert acknowledgements from generated contracts', () {
    const builder = DriverActionBuilder();
    final acknowledgedAt = DateTime.parse('2026-07-20T00:30:06.000Z');

    final acknowledgement = builder.acknowledgeAlert(
      alert: _alert(),
      memberId: 'M004',
      acknowledgedAt: acknowledgedAt,
    );

    expect(acknowledgement.alertId, 'alert:notification:1');
    expect(acknowledgement.notificationId, 'notification:1');
    expect(acknowledgement.idempotencyKey, 'ack:notification:1');
    expect(acknowledgement.acknowledgedAt, acknowledgedAt);
  });

  test('builds report issue and leave formation commands with safe copy', () {
    const builder = DriverActionBuilder();
    final occurredAt = DateTime.parse('2026-07-20T00:30:06.000Z');

    final issue = builder.reportIssue(
      tripId: 'TRIP001',
      memberId: 'M004',
      kind: DriverIssueKind.routeBlocked,
      note: 'Road work ahead',
      occurredAt: occurredAt,
    );
    final leave = builder.leaveFormation(
      tripId: 'TRIP001',
      memberId: 'M004',
      occurredAt: occurredAt,
    );

    expect(issue.type, 'driverIssueReported');
    expect(issue.payload['kind'], 'routeBlocked');
    expect(leave.type, 'driverLeftFormation');
    expect(
      leave.payload['driverGuidance'],
      'Leave formation only after choosing a safe, verified place to do so.',
    );
  });

  test(
    'presents alerts through TTS and haptic adapters without unsafe wording',
    () async {
      final feedback = _FeedbackFake();
      final presenter = LiveAlertPresenter(feedback: feedback);

      await presenter.present(_alert());

      expect(feedback.spoken.single, contains('Maintain a safe pace'));
      expect(
        feedback.spoken.single,
        isNot(
          contains(RegExp('speed up|brake suddenly', caseSensitive: false)),
        ),
      );
      expect(feedback.haptics.single, AlertHapticPattern.urgent);
    },
  );
}
