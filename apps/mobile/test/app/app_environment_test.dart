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
      expect(
        prod.apiBaseUrl,
        Uri.parse(
          'https://43lxtq2xxc.execute-api.ap-southeast-1.amazonaws.com/',
        ),
      );
      expect(
        prod.realtimeUrl,
        Uri.parse(
          'wss://i2d7c3qaijbntb3njoblhfukbu.appsync-realtime-api.ap-southeast-1.amazonaws.com/graphql',
        ),
      );
      expect(
        prod.graphqlUrl,
        Uri.parse(
          'https://i2d7c3qaijbntb3njoblhfukbu.appsync-api.ap-southeast-1.amazonaws.com/graphql',
        ),
      );
      expect(
        prod.cognitoIssuer,
        Uri.parse(
          'https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_qOEIGE6xa',
        ),
      );
      expect(prod.cognitoUserPoolId, 'ap-southeast-1_qOEIGE6xa');
      expect(prod.cognitoUserPoolClientId, '5t8n8d6nt8op9k6eavp0u5g80j');
      expect(prod.awsRegion, 'ap-southeast-1');
    });

    test('rejects an unknown environment instead of guessing', () {
      expect(
        () => AppEnvironmentConfig.forName('staging'),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}
