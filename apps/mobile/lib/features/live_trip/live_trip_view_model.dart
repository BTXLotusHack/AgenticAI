import '../../contracts/generated/loopin_contracts.dart';

final class LiveTripPresentation {
  const LiveTripPresentation({
    required this.statusLabel,
    required this.primaryAction,
    required this.confidenceLabel,
    required this.connectivityLabel,
    required this.freshnessLabel,
    required this.requiresAcknowledgement,
  });

  final String statusLabel;
  final String primaryAction;
  final String confidenceLabel;
  final String connectivityLabel;
  final String freshnessLabel;
  final bool requiresAcknowledgement;

  factory LiveTripPresentation.fromSnapshot(
    LiveSnapshotV1 snapshot, {
    required String memberId,
    required DateTime now,
  }) {
    final member = snapshot.members.firstWhere(
      (candidate) => candidate.memberId == memberId,
      orElse: () => snapshot.members.first,
    );
    final notification = _currentNotification(snapshot, memberId, now);

    return LiveTripPresentation(
      statusLabel: _stateLabel(snapshot.graph.overallState),
      primaryAction:
          notification?.message ?? _fallbackAction(snapshot.graph.overallState),
      confidenceLabel: _confidenceLabel(member.confidence),
      connectivityLabel: _connectivityLabel(member.connectivity),
      freshnessLabel: _freshnessLabel(member.receivedAt, now),
      requiresAcknowledgement:
          notification != null &&
          notification.severity != NotificationRequestV1Severity.INFO,
    );
  }
}

NotificationElement? _currentNotification(
  LiveSnapshotV1 snapshot,
  String memberId,
  DateTime now,
) {
  final candidates =
      snapshot.notifications
          .where((notification) => notification.recipientMemberId == memberId)
          .where((notification) => notification.expiresAt.isAfter(now))
          .toList()
        ..sort((left, right) => right.createdAt.compareTo(left.createdAt));
  return candidates.firstOrNull;
}

String _stateLabel(OverallState state) {
  return switch (state) {
    OverallState.TOGETHER => 'Together',
    OverallState.STRETCHED => 'Stretched',
    OverallState.SPLIT => 'Split',
    OverallState.DEGRADED => 'Degraded',
  };
}

String _fallbackAction(OverallState state) {
  return switch (state) {
    OverallState.TOGETHER => 'Continue safely on the planned route.',
    OverallState.STRETCHED =>
      'Maintain a safe pace and wait for leader guidance.',
    OverallState.SPLIT =>
      'Continue safely on the planned route while the leader coordinates.',
    OverallState.DEGRADED =>
      'Continue safely on the planned route while Loopin refreshes location quality.',
  };
}

String _confidenceLabel(Confidence confidence) {
  return switch (confidence) {
    Confidence.HIGH => 'High confidence',
    Confidence.MEDIUM => 'Medium confidence',
    Confidence.LOW => 'Low confidence',
  };
}

String _connectivityLabel(Connectivity connectivity) {
  return switch (connectivity) {
    Connectivity.HEALTHY => 'Healthy',
    Connectivity.DEGRADED => 'Limited',
    Connectivity.STALE => 'Stale',
    Connectivity.LOST => 'Lost',
  };
}

String _freshnessLabel(DateTime receivedAt, DateTime now) {
  final seconds = now.difference(receivedAt).inSeconds.clamp(0, 59);
  if (seconds < 2) return 'Updated now';
  return 'Updated ${seconds}s ago';
}
