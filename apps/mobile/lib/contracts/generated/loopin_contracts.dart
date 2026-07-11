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

TascoPlaceRefV1 tascoPlaceRefV1FromJson(String str) => TascoPlaceRefV1.fromJson(json.decode(str));

String tascoPlaceRefV1ToJson(TascoPlaceRefV1 data) => json.encode(data.toJson());

TripStopV1 tripStopV1FromJson(String str) => TripStopV1.fromJson(json.decode(str));

String tripStopV1ToJson(TripStopV1 data) => json.encode(data.toJson());

TascoRoutePreviewV1 tascoRoutePreviewV1FromJson(String str) => TascoRoutePreviewV1.fromJson(json.decode(str));

String tascoRoutePreviewV1ToJson(TascoRoutePreviewV1 data) => json.encode(data.toJson());

TripPlanSummaryV1 tripPlanSummaryV1FromJson(String str) => TripPlanSummaryV1.fromJson(json.decode(str));

String tripPlanSummaryV1ToJson(TripPlanSummaryV1 data) => json.encode(data.toJson());

JoinTripResultV1 joinTripResultV1FromJson(String str) => JoinTripResultV1.fromJson(json.decode(str));

String joinTripResultV1ToJson(JoinTripResultV1 data) => json.encode(data.toJson());

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
    final LocationTelemetryV1Source source;
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
        source: locationTelemetryV1SourceValues.map[json["source"]]!,
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
        "source": locationTelemetryV1SourceValues.reverse[source],
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

enum LocationTelemetryV1Source {
    GPS,
    SIMULATOR
}

