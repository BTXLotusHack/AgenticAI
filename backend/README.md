# Loopin backend

TypeScript Lambda handlers for Loopin's two backend planes. Deployed by the
Terraform stack in [`../infra`](../infra).

## Planes

| Plane | Handler | Trigger | Flow |
|---|---|---|---|
| Fast path | `telemetry-processor` | Kinesis batch | IoT → Kinesis → **Lambda** → Valhalla map-match → AppSync mutation → live clients |
| Control path | `create-team` | `POST /teams` | API Gateway (Cognito JWT) → **Lambda** → DynamoDB |
| Control path | `invite-user` | `POST /teams/{teamId}/invites` | API Gateway (Cognito JWT) → **Lambda** → DynamoDB → SNS push |

## Layout

```
src/
├── contracts/   Versioned Zod schemas — every boundary is validated here
├── domain/      Pure logic (no AWS SDK / no I/O), unit-tested
├── lib/         Adapters: dynamo, maps (Valhalla), appsync, sns, http, env
└── handlers/    Thin Lambda entry points: authenticate → validate → domain → map
```

Domain packages hold no AWS or network dependency; adapters in `lib/` are the
only place the AWS SDK and `fetch` appear. Handlers orchestrate.

## Identity

Cognito is the identity backbone:

- **API Gateway** uses a Cognito JWT authorizer. Handlers read the verified
  caller from `event.requestContext.authorizer.jwt.claims` via `getCaller()`.
- **AppSync** uses Cognito user pools for client subscriptions and IAM for the
  processor Lambda's `publishRiderPosition` mutation.

## Commands

```bash
npm install
npm run typecheck     # tsc --noEmit (strict)
npm test              # vitest — pure domain + key builders
npm run build         # esbuild → dist/<handler>/index.js (consumed by Terraform)
```

## Runtime configuration (injected by Terraform)

| Env var | Used by | Purpose |
|---|---|---|
| `TABLE_NAME` | all API handlers | DynamoDB single-table name |
| `MAPS_TRACE_URL` | telemetry-processor | Valhalla `/trace_attributes` endpoint |
| `MAPS_API_KEY` | telemetry-processor | optional Tasco bearer token |
| `APPSYNC_HTTP_URL` | telemetry-processor | AppSync GraphQL HTTP endpoint |

## Not yet validated (external)

Tasco Maps auth/quotas and the exact `/trace_attributes` response shape; SNS
platform application setup for APNs/FCM. See `docs/` for the owning specs.
