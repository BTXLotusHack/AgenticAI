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
  final examples = jsonDecode(
    File.fromUri(testDirectory.uri.resolve('../generated/contract-examples-v1.json')).readAsStringSync(),
  ) as Map<String, dynamic>;
  final cases = examples['cases'] as List<dynamic>;

  for (final value in cases.cast<Map<String, dynamic>>()) {
    final telemetry = value['telemetry'] as Map<String, dynamic>;
    if (value['expectedContract'] == 'valid') {
      LocationTelemetryV1.fromJson(telemetry);
    }
    if (value['caseId'] == 'valid-golden') {
      final projectedLocation = value['projectedLocation'] as Map<String, dynamic>;
      final eventEnvelope = value['eventEnvelope'] as Map<String, dynamic>;
      ProjectedLocationV1.fromJson(projectedLocation);
      EventEnvelopeV1.fromJson(eventEnvelope);
      ConvoyGraphV1.fromJson(value['convoyGraph'] as Map<String, dynamic>);
      SituationV1.fromJson(value['situation'] as Map<String, dynamic>);
      NotificationRequestV1.fromJson(value['notificationRequest'] as Map<String, dynamic>);
      _expectInvalidVersion(
        () => ProjectedLocationV1.fromJson({...projectedLocation, 'schemaVersion': 2}),
        'ProjectedLocationV1',
      );
      _expectInvalidVersion(
        () => EventEnvelopeV1.fromJson({...eventEnvelope, 'schemaVersion': 2}),
        'EventEnvelopeV1',
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
