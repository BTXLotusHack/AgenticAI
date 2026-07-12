import { describe, expect, it } from 'vitest';
import { resolveAwsRuntimeConfig } from './aws-runtime';

const productionEnvironment = {
  VITE_AWS_REGION: 'ap-southeast-1',
  VITE_LOOPIN_API_ENDPOINT:
    'https://43lxtq2xxc.execute-api.ap-southeast-1.amazonaws.com/',
  VITE_LOOPIN_APPSYNC_GRAPHQL_URL:
    'https://i2d7c3qaijbntb3njoblhfukbu.appsync-api.ap-southeast-1.amazonaws.com/graphql',
  VITE_LOOPIN_APPSYNC_REALTIME_URL:
    'wss://i2d7c3qaijbntb3njoblhfukbu.appsync-realtime-api.ap-southeast-1.amazonaws.com/graphql',
  VITE_LOOPIN_COGNITO_ISSUER:
    'https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_qOEIGE6xa',
  VITE_LOOPIN_COGNITO_USER_POOL_CLIENT_ID: '5t8n8d6nt8op9k6eavp0u5g80j',
  VITE_LOOPIN_COGNITO_USER_POOL_ID: 'ap-southeast-1_qOEIGE6xa',
};

describe('resolveAwsRuntimeConfig', () => {
  it('returns a complete production client configuration', () => {
    expect(resolveAwsRuntimeConfig(productionEnvironment)).toEqual({
      apiEndpoint: new URL(productionEnvironment.VITE_LOOPIN_API_ENDPOINT),
      appSyncGraphqlUrl: new URL(
        productionEnvironment.VITE_LOOPIN_APPSYNC_GRAPHQL_URL,
      ),
      appSyncRealtimeUrl: new URL(
        productionEnvironment.VITE_LOOPIN_APPSYNC_REALTIME_URL,
      ),
      cognitoIssuer: new URL(
        productionEnvironment.VITE_LOOPIN_COGNITO_ISSUER,
      ),
      cognitoUserPoolClientId:
        productionEnvironment.VITE_LOOPIN_COGNITO_USER_POOL_CLIENT_ID,
      cognitoUserPoolId:
        productionEnvironment.VITE_LOOPIN_COGNITO_USER_POOL_ID,
      region: productionEnvironment.VITE_AWS_REGION,
    });
  });

  it('fails closed when a required public value is missing', () => {
    expect(() =>
      resolveAwsRuntimeConfig({
        ...productionEnvironment,
        VITE_LOOPIN_COGNITO_USER_POOL_ID: undefined,
      }),
    ).toThrow(/VITE_LOOPIN_COGNITO_USER_POOL_ID/);
  });
});
