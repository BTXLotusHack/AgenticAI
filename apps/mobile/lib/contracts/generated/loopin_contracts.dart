// GENERATED CODE - DO NOT MODIFY BY HAND.
// Source: packages/contracts authoritative Zod schemas (schema version 1).

import 'dart:convert';

void _requireVersionOne(Map<String, dynamic> json, String contractName) {
  if (json['schemaVersion'] != 1) {
    throw FormatException('$contractName requires schemaVersion 1.');
  }
}

LocationTelemetryV1 locationTelemetryV1FromJson(String str) => LocationTelemetryV1.fromJson(json.decode(str));

String locationTelemetryV1ToJson(LocationTelemetryV1 data) => json.encode(data.toJson());

MemberTelemetryInputV1 memberTelemetryInputV1FromJson(String str) => MemberTelemetryInputV1.fromJson(json.decode(str));

String memberTelemetryInputV1ToJson(MemberTelemetryInputV1 data) => json.encode(data.toJson());

EventEnvelopeV1 eventEnvelopeV1FromJson(String str) => EventEnvelopeV1.fromJson(json.decode(str));

String eventEnvelopeV1ToJson(EventEnvelopeV1 data) => json.encode(data.toJson());

ProjectedLocationV1 projectedLocationV1FromJson(String str) => ProjectedLocationV1.fromJson(json.decode(str));

String projectedLocationV1ToJson(ProjectedLocationV1 data) => json.encode(data.toJson());

ConvoyGraphV1 convoyGraphV1FromJson(String str) => ConvoyGraphV1.fromJson(json.decode(str));

String convoyGraphV1ToJson(ConvoyGraphV1 data) => json.encode(data.toJson());

SituationV1 situationV1FromJson(String str) => SituationV1.fromJson(json.decode(str));

String situationV1ToJson(SituationV1 data) => json.encode(data.toJson());

NotificationRequestV1 notificationRequestV1FromJson(String str) => NotificationRequestV1.fromJson(json.decode(str));

String notificationRequestV1ToJson(NotificationRequestV1 data) => json.encode(data.toJson());

LiveMemberSnapshotV1 liveMemberSnapshotV1FromJson(String str) => LiveMemberSnapshotV1.fromJson(json.decode(str));

String liveMemberSnapshotV1ToJson(LiveMemberSnapshotV1 data) => json.encode(data.toJson());

LiveSnapshotV1 liveSnapshotV1FromJson(String str) => LiveSnapshotV1.fromJson(json.decode(str));

String liveSnapshotV1ToJson(LiveSnapshotV1 data) => json.encode(data.toJson());

ConvoySituationEventV1 convoySituationEventV1FromJson(String str) => ConvoySituationEventV1.fromJson(json.decode(str));

String convoySituationEventV1ToJson(ConvoySituationEventV1 data) => json.encode(data.toJson());

DriverAlertV1 driverAlertV1FromJson(String str) => DriverAlertV1.fromJson(json.decode(str));

String driverAlertV1ToJson(DriverAlertV1 data) => json.encode(data.toJson());

DriverAlertAcknowledgementV1 driverAlertAcknowledgementV1FromJson(String str) => DriverAlertAcknowledgementV1.fromJson(json.decode(str));

String driverAlertAcknowledgementV1ToJson(DriverAlertAcknowledgementV1 data) => json.encode(data.toJson());

RealtimeEventV1 realtimeEventV1FromJson(String str) => RealtimeEventV1.fromJson(json.decode(str));

String realtimeEventV1ToJson(RealtimeEventV1 data) => json.encode(data.toJson());

class LocationTelemetryV1 {
    final double accuracyMeters;
    final double? batteryPercent;
    final String deviceId;
    final String eventId;
    final double? headingDegrees;
    final double latitude;
    final double longitude;
    final String memberId;
    final NetworkQuality networkQuality;
    final DateTime observedAt;
    final double schemaVersion;
    final DateTime sentAt;
    final int sequence;
    final Source source;
    final double? speedKmh;
    final String tripId;

    LocationTelemetryV1({
        required this.accuracyMeters,
        required this.batteryPercent,
        required this.deviceId,
        required this.eventId,
        required this.headingDegrees,
        required this.latitude,
        required this.longitude,
        required this.memberId,
        required this.networkQuality,
        required this.observedAt,
        required this.schemaVersion,
        required this.sentAt,
        required this.sequence,
        required this.source,
        required this.speedKmh,
        required this.tripId,
    });

    factory LocationTelemetryV1.fromJson(Map<String, dynamic> json) {
        _requireVersionOne(json, 'LocationTelemetryV1');
        return LocationTelemetryV1(
        accuracyMeters: json["accuracyMeters"]?.toDouble(),
        batteryPercent: json["batteryPercent"]?.toDouble(),
        deviceId: json["deviceId"],
        eventId: json["eventId"],
        headingDegrees: json["headingDegrees"]?.toDouble(),
        latitude: json["latitude"]?.toDouble(),
        longitude: json["longitude"]?.toDouble(),
        memberId: json["memberId"],
        networkQuality: networkQualityValues.map[json["networkQuality"]]!,
        observedAt: DateTime.parse(json["observedAt"]),
        schemaVersion: json["schemaVersion"]?.toDouble(),
        sentAt: DateTime.parse(json["sentAt"]),
        sequence: json["sequence"],
        source: sourceValues.map[json["source"]]!,
        speedKmh: json["speedKmh"]?.toDouble(),
        tripId: json["tripId"],
    );
    }

    Map<String, dynamic> toJson() => {
        "accuracyMeters": accuracyMeters,
        "batteryPercent": batteryPercent,
        "deviceId": deviceId,
        "eventId": eventId,
        "headingDegrees": headingDegrees,
        "latitude": latitude,
        "longitude": longitude,
        "memberId": memberId,
        "networkQuality": networkQualityValues.reverse[networkQuality],
        "observedAt": observedAt.toIso8601String(),
        "schemaVersion": schemaVersion,
        "sentAt": sentAt.toIso8601String(),
        "sequence": sequence,
        "source": sourceValues.reverse[source],
        "speedKmh": speedKmh,
        "tripId": tripId,
    };
}

enum NetworkQuality {
    GOOD,
    OFFLINE_REPLAY,
    WEAK
}

final networkQualityValues = EnumValues({
    "good": NetworkQuality.GOOD,
    "offline-replay": NetworkQuality.OFFLINE_REPLAY,
    "weak": NetworkQuality.WEAK
});

enum Source {
    GPS,
    SIMULATOR
}

final sourceValues = EnumValues({
    "gps": Source.GPS,
    "simulator": Source.SIMULATOR
});

class MemberTelemetryInputV1 {
    final int offlineQueueDepth;
    final DateTime publishedAt;
    final DateTime? queuedAt;
    final double schemaVersion;
    final Telemetry telemetry;
    final Transport transport;

    MemberTelemetryInputV1({
        required this.offlineQueueDepth,
        required this.publishedAt,
        this.queuedAt,
        required this.schemaVersion,
        required this.telemetry,
        required this.transport,
    });

    factory MemberTelemetryInputV1.fromJson(Map<String, dynamic> json) {
        _requireVersionOne(json, 'MemberTelemetryInputV1');
        return MemberTelemetryInputV1(
        offlineQueueDepth: json["offlineQueueDepth"],
        publishedAt: DateTime.parse(json["publishedAt"]),
        queuedAt: json["queuedAt"] == null ? null : DateTime.parse(json["queuedAt"]),
        schemaVersion: json["schemaVersion"]?.toDouble(),
        telemetry: Telemetry.fromJson(json["telemetry"]),
        transport: transportValues.map[json["transport"]]!,
    );
    }

    Map<String, dynamic> toJson() => {
        "offlineQueueDepth": offlineQueueDepth,
        "publishedAt": publishedAt.toIso8601String(),
        "queuedAt": queuedAt?.toIso8601String(),
        "schemaVersion": schemaVersion,
        "telemetry": telemetry.toJson(),
        "transport": transportValues.reverse[transport],
    };
}

class Telemetry {
    final double accuracyMeters;
    final double? batteryPercent;
    final String deviceId;
    final String eventId;
    final double? headingDegrees;
    final double latitude;
    final double longitude;
    final String memberId;
    final NetworkQuality networkQuality;
    final DateTime observedAt;
    final double schemaVersion;
    final DateTime sentAt;
    final int sequence;
    final Source source;
    final double? speedKmh;
    final String tripId;

    Telemetry({
        required this.accuracyMeters,
        required this.batteryPercent,
        required this.deviceId,
        required this.eventId,
        required this.headingDegrees,
        required this.latitude,
        required this.longitude,
        required this.memberId,
        required this.networkQuality,
        required this.observedAt,
        required this.schemaVersion,
        required this.sentAt,
        required this.sequence,
        required this.source,
        required this.speedKmh,
        required this.tripId,
    });

