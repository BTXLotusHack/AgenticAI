import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/contracts/generated/loopin_contracts.dart';
import 'package:loopin_mobile/features/live_trip/live_trip_view_model.dart';

Map<String, dynamic> _graph(String state) => {
  'tripId': 'TRIP001',
  'leaderMemberId': 'M001',
  'graphRevision': 9,
  'calculatedAt': '2026-07-20T00:30:01.000Z',
  'overallState': state,
  'orderedMemberIds': ['M001', 'M002', 'M003', 'M004'],
  'edges': <Map<String, dynamic>>[],
  'components': <Map<String, dynamic>>[],
  'policyVersion': 'convoy-v1',
};

Map<String, dynamic> _member(String memberId, String connectivity) => {
  'memberId': memberId,
  'tripId': 'TRIP001',
  'role': memberId == 'M001' ? 'leader' : 'member',
  'latitude': 21.0285,
  'longitude': 105.8542,
  'snappedLatitude': 21.0285,
  'snappedLongitude': 105.8542,
  'routeProgressMeters': memberId == 'M004' ? 10900 : 11800,
  'routeDeviationMeters': 0,
  'speedKmh': 70,
  'headingDegrees': 90,
  'accuracyMeters': 5,
  'observedAt': '2026-07-20T00:30:00.000Z',
  'receivedAt': '2026-07-20T00:30:01.000Z',
  'sequence': 304,
  'sourceTelemetryEventId': 'gps:30:$memberId',
  'confidence': 'high',
  'connectivity': connectivity,
  'policyVersion': 'convoy-v1',
};

LiveSnapshotV1 _snapshot({
  required String overallState,
  required List<Map<String, dynamic>> notifications,
}) {
  return LiveSnapshotV1.fromJson({
    'schemaVersion': 1,
    'tripId': 'TRIP001',
    'snapshotRevision': 9,
    'generatedAt': '2026-07-20T00:30:01.000Z',
    'viewer': {'memberId': 'M004', 'role': 'member'},
    'members': [_member('M001', 'healthy'), _member('M004', 'healthy')],
    'graph': _graph(overallState),
    'situations': <Map<String, dynamic>>[],
    'recommendations': <Map<String, dynamic>>[],
    'notifications': notifications,
  });
}

void main() {
  test('renders only the member authorized safe alert from a split snapshot', () {
    final snapshot = _snapshot(
      overallState: 'split',
      notifications: [
        {
          'notificationId': 'notification:split:M004',
          'dedupeKey': 'split:M004',
          'situationId': 'split:TRIP001:M003:M004',
          'recipientMemberId': 'M004',
          'locale': 'en',
          'audience': 'rear-boundary',
          'severity': 'high',
          'message':
              'The front section is about 900 m ahead. Maintain a safe pace and do not rush to catch up.',
          'graphRevision': 9,
          'createdAt': '2026-07-20T00:30:01.000Z',
          'expiresAt': '2026-07-20T00:35:01.000Z',
          'channels': ['visual', 'voice', 'haptic'],
        },
      ],
    );

    final presentation = LiveTripPresentation.fromSnapshot(
      snapshot,
      memberId: 'M004',
      now: DateTime.parse('2026-07-20T00:30:06.000Z'),
    );

    expect(presentation.statusLabel, 'Split');
    expect(presentation.primaryAction, contains('Maintain a safe pace'));
    expect(
      presentation.primaryAction,
      isNot(contains(RegExp('speed up|brake suddenly', caseSensitive: false))),
    );
    expect(presentation.confidenceLabel, 'High confidence');
    expect(presentation.freshnessLabel, 'Updated 5s ago');
    expect(presentation.requiresAcknowledgement, isTrue);
  });

  test(
    'falls back to a deterministic safe message when there is no member alert',
    () {
      final snapshot = _snapshot(overallState: 'degraded', notifications: []);

      final presentation = LiveTripPresentation.fromSnapshot(
        snapshot,
        memberId: 'M004',
        now: DateTime.parse('2026-07-20T00:30:45.000Z'),
      );

      expect(presentation.statusLabel, 'Degraded');
      expect(
        presentation.primaryAction,
        'Continue safely on the planned route while Loopin refreshes location quality.',
      );
      expect(presentation.connectivityLabel, 'Healthy');
    },
  );
}
