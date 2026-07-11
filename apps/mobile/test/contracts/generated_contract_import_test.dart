import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/contracts/generated/loopin_contracts.dart';

void main() {
  test('generated contract library is importable from the mobile package', () {
    expect(locationTelemetryV1FromJson, isA<Function>());
  });
}
