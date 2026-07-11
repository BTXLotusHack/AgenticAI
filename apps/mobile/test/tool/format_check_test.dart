import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import '../../tool/format_check.dart';

void main() {
  test('selects every handwritten Dart area', () {
    expect(isHandwrittenDartPath('lib/app/loopin_app.dart'), isTrue);
    expect(isHandwrittenDartPath('lib/features/trip/view.dart'), isTrue);
    expect(isHandwrittenDartPath('test/app/loopin_app_test.dart'), isTrue);
    expect(isHandwrittenDartPath('integration_test/trip_test.dart'), isTrue);
    expect(isHandwrittenDartPath('tool/format_check.dart'), isTrue);
  });

  test('excludes generated contracts, build outputs, and non-Dart files', () {
    expect(
      isHandwrittenDartPath('lib/contracts/generated/loopin_contracts.dart'),
      isFalse,
    );
    expect(isHandwrittenDartPath('build/generated/plugin.dart'), isFalse);
    expect(isHandwrittenDartPath('.dart_tool/build/entrypoint.dart'), isFalse);
    expect(isHandwrittenDartPath('lib/app/readme.md'), isFalse);
  });

  test('discovers source without traversing excluded directories', () async {
    final root = await Directory.systemTemp.createTemp('loopin-format-check-');
    addTearDown(() => root.delete(recursive: true));
    await File('${root.path}/lib/app.dart').create(recursive: true);
    await File('${root.path}/build/generated.dart').create(recursive: true);
    await File(
      '${root.path}/lib/contracts/generated/contracts.dart',
    ).create(recursive: true);

    expect(await findHandwrittenDartFiles(root), <String>['lib/app.dart']);
  });
}
