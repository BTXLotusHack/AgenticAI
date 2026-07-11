import '../../contracts/generated/loopin_contracts.dart';

typedef Clock = DateTime Function();

enum TelemetryTransportKind { mqtt, wss, simulator }

abstract interface class TelemetryTransport {
  Future<void> publish(MemberTelemetryInputV1 input);
}

final class TrackingSession {
  const TrackingSession({
    required this.tripId,
    required this.memberId,
    required this.deviceId,
  });

  final String tripId;
  final String memberId;
  final String deviceId;
}

final class LocationObservation {
  const LocationObservation({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.speedKmh,
    required this.headingDegrees,
    required this.batteryPercent,
    required this.observedAt,
  });

  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final double? speedKmh;
  final double? headingDegrees;
  final double? batteryPercent;
  final String observedAt;
}

final class TrackingCoordinator {
  TrackingCoordinator({required this.session, required this.now});

  final TrackingSession session;
  final Clock now;
  int _lastSequence = 0;

  LocationTelemetryV1 capture(
    LocationObservation observation, {
    NetworkQuality networkQuality = NetworkQuality.GOOD,
  }) {
    final sequence = ++_lastSequence;
    return LocationTelemetryV1(
      schemaVersion: 1.0,
      eventId: 'telemetry:${session.tripId}:${session.memberId}:$sequence',
      tripId: session.tripId,
      memberId: session.memberId,
      deviceId: session.deviceId,
      sequence: sequence,
      observedAt: DateTime.parse(observation.observedAt),
      sentAt: now(),
      latitude: observation.latitude,
      longitude: observation.longitude,
      accuracyMeters: observation.accuracyMeters,
      speedKmh: observation.speedKmh,
      headingDegrees: observation.headingDegrees,
      batteryPercent: observation.batteryPercent,
      networkQuality: networkQuality,
      source: LocationTelemetryV1Source.GPS,
    );
  }

  MemberTelemetryInputV1 packageForPublish(
    LocationTelemetryV1 telemetry, {
    required TelemetryTransportKind transport,
    DateTime? queuedAt,
    required int offlineQueueDepth,
  }) {
    return MemberTelemetryInputV1(
      schemaVersion: 1.0,
      telemetry: _toInputTelemetry(telemetry),
      transport: _contractTransport(transport),
      queuedAt: queuedAt,
      publishedAt: now(),
      offlineQueueDepth: offlineQueueDepth,
    );
  }
}

Telemetry _toInputTelemetry(LocationTelemetryV1 source) {
  return Telemetry(
    schemaVersion: source.schemaVersion,
    eventId: source.eventId,
    tripId: source.tripId,
    memberId: source.memberId,
    deviceId: source.deviceId,
    sequence: source.sequence,
    observedAt: source.observedAt,
    sentAt: source.sentAt,
    latitude: source.latitude,
    longitude: source.longitude,
    accuracyMeters: source.accuracyMeters,
    speedKmh: source.speedKmh,
    headingDegrees: source.headingDegrees,
    batteryPercent: source.batteryPercent,
    networkQuality: source.networkQuality,
    source: source.source,
  );
}

Transport _contractTransport(TelemetryTransportKind kind) {
  return switch (kind) {
    TelemetryTransportKind.mqtt => Transport.MQTT,
    TelemetryTransportKind.wss => Transport.WSS,
    TelemetryTransportKind.simulator => Transport.SIMULATOR,
  };
}

final class OrderedTelemetryQueue {
  OrderedTelemetryQueue({required this.maxEntries});

  final int maxEntries;
  final Map<String, LocationTelemetryV1> _items =
      <String, LocationTelemetryV1>{};

  bool get isEmpty => _items.isEmpty;

  bool enqueue(LocationTelemetryV1 telemetry) {
    final key =
        '${telemetry.tripId}:${telemetry.memberId}:${telemetry.sequence}';
    if (_items.containsKey(key) || _items.length >= maxEntries) return false;
    _items[key] = telemetry;
    return true;
  }

  List<LocationTelemetryV1> drain() {
    final values = _items.values.toList()
      ..sort((left, right) {
        final trip = left.tripId.compareTo(right.tripId);
        if (trip != 0) return trip;
        final member = left.memberId.compareTo(right.memberId);
        if (member != 0) return member;
        return left.sequence.compareTo(right.sequence);
      });
    _items.clear();
    return values;
  }
}