    factory Telemetry.fromJson(Map<String, dynamic> json) => Telemetry(
        accuracyMeters: json["accuracyMeters"]?.toDouble(),
        batteryPercent: json["batteryPercent"]?.toDouble(),
        deviceId: json["deviceId"],
        eventId: json["eventId"],
        headingDegrees: json["headingDegrees"]?.toDouble(),
        latitude: json["latitude"]?.toDouble(),
        longitude: json["longitude"]?.toDouble(),
        memberId: json["memberId"],
        networkQuality: networkQualityValues.map[json["networkQuality"]]!,
        observedAt: DateTime.parse(json["observedAt"]),
        schemaVersion: json["schemaVersion"]?.toDouble(),
        sentAt: DateTime.parse(json["sentAt"]),
        sequence: json["sequence"],
        source: sourceValues.map[json["source"]]!,
        speedKmh: json["speedKmh"]?.toDouble(),
        tripId: json["tripId"],
    );

    Map<String, dynamic> toJson() => {
        "accuracyMeters": accuracyMeters,
        "batteryPercent": batteryPercent,
        "deviceId": deviceId,
        "eventId": eventId,
        "headingDegrees": headingDegrees,
        "latitude": latitude,
        "longitude": longitude,
        "memberId": memberId,
        "networkQuality": networkQualityValues.reverse[networkQuality],
        "observedAt": observedAt.toIso8601String(),
        "schemaVersion": schemaVersion,
        "sentAt": sentAt.toIso8601String(),
        "sequence": sequence,
        "source": sourceValues.reverse[source],
        "speedKmh": speedKmh,
        "tripId": tripId,
    };
}

enum Transport {
    MQTT,
    SIMULATOR,
    WSS
}

final transportValues = EnumValues({
    "mqtt": Transport.MQTT,
    "simulator": Transport.SIMULATOR,
    "wss": Transport.WSS
});

class EventEnvelopeV1 {
    final String? causationId;
    final String correlationId;
    final String eventId;
    final String eventType;
    final DateTime occurredAt;
    final Map<String, dynamic> payload;
    final DateTime producedAt;
    final String producer;
    final double schemaVersion;
    final String tripId;

    EventEnvelopeV1({
        this.causationId,
        required this.correlationId,
        required this.eventId,
        required this.eventType,
        required this.occurredAt,
        required this.payload,
        required this.producedAt,
        required this.producer,
        required this.schemaVersion,
        required this.tripId,
    });

    factory EventEnvelopeV1.fromJson(Map<String, dynamic> json) {
        _requireVersionOne(json, 'EventEnvelopeV1');
        return EventEnvelopeV1(
        causationId: json["causationId"],
        correlationId: json["correlationId"],
        eventId: json["eventId"],
        eventType: json["eventType"],
        occurredAt: DateTime.parse(json["occurredAt"]),
        payload: Map.from(json["payload"]).map((k, v) => MapEntry<String, dynamic>(k, v)),
        producedAt: DateTime.parse(json["producedAt"]),
        producer: json["producer"],
        schemaVersion: json["schemaVersion"]?.toDouble(),
        tripId: json["tripId"],
    );
    }

    Map<String, dynamic> toJson() => {
        "causationId": causationId,
        "correlationId": correlationId,
        "eventId": eventId,
        "eventType": eventType,
        "occurredAt": occurredAt.toIso8601String(),
        "payload": Map.from(payload).map((k, v) => MapEntry<String, dynamic>(k, v)),
        "producedAt": producedAt.toIso8601String(),
        "producer": producer,
        "schemaVersion": schemaVersion,
        "tripId": tripId,
    };
}

class ProjectedLocationV1 {
    final String eventId;
    final MatchConfidence matchConfidence;
    final String memberId;
    final DateTime projectedAt;
    final Role role;
    final double routeDeviationMeters;
    final double routeProgressMeters;
    final double schemaVersion;
    final String sourceTelemetryEventId;
    final String tripId;

    ProjectedLocationV1({
        required this.eventId,
        required this.matchConfidence,
        required this.memberId,
        required this.projectedAt,
        required this.role,
        required this.routeDeviationMeters,
        required this.routeProgressMeters,
        required this.schemaVersion,
        required this.sourceTelemetryEventId,
        required this.tripId,
    });

    factory ProjectedLocationV1.fromJson(Map<String, dynamic> json) {
        _requireVersionOne(json, 'ProjectedLocationV1');
        return ProjectedLocationV1(
        eventId: json["eventId"],
        matchConfidence: matchConfidenceValues.map[json["matchConfidence"]]!,
        memberId: json["memberId"],
        projectedAt: DateTime.parse(json["projectedAt"]),
        role: roleValues.map[json["role"]]!,
        routeDeviationMeters: json["routeDeviationMeters"]?.toDouble(),
        routeProgressMeters: json["routeProgressMeters"]?.toDouble(),
        schemaVersion: json["schemaVersion"]?.toDouble(),
        sourceTelemetryEventId: json["sourceTelemetryEventId"],
        tripId: json["tripId"],
    );
    }

    Map<String, dynamic> toJson() => {
        "eventId": eventId,
        "matchConfidence": matchConfidenceValues.reverse[matchConfidence],
        "memberId": memberId,
        "projectedAt": projectedAt.toIso8601String(),
        "role": roleValues.reverse[role],
        "routeDeviationMeters": routeDeviationMeters,
        "routeProgressMeters": routeProgressMeters,
        "schemaVersion": schemaVersion,
        "sourceTelemetryEventId": sourceTelemetryEventId,
        "tripId": tripId,
    };
}

enum MatchConfidence {
    HIGH,
    LOW,
    MEDIUM,
    UNMATCHABLE
}

final matchConfidenceValues = EnumValues({
    "high": MatchConfidence.HIGH,
    "low": MatchConfidence.LOW,
    "medium": MatchConfidence.MEDIUM,
    "unmatchable": MatchConfidence.UNMATCHABLE
});

enum Role {
    LEADER,
    MEMBER
}

final roleValues = EnumValues({
    "leader": Role.LEADER,
    "member": Role.MEMBER
});

class ConvoyGraphV1 {
    final DateTime calculatedAt;
    final List<ConvoyGraphV1Component> components;
    final List<ConvoyGraphV1Edge> edges;
    final int graphRevision;
    final String? leaderMemberId;
    final List<String> orderedMemberIds;
    final OverallState overallState;
    final String policyVersion;
    final String tripId;

    ConvoyGraphV1({
        required this.calculatedAt,
        required this.components,
        required this.edges,
        required this.graphRevision,
        required this.leaderMemberId,
        required this.orderedMemberIds,
        required this.overallState,
        required this.policyVersion,
        required this.tripId,
    });

    factory ConvoyGraphV1.fromJson(Map<String, dynamic> json) => ConvoyGraphV1(
        calculatedAt: DateTime.parse(json["calculatedAt"]),
        components: List<ConvoyGraphV1Component>.from(json["components"].map((x) => ConvoyGraphV1Component.fromJson(x))),
        edges: List<ConvoyGraphV1Edge>.from(json["edges"].map((x) => ConvoyGraphV1Edge.fromJson(x))),
        graphRevision: json["graphRevision"],
        leaderMemberId: json["leaderMemberId"],
        orderedMemberIds: List<String>.from(json["orderedMemberIds"].map((x) => x)),
        overallState: overallStateValues.map[json["overallState"]]!,
        policyVersion: json["policyVersion"],
        tripId: json["tripId"],
    );

    Map<String, dynamic> toJson() => {
        "calculatedAt": calculatedAt.toIso8601String(),
        "components": List<dynamic>.from(components.map((x) => x.toJson())),
        "edges": List<dynamic>.from(edges.map((x) => x.toJson())),
        "graphRevision": graphRevision,
        "leaderMemberId": leaderMemberId,
        "orderedMemberIds": List<dynamic>.from(orderedMemberIds.map((x) => x)),
        "overallState": overallStateValues.reverse[overallState],
        "policyVersion": policyVersion,
        "tripId": tripId,
    };
}

class ConvoyGraphV1Component {
    final double? averageSpeedKmh;
    final String componentId;
    final bool containsLeader;
    final String frontBoundaryMemberId;
    final List<String> memberIds;
    final String rearBoundaryMemberId;

    ConvoyGraphV1Component({
        required this.averageSpeedKmh,
        required this.componentId,
        required this.containsLeader,
        required this.frontBoundaryMemberId,
        required this.memberIds,
        required this.rearBoundaryMemberId,
    });

    factory ConvoyGraphV1Component.fromJson(Map<String, dynamic> json) => ConvoyGraphV1Component(
        averageSpeedKmh: json["averageSpeedKmh"]?.toDouble(),
        componentId: json["componentId"],
        containsLeader: json["containsLeader"],
        frontBoundaryMemberId: json["frontBoundaryMemberId"],
        memberIds: List<String>.from(json["memberIds"].map((x) => x)),
        rearBoundaryMemberId: json["rearBoundaryMemberId"],
    );

    Map<String, dynamic> toJson() => {
        "averageSpeedKmh": averageSpeedKmh,
        "componentId": componentId,
        "containsLeader": containsLeader,
        "frontBoundaryMemberId": frontBoundaryMemberId,
        "memberIds": List<dynamic>.from(memberIds.map((x) => x)),
        "rearBoundaryMemberId": rearBoundaryMemberId,
    };
}

