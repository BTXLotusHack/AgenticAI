import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:logging/logging.dart';

import '../../groups/group_notifications.dart';
import 'live_map_models.dart';
import 'live_map_realtime.dart';
import 'live_map_repository.dart';

final _log = Logger('LiveMapController');

final liveMapControllerProvider =
    NotifierProvider<LiveMapController, LiveMapState>(LiveMapController.new);

final class LiveMapController extends Notifier<LiveMapState> {
  StreamSubscription<Map<String, Object?>>? _subscription;
  Timer? _simulationTimer;
  var _simulationTick = 0;

  @override
  LiveMapState build() {
    ref.onDispose(_dispose);
    return const LiveMapState();
  }

  Future<void> connect(String tripId) async {
    await _stopActiveStreams();
    state = state.copyWith(
      status: LiveMapConnectionStatus.connecting,
      tripId: tripId,
      clearError: true,
    );
    try {
      final snapshot = await ref
          .read(liveMapRepositoryProvider)
          .fetchSnapshot(tripId);
      if (snapshot != null) {
        state = snapshot.copyWith(status: LiveMapConnectionStatus.connected);
      } else {
        state = state.copyWith(
          status: LiveMapConnectionStatus.connected,
          overallState: 'waiting for live telemetry',
          lastUpdate: DateTime.now(),
        );
      }
      _subscription = ref
          .read(liveMapRealtimeClientProvider)
          .subscribe(tripId)
          .listen(
            _handleRealtimeEvent,
            onError: (Object error) {
              _log.warning('Realtime error: $error');
              state = state.copyWith(
                status: LiveMapConnectionStatus.degraded,
                errorMessage:
                    'Realtime link degraded: $error',
              );
            },
          );
    } catch (e) {
      _log.severe('Connection failed: $e');
      state = state.copyWith(
        status: LiveMapConnectionStatus.degraded,
        errorMessage: 'Could not connect to live map for $tripId: $e',
      );
    }
  }

