# Loopin backend

TypeScript Lambda handlers for Loopin's backend planes. Deployed by the
Terraform stack in [`../infra`](../infra).

## Planes

| Plane | Handler | Trigger | Flow |
|---|---|---|---|
| Fast path | `telemetry-processor` | Kinesis batch | IoT/Kinesis projected telemetry -> **Lambda** -> convoy-core -> DynamoDB live state/events -> AppSync `publishRealtimeEvent` -> live clients |
| Control path | `create-team` | `POST /teams` | API Gateway (Cognito JWT) -> **Lambda** -> DynamoDB |
| Control path | `invite-user` | `POST /teams/{teamId}/invites` | API Gateway (Cognito JWT) -> **Lambda** -> DynamoDB -> SNS push |
| Control path | `get-live-snapshot` | `GET /teams/{teamId}/live-snapshot` | API Gateway (Cognito JWT) -> **Lambda** -> DynamoDB `LIVE#SNAPSHOT` |

## Layout

```text
src/
|-- contracts/   Versioned Zod schemas; every boundary is validated here
|-- domain/      Pure logic (no AWS SDK / no I/O), unit-tested
|-- lib/         Adapters: dynamo, maps (Valhalla), appsync, sns, http, env
`-- handlers/    Thin Lambda entry points: validate -> domain -> adapters
```

Domain packages hold no AWS or network dependency; adapters in `lib/` are the
only place the AWS SDK and `fetch` appear. Handlers orchestrate.

## Identity

Cognito is the identity backbone:

- **API Gateway** uses a Cognito JWT authorizer. Handlers read the verified
  caller from `event.requestContext.authorizer.jwt.claims` via `getCaller()`.
- **AppSync** uses Cognito user pools for client subscriptions and IAM for the
  processor Lambda's `publishRealtimeEvent` mutation.

## Commands

```bash
npm install
npm run typecheck     # tsc --noEmit (strict)
npm test              # vitest: pure domain + adapter contract tests
npm run build         # esbuild -> dist/<handler>/index.js (consumed by Terraform)
```

## Runtime configuration (injected by Terraform)

| Env var | Used by | Purpose |
|---|---|---|
| `TABLE_NAME` | all API handlers | DynamoDB single-table name |
| `MAPS_TRACE_URL` | maps adapter | Valhalla `/trace_attributes` endpoint |
| `MAPS_API_KEY` | maps adapter | optional Tasco bearer token |
| `APPSYNC_HTTP_URL` | telemetry-processor | AppSync GraphQL HTTP endpoint |

## Live telemetry state

`telemetry-processor` accepts versioned `LocationTelemetryV1` plus
`ProjectedLocationV1`, runs the shared `@loopin/convoy-core` reducers, stores the
current `LiveSnapshotV1`, per-member freshness/confidence snapshots,
idempotency records and derived realtime events in the DynamoDB single table,
then publishes only derived realtime events to AppSync. Duplicate, stale and
history-only records do not create live AppSync updates.

The Lambda persists `LIVE#STATE` as reducer state so cold starts can continue
member sequences, graph hysteresis and active situation lifecycle.
Driver alert acknowledgements are modeled as idempotent deterministic state
updates and publish `driverAlertAcknowledged` realtime events only for known
member notifications.
Regroup selection publishing accepts only a pre-vetted `RegroupRecommendationV1`
with a safe selected candidate; it does not create POIs or authorize regrouping
from model output.

## Maps map-matching adapter

`lib/maps/valhalla.ts` map-matches via Tasco's Valhalla `/trace_attributes`
(`https://tasco-maps.dnpwater.vn/route/trace_attributes`, Valhalla 3.7.0,
accepts requests with no auth). The `matched_points[]` response shape matches
`lib/maps/valhalla.ts`. Constraint: `shape_match: "map_snap"` rejects a trace
whose consecutive points are more than **2000 m** apart (`error_code 172`); on
any error the adapter falls back to raw, `matchConfidence: null` positions, so
sparse GPS batches silently skip snapping.

The production projection adapter still needs to connect this map output to
route-progress `ProjectedLocationV1` before the processor Lambda receives the
record.

## Not yet validated (external)

Tasco Maps production auth/quotas, physical mobile background lifecycle, AppSync
client behavior on real devices, and SNS platform application setup for APNs/FCM
remain external validation gates. See `docs/` for the owning specs.