class ConvoyGraphV1Edge {
    final String aheadMemberId;
    final String behindMemberId;
    final double combinedUncertaintyMeters;
    final double confidentLowerGapMeters;
    final double? etaGapSeconds;
    final String policyVersion;
    final double routeGapMeters;
    final EdgeState state;
    final DateTime stateSince;

    ConvoyGraphV1Edge({
        required this.aheadMemberId,
        required this.behindMemberId,
        required this.combinedUncertaintyMeters,
        required this.confidentLowerGapMeters,
        required this.etaGapSeconds,
        required this.policyVersion,
        required this.routeGapMeters,
        required this.state,
        required this.stateSince,
    });

    factory ConvoyGraphV1Edge.fromJson(Map<String, dynamic> json) => ConvoyGraphV1Edge(
        aheadMemberId: json["aheadMemberId"],
        behindMemberId: json["behindMemberId"],
        combinedUncertaintyMeters: json["combinedUncertaintyMeters"]?.toDouble(),
        confidentLowerGapMeters: json["confidentLowerGapMeters"]?.toDouble(),
        etaGapSeconds: json["etaGapSeconds"]?.toDouble(),
        policyVersion: json["policyVersion"],
        routeGapMeters: json["routeGapMeters"]?.toDouble(),
        state: edgeStateValues.map[json["state"]]!,
        stateSince: DateTime.parse(json["stateSince"]),
    );

    Map<String, dynamic> toJson() => {
        "aheadMemberId": aheadMemberId,
        "behindMemberId": behindMemberId,
        "combinedUncertaintyMeters": combinedUncertaintyMeters,
        "confidentLowerGapMeters": confidentLowerGapMeters,
        "etaGapSeconds": etaGapSeconds,
        "policyVersion": policyVersion,
        "routeGapMeters": routeGapMeters,
        "state": edgeStateValues.reverse[state],
        "stateSince": stateSince.toIso8601String(),
    };
}

enum EdgeState {
    BROKEN,
    HEALTHY,
    RECOVERING,
    STRETCHED,
    UNKNOWN
}

final edgeStateValues = EnumValues({
    "broken": EdgeState.BROKEN,
    "healthy": EdgeState.HEALTHY,
    "recovering": EdgeState.RECOVERING,
    "stretched": EdgeState.STRETCHED,
    "unknown": EdgeState.UNKNOWN
});

enum OverallState {
    DEGRADED,
    SPLIT,
    STRETCHED,
    TOGETHER
}

final overallStateValues = EnumValues({
    "degraded": OverallState.DEGRADED,
    "split": OverallState.SPLIT,
    "stretched": OverallState.STRETCHED,
    "together": OverallState.TOGETHER
});

class SituationV1 {
    final List<String> affectedComponentIds;
    final DateTime confirmedAt;
    final SituationV1Evidence evidence;
    final Lifecycle lifecycle;
    final DateTime? notifiedAt;
    final String policyVersion;
    final DateTime? resolvedAt;
    final SituationV1Severity severity;
    final String situationId;
    final String tripId;
    final Type type;
    final DateTime updatedAt;

    SituationV1({
        required this.affectedComponentIds,
        required this.confirmedAt,
        required this.evidence,
        required this.lifecycle,
        this.notifiedAt,
        required this.policyVersion,
        this.resolvedAt,
        required this.severity,
        required this.situationId,
        required this.tripId,
        required this.type,
        required this.updatedAt,
    });

    factory SituationV1.fromJson(Map<String, dynamic> json) => SituationV1(
        affectedComponentIds: List<String>.from(json["affectedComponentIds"].map((x) => x)),
        confirmedAt: DateTime.parse(json["confirmedAt"]),
        evidence: SituationV1Evidence.fromJson(json["evidence"]),
        lifecycle: lifecycleValues.map[json["lifecycle"]]!,
        notifiedAt: json["notifiedAt"] == null ? null : DateTime.parse(json["notifiedAt"]),
        policyVersion: json["policyVersion"],
        resolvedAt: json["resolvedAt"] == null ? null : DateTime.parse(json["resolvedAt"]),
        severity: situationV1SeverityValues.map[json["severity"]]!,
        situationId: json["situationId"],
        tripId: json["tripId"],
        type: typeValues.map[json["type"]]!,
        updatedAt: DateTime.parse(json["updatedAt"]),
    );

    Map<String, dynamic> toJson() => {
        "affectedComponentIds": List<dynamic>.from(affectedComponentIds.map((x) => x)),
        "confirmedAt": confirmedAt.toIso8601String(),
        "evidence": evidence.toJson(),
        "lifecycle": lifecycleValues.reverse[lifecycle],
        "notifiedAt": notifiedAt?.toIso8601String(),
        "policyVersion": policyVersion,
        "resolvedAt": resolvedAt?.toIso8601String(),
        "severity": situationV1SeverityValues.reverse[severity],
        "situationId": situationId,
        "tripId": tripId,
        "type": typeValues.reverse[type],
        "updatedAt": updatedAt.toIso8601String(),
    };
}

class SituationV1Evidence {
    final double durationSeconds;
    final double? etaGapSeconds;
    final String? frontBoundaryMemberId;
    final int graphRevision;
    final Confidence locationConfidence;
    final double? maximumRouteGapMeters;
    final String? rearBoundaryMemberId;
    final double? routeGapMeters;
    final List<String> sourceEventIds;

    SituationV1Evidence({
        required this.durationSeconds,
        this.etaGapSeconds,
        this.frontBoundaryMemberId,
        required this.graphRevision,
        required this.locationConfidence,
        this.maximumRouteGapMeters,
        this.rearBoundaryMemberId,
        this.routeGapMeters,
        required this.sourceEventIds,
    });

    factory SituationV1Evidence.fromJson(Map<String, dynamic> json) => SituationV1Evidence(
        durationSeconds: json["durationSeconds"]?.toDouble(),
        etaGapSeconds: json["etaGapSeconds"]?.toDouble(),
        frontBoundaryMemberId: json["frontBoundaryMemberId"],
        graphRevision: json["graphRevision"],
        locationConfidence: confidenceValues.map[json["locationConfidence"]]!,
        maximumRouteGapMeters: json["maximumRouteGapMeters"]?.toDouble(),
        rearBoundaryMemberId: json["rearBoundaryMemberId"],
        routeGapMeters: json["routeGapMeters"]?.toDouble(),
        sourceEventIds: List<String>.from(json["sourceEventIds"].map((x) => x)),
    );

    Map<String, dynamic> toJson() => {
        "durationSeconds": durationSeconds,
        "etaGapSeconds": etaGapSeconds,
        "frontBoundaryMemberId": frontBoundaryMemberId,
        "graphRevision": graphRevision,
        "locationConfidence": confidenceValues.reverse[locationConfidence],
        "maximumRouteGapMeters": maximumRouteGapMeters,
        "rearBoundaryMemberId": rearBoundaryMemberId,
        "routeGapMeters": routeGapMeters,
        "sourceEventIds": List<dynamic>.from(sourceEventIds.map((x) => x)),
    };
}

enum Confidence {
    HIGH,
    LOW,
    MEDIUM
}

final confidenceValues = EnumValues({
    "high": Confidence.HIGH,
    "low": Confidence.LOW,
    "medium": Confidence.MEDIUM
});

enum Lifecycle {
    CONFIRMED,
    NOTIFIED,
    RESOLVED
}

final lifecycleValues = EnumValues({
    "confirmed": Lifecycle.CONFIRMED,
    "notified": Lifecycle.NOTIFIED,
    "resolved": Lifecycle.RESOLVED
});

enum SituationV1Severity {
    HIGH,
    MEDIUM
}

final situationV1SeverityValues = EnumValues({
    "high": SituationV1Severity.HIGH,
    "medium": SituationV1Severity.MEDIUM
});

enum Type {
    CONVOY_SPLIT
}

final typeValues = EnumValues({
    "convoy-split": Type.CONVOY_SPLIT
});

class NotificationRequestV1 {
    final AudienceEnum audience;
    final List<Channel> channels;
    final DateTime createdAt;
    final String dedupeKey;
    final DateTime expiresAt;
    final int graphRevision;
    final Locale locale;
    final String message;
    final String notificationId;
    final String recipientMemberId;
    final NotificationRequestV1Severity severity;
    final String situationId;

    NotificationRequestV1({
        required this.audience,
        required this.channels,
        required this.createdAt,
        required this.dedupeKey,
        required this.expiresAt,
        required this.graphRevision,
        required this.locale,
        required this.message,
        required this.notificationId,
        required this.recipientMemberId,
        required this.severity,
        required this.situationId,
    });

    factory NotificationRequestV1.fromJson(Map<String, dynamic> json) => NotificationRequestV1(
        audience: audienceEnumValues.map[json["audience"]]!,
        channels: List<Channel>.from(json["channels"].map((x) => channelValues.map[x]!)),
        createdAt: DateTime.parse(json["createdAt"]),
        dedupeKey: json["dedupeKey"],
        expiresAt: DateTime.parse(json["expiresAt"]),
        graphRevision: json["graphRevision"],
        locale: localeValues.map[json["locale"]]!,
        message: json["message"],
        notificationId: json["notificationId"],
        recipientMemberId: json["recipientMemberId"],
        severity: notificationRequestV1SeverityValues.map[json["severity"]]!,
        situationId: json["situationId"],
    );

