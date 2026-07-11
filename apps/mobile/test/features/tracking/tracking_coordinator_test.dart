import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/contracts/generated/loopin_contracts.dart';
import 'package:loopin_mobile/features/tracking/tracking_coordinator.dart';

void main() {
  test('builds generated telemetry with monotonic member sequence numbers', () {
    final coordinator = TrackingCoordinator(
      session: const TrackingSession(
        tripId: 'TRIP001',
        memberId: 'M004',
        deviceId: 'device:M004',
      ),
      now: () => DateTime.parse('2026-07-20T00:00:05.000Z'),
    );

    final first = coordinator.capture(
      const LocationObservation(
        latitude: 21.0285,
        longitude: 105.8542,
        accuracyMeters: 8,
        speedKmh: 70,
        headingDegrees: 90,
        batteryPercent: 72,
        observedAt: '2026-07-20T00:00:00.000Z',
      ),
    );
    final second = coordinator.capture(
      const LocationObservation(
        latitude: 21.0286,
        longitude: 105.8543,
        accuracyMeters: 9,
        speedKmh: 71,
        headingDegrees: 91,
        batteryPercent: 71,
        observedAt: '2026-07-20T00:00:05.000Z',
      ),
    );

    expect(first.sequence, 1);
    expect(second.sequence, 2);
    expect(first.eventId, 'telemetry:TRIP001:M004:1');
    expect(first.networkQuality, NetworkQuality.GOOD);
    expect(first.source, LocationTelemetryV1Source.GPS);
  });

  test('offline queue deduplicates and drains telemetry in sequence order', () {
    final queue = OrderedTelemetryQueue(maxEntries: 3);
    final coordinator = TrackingCoordinator(
      session: const TrackingSession(
        tripId: 'TRIP001',
        memberId: 'M004',
        deviceId: 'device:M004',
      ),
      now: () => DateTime.parse('2026-07-20T00:00:05.000Z'),
    );
    final first = coordinator.capture(
      const LocationObservation(
        latitude: 21.0285,
        longitude: 105.8542,
        accuracyMeters: 8,
        speedKmh: 70,
        headingDegrees: 90,
        batteryPercent: 72,
        observedAt: '2026-07-20T00:00:00.000Z',
      ),
      networkQuality: NetworkQuality.OFFLINE_REPLAY,
    );
    final second = coordinator.capture(
      const LocationObservation(
        latitude: 21.0286,
        longitude: 105.8543,
        accuracyMeters: 8,
        speedKmh: 70,
        headingDegrees: 90,
        batteryPercent: 72,
        observedAt: '2026-07-20T00:00:05.000Z',
      ),
      networkQuality: NetworkQuality.OFFLINE_REPLAY,
    );

    expect(queue.enqueue(second), isTrue);
    expect(queue.enqueue(first), isTrue);
    expect(queue.enqueue(first), isFalse);
    expect(queue.drain().map((item) => item.sequence), [1, 2]);
    expect(queue.isEmpty, isTrue);
  });

  test(
    'packages telemetry for MQTT or WSS publish without changing safety semantics',
    () {
      final coordinator = TrackingCoordinator(
        session: const TrackingSession(
          tripId: 'TRIP001',
          memberId: 'M004',
          deviceId: 'device:M004',
        ),
        now: () => DateTime.parse('2026-07-20T00:00:10.000Z'),
      );
      final telemetry = coordinator.capture(
        const LocationObservation(
          latitude: 21.0285,
          longitude: 105.8542,
          accuracyMeters: 8,
          speedKmh: 70,
          headingDegrees: 90,
          batteryPercent: 72,
          observedAt: '2026-07-20T00:00:00.000Z',
        ),
        networkQuality: NetworkQuality.OFFLINE_REPLAY,
      );

      final input = coordinator.packageForPublish(
        telemetry,
        transport: TelemetryTransportKind.mqtt,
        queuedAt: DateTime.parse('2026-07-20T00:00:01.000Z'),
        offlineQueueDepth: 2,
      );

      expect(input.transport, Transport.MQTT);
      expect(input.telemetry.eventId, telemetry.eventId);
      expect(input.telemetry.networkQuality, NetworkQuality.OFFLINE_REPLAY);
      expect(input.offlineQueueDepth, 2);
      expect(input.publishedAt, DateTime.parse('2026-07-20T00:00:10.000Z'));
    },
  );
}
