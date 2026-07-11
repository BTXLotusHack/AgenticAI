import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppEnvironment { local, dev, prod }

final appEnvironmentProvider = Provider<AppEnvironmentConfig>((ref) {
  throw StateError('App environment must be provided at bootstrap.');
});

final class AppEnvironmentConfig {
  const AppEnvironmentConfig._({
    required this.environment,
    required this.apiBaseUrl,
    required this.realtimeUrl,
    required this.applicationId,
  });

  final AppEnvironment environment;
  final Uri apiBaseUrl;
  final Uri realtimeUrl;
  final String applicationId;

  static AppEnvironmentConfig forName(String name) {
    return switch (name) {
      'local' => AppEnvironmentConfig._(
        environment: AppEnvironment.local,
        apiBaseUrl: Uri.parse('http://127.0.0.1:8787'),
        realtimeUrl: Uri.parse('ws://127.0.0.1:8787/v1/realtime'),
        applicationId: 'loopin-mobile-local',
      ),
      'dev' => AppEnvironmentConfig._(
        environment: AppEnvironment.dev,
        apiBaseUrl: Uri.parse('https://api.dev.loopin.vn'),
        realtimeUrl: Uri.parse('wss://realtime.dev.loopin.vn/v1/realtime'),
        applicationId: 'loopin-mobile-dev',
      ),
      'prod' => AppEnvironmentConfig._(
        environment: AppEnvironment.prod,
        apiBaseUrl: Uri.parse('https://api.loopin.vn'),
        realtimeUrl: Uri.parse('wss://realtime.loopin.vn/v1/realtime'),
        applicationId: 'loopin-mobile-prod',
      ),
      _ => throw ArgumentError.value(
        name,
        'name',
        'Unknown Loopin environment',
      ),
    };
  }
}