    Map<String, dynamic> toJson() => {
        "audience": audienceEnumValues.reverse[audience],
        "channels": List<dynamic>.from(channels.map((x) => channelValues.reverse[x])),
        "createdAt": createdAt.toIso8601String(),
        "dedupeKey": dedupeKey,
        "expiresAt": expiresAt.toIso8601String(),
        "graphRevision": graphRevision,
        "locale": localeValues.reverse[locale],
        "message": message,
        "notificationId": notificationId,
        "recipientMemberId": recipientMemberId,
        "severity": notificationRequestV1SeverityValues.reverse[severity],
        "situationId": situationId,
    };
}

enum AudienceEnum {
    FRONT_BOUNDARY,
    FRONT_SECTION,
    LEADER,
    REAR_BOUNDARY,
    REAR_SECTION,
    RESOLUTION
}

final audienceEnumValues = EnumValues({
    "front-boundary": AudienceEnum.FRONT_BOUNDARY,
    "front-section": AudienceEnum.FRONT_SECTION,
    "leader": AudienceEnum.LEADER,
    "rear-boundary": AudienceEnum.REAR_BOUNDARY,
    "rear-section": AudienceEnum.REAR_SECTION,
    "resolution": AudienceEnum.RESOLUTION
});

enum Channel {
    HAPTIC,
    PUSH,
    VISUAL,
    VOICE
}

final channelValues = EnumValues({
    "haptic": Channel.HAPTIC,
    "push": Channel.PUSH,
    "visual": Channel.VISUAL,
    "voice": Channel.VOICE
});

enum Locale {
    EN,
    VI
}

final localeValues = EnumValues({
    "en": Locale.EN,
    "vi": Locale.VI
});

enum NotificationRequestV1Severity {
    HIGH,
    INFO,
    MEDIUM
}

final notificationRequestV1SeverityValues = EnumValues({
    "high": NotificationRequestV1Severity.HIGH,
    "info": NotificationRequestV1Severity.INFO,
    "medium": NotificationRequestV1Severity.MEDIUM
});

class LiveMemberSnapshotV1 {
    final double accuracyMeters;
    final Confidence confidence;
    final Connectivity connectivity;
    final double? headingDegrees;
    final double latitude;
    final double longitude;
    final String memberId;
    final DateTime observedAt;
    final String policyVersion;
    final DateTime receivedAt;
    final Role role;
    final double routeDeviationMeters;
    final double routeProgressMeters;
    final int sequence;
    final double snappedLatitude;
    final double snappedLongitude;
    final String sourceTelemetryEventId;
    final double? speedKmh;
    final String tripId;

    LiveMemberSnapshotV1({
        required this.accuracyMeters,
        required this.confidence,
        required this.connectivity,
        required this.headingDegrees,
        required this.latitude,
        required this.longitude,
        required this.memberId,
        required this.observedAt,
        required this.policyVersion,
        required this.receivedAt,
        required this.role,
        required this.routeDeviationMeters,
        required this.routeProgressMeters,
        required this.sequence,
        required this.snappedLatitude,
        required this.snappedLongitude,
        required this.sourceTelemetryEventId,
        required this.speedKmh,
        required this.tripId,
    });

    factory LiveMemberSnapshotV1.fromJson(Map<String, dynamic> json) => LiveMemberSnapshotV1(
        accuracyMeters: json["accuracyMeters"]?.toDouble(),
        confidence: confidenceValues.map[json["confidence"]]!,
        connectivity: connectivityValues.map[json["connectivity"]]!,
        headingDegrees: json["headingDegrees"]?.toDouble(),
        latitude: json["latitude"]?.toDouble(),
        longitude: json["longitude"]?.toDouble(),
        memberId: json["memberId"],
        observedAt: DateTime.parse(json["observedAt"]),
        policyVersion: json["policyVersion"],
        receivedAt: DateTime.parse(json["receivedAt"]),
        role: roleValues.map[json["role"]]!,
        routeDeviationMeters: json["routeDeviationMeters"]?.toDouble(),
        routeProgressMeters: json["routeProgressMeters"]?.toDouble(),
        sequence: json["sequence"],
        snappedLatitude: json["snappedLatitude"]?.toDouble(),
        snappedLongitude: json["snappedLongitude"]?.toDouble(),
        sourceTelemetryEventId: json["sourceTelemetryEventId"],
        speedKmh: json["speedKmh"]?.toDouble(),
        tripId: json["tripId"],
    );

    Map<String, dynamic> toJson() => {
        "accuracyMeters": accuracyMeters,
        "confidence": confidenceValues.reverse[confidence],
        "connectivity": connectivityValues.reverse[connectivity],
        "headingDegrees": headingDegrees,
        "latitude": latitude,
        "longitude": longitude,
        "memberId": memberId,
        "observedAt": observedAt.toIso8601String(),
        "policyVersion": policyVersion,
        "receivedAt": receivedAt.toIso8601String(),
        "role": roleValues.reverse[role],
        "routeDeviationMeters": routeDeviationMeters,
        "routeProgressMeters": routeProgressMeters,
        "sequence": sequence,
        "snappedLatitude": snappedLatitude,
        "snappedLongitude": snappedLongitude,
        "sourceTelemetryEventId": sourceTelemetryEventId,
        "speedKmh": speedKmh,
        "tripId": tripId,
    };
}

enum Connectivity {
    DEGRADED,
    HEALTHY,
    LOST,
    STALE
}

final connectivityValues = EnumValues({
    "degraded": Connectivity.DEGRADED,
    "healthy": Connectivity.HEALTHY,
    "lost": Connectivity.LOST,
    "stale": Connectivity.STALE
});

class LiveSnapshotV1 {
    final DateTime generatedAt;
    final Graph graph;
    final List<Member> members;
    final List<NotificationElement> notifications;
    final List<Recommendation> recommendations;
    final double schemaVersion;
    final List<SituationElement> situations;
    final int snapshotRevision;
    final String tripId;
    final Viewer viewer;

    LiveSnapshotV1({
        required this.generatedAt,
        required this.graph,
        required this.members,
        required this.notifications,
        required this.recommendations,
        required this.schemaVersion,
        required this.situations,
        required this.snapshotRevision,
        required this.tripId,
        required this.viewer,
    });

    factory LiveSnapshotV1.fromJson(Map<String, dynamic> json) {
        _requireVersionOne(json, 'LiveSnapshotV1');
        return LiveSnapshotV1(
        generatedAt: DateTime.parse(json["generatedAt"]),
        graph: Graph.fromJson(json["graph"]),
        members: List<Member>.from(json["members"].map((x) => Member.fromJson(x))),
        notifications: List<NotificationElement>.from(json["notifications"].map((x) => NotificationElement.fromJson(x))),
        recommendations: List<Recommendation>.from(json["recommendations"].map((x) => Recommendation.fromJson(x))),
        schemaVersion: json["schemaVersion"]?.toDouble(),
        situations: List<SituationElement>.from(json["situations"].map((x) => SituationElement.fromJson(x))),
        snapshotRevision: json["snapshotRevision"],
        tripId: json["tripId"],
        viewer: Viewer.fromJson(json["viewer"]),
    );
    }

    Map<String, dynamic> toJson() => {
        "generatedAt": generatedAt.toIso8601String(),
        "graph": graph.toJson(),
        "members": List<dynamic>.from(members.map((x) => x.toJson())),
        "notifications": List<dynamic>.from(notifications.map((x) => x.toJson())),
        "recommendations": List<dynamic>.from(recommendations.map((x) => x.toJson())),
        "schemaVersion": schemaVersion,
        "situations": List<dynamic>.from(situations.map((x) => x.toJson())),
        "snapshotRevision": snapshotRevision,
        "tripId": tripId,
        "viewer": viewer.toJson(),
    };
}

class Graph {
    final DateTime calculatedAt;
    final List<GraphComponent> components;
    final List<GraphEdge> edges;
    final int graphRevision;
    final String? leaderMemberId;
    final List<String> orderedMemberIds;
    final OverallState overallState;
    final String policyVersion;
    final String tripId;

    Graph({
        required this.calculatedAt,
        required this.components,
        required this.edges,
        required this.graphRevision,
        required this.leaderMemberId,
        required this.orderedMemberIds,
        required this.overallState,
        required this.policyVersion,
        required this.tripId,
    });

    factory Graph.fromJson(Map<String, dynamic> json) => Graph(
        calculatedAt: DateTime.parse(json["calculatedAt"]),
        components: List<GraphComponent>.from(json["components"].map((x) => GraphComponent.fromJson(x))),
        edges: List<GraphEdge>.from(json["edges"].map((x) => GraphEdge.fromJson(x))),
        graphRevision: json["graphRevision"],
        leaderMemberId: json["leaderMemberId"],
        orderedMemberIds: List<String>.from(json["orderedMemberIds"].map((x) => x)),
        overallState: overallStateValues.map[json["overallState"]]!,
        policyVersion: json["policyVersion"],
        tripId: json["tripId"],
    );

