import 'dart:io';

bool isHandwrittenDartPath(String path) {
  final normalized = path.replaceAll('\\', '/');
  final segments = normalized.split('/');

  return normalized.endsWith('.dart') &&
      !segments.contains('build') &&
      !segments.contains('.dart_tool') &&
      !normalized.startsWith('lib/contracts/generated/');
}

Future<List<String>> findHandwrittenDartFiles(Directory root) async {
  final dartFiles = <String>[];

  Future<void> visit(Directory directory, String relativeDirectory) async {
    await for (final entity in directory.list(followLinks: false)) {
      final name = entity.path.substring(directory.path.length + 1);
      final relativePath = relativeDirectory.isEmpty
          ? name
          : '$relativeDirectory/$name';

      if (entity is Directory) {
        if (!_isExcludedDirectory(relativePath)) {
          await visit(entity, relativePath);
        }
      } else if (entity is File && isHandwrittenDartPath(relativePath)) {
        dartFiles.add(relativePath.replaceAll('\\', '/'));
      }
    }
  }

  await visit(root.absolute, '');
  dartFiles.sort();
  return dartFiles;
}

bool _isExcludedDirectory(String path) {
  final normalized = path.replaceAll('\\', '/');
  final segments = normalized.split('/');

  return segments.contains('build') ||
      segments.contains('.dart_tool') ||
      normalized == 'lib/contracts/generated' ||
      normalized.startsWith('lib/contracts/generated/');
}

Future<void> main() async {
  final root = Directory.current.absolute;
  final dartFiles = await findHandwrittenDartFiles(root);

  var resultCode = 0;
  for (var offset = 0; offset < dartFiles.length; offset += 50) {
    final end = (offset + 50).clamp(0, dartFiles.length);
    final result = await Process.run(Platform.resolvedExecutable, <String>[
      'format',
      '--output=none',
      '--set-exit-if-changed',
      ...dartFiles.sublist(offset, end),
    ]);
    stdout.write(result.stdout);
    stderr.write(result.stderr);
    if (result.exitCode != 0) {
      resultCode = result.exitCode;
    }
  }

  exitCode = resultCode;
}
