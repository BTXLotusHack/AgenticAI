import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

enum LiveMapConnectionStatus {
  idle,
  connecting,
  connected,
  simulating,
  degraded,
  disconnected,
}

enum LiveMapLinkState { connected, stretched, split, degraded }

final class LiveMapMember {
  const LiveMapMember({
    required this.memberId,
    required this.point,
    required this.accuracyMeters,
    required this.confidenceLabel,
    required this.connectivityLabel,
    required this.observedAt,
    required this.routeProgressMeters,
    this.headingDegrees,
    this.speedKmh,
  });

  final String memberId;
  final LatLng point;
  final double accuracyMeters;
  final String confidenceLabel;
  final String connectivityLabel;
  final DateTime observedAt;
  final double routeProgressMeters;
  final double? headingDegrees;
  final double? speedKmh;

  bool get isFresh => DateTime.now().difference(observedAt).inSeconds <= 15;
}

final class LiveMapLink {
  const LiveMapLink({
    required this.aheadMemberId,
    required this.behindMemberId,
    required this.state,
    required this.routeGapMeters,
  });

  final String aheadMemberId;
  final String behindMemberId;
  final LiveMapLinkState state;
  final double routeGapMeters;
}

final class LiveMapAlert {
  const LiveMapAlert({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    this.memberId,
  });

  final String id;
  final String title;
  final String message;
  final DateTime createdAt;
  final String? memberId;
}

final class LiveMapState {
  const LiveMapState({
    this.status = LiveMapConnectionStatus.idle,
    this.tripId,
    this.snapshotRevision = 0,
    this.graphRevision = 0,
    this.overallState = 'waiting',
    this.members = const <LiveMapMember>[],
    this.links = const <LiveMapLink>[],
    this.alerts = const <LiveMapAlert>[],
    this.focusedMemberId,
    this.lastUpdate,
    this.errorMessage,
  });

  final LiveMapConnectionStatus status;
  final String? tripId;
  final int snapshotRevision;
  final int graphRevision;
  final String overallState;
  final List<LiveMapMember> members;
  final List<LiveMapLink> links;
  final List<LiveMapAlert> alerts;
  final String? focusedMemberId;
  final DateTime? lastUpdate;
  final String? errorMessage;

  LatLng get center {
    final focused = focusedMember;
    if (focused != null) return focused.point;
    if (members.isEmpty) return const LatLng(21.0285, 105.8542);
    final lat =
        members.map((member) => member.point.latitude).reduce((a, b) => a + b) /
        members.length;
    final lng =
        members
            .map((member) => member.point.longitude)
            .reduce((a, b) => a + b) /
        members.length;
    return LatLng(lat, lng);
  }

  LiveMapMember? get focusedMember {
    final id = focusedMemberId;
    if (id == null) return null;
    for (final member in members) {
      if (member.memberId == id) return member;
    }
    return null;
  }

  LiveMapState copyWith({
    LiveMapConnectionStatus? status,
    String? tripId,
    int? snapshotRevision,
    int? graphRevision,
    String? overallState,
    List<LiveMapMember>? members,
    List<LiveMapLink>? links,
    List<LiveMapAlert>? alerts,
    String? focusedMemberId,
    DateTime? lastUpdate,
    String? errorMessage,
    bool clearFocus = false,
    bool clearError = false,
  }) {
    return LiveMapState(
      status: status ?? this.status,
      tripId: tripId ?? this.tripId,
      snapshotRevision: snapshotRevision ?? this.snapshotRevision,
      graphRevision: graphRevision ?? this.graphRevision,
      overallState: overallState ?? this.overallState,
      members: members ?? this.members,
      links: links ?? this.links,
      alerts: alerts ?? this.alerts,
      focusedMemberId: clearFocus
          ? null
          : focusedMemberId ?? this.focusedMemberId,
      lastUpdate: lastUpdate ?? this.lastUpdate,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

Color liveMapColorForMember(LiveMapMember member) {
  if (!member.isFresh || member.connectivityLabel != 'healthy') {
    return const Color(0xFFE5A83A);
  }
  if (member.confidenceLabel == 'low') return const Color(0xFF7A827D);
  return const Color(0xFF18724B);
}

Color liveMapColorForLink(LiveMapLinkState state) {
  return switch (state) {
    LiveMapLinkState.connected => const Color(0xFF18724B),
    LiveMapLinkState.stretched => const Color(0xFFE5A83A),
    LiveMapLinkState.split => const Color(0xFFB42318),
    LiveMapLinkState.degraded => const Color(0xFF7A827D),
  };
}