    Map<String, dynamic> toJson() => {
        "calculatedAt": calculatedAt.toIso8601String(),
        "components": List<dynamic>.from(components.map((x) => x.toJson())),
        "edges": List<dynamic>.from(edges.map((x) => x.toJson())),
        "graphRevision": graphRevision,
        "leaderMemberId": leaderMemberId,
        "orderedMemberIds": List<dynamic>.from(orderedMemberIds.map((x) => x)),
        "overallState": overallStateValues.reverse[overallState],
        "policyVersion": policyVersion,
        "tripId": tripId,
    };
}

class GraphComponent {
    final double? averageSpeedKmh;
    final String componentId;
    final bool containsLeader;
    final String frontBoundaryMemberId;
    final List<String> memberIds;
    final String rearBoundaryMemberId;

    GraphComponent({
        required this.averageSpeedKmh,
        required this.componentId,
        required this.containsLeader,
        required this.frontBoundaryMemberId,
        required this.memberIds,
        required this.rearBoundaryMemberId,
    });

    factory GraphComponent.fromJson(Map<String, dynamic> json) => GraphComponent(
        averageSpeedKmh: json["averageSpeedKmh"]?.toDouble(),
        componentId: json["componentId"],
        containsLeader: json["containsLeader"],
        frontBoundaryMemberId: json["frontBoundaryMemberId"],
        memberIds: List<String>.from(json["memberIds"].map((x) => x)),
        rearBoundaryMemberId: json["rearBoundaryMemberId"],
    );

    Map<String, dynamic> toJson() => {
        "averageSpeedKmh": averageSpeedKmh,
        "componentId": componentId,
        "containsLeader": containsLeader,
        "frontBoundaryMemberId": frontBoundaryMemberId,
        "memberIds": List<dynamic>.from(memberIds.map((x) => x)),
        "rearBoundaryMemberId": rearBoundaryMemberId,
    };
}

class GraphEdge {
    final String aheadMemberId;
    final String behindMemberId;
    final double combinedUncertaintyMeters;
    final double confidentLowerGapMeters;
    final double? etaGapSeconds;
    final String policyVersion;
    final double routeGapMeters;
    final EdgeState state;
    final DateTime stateSince;

    GraphEdge({
        required this.aheadMemberId,
        required this.behindMemberId,
        required this.combinedUncertaintyMeters,
        required this.confidentLowerGapMeters,
        required this.etaGapSeconds,
        required this.policyVersion,
        required this.routeGapMeters,
        required this.state,
        required this.stateSince,
    });

    factory GraphEdge.fromJson(Map<String, dynamic> json) => GraphEdge(
        aheadMemberId: json["aheadMemberId"],
        behindMemberId: json["behindMemberId"],
        combinedUncertaintyMeters: json["combinedUncertaintyMeters"]?.toDouble(),
        confidentLowerGapMeters: json["confidentLowerGapMeters"]?.toDouble(),
        etaGapSeconds: json["etaGapSeconds"]?.toDouble(),
        policyVersion: json["policyVersion"],
        routeGapMeters: json["routeGapMeters"]?.toDouble(),
        state: edgeStateValues.map[json["state"]]!,
        stateSince: DateTime.parse(json["stateSince"]),
    );

    Map<String, dynamic> toJson() => {
        "aheadMemberId": aheadMemberId,
        "behindMemberId": behindMemberId,
        "combinedUncertaintyMeters": combinedUncertaintyMeters,
        "confidentLowerGapMeters": confidentLowerGapMeters,
        "etaGapSeconds": etaGapSeconds,
        "policyVersion": policyVersion,
        "routeGapMeters": routeGapMeters,
        "state": edgeStateValues.reverse[state],
        "stateSince": stateSince.toIso8601String(),
    };
}

class Member {
    final double accuracyMeters;
    final Confidence confidence;
    final Connectivity connectivity;
    final double? headingDegrees;
    final double latitude;
    final double longitude;
    final String memberId;
    final DateTime observedAt;
    final String policyVersion;
    final DateTime receivedAt;
    final Role role;
    final double routeDeviationMeters;
    final double routeProgressMeters;
    final int sequence;
    final double snappedLatitude;
    final double snappedLongitude;
    final String sourceTelemetryEventId;
    final double? speedKmh;
    final String tripId;

    Member({
        required this.accuracyMeters,
        required this.confidence,
        required this.connectivity,
        required this.headingDegrees,
        required this.latitude,
        required this.longitude,
        required this.memberId,
        required this.observedAt,
        required this.policyVersion,
        required this.receivedAt,
        required this.role,
        required this.routeDeviationMeters,
        required this.routeProgressMeters,
        required this.sequence,
        required this.snappedLatitude,
        required this.snappedLongitude,
        required this.sourceTelemetryEventId,
        required this.speedKmh,
        required this.tripId,
    });

    factory Member.fromJson(Map<String, dynamic> json) => Member(
        accuracyMeters: json["accuracyMeters"]?.toDouble(),
        confidence: confidenceValues.map[json["confidence"]]!,
        connectivity: connectivityValues.map[json["connectivity"]]!,
        headingDegrees: json["headingDegrees"]?.toDouble(),
        latitude: json["latitude"]?.toDouble(),
        longitude: json["longitude"]?.toDouble(),
        memberId: json["memberId"],
        observedAt: DateTime.parse(json["observedAt"]),
        policyVersion: json["policyVersion"],
        receivedAt: DateTime.parse(json["receivedAt"]),
        role: roleValues.map[json["role"]]!,
        routeDeviationMeters: json["routeDeviationMeters"]?.toDouble(),
        routeProgressMeters: json["routeProgressMeters"]?.toDouble(),
        sequence: json["sequence"],
        snappedLatitude: json["snappedLatitude"]?.toDouble(),
        snappedLongitude: json["snappedLongitude"]?.toDouble(),
        sourceTelemetryEventId: json["sourceTelemetryEventId"],
        speedKmh: json["speedKmh"]?.toDouble(),
        tripId: json["tripId"],
    );

    Map<String, dynamic> toJson() => {
        "accuracyMeters": accuracyMeters,
        "confidence": confidenceValues.reverse[confidence],
        "connectivity": connectivityValues.reverse[connectivity],
        "headingDegrees": headingDegrees,
        "latitude": latitude,
        "longitude": longitude,
        "memberId": memberId,
        "observedAt": observedAt.toIso8601String(),
        "policyVersion": policyVersion,
        "receivedAt": receivedAt.toIso8601String(),
        "role": roleValues.reverse[role],
        "routeDeviationMeters": routeDeviationMeters,
        "routeProgressMeters": routeProgressMeters,
        "sequence": sequence,
        "snappedLatitude": snappedLatitude,
        "snappedLongitude": snappedLongitude,
        "sourceTelemetryEventId": sourceTelemetryEventId,
        "speedKmh": speedKmh,
        "tripId": tripId,
    };
}

class NotificationElement {
    final AudienceEnum audience;
    final List<Channel> channels;
    final DateTime createdAt;
    final String dedupeKey;
    final DateTime expiresAt;
    final int graphRevision;
    final Locale locale;
    final String message;
    final String notificationId;
    final String recipientMemberId;
    final NotificationRequestV1Severity severity;
    final String situationId;

    NotificationElement({
        required this.audience,
        required this.channels,
        required this.createdAt,
        required this.dedupeKey,
        required this.expiresAt,
        required this.graphRevision,
        required this.locale,
        required this.message,
        required this.notificationId,
        required this.recipientMemberId,
        required this.severity,
        required this.situationId,
    });

    factory NotificationElement.fromJson(Map<String, dynamic> json) => NotificationElement(
        audience: audienceEnumValues.map[json["audience"]]!,
        channels: List<Channel>.from(json["channels"].map((x) => channelValues.map[x]!)),
        createdAt: DateTime.parse(json["createdAt"]),
        dedupeKey: json["dedupeKey"],
        expiresAt: DateTime.parse(json["expiresAt"]),
        graphRevision: json["graphRevision"],
        locale: localeValues.map[json["locale"]]!,
        message: json["message"],
        notificationId: json["notificationId"],
        recipientMemberId: json["recipientMemberId"],
        severity: notificationRequestV1SeverityValues.map[json["severity"]]!,
        situationId: json["situationId"],
    );

    Map<String, dynamic> toJson() => {
        "audience": audienceEnumValues.reverse[audience],
        "channels": List<dynamic>.from(channels.map((x) => channelValues.reverse[x])),
        "createdAt": createdAt.toIso8601String(),
        "dedupeKey": dedupeKey,
        "expiresAt": expiresAt.toIso8601String(),
        "graphRevision": graphRevision,
        "locale": localeValues.reverse[locale],
        "message": message,
        "notificationId": notificationId,
        "recipientMemberId": recipientMemberId,
        "severity": notificationRequestV1SeverityValues.reverse[severity],
        "situationId": situationId,
    };
}

class Recommendation {
    final DateTime? approvedAt;
    final String? approvedByMemberId;
    final DateTime createdAt;
    final List<ExcludedCandidate> excludedCandidates;
    final DateTime expiresAt;
    final String policyVersion;
    final String recommendationId;
    final double schemaVersion;
    final SelectedCandidate? selectedCandidate;
    final String situationId;
    final RecommendationState state;
    final String tripId;

