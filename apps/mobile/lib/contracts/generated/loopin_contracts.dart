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

PlaceCommunitySummaryV1 placeCommunitySummaryV1FromJson(String str) => PlaceCommunitySummaryV1.fromJson(json.decode(str));

String placeCommunitySummaryV1ToJson(PlaceCommunitySummaryV1 data) => json.encode(data.toJson());

LocationVisibilityPolicyV1 locationVisibilityPolicyV1FromJson(String str) => LocationVisibilityPolicyV1.fromJson(json.decode(str));

String locationVisibilityPolicyV1ToJson(LocationVisibilityPolicyV1 data) => json.encode(data.toJson());

UserTravelProfileV1 userTravelProfileV1FromJson(String str) => UserTravelProfileV1.fromJson(json.decode(str));

String userTravelProfileV1ToJson(UserTravelProfileV1 data) => json.encode(data.toJson());

ContentReportV1 contentReportV1FromJson(String str) => ContentReportV1.fromJson(json.decode(str));

String contentReportV1ToJson(ContentReportV1 data) => json.encode(data.toJson());

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
        evidence: Evidence.fromJson(json["evidence"]),
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

class PlaceCommunitySummaryV1 {
    final double? averageRating;
    final int commentCount;
    final int reviewCount;
    final double schemaVersion;
    final PlaceCommunitySummaryV1Source source;
    final String tascoPlaceId;
    final bool viewerCanReview;
    final bool viewerHasReviewed;

    PlaceCommunitySummaryV1({
        required this.averageRating,
        required this.commentCount,
        required this.reviewCount,
        required this.schemaVersion,
        required this.source,
        required this.tascoPlaceId,
        required this.viewerCanReview,
        required this.viewerHasReviewed,
    });

    factory PlaceCommunitySummaryV1.fromJson(Map<String, dynamic> json) => PlaceCommunitySummaryV1(
        averageRating: json["averageRating"]?.toDouble(),
        commentCount: json["commentCount"],
        reviewCount: json["reviewCount"],
        schemaVersion: json["schemaVersion"]?.toDouble(),
        source: placeCommunitySummaryV1SourceValues.map[json["source"]]!,
        tascoPlaceId: json["tascoPlaceId"],
        viewerCanReview: json["viewerCanReview"],
        viewerHasReviewed: json["viewerHasReviewed"],
    );

    Map<String, dynamic> toJson() => {
        "averageRating": averageRating,
        "commentCount": commentCount,
        "reviewCount": reviewCount,
        "schemaVersion": schemaVersion,
        "source": placeCommunitySummaryV1SourceValues.reverse[source],
        "tascoPlaceId": tascoPlaceId,
        "viewerCanReview": viewerCanReview,
        "viewerHasReviewed": viewerHasReviewed,
    };
}

enum PlaceCommunitySummaryV1Source {
    USER_GENERATED
}

final placeCommunitySummaryV1SourceValues = EnumValues({
    "user-generated": PlaceCommunitySummaryV1Source.USER_GENERATED
});

class LocationVisibilityPolicyV1 {
    final List<String> blockedUserIds;
    final PlacePresenceVisibility placePresenceVisibility;
    final RetentionPreference retentionPreference;
    final double schemaVersion;
    final TripVisibility tripVisibility;
    final DateTime updatedAt;
    final String userId;

    LocationVisibilityPolicyV1({
        required this.blockedUserIds,
        required this.placePresenceVisibility,
        required this.retentionPreference,
        required this.schemaVersion,
        required this.tripVisibility,
        required this.updatedAt,
        required this.userId,
    });

    factory LocationVisibilityPolicyV1.fromJson(Map<String, dynamic> json) => LocationVisibilityPolicyV1(
        blockedUserIds: List<String>.from(json["blockedUserIds"].map((x) => x)),
        placePresenceVisibility: placePresenceVisibilityValues.map[json["placePresenceVisibility"]]!,
        retentionPreference: retentionPreferenceValues.map[json["retentionPreference"]]!,
        schemaVersion: json["schemaVersion"]?.toDouble(),
        tripVisibility: tripVisibilityValues.map[json["tripVisibility"]]!,
        updatedAt: DateTime.parse(json["updatedAt"]),
        userId: json["userId"],
    );

    Map<String, dynamic> toJson() => {
        "blockedUserIds": List<dynamic>.from(blockedUserIds.map((x) => x)),
        "placePresenceVisibility": placePresenceVisibilityValues.reverse[placePresenceVisibility],
        "retentionPreference": retentionPreferenceValues.reverse[retentionPreference],
        "schemaVersion": schemaVersion,
        "tripVisibility": tripVisibilityValues.reverse[tripVisibility],
        "updatedAt": updatedAt.toIso8601String(),
        "userId": userId,
    };
}

enum PlacePresenceVisibility {
    CONNECTIONS,
    PRIVATE,
    PUBLIC
}

final placePresenceVisibilityValues = EnumValues({
    "connections": PlacePresenceVisibility.CONNECTIONS,
    "private": PlacePresenceVisibility.PRIVATE,
    "public": PlacePresenceVisibility.PUBLIC
});

enum RetentionPreference {
    EXTENDED,
    MINIMAL,
    STANDARD
}

final retentionPreferenceValues = EnumValues({
    "extended": RetentionPreference.EXTENDED,
    "minimal": RetentionPreference.MINIMAL,
    "standard": RetentionPreference.STANDARD
});

enum TripVisibility {
    GROUP,
    LEADER_ONLY,
    PAUSED
}

