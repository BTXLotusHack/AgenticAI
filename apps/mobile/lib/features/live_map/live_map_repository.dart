import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../api/api_client.dart';
import 'live_map_models.dart';

final liveMapRepositoryProvider = Provider<LiveMapRepository>((ref) {
  return LiveMapRepository(ref.watch(apiClientProvider));
});

final class LiveMapRepository {
  const LiveMapRepository(this._client);

  final LoopinApiClient _client;

  Future<LiveMapState?> fetchSnapshot(String tripId) async {
    final response = await _client.get(
      'teams/${Uri.encodeComponent(tripId)}/live-snapshot',
    );
    final rawSnapshot = response['snapshot'];
    if (rawSnapshot == null) return null;
    final snapshot = _asMap(rawSnapshot, 'live snapshot');
    return liveMapStateFromSnapshot(snapshot);
  }
}

LiveMapState liveMapStateFromSnapshot(Map<String, Object?> snapshot) {
  final graph = _asMap(snapshot['graph'], 'graph');
  final members = _asList(snapshot['members'], 'members')
      .map((raw) => _memberFromJson(_asMap(raw, 'member')))
      .toList(growable: false);
  final links = _asList(
    graph['edges'],
    'edges',
  ).map((raw) => _linkFromJson(_asMap(raw, 'edge'))).toList(growable: false);
  return LiveMapState(
    status: LiveMapConnectionStatus.connected,
    tripId: _readString(snapshot, 'tripId'),
    snapshotRevision: _readInt(snapshot, 'snapshotRevision'),
    graphRevision: _readInt(graph, 'graphRevision'),
    overallState: _readString(graph, 'overallState'),
    members: members,
    links: links,
    lastUpdate: DateTime.tryParse(_readString(snapshot, 'generatedAt')),
  );
}

Map<String, Object?> liveMapJsonObject(Object? raw, String label) {
  if (raw is String) {
    final decoded = jsonDecode(raw);
    return _asMap(decoded, label);
  }
  return _asMap(raw, label);
}

LiveMapMember _memberFromJson(Map<String, Object?> json) {
  return LiveMapMember(
    memberId: _readString(json, 'memberId'),
    point: LatLng(
      _readDouble(json, 'snappedLatitude', fallbackKey: 'latitude'),
      _readDouble(json, 'snappedLongitude', fallbackKey: 'longitude'),
    ),
    accuracyMeters: _readDouble(json, 'accuracyMeters'),
    confidenceLabel: _readString(json, 'confidence'),
    connectivityLabel: _readString(json, 'connectivity'),
    observedAt: DateTime.parse(_readString(json, 'observedAt')),
    routeProgressMeters: _readDouble(json, 'routeProgressMeters'),
    headingDegrees: _readNullableDouble(json, 'headingDegrees'),
    speedKmh: _readNullableDouble(json, 'speedKmh'),
  );
}

LiveMapLink _linkFromJson(Map<String, Object?> json) {
  return LiveMapLink(
    aheadMemberId: _readString(json, 'aheadMemberId'),
    behindMemberId: _readString(json, 'behindMemberId'),
    state: _linkStateFromWire(_readString(json, 'state')),
    routeGapMeters: _readDouble(json, 'routeGapMeters'),
  );
}

LiveMapLinkState _linkStateFromWire(String value) {
  return switch (value) {
    'connected' => LiveMapLinkState.connected,
    'stretched' => LiveMapLinkState.stretched,
    'split' || 'broken' => LiveMapLinkState.split,
    _ => LiveMapLinkState.degraded,
  };
}

Map<String, Object?> _asMap(Object? raw, String label) {
  if (raw is Map<String, Object?>) return raw;
  if (raw is Map) return raw.cast<String, Object?>();
  throw FormatException('Invalid $label payload.');
}

List<Object?> _asList(Object? raw, String label) {
  if (raw is List<Object?>) return raw;
  if (raw is List) return raw.cast<Object?>();
  throw FormatException('Invalid $label payload.');
}

String _readString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Missing $key.');
}

int _readInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('Missing $key.');
}

double _readDouble(
  Map<String, Object?> json,
  String key, {
  String? fallbackKey,
}) {
  final value = json[key] ?? (fallbackKey == null ? null : json[fallbackKey]);
  if (value is num) return value.toDouble();
  throw FormatException('Missing $key.');
}

double? _readNullableDouble(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is num) return value.toDouble();
  throw FormatException('Invalid $key.');
}
