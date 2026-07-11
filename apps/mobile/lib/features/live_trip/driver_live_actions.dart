import '../../contracts/generated/loopin_contracts.dart';

enum DriverIssueKind {
  routeBlocked,
  hazardObserved,
  vehicleProblem,
  appProblem,
}

enum AlertHapticPattern { notice, urgent }

abstract interface class DriverAlertFeedback {
  Future<void> speak(String message);

  Future<void> haptic(AlertHapticPattern pattern);
}

final class DriverLiveCommand {
  const DriverLiveCommand({
    required this.commandId,
    required this.idempotencyKey,
    required this.tripId,
    required this.memberId,
    required this.type,
    required this.occurredAt,
    required this.payload,
  });

  final String commandId;
  final String idempotencyKey;
  final String tripId;
  final String memberId;
  final String type;
  final DateTime occurredAt;
  final Map<String, Object?> payload;

  Map<String, Object?> toJson() => <String, Object?>{
    'schemaVersion': 1,
    'commandId': commandId,
    'idempotencyKey': idempotencyKey,
    'tripId': tripId,
    'memberId': memberId,
    'type': type,
    'occurredAt': occurredAt.toIso8601String(),
    'payload': payload,
  };
}

final class DriverActionBuilder {
  const DriverActionBuilder();

  DriverAlertAcknowledgementV1 acknowledgeAlert({
    required DriverAlertV1 alert,
    required String memberId,
    required DateTime acknowledgedAt,
  }) {
    return DriverAlertAcknowledgementV1(
      schemaVersion: 1.0,
      acknowledgementId: 'ack:${alert.notification.notificationId}',
      alertId: alert.alertId,
      notificationId: alert.notification.notificationId,
      tripId: alert.tripId,
      memberId: memberId,
      acknowledgedAt: acknowledgedAt,
      idempotencyKey: 'ack:${alert.notification.notificationId}',
    );
  }

  DriverLiveCommand reportIssue({
    required String tripId,
    required String memberId,
    required DriverIssueKind kind,
    required String note,
    required DateTime occurredAt,
  }) {
    final issue = kind.name;
    return DriverLiveCommand(
      commandId: 'issue:$tripId:$memberId:${occurredAt.toIso8601String()}',
      idempotencyKey:
          'issue:$tripId:$memberId:$issue:${occurredAt.toIso8601String()}',
      tripId: tripId,
      memberId: memberId,
      type: 'driverIssueReported',
      occurredAt: occurredAt,
      payload: <String, Object?>{'kind': issue, 'note': note},
    );
  }

  DriverLiveCommand leaveFormation({
    required String tripId,
    required String memberId,
    required DateTime occurredAt,
  }) {
    return DriverLiveCommand(
      commandId: 'leave:$tripId:$memberId:${occurredAt.toIso8601String()}',
      idempotencyKey: 'leave:$tripId:$memberId',
      tripId: tripId,
      memberId: memberId,
      type: 'driverLeftFormation',
      occurredAt: occurredAt,
      payload: const <String, Object?>{
        'driverGuidance':
            'Leave formation only after choosing a safe, verified place to do so.',
      },
    );
  }
}

final class LiveAlertPresenter {
  const LiveAlertPresenter({required this.feedback});

  final DriverAlertFeedback feedback;

  Future<void> present(DriverAlertV1 alert) async {
    if (alert.notification.channels.contains(Channel.VOICE)) {
      await feedback.speak(alert.notification.message);
    }
    if (alert.notification.channels.contains(Channel.HAPTIC)) {
      await feedback.haptic(
        alert.notification.severity == NotificationRequestV1Severity.HIGH
            ? AlertHapticPattern.urgent
            : AlertHapticPattern.notice,
      );
    }
  }
}