    Recommendation({
        this.approvedAt,
        this.approvedByMemberId,
        required this.createdAt,
        required this.excludedCandidates,
        required this.expiresAt,
        required this.policyVersion,
        required this.recommendationId,
        required this.schemaVersion,
        required this.selectedCandidate,
        required this.situationId,
        required this.state,
        required this.tripId,
    });

    factory Recommendation.fromJson(Map<String, dynamic> json) => Recommendation(
        approvedAt: json["approvedAt"] == null ? null : DateTime.parse(json["approvedAt"]),
        approvedByMemberId: json["approvedByMemberId"],
        createdAt: DateTime.parse(json["createdAt"]),
        excludedCandidates: List<ExcludedCandidate>.from(json["excludedCandidates"].map((x) => ExcludedCandidate.fromJson(x))),
        expiresAt: DateTime.parse(json["expiresAt"]),
        policyVersion: json["policyVersion"],
        recommendationId: json["recommendationId"],
        schemaVersion: json["schemaVersion"]?.toDouble(),
        selectedCandidate: json["selectedCandidate"] == null ? null : SelectedCandidate.fromJson(json["selectedCandidate"]),
        situationId: json["situationId"],
        state: recommendationStateValues.map[json["state"]]!,
        tripId: json["tripId"],
    );

    Map<String, dynamic> toJson() => {
        "approvedAt": approvedAt?.toIso8601String(),
        "approvedByMemberId": approvedByMemberId,
        "createdAt": createdAt.toIso8601String(),
        "excludedCandidates": List<dynamic>.from(excludedCandidates.map((x) => x.toJson())),
        "expiresAt": expiresAt.toIso8601String(),
        "policyVersion": policyVersion,
        "recommendationId": recommendationId,
        "schemaVersion": schemaVersion,
        "selectedCandidate": selectedCandidate?.toJson(),
        "situationId": situationId,
        "state": recommendationStateValues.reverse[state],
        "tripId": tripId,
    };
}

class ExcludedCandidate {
    final String poiId;
    final List<ReasonCode> reasonCodes;

    ExcludedCandidate({
        required this.poiId,
        required this.reasonCodes,
    });

    factory ExcludedCandidate.fromJson(Map<String, dynamic> json) => ExcludedCandidate(
        poiId: json["poiId"],
        reasonCodes: List<ReasonCode>.from(json["reasonCodes"].map((x) => reasonCodeValues.map[x]!)),
    );

    Map<String, dynamic> toJson() => {
        "poiId": poiId,
        "reasonCodes": List<dynamic>.from(reasonCodes.map((x) => reasonCodeValues.reverse[x])),
    };
}

enum ReasonCode {
    CLOSED,
    EXCESSIVE_DETOUR,
    ILLEGAL,
    INACCESSIBLE,
    INSUFFICIENT_PARKING,
    LOW_SOURCE_CONFIDENCE,
    REVERSE_DIRECTION,
    UNSAFE_STOP
}

final reasonCodeValues = EnumValues({
    "closed": ReasonCode.CLOSED,
    "excessive-detour": ReasonCode.EXCESSIVE_DETOUR,
    "illegal": ReasonCode.ILLEGAL,
    "inaccessible": ReasonCode.INACCESSIBLE,
    "insufficient-parking": ReasonCode.INSUFFICIENT_PARKING,
    "low-source-confidence": ReasonCode.LOW_SOURCE_CONFIDENCE,
    "reverse-direction": ReasonCode.REVERSE_DIRECTION,
    "unsafe-stop": ReasonCode.UNSAFE_STOP
});

class SelectedCandidate {
    final double amenitiesScore;
    final double detourMeters;
    final double detourScore;
    final double etaFairnessScore;
    final double fuelOrChargingScore;
    final bool hasSufficientParking;
    final bool isAccessible;
    final bool isLegal;
    final bool isOpen;
    final bool isSafeToStop;
    final double maximumMemberEtaSeconds;
    final String name;
    final double parkingScore;
    final String poiId;
    final bool requiresReverseDirection;
    final double routeCompatibilityScore;
    final double safeStopScore;
    final Confidence sourceConfidence;
    final String type;

    SelectedCandidate({
        required this.amenitiesScore,
        required this.detourMeters,
        required this.detourScore,
        required this.etaFairnessScore,
        required this.fuelOrChargingScore,
        required this.hasSufficientParking,
        required this.isAccessible,
        required this.isLegal,
        required this.isOpen,
        required this.isSafeToStop,
        required this.maximumMemberEtaSeconds,
        required this.name,
        required this.parkingScore,
        required this.poiId,
        required this.requiresReverseDirection,
        required this.routeCompatibilityScore,
        required this.safeStopScore,
        required this.sourceConfidence,
        required this.type,
    });

    factory SelectedCandidate.fromJson(Map<String, dynamic> json) => SelectedCandidate(
        amenitiesScore: json["amenitiesScore"]?.toDouble(),
        detourMeters: json["detourMeters"]?.toDouble(),
        detourScore: json["detourScore"]?.toDouble(),
        etaFairnessScore: json["etaFairnessScore"]?.toDouble(),
        fuelOrChargingScore: json["fuelOrChargingScore"]?.toDouble(),
        hasSufficientParking: json["hasSufficientParking"],
        isAccessible: json["isAccessible"],
        isLegal: json["isLegal"],
        isOpen: json["isOpen"],
        isSafeToStop: json["isSafeToStop"],
        maximumMemberEtaSeconds: json["maximumMemberEtaSeconds"]?.toDouble(),
        name: json["name"],
        parkingScore: json["parkingScore"]?.toDouble(),
        poiId: json["poiId"],
        requiresReverseDirection: json["requiresReverseDirection"],
        routeCompatibilityScore: json["routeCompatibilityScore"]?.toDouble(),
        safeStopScore: json["safeStopScore"]?.toDouble(),
        sourceConfidence: confidenceValues.map[json["sourceConfidence"]]!,
        type: json["type"],
    );

    Map<String, dynamic> toJson() => {
        "amenitiesScore": amenitiesScore,
        "detourMeters": detourMeters,
        "detourScore": detourScore,
        "etaFairnessScore": etaFairnessScore,
        "fuelOrChargingScore": fuelOrChargingScore,
        "hasSufficientParking": hasSufficientParking,
        "isAccessible": isAccessible,
        "isLegal": isLegal,
        "isOpen": isOpen,
        "isSafeToStop": isSafeToStop,
        "maximumMemberEtaSeconds": maximumMemberEtaSeconds,
        "name": name,
        "parkingScore": parkingScore,
        "poiId": poiId,
        "requiresReverseDirection": requiresReverseDirection,
        "routeCompatibilityScore": routeCompatibilityScore,
        "safeStopScore": safeStopScore,
        "sourceConfidence": confidenceValues.reverse[sourceConfidence],
        "type": type,
    };
}

enum RecommendationState {
    APPROVED,
    EXPIRED,
    PENDING
}

final recommendationStateValues = EnumValues({
    "approved": RecommendationState.APPROVED,
    "expired": RecommendationState.EXPIRED,
    "pending": RecommendationState.PENDING
});

class SituationElement {
    final List<String> affectedComponentIds;
    final DateTime confirmedAt;
    final PurpleEvidence evidence;
    final Lifecycle lifecycle;
    final DateTime? notifiedAt;
    final String policyVersion;
    final DateTime? resolvedAt;
    final SituationV1Severity severity;
    final String situationId;
    final String tripId;
    final Type type;
    final DateTime updatedAt;

    SituationElement({
        required this.affectedComponentIds,
        required this.confirmedAt,
        required this.evidence,
        required this.lifecycle,
        this.notifiedAt,
        required this.policyVersion,
        this.resolvedAt,
        required this.severity,
        required this.situationId,
        required this.tripId,
        required this.type,
        required this.updatedAt,
    });

    factory SituationElement.fromJson(Map<String, dynamic> json) => SituationElement(
        affectedComponentIds: List<String>.from(json["affectedComponentIds"].map((x) => x)),
        confirmedAt: DateTime.parse(json["confirmedAt"]),
        evidence: PurpleEvidence.fromJson(json["evidence"]),
        lifecycle: lifecycleValues.map[json["lifecycle"]]!,
        notifiedAt: json["notifiedAt"] == null ? null : DateTime.parse(json["notifiedAt"]),
        policyVersion: json["policyVersion"],
        resolvedAt: json["resolvedAt"] == null ? null : DateTime.parse(json["resolvedAt"]),
        severity: situationV1SeverityValues.map[json["severity"]]!,
        situationId: json["situationId"],
        tripId: json["tripId"],
        type: typeValues.map[json["type"]]!,
        updatedAt: DateTime.parse(json["updatedAt"]),
    );

    Map<String, dynamic> toJson() => {
        "affectedComponentIds": List<dynamic>.from(affectedComponentIds.map((x) => x)),
        "confirmedAt": confirmedAt.toIso8601String(),
        "evidence": evidence.toJson(),
        "lifecycle": lifecycleValues.reverse[lifecycle],
        "notifiedAt": notifiedAt?.toIso8601String(),
        "policyVersion": policyVersion,
        "resolvedAt": resolvedAt?.toIso8601String(),
        "severity": situationV1SeverityValues.reverse[severity],
        "situationId": situationId,
        "tripId": tripId,
        "type": typeValues.reverse[type],
        "updatedAt": updatedAt.toIso8601String(),
    };
}

