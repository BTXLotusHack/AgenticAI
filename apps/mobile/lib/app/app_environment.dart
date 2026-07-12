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
    required this.graphqlUrl,
    required this.cognitoIssuer,
    required this.cognitoUserPoolId,
    required this.cognitoUserPoolClientId,
    required this.awsRegion,
    required this.applicationId,
  });

  final AppEnvironment environment;
  final Uri apiBaseUrl;
  final Uri realtimeUrl;
  final Uri graphqlUrl;
  final Uri cognitoIssuer;
  final String cognitoUserPoolId;
  final String cognitoUserPoolClientId;
  final String awsRegion;
  final String applicationId;

  static AppEnvironmentConfig forName(String name) {
    return switch (name) {
      'local' => AppEnvironmentConfig._(
        environment: AppEnvironment.local,
        apiBaseUrl: Uri.parse('http://127.0.0.1:8787'),
        realtimeUrl: Uri.parse('ws://127.0.0.1:8787/v1/realtime'),
        graphqlUrl: Uri.parse('http://127.0.0.1:8787/graphql'),
        cognitoIssuer: Uri.parse('http://127.0.0.1:8787/cognito'),
        cognitoUserPoolId: 'local',
        cognitoUserPoolClientId: 'local',
        awsRegion: 'ap-southeast-1',
        applicationId: 'loopin-mobile-local',
      ),
      'dev' => AppEnvironmentConfig._(
        environment: AppEnvironment.dev,
        apiBaseUrl: Uri.parse('https://api.dev.loopin.vn'),
        realtimeUrl: Uri.parse('wss://realtime.dev.loopin.vn/v1/realtime'),
        graphqlUrl: Uri.parse('https://api.dev.loopin.vn/graphql'),
        cognitoIssuer: Uri.parse('https://auth.dev.loopin.vn'),
        cognitoUserPoolId: 'loopin-dev',
        cognitoUserPoolClientId: 'loopin-mobile-dev',
        awsRegion: 'ap-southeast-1',
        applicationId: 'loopin-mobile-dev',
      ),
      'prod' => AppEnvironmentConfig._(
        environment: AppEnvironment.prod,
        apiBaseUrl: Uri.parse(
          'https://43lxtq2xxc.execute-api.ap-southeast-1.amazonaws.com/',
        ),
        realtimeUrl: Uri.parse(
          'wss://i2d7c3qaijbntb3njoblhfukbu.appsync-realtime-api.ap-southeast-1.amazonaws.com/graphql',
        ),
        graphqlUrl: Uri.parse(
          'https://i2d7c3qaijbntb3njoblhfukbu.appsync-api.ap-southeast-1.amazonaws.com/graphql',
        ),
        cognitoIssuer: Uri.parse(
          'https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_qOEIGE6xa',
        ),
        cognitoUserPoolId: 'ap-southeast-1_qOEIGE6xa',
        cognitoUserPoolClientId: '5t8n8d6nt8op9k6eavp0u5g80j',
        awsRegion: 'ap-southeast-1',
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