  void startSimulation() {
    _stopActiveStreams();
    _simulationTick = 0;
    state = _simulatedState(0).copyWith(
      status: LiveMapConnectionStatus.simulating,
      focusedMemberId: 'M004',
    );
    _simulationTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      _simulationTick += 1;
      final next = _simulatedState(_simulationTick);
      state = next.copyWith(
        status: LiveMapConnectionStatus.simulating,
        focusedMemberId: state.focusedMemberId,
        alerts: state.alerts,
      );
      if (_simulationTick == 3) {
        _addAlert(
          title: 'Split observed',
          message: 'Server marked the rear section with lower freshness.',
          memberId: 'M004',
        );
      }
    });
  }

  Future<void> stop() async {
    await _stopActiveStreams();
    state = state.copyWith(status: LiveMapConnectionStatus.disconnected);
  }

  void focusMember(String memberId) {
    state = state.copyWith(focusedMemberId: memberId);
  }

  Future<void> _handleRealtimeEvent(Map<String, Object?> event) async {
    final tripId = event['tripId'] as String?;
    final eventType = event['eventType'] as String?;
    final payload = liveMapJsonObject(event['payload'], 'realtime payload');

    if (tripId == null || eventType == null) return;

    if (eventType == 'liveSnapshotUpdated') {
      final snapshot = await ref
          .read(liveMapRepositoryProvider)
          .fetchSnapshot(tripId);
      if (snapshot != null &&
          snapshot.snapshotRevision >= state.snapshotRevision) {
        state = snapshot.copyWith(
          status: LiveMapConnectionStatus.connected,
          focusedMemberId: state.focusedMemberId,
          alerts: state.alerts,
        );
      }
      return;
    }

    if (eventType == 'driverAlertIssued') {
      final notification = liveMapJsonObject(
        payload['notification'],
        'driver alert notification',
      );
      final memberId =
          payload['recipientMemberId'] as String? ??
          notification['recipientMemberId'] as String?;
      _addAlert(
        title: 'Driver alert',
        message:
            notification['message'] as String? ?? 'Open live map for details.',
        memberId: memberId,
      );
      return;
    }

    if (eventType == 'convoySituationCreated' ||
        eventType == 'convoySituationUpdated' ||
        eventType == 'regroupCandidateSelected') {
      _addAlert(
        title: _titleForEvent(eventType),
        message: 'Server updated the live convoy state.',
      );
    }
  }

  String _titleForEvent(String eventType) {
    return switch (eventType) {
      'convoySituationCreated' => 'Situation confirmed',
      'convoySituationUpdated' => 'Situation updated',
      'regroupCandidateSelected' => 'Regroup candidate selected',
      _ => 'Live update',
    };
  }

  void _addAlert({
    required String title,
    required String message,
    String? memberId,
  }) {
    final alert = LiveMapAlert(
      id: '${DateTime.now().microsecondsSinceEpoch}:$title',
      title: title,
      message: message,
      memberId: memberId,
      createdAt: DateTime.now(),
    );
    state = state.copyWith(
      alerts: <LiveMapAlert>[alert, ...state.alerts].take(8).toList(),
      focusedMemberId: memberId ?? state.focusedMemberId,
    );
    ref
        .read(groupNotificationsProvider.notifier)
        .push(
          title: title,
          body: message,
          teamId: state.tripId,
          memberId: memberId,
        );
  }

  LiveMapState _simulatedState(int tick) {
    final now = DateTime.now();
    // Path: Hanoi center heading North-East
    final base = <LatLng>[
      const LatLng(21.0279, 105.8342), // Leader
      const LatLng(21.0270, 105.8335), // Member 2 (Following)
      const LatLng(21.0260, 105.8325), // Member 3 (Rear)
    ];

    final members = <LiveMapMember>[
      for (var i = 0; i < base.length; i++)
        LiveMapMember(
          memberId: i == 0 ? 'LEADER' : 'RIDER-00$i',
          point: LatLng(
            base[i].latitude + (tick * 0.0005), // Moving North
            base[i].longitude + (tick * 0.0008) + (i == 2 && tick > 10 ? - (tick - 10) * 0.0002 : 0), // Member 3 drifts away after tick 10
          ),
          accuracyMeters: i == 2 && tick > 10 ? 35 : 10,
          confidenceLabel: i == 2 && tick > 12 ? 'low' : 'high',
          connectivityLabel: i == 2 && tick > 15 ? 'degraded' : 'healthy',
          observedAt: now.subtract(
            Duration(seconds: i == 2 && tick > 15 ? 12 : 2),
          ),
          routeProgressMeters: 500 + (tick * 20) - (i * 100),
          headingDegrees: 45,
          speedKmh: i == 2 && tick > 10 ? 30 : 50,
        ),
    ];

    bool isSplit = tick > 12;

    return LiveMapState(
      status: LiveMapConnectionStatus.simulating,
      tripId: 'TRIP001',
      snapshotRevision: tick + 1,
      graphRevision: tick + 1,
      overallState: isSplit ? 'split' : 'together',
      members: members,
      links: <LiveMapLink>[
        LiveMapLink(
          aheadMemberId: 'LEADER',
          behindMemberId: 'RIDER-001',
          state: LiveMapLinkState.connected,
          routeGapMeters: 120,
        ),
        LiveMapLink(
          aheadMemberId: 'RIDER-001',
          behindMemberId: 'RIDER-002',
          state: isSplit ? LiveMapLinkState.split : LiveMapLinkState.stretched,
          routeGapMeters: isSplit ? 800 : 250,
        ),
      ],
      lastUpdate: now,
    );
  }

  Future<void> _stopActiveStreams() async {
    _simulationTimer?.cancel();
    _simulationTimer = null;
    await _subscription?.cancel();
    _subscription = null;
  }

  void _dispose() {
    _simulationTimer?.cancel();
    _subscription?.cancel();
  }
}