class PurpleEvidence {
    final double durationSeconds;
    final double? etaGapSeconds;
    final String? frontBoundaryMemberId;
    final int graphRevision;
    final Confidence locationConfidence;
    final double? maximumRouteGapMeters;
    final String? rearBoundaryMemberId;
    final double? routeGapMeters;
    final List<String> sourceEventIds;

    PurpleEvidence({
        required this.durationSeconds,
        this.etaGapSeconds,
        this.frontBoundaryMemberId,
        required this.graphRevision,
        required this.locationConfidence,
        this.maximumRouteGapMeters,
        this.rearBoundaryMemberId,
        this.routeGapMeters,
        required this.sourceEventIds,
    });

    factory PurpleEvidence.fromJson(Map<String, dynamic> json) => PurpleEvidence(
        durationSeconds: json["durationSeconds"]?.toDouble(),
        etaGapSeconds: json["etaGapSeconds"]?.toDouble(),
        frontBoundaryMemberId: json["frontBoundaryMemberId"],
        graphRevision: json["graphRevision"],
        locationConfidence: confidenceValues.map[json["locationConfidence"]]!,
        maximumRouteGapMeters: json["maximumRouteGapMeters"]?.toDouble(),
        rearBoundaryMemberId: json["rearBoundaryMemberId"],
        routeGapMeters: json["routeGapMeters"]?.toDouble(),
        sourceEventIds: List<String>.from(json["sourceEventIds"].map((x) => x)),
    );

    Map<String, dynamic> toJson() => {
        "durationSeconds": durationSeconds,
        "etaGapSeconds": etaGapSeconds,
        "frontBoundaryMemberId": frontBoundaryMemberId,
        "graphRevision": graphRevision,
        "locationConfidence": confidenceValues.reverse[locationConfidence],
        "maximumRouteGapMeters": maximumRouteGapMeters,
        "rearBoundaryMemberId": rearBoundaryMemberId,
        "routeGapMeters": routeGapMeters,
        "sourceEventIds": List<dynamic>.from(sourceEventIds.map((x) => x)),
    };
}

class Viewer {
    final String memberId;
    final Role role;

    Viewer({
        required this.memberId,
        required this.role,
    });

    factory Viewer.fromJson(Map<String, dynamic> json) => Viewer(
        memberId: json["memberId"],
        role: roleValues.map[json["role"]]!,
    );

    Map<String, dynamic> toJson() => {
        "memberId": memberId,
        "role": roleValues.reverse[role],
    };
}

class ConvoySituationEventV1 {
    final String eventId;
    final ConvoySituationEventV1EventType eventType;
    final int graphRevision;
    final DateTime occurredAt;
    final double schemaVersion;
    final ConvoySituationEventV1Situation situation;
    final int snapshotRevision;
    final String tripId;

    ConvoySituationEventV1({
        required this.eventId,
        required this.eventType,
        required this.graphRevision,
        required this.occurredAt,
        required this.schemaVersion,
        required this.situation,
        required this.snapshotRevision,
        required this.tripId,
    });

    factory ConvoySituationEventV1.fromJson(Map<String, dynamic> json) {
        _requireVersionOne(json, 'ConvoySituationEventV1');
        return ConvoySituationEventV1(
        eventId: json["eventId"],
        eventType: convoySituationEventV1EventTypeValues.map[json["eventType"]]!,
        graphRevision: json["graphRevision"],
        occurredAt: DateTime.parse(json["occurredAt"]),
        schemaVersion: json["schemaVersion"]?.toDouble(),
        situation: ConvoySituationEventV1Situation.fromJson(json["situation"]),
        snapshotRevision: json["snapshotRevision"],
        tripId: json["tripId"],
    );
    }

    Map<String, dynamic> toJson() => {
        "eventId": eventId,
        "eventType": convoySituationEventV1EventTypeValues.reverse[eventType],
        "graphRevision": graphRevision,
        "occurredAt": occurredAt.toIso8601String(),
        "schemaVersion": schemaVersion,
        "situation": situation.toJson(),
        "snapshotRevision": snapshotRevision,
        "tripId": tripId,
    };
}

enum ConvoySituationEventV1EventType {
    CONVOY_SITUATION_CREATED,
    CONVOY_SITUATION_UPDATED
}

final convoySituationEventV1EventTypeValues = EnumValues({
    "convoySituationCreated": ConvoySituationEventV1EventType.CONVOY_SITUATION_CREATED,
    "convoySituationUpdated": ConvoySituationEventV1EventType.CONVOY_SITUATION_UPDATED
});

class ConvoySituationEventV1Situation {
    final List<String> affectedComponentIds;
    final DateTime confirmedAt;
    final FluffyEvidence evidence;
    final Lifecycle lifecycle;
    final DateTime? notifiedAt;
    final String policyVersion;
    final DateTime? resolvedAt;
    final SituationV1Severity severity;
    final String situationId;
    final String tripId;
    final Type type;
    final DateTime updatedAt;

    ConvoySituationEventV1Situation({
        required this.affectedComponentIds,
        required this.confirmedAt,
        required this.evidence,
        required this.lifecycle,
        this.notifiedAt,
        required this.policyVersion,
        this.resolvedAt,
        required this.severity,
        required this.situationId,
        required this.tripId,
        required this.type,
        required this.updatedAt,
    });

    factory ConvoySituationEventV1Situation.fromJson(Map<String, dynamic> json) => ConvoySituationEventV1Situation(
        affectedComponentIds: List<String>.from(json["affectedComponentIds"].map((x) => x)),
        confirmedAt: DateTime.parse(json["confirmedAt"]),
        evidence: FluffyEvidence.fromJson(json["evidence"]),
        lifecycle: lifecycleValues.map[json["lifecycle"]]!,
        notifiedAt: json["notifiedAt"] == null ? null : DateTime.parse(json["notifiedAt"]),
        policyVersion: json["policyVersion"],
        resolvedAt: json["resolvedAt"] == null ? null : DateTime.parse(json["resolvedAt"]),
        severity: situationV1SeverityValues.map[json["severity"]]!,
        situationId: json["situationId"],
        tripId: json["tripId"],
        type: typeValues.map[json["type"]]!,
        updatedAt: DateTime.parse(json["updatedAt"]),
    );

    Map<String, dynamic> toJson() => {
        "affectedComponentIds": List<dynamic>.from(affectedComponentIds.map((x) => x)),
        "confirmedAt": confirmedAt.toIso8601String(),
        "evidence": evidence.toJson(),
        "lifecycle": lifecycleValues.reverse[lifecycle],
        "notifiedAt": notifiedAt?.toIso8601String(),
        "policyVersion": policyVersion,
        "resolvedAt": resolvedAt?.toIso8601String(),
        "severity": situationV1SeverityValues.reverse[severity],
        "situationId": situationId,
        "tripId": tripId,
        "type": typeValues.reverse[type],
        "updatedAt": updatedAt.toIso8601String(),
    };
}

class FluffyEvidence {
    final double durationSeconds;
    final double? etaGapSeconds;
    final String? frontBoundaryMemberId;
    final int graphRevision;
    final Confidence locationConfidence;
    final double? maximumRouteGapMeters;
    final String? rearBoundaryMemberId;
    final double? routeGapMeters;
    final List<String> sourceEventIds;

    FluffyEvidence({
        required this.durationSeconds,
        this.etaGapSeconds,
        this.frontBoundaryMemberId,
        required this.graphRevision,
        required this.locationConfidence,
        this.maximumRouteGapMeters,
        this.rearBoundaryMemberId,
        this.routeGapMeters,
        required this.sourceEventIds,
    });

    factory FluffyEvidence.fromJson(Map<String, dynamic> json) => FluffyEvidence(
        durationSeconds: json["durationSeconds"]?.toDouble(),
        etaGapSeconds: json["etaGapSeconds"]?.toDouble(),
        frontBoundaryMemberId: json["frontBoundaryMemberId"],
        graphRevision: json["graphRevision"],
        locationConfidence: confidenceValues.map[json["locationConfidence"]]!,
        maximumRouteGapMeters: json["maximumRouteGapMeters"]?.toDouble(),
        rearBoundaryMemberId: json["rearBoundaryMemberId"],
        routeGapMeters: json["routeGapMeters"]?.toDouble(),
        sourceEventIds: List<String>.from(json["sourceEventIds"].map((x) => x)),
    );

    Map<String, dynamic> toJson() => {
        "durationSeconds": durationSeconds,
        "etaGapSeconds": etaGapSeconds,
        "frontBoundaryMemberId": frontBoundaryMemberId,
        "graphRevision": graphRevision,
        "locationConfidence": confidenceValues.reverse[locationConfidence],
        "maximumRouteGapMeters": maximumRouteGapMeters,
        "rearBoundaryMemberId": rearBoundaryMemberId,
        "routeGapMeters": routeGapMeters,
        "sourceEventIds": List<dynamic>.from(sourceEventIds.map((x) => x)),
    };
}