final locationTelemetryV1SourceValues = EnumValues({
    "gps": LocationTelemetryV1Source.GPS,
    "simulator": LocationTelemetryV1Source.SIMULATOR
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
    final List<Component> components;
    final List<Edge> edges;
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
        components: List<Component>.from(json["components"].map((x) => Component.fromJson(x))),
        edges: List<Edge>.from(json["edges"].map((x) => Edge.fromJson(x))),
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

class Component {
    final double? averageSpeedKmh;
    final String componentId;
    final bool containsLeader;
    final String frontBoundaryMemberId;
    final List<String> memberIds;
    final String rearBoundaryMemberId;

    Component({
        required this.averageSpeedKmh,
        required this.componentId,
        required this.containsLeader,
        required this.frontBoundaryMemberId,
        required this.memberIds,
        required this.rearBoundaryMemberId,
    });

    factory Component.fromJson(Map<String, dynamic> json) => Component(
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

class Edge {
    final String aheadMemberId;
    final String behindMemberId;
    final double combinedUncertaintyMeters;
    final double confidentLowerGapMeters;
    final double? etaGapSeconds;
    final String policyVersion;
    final double routeGapMeters;
    final State state;
    final DateTime stateSince;

    Edge({
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

    factory Edge.fromJson(Map<String, dynamic> json) => Edge(
        aheadMemberId: json["aheadMemberId"],
        behindMemberId: json["behindMemberId"],
        combinedUncertaintyMeters: json["combinedUncertaintyMeters"]?.toDouble(),
        confidentLowerGapMeters: json["confidentLowerGapMeters"]?.toDouble(),
        etaGapSeconds: json["etaGapSeconds"]?.toDouble(),
        policyVersion: json["policyVersion"],
        routeGapMeters: json["routeGapMeters"]?.toDouble(),
        state: stateValues.map[json["state"]]!,
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
        "state": stateValues.reverse[state],
        "stateSince": stateSince.toIso8601String(),
    };
}

enum State {
    BROKEN,
    HEALTHY,
    RECOVERING,
    STRETCHED,
    UNKNOWN
}

final stateValues = EnumValues({
    "broken": State.BROKEN,
    "healthy": State.HEALTHY,
    "recovering": State.RECOVERING,
    "stretched": State.STRETCHED,
    "unknown": State.UNKNOWN
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
    final Evidence evidence;
    final SituationV1Lifecycle lifecycle;
    final DateTime? notifiedAt;
    final String policyVersion;
    final DateTime? resolvedAt;
    final SituationV1Severity severity;
    final String situationId;
    final String tripId;
    final SituationV1Type type;
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
        evidence: Evidence.fromJson(json["evidence"]),
        lifecycle: situationV1LifecycleValues.map[json["lifecycle"]]!,
        notifiedAt: json["notifiedAt"] == null ? null : DateTime.parse(json["notifiedAt"]),
        policyVersion: json["policyVersion"],
        resolvedAt: json["resolvedAt"] == null ? null : DateTime.parse(json["resolvedAt"]),
        severity: situationV1SeverityValues.map[json["severity"]]!,
        situationId: json["situationId"],
        tripId: json["tripId"],
        type: situationV1TypeValues.map[json["type"]]!,
        updatedAt: DateTime.parse(json["updatedAt"]),
    );

    Map<String, dynamic> toJson() => {
        "affectedComponentIds": List<dynamic>.from(affectedComponentIds.map((x) => x)),
        "confirmedAt": confirmedAt.toIso8601String(),
        "evidence": evidence.toJson(),
        "lifecycle": situationV1LifecycleValues.reverse[lifecycle],
        "notifiedAt": notifiedAt?.toIso8601String(),
        "policyVersion": policyVersion,
        "resolvedAt": resolvedAt?.toIso8601String(),
        "severity": situationV1SeverityValues.reverse[severity],
        "situationId": situationId,
        "tripId": tripId,
        "type": situationV1TypeValues.reverse[type],
        "updatedAt": updatedAt.toIso8601String(),
    };
}

class Evidence {
    final double durationSeconds;
    final double? etaGapSeconds;
    final String? frontBoundaryMemberId;
    final int graphRevision;
    final LocationConfidence locationConfidence;
    final double? maximumRouteGapMeters;
    final String? rearBoundaryMemberId;
    final double? routeGapMeters;
    final List<String> sourceEventIds;

    Evidence({
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

    factory Evidence.fromJson(Map<String, dynamic> json) => Evidence(
        durationSeconds: json["durationSeconds"]?.toDouble(),
        etaGapSeconds: json["etaGapSeconds"]?.toDouble(),
        frontBoundaryMemberId: json["frontBoundaryMemberId"],
        graphRevision: json["graphRevision"],
        locationConfidence: locationConfidenceValues.map[json["locationConfidence"]]!,
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
        "locationConfidence": locationConfidenceValues.reverse[locationConfidence],
        "maximumRouteGapMeters": maximumRouteGapMeters,
        "rearBoundaryMemberId": rearBoundaryMemberId,
        "routeGapMeters": routeGapMeters,
        "sourceEventIds": List<dynamic>.from(sourceEventIds.map((x) => x)),
    };
}

enum LocationConfidence {
    HIGH,
    LOW,
    MEDIUM
}

final locationConfidenceValues = EnumValues({
    "high": LocationConfidence.HIGH,
    "low": LocationConfidence.LOW,
    "medium": LocationConfidence.MEDIUM
});

enum SituationV1Lifecycle {
    CONFIRMED,
    NOTIFIED,
    RESOLVED
}

final situationV1LifecycleValues = EnumValues({
    "confirmed": SituationV1Lifecycle.CONFIRMED,
    "notified": SituationV1Lifecycle.NOTIFIED,
    "resolved": SituationV1Lifecycle.RESOLVED
});

enum SituationV1Severity {
    HIGH,
    MEDIUM
}

final situationV1SeverityValues = EnumValues({
    "high": SituationV1Severity.HIGH,
    "medium": SituationV1Severity.MEDIUM
});

enum SituationV1Type {
    CONVOY_SPLIT
}

final situationV1TypeValues = EnumValues({
    "convoy-split": SituationV1Type.CONVOY_SPLIT
});

class NotificationRequestV1 {
    final Audience audience;
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
        audience: audienceValues.map[json["audience"]]!,
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
        "audience": audienceValues.reverse[audience],
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

enum Audience {
    FRONT_BOUNDARY,
    FRONT_SECTION,
    LEADER,
    REAR_BOUNDARY,
    REAR_SECTION,
    RESOLUTION
}

final audienceValues = EnumValues({
    "front-boundary": Audience.FRONT_BOUNDARY,
    "front-section": Audience.FRONT_SECTION,
    "leader": Audience.LEADER,
    "rear-boundary": Audience.REAR_BOUNDARY,
    "rear-section": Audience.REAR_SECTION,
    "resolution": Audience.RESOLUTION
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

class TascoPlaceRefV1 {
    final String address;
    final List<String> categories;
    final TascoPlaceRefV1Coordinates coordinates;
    final String id;
    final String name;
    final Provider provider;
    final TascoPlaceRefV1RatingSummary? ratingSummary;
    final String sourceVersion;

    TascoPlaceRefV1({
        required this.address,
        required this.categories,
        required this.coordinates,
        required this.id,
        required this.name,
        required this.provider,
        this.ratingSummary,
        required this.sourceVersion,
    });

    factory TascoPlaceRefV1.fromJson(Map<String, dynamic> json) => TascoPlaceRefV1(
        address: json["address"],
        categories: List<String>.from(json["categories"].map((x) => x)),
        coordinates: TascoPlaceRefV1Coordinates.fromJson(json["coordinates"]),
        id: json["id"],
        name: json["name"],
        provider: providerValues.map[json["provider"]]!,
        ratingSummary: json["ratingSummary"] == null ? null : TascoPlaceRefV1RatingSummary.fromJson(json["ratingSummary"]),
        sourceVersion: json["sourceVersion"],
    );

    Map<String, dynamic> toJson() => {
        "address": address,
        "categories": List<dynamic>.from(categories.map((x) => x)),
        "coordinates": coordinates.toJson(),
        "id": id,
        "name": name,
        "provider": providerValues.reverse[provider],
        "ratingSummary": ratingSummary?.toJson(),
        "sourceVersion": sourceVersion,
    };
}

class TascoPlaceRefV1Coordinates {
    final double lat;
    final double lon;

    TascoPlaceRefV1Coordinates({
        required this.lat,
        required this.lon,
    });

    factory TascoPlaceRefV1Coordinates.fromJson(Map<String, dynamic> json) => TascoPlaceRefV1Coordinates(
        lat: json["lat"]?.toDouble(),
        lon: json["lon"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "lat": lat,
        "lon": lon,
    };
}

enum Provider {
    TASCO
}

final providerValues = EnumValues({
    "tasco": Provider.TASCO
});

class TascoPlaceRefV1RatingSummary {
    final double averageRating;
    final int reviewCount;
    final Provider source;

    TascoPlaceRefV1RatingSummary({
        required this.averageRating,
        required this.reviewCount,
        required this.source,
    });

    factory TascoPlaceRefV1RatingSummary.fromJson(Map<String, dynamic> json) => TascoPlaceRefV1RatingSummary(
        averageRating: json["averageRating"]?.toDouble(),
        reviewCount: json["reviewCount"],
        source: providerValues.map[json["source"]]!,
    );

    Map<String, dynamic> toJson() => {
        "averageRating": averageRating,
        "reviewCount": reviewCount,
        "source": providerValues.reverse[source],
    };
}

class TripStopV1 {
    final bool locked;
    final String? notes;
    final TripStopV1Place place;
    final TripStopV1PlannedWindow? plannedWindow;
    final TripStopV1Source source;
    final String stopId;

    TripStopV1({
        required this.locked,
        this.notes,
        required this.place,
        this.plannedWindow,
        required this.source,
        required this.stopId,
    });

    factory TripStopV1.fromJson(Map<String, dynamic> json) => TripStopV1(
        locked: json["locked"],
        notes: json["notes"],
        place: TripStopV1Place.fromJson(json["place"]),
        plannedWindow: json["plannedWindow"] == null ? null : TripStopV1PlannedWindow.fromJson(json["plannedWindow"]),
        source: tripStopV1SourceValues.map[json["source"]]!,
        stopId: json["stopId"],
    );

    Map<String, dynamic> toJson() => {
        "locked": locked,
        "notes": notes,
        "place": place.toJson(),
        "plannedWindow": plannedWindow?.toJson(),
        "source": tripStopV1SourceValues.reverse[source],
        "stopId": stopId,
    };
}

class TripStopV1Place {
    final String address;
    final List<String> categories;
    final PurpleCoordinates coordinates;
    final String id;
    final String name;
    final Provider provider;
    final PurpleRatingSummary? ratingSummary;
    final String sourceVersion;

    TripStopV1Place({
        required this.address,
        required this.categories,
        required this.coordinates,
        required this.id,
        required this.name,
        required this.provider,
        this.ratingSummary,
        required this.sourceVersion,
    });

    factory TripStopV1Place.fromJson(Map<String, dynamic> json) => TripStopV1Place(
        address: json["address"],
        categories: List<String>.from(json["categories"].map((x) => x)),
        coordinates: PurpleCoordinates.fromJson(json["coordinates"]),
        id: json["id"],
        name: json["name"],
        provider: providerValues.map[json["provider"]]!,
        ratingSummary: json["ratingSummary"] == null ? null : PurpleRatingSummary.fromJson(json["ratingSummary"]),
        sourceVersion: json["sourceVersion"],
    );

    Map<String, dynamic> toJson() => {
        "address": address,
        "categories": List<dynamic>.from(categories.map((x) => x)),
        "coordinates": coordinates.toJson(),
        "id": id,
        "name": name,
        "provider": providerValues.reverse[provider],
        "ratingSummary": ratingSummary?.toJson(),
        "sourceVersion": sourceVersion,
    };
}

class PurpleCoordinates {
    final double lat;
    final double lon;

    PurpleCoordinates({
        required this.lat,
        required this.lon,
    });

    factory PurpleCoordinates.fromJson(Map<String, dynamic> json) => PurpleCoordinates(
        lat: json["lat"]?.toDouble(),
        lon: json["lon"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "lat": lat,
        "lon": lon,
    };
}

class PurpleRatingSummary {
    final double averageRating;
    final int reviewCount;
    final Provider source;

    PurpleRatingSummary({
        required this.averageRating,
        required this.reviewCount,
        required this.source,
    });

    factory PurpleRatingSummary.fromJson(Map<String, dynamic> json) => PurpleRatingSummary(
        averageRating: json["averageRating"]?.toDouble(),
        reviewCount: json["reviewCount"],
        source: providerValues.map[json["source"]]!,
    );

    Map<String, dynamic> toJson() => {
        "averageRating": averageRating,
        "reviewCount": reviewCount,
        "source": providerValues.reverse[source],
    };
}

class TripStopV1PlannedWindow {
    final DateTime? arrivalAt;
    final DateTime? departureAt;

    TripStopV1PlannedWindow({
        this.arrivalAt,
        this.departureAt,
    });

    factory TripStopV1PlannedWindow.fromJson(Map<String, dynamic> json) => TripStopV1PlannedWindow(
        arrivalAt: json["arrivalAt"] == null ? null : DateTime.parse(json["arrivalAt"]),
        departureAt: json["departureAt"] == null ? null : DateTime.parse(json["departureAt"]),
    );

    Map<String, dynamic> toJson() => {
        "arrivalAt": arrivalAt?.toIso8601String(),
        "departureAt": departureAt?.toIso8601String(),
    };
}

enum TripStopV1Source {
    LEADER,
    SYSTEM,
    TASCO_SEARCH
}

final tripStopV1SourceValues = EnumValues({
    "leader": TripStopV1Source.LEADER,
    "system": TripStopV1Source.SYSTEM,
    "tasco-search": TripStopV1Source.TASCO_SEARCH
});

class TascoRoutePreviewV1 {
    final TascoRoutePreviewV1Destination destination;
    final Geometry geometry;
    final TascoRoutePreviewV1Origin origin;
    final Provider provider;
    final String routeId;
    final String sourceVersion;
    final Summary summary;
    final List<Waypoint> waypoints;

    TascoRoutePreviewV1({
        required this.destination,
        required this.geometry,
        required this.origin,
        required this.provider,
        required this.routeId,
        required this.sourceVersion,
        required this.summary,
        required this.waypoints,
    });

    factory TascoRoutePreviewV1.fromJson(Map<String, dynamic> json) => TascoRoutePreviewV1(
        destination: TascoRoutePreviewV1Destination.fromJson(json["destination"]),
        geometry: Geometry.fromJson(json["geometry"]),
        origin: TascoRoutePreviewV1Origin.fromJson(json["origin"]),
        provider: providerValues.map[json["provider"]]!,
        routeId: json["routeId"],
        sourceVersion: json["sourceVersion"],
        summary: Summary.fromJson(json["summary"]),
        waypoints: List<Waypoint>.from(json["waypoints"].map((x) => Waypoint.fromJson(x))),
    );

    Map<String, dynamic> toJson() => {
        "destination": destination.toJson(),
        "geometry": geometry.toJson(),
        "origin": origin.toJson(),
        "provider": providerValues.reverse[provider],
        "routeId": routeId,
        "sourceVersion": sourceVersion,
        "summary": summary.toJson(),
        "waypoints": List<dynamic>.from(waypoints.map((x) => x.toJson())),
    };
}

class TascoRoutePreviewV1Destination {
    final String address;
    final List<String> categories;
    final FluffyCoordinates coordinates;
    final String id;
    final String name;
    final Provider provider;
    final FluffyRatingSummary? ratingSummary;
    final String sourceVersion;

    TascoRoutePreviewV1Destination({
        required this.address,
        required this.categories,
        required this.coordinates,
        required this.id,
        required this.name,
        required this.provider,
        this.ratingSummary,
        required this.sourceVersion,
    });

    factory TascoRoutePreviewV1Destination.fromJson(Map<String, dynamic> json) => TascoRoutePreviewV1Destination(
        address: json["address"],
        categories: List<String>.from(json["categories"].map((x) => x)),
        coordinates: FluffyCoordinates.fromJson(json["coordinates"]),
        id: json["id"],
        name: json["name"],
        provider: providerValues.map[json["provider"]]!,
        ratingSummary: json["ratingSummary"] == null ? null : FluffyRatingSummary.fromJson(json["ratingSummary"]),
        sourceVersion: json["sourceVersion"],
    );

    Map<String, dynamic> toJson() => {
        "address": address,
        "categories": List<dynamic>.from(categories.map((x) => x)),
        "coordinates": coordinates.toJson(),
        "id": id,
        "name": name,
        "provider": providerValues.reverse[provider],
        "ratingSummary": ratingSummary?.toJson(),
        "sourceVersion": sourceVersion,
    };
}

class FluffyCoordinates {
    final double lat;
    final double lon;

    FluffyCoordinates({
        required this.lat,
        required this.lon,
    });

    factory FluffyCoordinates.fromJson(Map<String, dynamic> json) => FluffyCoordinates(
        lat: json["lat"]?.toDouble(),
        lon: json["lon"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "lat": lat,
        "lon": lon,
    };
}

class FluffyRatingSummary {
    final double averageRating;
    final int reviewCount;
    final Provider source;

    FluffyRatingSummary({
        required this.averageRating,
        required this.reviewCount,
        required this.source,
    });

    factory FluffyRatingSummary.fromJson(Map<String, dynamic> json) => FluffyRatingSummary(
        averageRating: json["averageRating"]?.toDouble(),
        reviewCount: json["reviewCount"],
        source: providerValues.map[json["source"]]!,
    );

    Map<String, dynamic> toJson() => {
        "averageRating": averageRating,
        "reviewCount": reviewCount,
        "source": providerValues.reverse[source],
    };
}

class Geometry {
    final List<List<double>> coordinates;
    final GeometryType type;

    Geometry({
        required this.coordinates,
        required this.type,
    });

    factory Geometry.fromJson(Map<String, dynamic> json) => Geometry(
        coordinates: List<List<double>>.from(json["coordinates"].map((x) => List<double>.from(x.map((x) => x?.toDouble())))),
        type: geometryTypeValues.map[json["type"]]!,
    );

    Map<String, dynamic> toJson() => {
        "coordinates": List<dynamic>.from(coordinates.map((x) => List<dynamic>.from(x.map((x) => x)))),
        "type": geometryTypeValues.reverse[type],
    };
}

enum GeometryType {
    LINE_STRING
}

final geometryTypeValues = EnumValues({
    "LineString": GeometryType.LINE_STRING
});

class TascoRoutePreviewV1Origin {
    final String address;
    final List<String> categories;
    final TentacledCoordinates coordinates;
    final String id;
    final String name;
    final Provider provider;
    final TentacledRatingSummary? ratingSummary;
    final String sourceVersion;

    TascoRoutePreviewV1Origin({
        required this.address,
        required this.categories,
        required this.coordinates,
        required this.id,
        required this.name,
        required this.provider,
        this.ratingSummary,
        required this.sourceVersion,
    });

    factory TascoRoutePreviewV1Origin.fromJson(Map<String, dynamic> json) => TascoRoutePreviewV1Origin(
        address: json["address"],
        categories: List<String>.from(json["categories"].map((x) => x)),
        coordinates: TentacledCoordinates.fromJson(json["coordinates"]),
        id: json["id"],
        name: json["name"],
        provider: providerValues.map[json["provider"]]!,
        ratingSummary: json["ratingSummary"] == null ? null : TentacledRatingSummary.fromJson(json["ratingSummary"]),
        sourceVersion: json["sourceVersion"],
    );

    Map<String, dynamic> toJson() => {
        "address": address,
        "categories": List<dynamic>.from(categories.map((x) => x)),
        "coordinates": coordinates.toJson(),
        "id": id,
        "name": name,
        "provider": providerValues.reverse[provider],
        "ratingSummary": ratingSummary?.toJson(),
        "sourceVersion": sourceVersion,
    };
}

class TentacledCoordinates {
    final double lat;
    final double lon;

    TentacledCoordinates({
        required this.lat,
        required this.lon,
    });

    factory TentacledCoordinates.fromJson(Map<String, dynamic> json) => TentacledCoordinates(
        lat: json["lat"]?.toDouble(),
        lon: json["lon"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "lat": lat,
        "lon": lon,
    };
}

class TentacledRatingSummary {
    final double averageRating;
    final int reviewCount;
    final Provider source;

    TentacledRatingSummary({
        required this.averageRating,
        required this.reviewCount,
        required this.source,
    });

    factory TentacledRatingSummary.fromJson(Map<String, dynamic> json) => TentacledRatingSummary(
        averageRating: json["averageRating"]?.toDouble(),
        reviewCount: json["reviewCount"],
        source: providerValues.map[json["source"]]!,
    );

    Map<String, dynamic> toJson() => {
        "averageRating": averageRating,
        "reviewCount": reviewCount,
        "source": providerValues.reverse[source],
    };
}

class Summary {
    final int distanceMeters;
    final int durationSeconds;

    Summary({
        required this.distanceMeters,
        required this.durationSeconds,
    });

    factory Summary.fromJson(Map<String, dynamic> json) => Summary(
        distanceMeters: json["distanceMeters"],
        durationSeconds: json["durationSeconds"],
    );

    Map<String, dynamic> toJson() => {
        "distanceMeters": distanceMeters,
        "durationSeconds": durationSeconds,
    };
}

class Waypoint {
    final String address;
    final List<String> categories;
    final WaypointCoordinates coordinates;
    final String id;
    final String name;
    final Provider provider;
    final WaypointRatingSummary? ratingSummary;
    final String sourceVersion;

    Waypoint({
        required this.address,
        required this.categories,
        required this.coordinates,
        required this.id,
        required this.name,
        required this.provider,
        this.ratingSummary,
        required this.sourceVersion,
    });

    factory Waypoint.fromJson(Map<String, dynamic> json) => Waypoint(
        address: json["address"],
        categories: List<String>.from(json["categories"].map((x) => x)),
        coordinates: WaypointCoordinates.fromJson(json["coordinates"]),
        id: json["id"],
        name: json["name"],
        provider: providerValues.map[json["provider"]]!,
        ratingSummary: json["ratingSummary"] == null ? null : WaypointRatingSummary.fromJson(json["ratingSummary"]),
        sourceVersion: json["sourceVersion"],
    );

    Map<String, dynamic> toJson() => {
        "address": address,
        "categories": List<dynamic>.from(categories.map((x) => x)),
        "coordinates": coordinates.toJson(),
        "id": id,
        "name": name,
        "provider": providerValues.reverse[provider],
        "ratingSummary": ratingSummary?.toJson(),
        "sourceVersion": sourceVersion,
    };
}

class WaypointCoordinates {
    final double lat;
    final double lon;

    WaypointCoordinates({
        required this.lat,
        required this.lon,
    });

    factory WaypointCoordinates.fromJson(Map<String, dynamic> json) => WaypointCoordinates(
        lat: json["lat"]?.toDouble(),
        lon: json["lon"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "lat": lat,
        "lon": lon,
    };
}

class WaypointRatingSummary {
    final double averageRating;
    final int reviewCount;
    final Provider source;

    WaypointRatingSummary({
        required this.averageRating,
        required this.reviewCount,
        required this.source,
    });

    factory WaypointRatingSummary.fromJson(Map<String, dynamic> json) => WaypointRatingSummary(
        averageRating: json["averageRating"]?.toDouble(),
        reviewCount: json["reviewCount"],
        source: providerValues.map[json["source"]]!,
    );

    Map<String, dynamic> toJson() => {
        "averageRating": averageRating,
        "reviewCount": reviewCount,
        "source": providerValues.reverse[source],
    };
}

class TripPlanSummaryV1 {
    final DateTime departureTime;
    final TripPlanSummaryV1Destination destination;
    final TripPlanSummaryV1Lifecycle lifecycle;
    final int memberCount;
    final TripPlanSummaryV1Origin origin;
    final String policyId;
    final RouteSummary routeSummary;
    final List<Stop> stops;
    final String title;
    final String tripId;

    TripPlanSummaryV1({
        required this.departureTime,
        required this.destination,
        required this.lifecycle,
        required this.memberCount,
        required this.origin,
        required this.policyId,
        required this.routeSummary,
        required this.stops,
        required this.title,
        required this.tripId,
    });

    factory TripPlanSummaryV1.fromJson(Map<String, dynamic> json) => TripPlanSummaryV1(
        departureTime: DateTime.parse(json["departureTime"]),
        destination: TripPlanSummaryV1Destination.fromJson(json["destination"]),
        lifecycle: tripPlanSummaryV1LifecycleValues.map[json["lifecycle"]]!,
        memberCount: json["memberCount"],
        origin: TripPlanSummaryV1Origin.fromJson(json["origin"]),
        policyId: json["policyId"],
        routeSummary: RouteSummary.fromJson(json["routeSummary"]),
        stops: List<Stop>.from(json["stops"].map((x) => Stop.fromJson(x))),
        title: json["title"],
        tripId: json["tripId"],
    );

    Map<String, dynamic> toJson() => {
        "departureTime": departureTime.toIso8601String(),
        "destination": destination.toJson(),
        "lifecycle": tripPlanSummaryV1LifecycleValues.reverse[lifecycle],
        "memberCount": memberCount,
        "origin": origin.toJson(),
        "policyId": policyId,
        "routeSummary": routeSummary.toJson(),
        "stops": List<dynamic>.from(stops.map((x) => x.toJson())),
        "title": title,
        "tripId": tripId,
    };
}

class TripPlanSummaryV1Destination {
    final String address;
    final List<String> categories;
    final StickyCoordinates coordinates;
    final String id;
    final String name;
    final Provider provider;
    final StickyRatingSummary? ratingSummary;
    final String sourceVersion;

    TripPlanSummaryV1Destination({
        required this.address,
        required this.categories,
        required this.coordinates,
        required this.id,
        required this.name,
        required this.provider,
        this.ratingSummary,
        required this.sourceVersion,
    });

    factory TripPlanSummaryV1Destination.fromJson(Map<String, dynamic> json) => TripPlanSummaryV1Destination(
        address: json["address"],
        categories: List<String>.from(json["categories"].map((x) => x)),
        coordinates: StickyCoordinates.fromJson(json["coordinates"]),
        id: json["id"],
        name: json["name"],
        provider: providerValues.map[json["provider"]]!,
        ratingSummary: json["ratingSummary"] == null ? null : StickyRatingSummary.fromJson(json["ratingSummary"]),
        sourceVersion: json["sourceVersion"],
    );

    Map<String, dynamic> toJson() => {
        "address": address,
        "categories": List<dynamic>.from(categories.map((x) => x)),
        "coordinates": coordinates.toJson(),
        "id": id,
        "name": name,
        "provider": providerValues.reverse[provider],
        "ratingSummary": ratingSummary?.toJson(),
        "sourceVersion": sourceVersion,
    };
}

class StickyCoordinates {
    final double lat;
    final double lon;

    StickyCoordinates({
        required this.lat,
        required this.lon,
    });

    factory StickyCoordinates.fromJson(Map<String, dynamic> json) => StickyCoordinates(
        lat: json["lat"]?.toDouble(),
        lon: json["lon"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "lat": lat,
        "lon": lon,
    };
}

class StickyRatingSummary {
    final double averageRating;
    final int reviewCount;
    final Provider source;

    StickyRatingSummary({
        required this.averageRating,
        required this.reviewCount,
        required this.source,
    });

    factory StickyRatingSummary.fromJson(Map<String, dynamic> json) => StickyRatingSummary(
        averageRating: json["averageRating"]?.toDouble(),
        reviewCount: json["reviewCount"],
        source: providerValues.map[json["source"]]!,
    );

    Map<String, dynamic> toJson() => {
        "averageRating": averageRating,
        "reviewCount": reviewCount,
        "source": providerValues.reverse[source],
    };
}

enum TripPlanSummaryV1Lifecycle {
    ACTIVE,
    ARCHIVED,
    COMPLETED,
    DRAFT,
    READY
}

final tripPlanSummaryV1LifecycleValues = EnumValues({
    "active": TripPlanSummaryV1Lifecycle.ACTIVE,
    "archived": TripPlanSummaryV1Lifecycle.ARCHIVED,
    "completed": TripPlanSummaryV1Lifecycle.COMPLETED,
    "draft": TripPlanSummaryV1Lifecycle.DRAFT,
    "ready": TripPlanSummaryV1Lifecycle.READY
});

class TripPlanSummaryV1Origin {
    final String address;
    final List<String> categories;
    final IndigoCoordinates coordinates;
    final String id;
    final String name;
    final Provider provider;
    final IndigoRatingSummary? ratingSummary;
    final String sourceVersion;

    TripPlanSummaryV1Origin({
        required this.address,
        required this.categories,
        required this.coordinates,
        required this.id,
        required this.name,
        required this.provider,
        this.ratingSummary,
        required this.sourceVersion,
    });

    factory TripPlanSummaryV1Origin.fromJson(Map<String, dynamic> json) => TripPlanSummaryV1Origin(
        address: json["address"],
        categories: List<String>.from(json["categories"].map((x) => x)),
        coordinates: IndigoCoordinates.fromJson(json["coordinates"]),
        id: json["id"],
        name: json["name"],
        provider: providerValues.map[json["provider"]]!,
        ratingSummary: json["ratingSummary"] == null ? null : IndigoRatingSummary.fromJson(json["ratingSummary"]),
        sourceVersion: json["sourceVersion"],
    );

    Map<String, dynamic> toJson() => {
        "address": address,
        "categories": List<dynamic>.from(categories.map((x) => x)),
        "coordinates": coordinates.toJson(),
        "id": id,
        "name": name,
        "provider": providerValues.reverse[provider],
        "ratingSummary": ratingSummary?.toJson(),
        "sourceVersion": sourceVersion,
    };
}

class IndigoCoordinates {
    final double lat;
    final double lon;

    IndigoCoordinates({
        required this.lat,
        required this.lon,
    });

    factory IndigoCoordinates.fromJson(Map<String, dynamic> json) => IndigoCoordinates(
        lat: json["lat"]?.toDouble(),
        lon: json["lon"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "lat": lat,
        "lon": lon,
    };
}

class IndigoRatingSummary {
    final double averageRating;
    final int reviewCount;
    final Provider source;

    IndigoRatingSummary({
        required this.averageRating,
        required this.reviewCount,
        required this.source,
    });

    factory IndigoRatingSummary.fromJson(Map<String, dynamic> json) => IndigoRatingSummary(
        averageRating: json["averageRating"]?.toDouble(),
        reviewCount: json["reviewCount"],
        source: providerValues.map[json["source"]]!,
    );

    Map<String, dynamic> toJson() => {
        "averageRating": averageRating,
        "reviewCount": reviewCount,
        "source": providerValues.reverse[source],
    };
}

class RouteSummary {
    final int distanceMeters;
    final int durationSeconds;

    RouteSummary({
        required this.distanceMeters,
        required this.durationSeconds,
    });

    factory RouteSummary.fromJson(Map<String, dynamic> json) => RouteSummary(
        distanceMeters: json["distanceMeters"],
        durationSeconds: json["durationSeconds"],
    );

    Map<String, dynamic> toJson() => {
        "distanceMeters": distanceMeters,
        "durationSeconds": durationSeconds,
    };
}

class Stop {
    final bool locked;
    final String? notes;
    final StopPlace place;
    final StopPlannedWindow? plannedWindow;
    final TripStopV1Source source;
    final String stopId;

    Stop({
        required this.locked,
        this.notes,
        required this.place,
        this.plannedWindow,
        required this.source,
        required this.stopId,
    });

    factory Stop.fromJson(Map<String, dynamic> json) => Stop(
        locked: json["locked"],
        notes: json["notes"],
        place: StopPlace.fromJson(json["place"]),
        plannedWindow: json["plannedWindow"] == null ? null : StopPlannedWindow.fromJson(json["plannedWindow"]),
        source: tripStopV1SourceValues.map[json["source"]]!,
        stopId: json["stopId"],
    );

    Map<String, dynamic> toJson() => {
        "locked": locked,
        "notes": notes,
        "place": place.toJson(),
        "plannedWindow": plannedWindow?.toJson(),
        "source": tripStopV1SourceValues.reverse[source],
        "stopId": stopId,
    };
}

class StopPlace {
    final String address;
    final List<String> categories;
    final IndecentCoordinates coordinates;
    final String id;
    final String name;
    final Provider provider;
    final IndecentRatingSummary? ratingSummary;
    final String sourceVersion;

    StopPlace({
        required this.address,
        required this.categories,
        required this.coordinates,
        required this.id,
        required this.name,
        required this.provider,
        this.ratingSummary,
        required this.sourceVersion,
    });

    factory StopPlace.fromJson(Map<String, dynamic> json) => StopPlace(
        address: json["address"],
        categories: List<String>.from(json["categories"].map((x) => x)),
        coordinates: IndecentCoordinates.fromJson(json["coordinates"]),
        id: json["id"],
        name: json["name"],
        provider: providerValues.map[json["provider"]]!,
        ratingSummary: json["ratingSummary"] == null ? null : IndecentRatingSummary.fromJson(json["ratingSummary"]),
        sourceVersion: json["sourceVersion"],
    );

    Map<String, dynamic> toJson() => {
        "address": address,
        "categories": List<dynamic>.from(categories.map((x) => x)),
        "coordinates": coordinates.toJson(),
        "id": id,
        "name": name,
        "provider": providerValues.reverse[provider],
        "ratingSummary": ratingSummary?.toJson(),
        "sourceVersion": sourceVersion,
    };
}

class IndecentCoordinates {
    final double lat;
    final double lon;

    IndecentCoordinates({
        required this.lat,
        required this.lon,
    });

    factory IndecentCoordinates.fromJson(Map<String, dynamic> json) => IndecentCoordinates(
        lat: json["lat"]?.toDouble(),
        lon: json["lon"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "lat": lat,
        "lon": lon,
    };
}

class IndecentRatingSummary {
    final double averageRating;
    final int reviewCount;
    final Provider source;

    IndecentRatingSummary({
        required this.averageRating,
        required this.reviewCount,
        required this.source,
    });

    factory IndecentRatingSummary.fromJson(Map<String, dynamic> json) => IndecentRatingSummary(
        averageRating: json["averageRating"]?.toDouble(),
        reviewCount: json["reviewCount"],
        source: providerValues.map[json["source"]]!,
    );

    Map<String, dynamic> toJson() => {
        "averageRating": averageRating,
        "reviewCount": reviewCount,
        "source": providerValues.reverse[source],
    };
}

class StopPlannedWindow {
    final DateTime? arrivalAt;
    final DateTime? departureAt;

    StopPlannedWindow({
        this.arrivalAt,
        this.departureAt,
    });

    factory StopPlannedWindow.fromJson(Map<String, dynamic> json) => StopPlannedWindow(
        arrivalAt: json["arrivalAt"] == null ? null : DateTime.parse(json["arrivalAt"]),
        departureAt: json["departureAt"] == null ? null : DateTime.parse(json["departureAt"]),
    );

    Map<String, dynamic> toJson() => {
        "arrivalAt": arrivalAt?.toIso8601String(),
        "departureAt": departureAt?.toIso8601String(),
    };
}

class JoinTripResultV1 {
    final List<ConsentRequirement> consentRequirements;
    final String memberId;
    final Role role;
    final RouteOfflineSummary routeOfflineSummary;
    final double schemaVersion;
    final String tripId;

    JoinTripResultV1({
        required this.consentRequirements,
        required this.memberId,
        required this.role,
        required this.routeOfflineSummary,
        required this.schemaVersion,
        required this.tripId,
    });

    factory JoinTripResultV1.fromJson(Map<String, dynamic> json) => JoinTripResultV1(
        consentRequirements: List<ConsentRequirement>.from(json["consentRequirements"].map((x) => consentRequirementValues.map[x]!)),
        memberId: json["memberId"],
        role: roleValues.map[json["role"]]!,
        routeOfflineSummary: RouteOfflineSummary.fromJson(json["routeOfflineSummary"]),
        schemaVersion: json["schemaVersion"]?.toDouble(),
        tripId: json["tripId"],
    );

    Map<String, dynamic> toJson() => {
        "consentRequirements": List<dynamic>.from(consentRequirements.map((x) => consentRequirementValues.reverse[x])),
        "memberId": memberId,
        "role": roleValues.reverse[role],
        "routeOfflineSummary": routeOfflineSummary.toJson(),
        "schemaVersion": schemaVersion,
        "tripId": tripId,
    };
}

enum ConsentRequirement {
    BACKGROUND_LOCATION,
    DRIVER_ALERTS,
    LOCATION_WHILE_DRIVING
}

final consentRequirementValues = EnumValues({
    "background-location": ConsentRequirement.BACKGROUND_LOCATION,
    "driver-alerts": ConsentRequirement.DRIVER_ALERTS,
    "location-while-driving": ConsentRequirement.LOCATION_WHILE_DRIVING
});

class RouteOfflineSummary {
    final int distanceMeters;
    final int durationSeconds;
    final String encodedGeometry;
    final String routeId;
    final String sourceVersion;

    RouteOfflineSummary({
        required this.distanceMeters,
        required this.durationSeconds,
        required this.encodedGeometry,
        required this.routeId,
        required this.sourceVersion,
    });

    factory RouteOfflineSummary.fromJson(Map<String, dynamic> json) => RouteOfflineSummary(
        distanceMeters: json["distanceMeters"],
        durationSeconds: json["durationSeconds"],
        encodedGeometry: json["encodedGeometry"],
        routeId: json["routeId"],
        sourceVersion: json["sourceVersion"],
    );

    Map<String, dynamic> toJson() => {
        "distanceMeters": distanceMeters,
        "durationSeconds": durationSeconds,
        "encodedGeometry": encodedGeometry,
        "routeId": routeId,
        "sourceVersion": sourceVersion,
    };
}

class EnumValues<T> {
    Map<String, T> map;
    late Map<T, String> reverseMap;

    EnumValues(this.map);

    Map<T, String> get reverse {
            reverseMap = map.map((k, v) => MapEntry(v, k));
            return reverseMap;
    }
}
