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
    required this.appSyncGraphqlUrl,
    required this.applicationId,
    required this.region,
    required this.cognitoRegion,
    required this.cognitoIssuer,
    required this.cognitoUserPoolId,
    required this.cognitoClientId,
    required this.dynamoDbTableName,
    required this.iotTelemetryTopicFilter,
    required this.kinesisStreamName,
  });

  final AppEnvironment environment;
  final Uri apiBaseUrl;
  final Uri realtimeUrl;
  final Uri appSyncGraphqlUrl;
  final String applicationId;
  final String region;

  /// Cognito identity backbone. The user pool is a single cloud resource shared
  /// across environments (there is no local Cognito), so every environment
  /// points at the deployed pool; only the API/realtime hosts differ. Pool id
  /// and client id are public identifiers, not secrets.
  final String cognitoRegion;
  final Uri cognitoIssuer;
  final String cognitoUserPoolId;
  final String cognitoClientId;
  final String dynamoDbTableName;
  final String iotTelemetryTopicFilter;
  final String kinesisStreamName;

  static const _region = 'ap-southeast-1';
  static const _prodApiEndpoint =
      'https://43lxtq2xxc.execute-api.ap-southeast-1.amazonaws.com/';
  static const _prodAppSyncGraphqlUrl =
      'https://i2d7c3qaijbntb3njoblhfukbu.appsync-api.ap-southeast-1.amazonaws.com/graphql';
  static const _prodAppSyncRealtimeUrl =
      'wss://i2d7c3qaijbntb3njoblhfukbu.appsync-realtime-api.ap-southeast-1.amazonaws.com/graphql';
  static const _cognitoUserPoolId = 'ap-southeast-1_qOEIGE6xa';
  static const _cognitoClientId = '5t8n8d6nt8op9k6eavp0u5g80j';
  static const _cognitoIssuer =
      'https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_qOEIGE6xa';
  static const _dynamoDbTableName = 'loopin-prod-app';
  static const _iotTelemetryTopicFilter = 'teams/+/riders/+/telemetry';
  static const _kinesisStreamName = 'loopin-prod-telemetry';

  static AppEnvironmentConfig forName(String name) {
    return switch (name) {
      'local' => AppEnvironmentConfig._(
        environment: AppEnvironment.local,
        apiBaseUrl: Uri.parse('http://10.0.2.2:8787'),
        realtimeUrl: Uri.parse('ws://10.0.2.2:8787/v1/realtime'),
        appSyncGraphqlUrl: Uri.parse(_prodAppSyncGraphqlUrl),
        applicationId: 'loopin-mobile-local',
        region: _region,
        cognitoRegion: _region,
        cognitoIssuer: Uri.parse(_cognitoIssuer),
        cognitoUserPoolId: _cognitoUserPoolId,
        cognitoClientId: _cognitoClientId,
        dynamoDbTableName: _dynamoDbTableName,
        iotTelemetryTopicFilter: _iotTelemetryTopicFilter,
        kinesisStreamName: _kinesisStreamName,
      ),
      'dev' => AppEnvironmentConfig._(
        environment: AppEnvironment.dev,
        apiBaseUrl: Uri.parse('https://api.dev.loopin.vn'),
        realtimeUrl: Uri.parse('wss://realtime.dev.loopin.vn/v1/realtime'),
        appSyncGraphqlUrl: Uri.parse(_prodAppSyncGraphqlUrl),
        applicationId: 'loopin-mobile-dev',
        region: _region,
        cognitoRegion: _region,
        cognitoIssuer: Uri.parse(_cognitoIssuer),
        cognitoUserPoolId: _cognitoUserPoolId,
        cognitoClientId: _cognitoClientId,
        dynamoDbTableName: _dynamoDbTableName,
        iotTelemetryTopicFilter: _iotTelemetryTopicFilter,
        kinesisStreamName: _kinesisStreamName,
      ),
      'prod' => AppEnvironmentConfig._(
        environment: AppEnvironment.prod,
        apiBaseUrl: Uri.parse(_prodApiEndpoint),
        realtimeUrl: Uri.parse(_prodAppSyncRealtimeUrl),
        appSyncGraphqlUrl: Uri.parse(_prodAppSyncGraphqlUrl),
        applicationId: 'loopin-mobile-prod',
        region: _region,
        cognitoRegion: _region,
        cognitoIssuer: Uri.parse(_cognitoIssuer),
        cognitoUserPoolId: _cognitoUserPoolId,
        cognitoClientId: _cognitoClientId,
        dynamoDbTableName: _dynamoDbTableName,
        iotTelemetryTopicFilter: _iotTelemetryTopicFilter,
        kinesisStreamName: _kinesisStreamName,
      ),
      _ => throw ArgumentError.value(
        name,
        'name',
        'Unknown Loopin environment',
      ),
    };
  }
}
