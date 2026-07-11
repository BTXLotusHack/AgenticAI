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
    required this.cognitoRegion,
    required this.cognitoUserPoolId,
    required this.cognitoClientId,
  });

  final AppEnvironment environment;
  final Uri apiBaseUrl;
  final Uri realtimeUrl;
  final String applicationId;

  /// Cognito identity backbone. The user pool is a single cloud resource shared
  /// across environments (there is no local Cognito), so every environment
  /// points at the deployed pool; only the API/realtime hosts differ. Pool id
  /// and client id are public identifiers, not secrets.
  final String cognitoRegion;
  final String cognitoUserPoolId;
  final String cognitoClientId;

  static const _cognitoRegion = 'ap-southeast-1';
  static const _cognitoUserPoolId = 'ap-southeast-1_qOEIGE6xa';
  static const _cognitoClientId = '5t8n8d6nt8op9k6eavp0u5g80j';

  static AppEnvironmentConfig forName(String name) {
    return switch (name) {
      'local' => AppEnvironmentConfig._(
        environment: AppEnvironment.local,
        apiBaseUrl: Uri.parse('http://127.0.0.1:8787'),
        realtimeUrl: Uri.parse('ws://127.0.0.1:8787/v1/realtime'),
        applicationId: 'loopin-mobile-local',
        cognitoRegion: _cognitoRegion,
        cognitoUserPoolId: _cognitoUserPoolId,
        cognitoClientId: _cognitoClientId,
      ),
      'dev' => AppEnvironmentConfig._(
        environment: AppEnvironment.dev,
        apiBaseUrl: Uri.parse('https://api.dev.loopin.vn'),
        realtimeUrl: Uri.parse('wss://realtime.dev.loopin.vn/v1/realtime'),
        applicationId: 'loopin-mobile-dev',
        cognitoRegion: _cognitoRegion,
        cognitoUserPoolId: _cognitoUserPoolId,
        cognitoClientId: _cognitoClientId,
      ),
      'prod' => AppEnvironmentConfig._(
        environment: AppEnvironment.prod,
        apiBaseUrl: Uri.parse('https://api.loopin.vn'),
        realtimeUrl: Uri.parse('wss://realtime.loopin.vn/v1/realtime'),
        applicationId: 'loopin-mobile-prod',
        cognitoRegion: _cognitoRegion,
        cognitoUserPoolId: _cognitoUserPoolId,
        cognitoClientId: _cognitoClientId,
      ),
      _ => throw ArgumentError.value(
        name,
        'name',
        'Unknown Loopin environment',
      ),
    };
  }
}
