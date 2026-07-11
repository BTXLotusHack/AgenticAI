import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/app/app_environment.dart';

void main() {
  group('AppEnvironmentConfig', () {
    test('provides public local, dev, and prod configuration', () {
      final local = AppEnvironmentConfig.forName('local');
      final dev = AppEnvironmentConfig.forName('dev');
      final prod = AppEnvironmentConfig.forName('prod');

      expect(local.environment, AppEnvironment.local);
      expect(local.apiBaseUrl, Uri.parse('http://127.0.0.1:8787'));
      expect(local.realtimeUrl, Uri.parse('ws://127.0.0.1:8787/v1/realtime'));
      expect(dev.environment, AppEnvironment.dev);
      expect(dev.apiBaseUrl.scheme, 'https');
      expect(dev.realtimeUrl.scheme, 'wss');
      expect(prod.environment, AppEnvironment.prod);
      expect(prod.apiBaseUrl.scheme, 'https');
      expect(prod.realtimeUrl.scheme, 'wss');
    });

    test('rejects an unknown environment instead of guessing', () {
      expect(
        () => AppEnvironmentConfig.forName('staging'),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}
