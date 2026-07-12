export interface AwsRuntimeEnvironment {
  readonly VITE_AWS_REGION?: string | undefined;
  readonly VITE_LOOPIN_API_ENDPOINT?: string | undefined;
  readonly VITE_LOOPIN_APPSYNC_GRAPHQL_URL?: string | undefined;
  readonly VITE_LOOPIN_APPSYNC_REALTIME_URL?: string | undefined;
  readonly VITE_LOOPIN_COGNITO_ISSUER?: string | undefined;
  readonly VITE_LOOPIN_COGNITO_USER_POOL_CLIENT_ID?: string | undefined;
  readonly VITE_LOOPIN_COGNITO_USER_POOL_ID?: string | undefined;
}

export interface AwsRuntimeConfig {
  readonly apiEndpoint: URL;
  readonly appSyncGraphqlUrl: URL;
  readonly appSyncRealtimeUrl: URL;
  readonly cognitoIssuer: URL;
  readonly cognitoUserPoolClientId: string;
  readonly cognitoUserPoolId: string;
  readonly region: string;
}

function requireValue(
  environment: AwsRuntimeEnvironment,
  name: keyof AwsRuntimeEnvironment,
): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Missing required public AWS configuration: ${name}`);
  }

  return value;
}

export function resolveAwsRuntimeConfig(
  environment: AwsRuntimeEnvironment,
): AwsRuntimeConfig {
  return {
    apiEndpoint: new URL(
      requireValue(environment, 'VITE_LOOPIN_API_ENDPOINT'),
    ),
    appSyncGraphqlUrl: new URL(
      requireValue(environment, 'VITE_LOOPIN_APPSYNC_GRAPHQL_URL'),
    ),
    appSyncRealtimeUrl: new URL(
      requireValue(environment, 'VITE_LOOPIN_APPSYNC_REALTIME_URL'),
    ),
    cognitoIssuer: new URL(
      requireValue(environment, 'VITE_LOOPIN_COGNITO_ISSUER'),
    ),
    cognitoUserPoolClientId: requireValue(
      environment,
      'VITE_LOOPIN_COGNITO_USER_POOL_CLIENT_ID',
    ),
    cognitoUserPoolId: requireValue(
      environment,
      'VITE_LOOPIN_COGNITO_USER_POOL_ID',
    ),
    region: requireValue(environment, 'VITE_AWS_REGION'),
  };
}

export function loadAwsRuntimeConfig(): AwsRuntimeConfig {
  return resolveAwsRuntimeConfig({
    VITE_AWS_REGION: import.meta.env.VITE_AWS_REGION,
    VITE_LOOPIN_API_ENDPOINT: import.meta.env.VITE_LOOPIN_API_ENDPOINT,
    VITE_LOOPIN_APPSYNC_GRAPHQL_URL:
      import.meta.env.VITE_LOOPIN_APPSYNC_GRAPHQL_URL,
    VITE_LOOPIN_APPSYNC_REALTIME_URL:
      import.meta.env.VITE_LOOPIN_APPSYNC_REALTIME_URL,
    VITE_LOOPIN_COGNITO_ISSUER:
      import.meta.env.VITE_LOOPIN_COGNITO_ISSUER,
    VITE_LOOPIN_COGNITO_USER_POOL_CLIENT_ID:
      import.meta.env.VITE_LOOPIN_COGNITO_USER_POOL_CLIENT_ID,
    VITE_LOOPIN_COGNITO_USER_POOL_ID:
      import.meta.env.VITE_LOOPIN_COGNITO_USER_POOL_ID,
  });
}