final tripVisibilityValues = EnumValues({
    "group": TripVisibility.GROUP,
    "leader-only": TripVisibility.LEADER_ONLY,
    "paused": TripVisibility.PAUSED
});

class UserTravelProfileV1 {
    final List<String> accessibilityPreferences;
    final List<String> dietaryPreferences;
    final String displayName;
    final String? homeCity;
    final List<String> interests;
    final List<Locale> preferredLanguages;
    final double schemaVersion;
    final List<String> travelStyles;
    final DateTime updatedAt;
    final String userId;

    UserTravelProfileV1({
        required this.accessibilityPreferences,
        required this.dietaryPreferences,
        required this.displayName,
        required this.homeCity,
        required this.interests,
        required this.preferredLanguages,
        required this.schemaVersion,
        required this.travelStyles,
        required this.updatedAt,
        required this.userId,
    });

    factory UserTravelProfileV1.fromJson(Map<String, dynamic> json) => UserTravelProfileV1(
        accessibilityPreferences: List<String>.from(json["accessibilityPreferences"].map((x) => x)),
        dietaryPreferences: List<String>.from(json["dietaryPreferences"].map((x) => x)),
        displayName: json["displayName"],
        homeCity: json["homeCity"],
        interests: List<String>.from(json["interests"].map((x) => x)),
        preferredLanguages: List<Locale>.from(json["preferredLanguages"].map((x) => localeValues.map[x]!)),
        schemaVersion: json["schemaVersion"]?.toDouble(),
        travelStyles: List<String>.from(json["travelStyles"].map((x) => x)),
        updatedAt: DateTime.parse(json["updatedAt"]),
        userId: json["userId"],
    );

    Map<String, dynamic> toJson() => {
        "accessibilityPreferences": List<dynamic>.from(accessibilityPreferences.map((x) => x)),
        "dietaryPreferences": List<dynamic>.from(dietaryPreferences.map((x) => x)),
        "displayName": displayName,
        "homeCity": homeCity,
        "interests": List<dynamic>.from(interests.map((x) => x)),
        "preferredLanguages": List<dynamic>.from(preferredLanguages.map((x) => localeValues.reverse[x])),
        "schemaVersion": schemaVersion,
        "travelStyles": List<dynamic>.from(travelStyles.map((x) => x)),
        "updatedAt": updatedAt.toIso8601String(),
        "userId": userId,
    };
}

class ContentReportV1 {
    final DateTime createdAt;
    final String? details;
    final ReasonCode reasonCode;
    final String reporterUserId;
    final String reportId;
    final Resolution? resolution;
    final DateTime? resolvedAt;
    final String? resolvedByUserId;
    final double schemaVersion;
    final Status status;
    final String targetId;
    final TargetType targetType;

    ContentReportV1({
        required this.createdAt,
        required this.details,
        required this.reasonCode,
        required this.reporterUserId,
        required this.reportId,
        required this.resolution,
        required this.resolvedAt,
        required this.resolvedByUserId,
        required this.schemaVersion,
        required this.status,
        required this.targetId,
        required this.targetType,
    });

    factory ContentReportV1.fromJson(Map<String, dynamic> json) => ContentReportV1(
        createdAt: DateTime.parse(json["createdAt"]),
        details: json["details"],
        reasonCode: reasonCodeValues.map[json["reasonCode"]]!,
        reporterUserId: json["reporterUserId"],
        reportId: json["reportId"],
        resolution: resolutionValues.map[json["resolution"]],
        resolvedAt: json["resolvedAt"] == null ? null : DateTime.parse(json["resolvedAt"]),
        resolvedByUserId: json["resolvedByUserId"],
        schemaVersion: json["schemaVersion"]?.toDouble(),
        status: statusValues.map[json["status"]]!,
        targetId: json["targetId"],
        targetType: targetTypeValues.map[json["targetType"]]!,
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt.toIso8601String(),
        "details": details,
        "reasonCode": reasonCodeValues.reverse[reasonCode],
        "reporterUserId": reporterUserId,
        "reportId": reportId,
        "resolution": resolutionValues.reverse[resolution],
        "resolvedAt": resolvedAt?.toIso8601String(),
        "resolvedByUserId": resolvedByUserId,
        "schemaVersion": schemaVersion,
        "status": statusValues.reverse[status],
        "targetId": targetId,
        "targetType": targetTypeValues.reverse[targetType],
    };
}

enum ReasonCode {
    HARASSMENT,
    MISLEADING,
    OTHER,
    PRIVACY_VIOLATION,
    SPAM
}

final reasonCodeValues = EnumValues({
    "harassment": ReasonCode.HARASSMENT,
    "misleading": ReasonCode.MISLEADING,
    "other": ReasonCode.OTHER,
    "privacy-violation": ReasonCode.PRIVACY_VIOLATION,
    "spam": ReasonCode.SPAM
});

enum Resolution {
    APPROVE_TARGET,
    HIDE_TARGET,
    RESOLVE_REPORT
}

final resolutionValues = EnumValues({
    "approve-target": Resolution.APPROVE_TARGET,
    "hide-target": Resolution.HIDE_TARGET,
    "resolve-report": Resolution.RESOLVE_REPORT
});

enum Status {
    OPEN,
    RESOLVED
}

final statusValues = EnumValues({
    "open": Status.OPEN,
    "resolved": Status.RESOLVED
});

enum TargetType {
    PLACE_REVIEW,
    TRAVEL_PRESENCE
}

final targetTypeValues = EnumValues({
    "place-review": TargetType.PLACE_REVIEW,
    "travel-presence": TargetType.TRAVEL_PRESENCE
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
