import 'dart:convert';
import 'dart:io';

import '../../../apps/mobile/lib/contracts/generated/loopin_contracts.dart';

Never _fail(String message) => throw StateError(message);

void _expectInvalidVersion(void Function() parse, String contractName) {
  try {
    parse();
  } on FormatException {
    return;
  }
  _fail('$contractName accepted incompatible schemaVersion 2.');
}

void main() {
  final testDirectory = File.fromUri(Platform.script).parent;
  final examples =
      jsonDecode(
            File.fromUri(
              testDirectory.uri.resolve(
                '../generated/contract-examples-v1.json',
              ),
            ).readAsStringSync(),
          )
          as Map<String, dynamic>;
  final cases = examples['cases'] as List<dynamic>;

  for (final value in cases.cast<Map<String, dynamic>>()) {
    final telemetry = value['telemetry'] as Map<String, dynamic>;
    if (value['expectedContract'] == 'valid') {
      LocationTelemetryV1.fromJson(telemetry);
    }
    if (value['caseId'] == 'valid-golden') {
      final projectedLocation =
          value['projectedLocation'] as Map<String, dynamic>;
      final eventEnvelope = value['eventEnvelope'] as Map<String, dynamic>;
      final memberTelemetryInput =
          value['memberTelemetryInput'] as Map<String, dynamic>;
      ProjectedLocationV1.fromJson(projectedLocation);
      MemberTelemetryInputV1.fromJson(memberTelemetryInput);
      EventEnvelopeV1.fromJson(eventEnvelope);
      ConvoyGraphV1.fromJson(value['convoyGraph'] as Map<String, dynamic>);
      SituationV1.fromJson(value['situation'] as Map<String, dynamic>);
      NotificationRequestV1.fromJson(
        value['notificationRequest'] as Map<String, dynamic>,
      );
      final liveSnapshot = value['liveSnapshot'] as Map<String, dynamic>;
      final convoySituationEvent =
          value['convoySituationEvent'] as Map<String, dynamic>;
      final driverAlert = value['driverAlert'] as Map<String, dynamic>;
      final driverAlertAcknowledgement =
          value['driverAlertAcknowledgement'] as Map<String, dynamic>;
      final realtimeEvent = value['realtimeEvent'] as Map<String, dynamic>;
      LiveSnapshotV1.fromJson(liveSnapshot);
      ConvoySituationEventV1.fromJson(convoySituationEvent);
      DriverAlertV1.fromJson(driverAlert);
      DriverAlertAcknowledgementV1.fromJson(driverAlertAcknowledgement);
      RealtimeEventV1.fromJson(realtimeEvent);
      _expectInvalidVersion(
        () => MemberTelemetryInputV1.fromJson({
          ...memberTelemetryInput,
          'schemaVersion': 2,
        }),
        'MemberTelemetryInputV1',
      );
      _expectInvalidVersion(
        () => ProjectedLocationV1.fromJson({
          ...projectedLocation,
          'schemaVersion': 2,
        }),
        'ProjectedLocationV1',
      );
      _expectInvalidVersion(
        () => EventEnvelopeV1.fromJson({...eventEnvelope, 'schemaVersion': 2}),
        'EventEnvelopeV1',
      );
      _expectInvalidVersion(
        () => LiveSnapshotV1.fromJson({...liveSnapshot, 'schemaVersion': 2}),
        'LiveSnapshotV1',
      );
      _expectInvalidVersion(
        () => ConvoySituationEventV1.fromJson({
          ...convoySituationEvent,
          'schemaVersion': 2,
        }),
        'ConvoySituationEventV1',
      );
      _expectInvalidVersion(
        () => DriverAlertV1.fromJson({...driverAlert, 'schemaVersion': 2}),
        'DriverAlertV1',
      );
      _expectInvalidVersion(
        () => DriverAlertAcknowledgementV1.fromJson({
          ...driverAlertAcknowledgement,
          'schemaVersion': 2,
        }),
        'DriverAlertAcknowledgementV1',
      );
      _expectInvalidVersion(
        () => RealtimeEventV1.fromJson({...realtimeEvent, 'schemaVersion': 2}),
        'RealtimeEventV1',
      );
    }
    if (value['caseId'] == 'invalid-version') {
      _expectInvalidVersion(
        () => LocationTelemetryV1.fromJson(telemetry),
        'LocationTelemetryV1',
      );
    }
  }
}