class DriverAlertV1 {
    final String alertId;
    final DateTime expiresAt;
    final DateTime issuedAt;
    final DriverAlertV1Notification notification;
    final String recipientMemberId;
    final bool requiresAcknowledgement;
    final double schemaVersion;
    final String tripId;

    DriverAlertV1({
        required this.alertId,
        required this.expiresAt,
        required this.issuedAt,
        required this.notification,
        required this.recipientMemberId,
        required this.requiresAcknowledgement,
        required this.schemaVersion,
        required this.tripId,
    });

    factory DriverAlertV1.fromJson(Map<String, dynamic> json) {
        _requireVersionOne(json, 'DriverAlertV1');
        return DriverAlertV1(
        alertId: json["alertId"],
        expiresAt: DateTime.parse(json["expiresAt"]),
        issuedAt: DateTime.parse(json["issuedAt"]),
        notification: DriverAlertV1Notification.fromJson(json["notification"]),
        recipientMemberId: json["recipientMemberId"],
        requiresAcknowledgement: json["requiresAcknowledgement"],
        schemaVersion: json["schemaVersion"]?.toDouble(),
        tripId: json["tripId"],
    );
    }

    Map<String, dynamic> toJson() => {
        "alertId": alertId,
        "expiresAt": expiresAt.toIso8601String(),
        "issuedAt": issuedAt.toIso8601String(),
        "notification": notification.toJson(),
        "recipientMemberId": recipientMemberId,
        "requiresAcknowledgement": requiresAcknowledgement,
        "schemaVersion": schemaVersion,
        "tripId": tripId,
    };
}

class DriverAlertV1Notification {
    final AudienceEnum audience;
    final List<Channel> channels;
    final DateTime createdAt;
    final String dedupeKey;
    final DateTime expiresAt;
    final int graphRevision;
    final Locale locale;
    final String message;
    final String notificationId;
    final String recipientMemberId;
    final NotificationRequestV1Severity severity;
    final String situationId;

    DriverAlertV1Notification({
        required this.audience,
        required this.channels,
        required this.createdAt,
        required this.dedupeKey,
        required this.expiresAt,
        required this.graphRevision,
        required this.locale,
        required this.message,
        required this.notificationId,
        required this.recipientMemberId,
        required this.severity,
        required this.situationId,
    });

    factory DriverAlertV1Notification.fromJson(Map<String, dynamic> json) => DriverAlertV1Notification(
        audience: audienceEnumValues.map[json["audience"]]!,
        channels: List<Channel>.from(json["channels"].map((x) => channelValues.map[x]!)),
        createdAt: DateTime.parse(json["createdAt"]),
        dedupeKey: json["dedupeKey"],
        expiresAt: DateTime.parse(json["expiresAt"]),
        graphRevision: json["graphRevision"],
        locale: localeValues.map[json["locale"]]!,
        message: json["message"],
        notificationId: json["notificationId"],
        recipientMemberId: json["recipientMemberId"],
        severity: notificationRequestV1SeverityValues.map[json["severity"]]!,
        situationId: json["situationId"],
    );

    Map<String, dynamic> toJson() => {
        "audience": audienceEnumValues.reverse[audience],
        "channels": List<dynamic>.from(channels.map((x) => channelValues.reverse[x])),
        "createdAt": createdAt.toIso8601String(),
        "dedupeKey": dedupeKey,
        "expiresAt": expiresAt.toIso8601String(),
        "graphRevision": graphRevision,
        "locale": localeValues.reverse[locale],
        "message": message,
        "notificationId": notificationId,
        "recipientMemberId": recipientMemberId,
        "severity": notificationRequestV1SeverityValues.reverse[severity],
        "situationId": situationId,
    };
}

class DriverAlertAcknowledgementV1 {
    final DateTime acknowledgedAt;
    final String acknowledgementId;
    final String alertId;
    final String idempotencyKey;
    final String memberId;
    final String notificationId;
    final double schemaVersion;
    final String tripId;

    DriverAlertAcknowledgementV1({
        required this.acknowledgedAt,
        required this.acknowledgementId,
        required this.alertId,
        required this.idempotencyKey,
        required this.memberId,
        required this.notificationId,
        required this.schemaVersion,
        required this.tripId,
    });

    factory DriverAlertAcknowledgementV1.fromJson(Map<String, dynamic> json) {
        _requireVersionOne(json, 'DriverAlertAcknowledgementV1');
        return DriverAlertAcknowledgementV1(
        acknowledgedAt: DateTime.parse(json["acknowledgedAt"]),
        acknowledgementId: json["acknowledgementId"],
        alertId: json["alertId"],
        idempotencyKey: json["idempotencyKey"],
        memberId: json["memberId"],
        notificationId: json["notificationId"],
        schemaVersion: json["schemaVersion"]?.toDouble(),
        tripId: json["tripId"],
    );
    }

    Map<String, dynamic> toJson() => {
        "acknowledgedAt": acknowledgedAt.toIso8601String(),
        "acknowledgementId": acknowledgementId,
        "alertId": alertId,
        "idempotencyKey": idempotencyKey,
        "memberId": memberId,
        "notificationId": notificationId,
        "schemaVersion": schemaVersion,
        "tripId": tripId,
    };
}

class RealtimeEventV1 {
    final AudienceClass audience;
    final String eventId;
    final RealtimeEventV1EventType eventType;
    final DateTime expiresAt;
    final int graphRevision;
    final DateTime occurredAt;
    final Map<String, dynamic> payload;
    final double schemaVersion;
    final int snapshotRevision;
    final String tripId;

    RealtimeEventV1({
        required this.audience,
        required this.eventId,
        required this.eventType,
        required this.expiresAt,
        required this.graphRevision,
        required this.occurredAt,
        required this.payload,
        required this.schemaVersion,
        required this.snapshotRevision,
        required this.tripId,
    });

    factory RealtimeEventV1.fromJson(Map<String, dynamic> json) {
        _requireVersionOne(json, 'RealtimeEventV1');
        return RealtimeEventV1(
        audience: AudienceClass.fromJson(json["audience"]),
        eventId: json["eventId"],
        eventType: realtimeEventV1EventTypeValues.map[json["eventType"]]!,
        expiresAt: DateTime.parse(json["expiresAt"]),
        graphRevision: json["graphRevision"],
        occurredAt: DateTime.parse(json["occurredAt"]),
        payload: Map.from(json["payload"]).map((k, v) => MapEntry<String, dynamic>(k, v)),
        schemaVersion: json["schemaVersion"]?.toDouble(),
        snapshotRevision: json["snapshotRevision"],
        tripId: json["tripId"],
    );
    }

    Map<String, dynamic> toJson() => {
        "audience": audience.toJson(),
        "eventId": eventId,
        "eventType": realtimeEventV1EventTypeValues.reverse[eventType],
        "expiresAt": expiresAt.toIso8601String(),
        "graphRevision": graphRevision,
        "occurredAt": occurredAt.toIso8601String(),
        "payload": Map.from(payload).map((k, v) => MapEntry<String, dynamic>(k, v)),
        "schemaVersion": schemaVersion,
        "snapshotRevision": snapshotRevision,
        "tripId": tripId,
    };
}

class AudienceClass {
    final Kind kind;
    final String? memberId;

    AudienceClass({
        required this.kind,
        this.memberId,
    });

    factory AudienceClass.fromJson(Map<String, dynamic> json) => AudienceClass(
        kind: kindValues.map[json["kind"]]!,
        memberId: json["memberId"],
    );

    Map<String, dynamic> toJson() => {
        "kind": kindValues.reverse[kind],
        "memberId": memberId,
    };
}

enum Kind {
    LEADER,
    MEMBER,
    TRIP
}

final kindValues = EnumValues({
    "leader": Kind.LEADER,
    "member": Kind.MEMBER,
    "trip": Kind.TRIP
});

enum RealtimeEventV1EventType {
    CONVOY_SITUATION_CREATED,
    CONVOY_SITUATION_UPDATED,
    DRIVER_ALERT_ACKNOWLEDGED,
    DRIVER_ALERT_ISSUED,
    LIVE_SNAPSHOT_UPDATED,
    REGROUP_CANDIDATE_SELECTED
}

final realtimeEventV1EventTypeValues = EnumValues({
    "convoySituationCreated": RealtimeEventV1EventType.CONVOY_SITUATION_CREATED,
    "convoySituationUpdated": RealtimeEventV1EventType.CONVOY_SITUATION_UPDATED,
    "driverAlertAcknowledged": RealtimeEventV1EventType.DRIVER_ALERT_ACKNOWLEDGED,
    "driverAlertIssued": RealtimeEventV1EventType.DRIVER_ALERT_ISSUED,
    "liveSnapshotUpdated": RealtimeEventV1EventType.LIVE_SNAPSHOT_UPDATED,
    "regroupCandidateSelected": RealtimeEventV1EventType.REGROUP_CANDIDATE_SELECTED
});

class EnumValues<T> {
    Map<String, T> map;
    late Map<T, String> reverseMap;

    EnumValues(this.map);

    Map<T, String> get reverse {
            reverseMap = map.map((k, v) => MapEntry(v, k));
            return reverseMap;
    }
}
