import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logging/logging.dart';

import 'location_service.dart';
import 'tracking_coordinator.dart';

final _log = Logger('TelemetryController');

final telemetryControllerProvider = NotifierProvider<TelemetryController, bool>(
  TelemetryController.new,
);

class TelemetryController extends Notifier<bool> {
  StreamSubscription<LocationObservation>? _subscription;
  TrackingCoordinator? _coordinator;

  @override
  bool build() {
    ref.onDispose(() => _subscription?.cancel());
    return false; // Not tracking by default
  }

  Future<void> startTracking({
    required String tripId,
    required String memberId,
    required String deviceId,
  }) async {
    final locationService = ref.read(locationServiceProvider);
    final hasPermission = await locationService.checkPermissions();
    if (!hasPermission) {
      _log.warning('Location permissions denied');
      return;
    }

    _coordinator = TrackingCoordinator(
      session: TrackingSession(
        tripId: tripId,
        memberId: memberId,
        deviceId: deviceId,
      ),
      now: DateTime.now,
    );

    _subscription?.cancel();
    _subscription = locationService.locationStream.listen((observation) {
      _handleObservation(observation);
    });

    state = true;
    _log.info('Started telemetry tracking for trip $tripId');
  }

  void stopTracking() {
    _subscription?.cancel();
    _subscription = null;
    state = false;
    _log.info('Stopped telemetry tracking');
  }

  void _handleObservation(LocationObservation observation) {
    if (_coordinator == null) return;

    final telemetry = _coordinator!.capture(observation);
    _coordinator!.packageForPublish(
      telemetry,
      transport: TelemetryTransportKind.wss, // Default to WSS for now
      offlineQueueDepth: 0,
    );

    // TODO: Publish to actual transport
    _log.fine('Telemetry captured: ${observation.latitude}, ${observation.longitude}');
    _log.info('SEND TELEMETRY: ${observation.latitude}, ${observation.longitude} (Dist/Time threshold met)');
  }
}
