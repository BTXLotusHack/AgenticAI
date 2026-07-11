# Loopin Local and AWS Service Vertical Slice Implementation Plan

**Date:** 2026-07-11

**Status:** Approved architecture; ready to execute before the Flutter client

## Objective

Deliver one production-shaped service path that accepts versioned member telemetry, derives authoritative convoy state with the existing pure domain package, exposes permission-filtered trip APIs and realtime events, and deploys to AWS through CDK. The same application services must run locally with deterministic in-memory adapters so React, Flutter and integration tests do not depend on an AWS account.

## Decisions locked for this slice

- TypeScript/Node.js 22 Lambda functions and AWS CDK v2 live in npm workspaces.
- API Gateway HTTP API is the command/query boundary; authenticated HTTPS telemetry is the mobile fallback.
- AWS IoT Core MQTT/WSS is the primary production telemetry boundary and writes to Kinesis with `tripId` ordering.
- A Kinesis-triggered Lambda processes at-least-once records idempotently with partial batch failure reporting and parallelization factor `1` initially.
- DynamoDB on-demand is the live-state, idempotency and operational trip store for this slice. PostgreSQL/PostGIS remains the long-term route, POI and relational-history store and is not required for the low-cost vertical slice.
- AppSync Events publishes permission-filtered derived state, situations and member alerts. Raw GPS is never broadcast.
- Cognito authenticates clients. API handlers still verify active trip membership and role; AppSync subscribe handlers enforce channel authorization.
- S3 receives encrypted raw telemetry through Firehose for replay and lifecycle retention.
- Local development uses fake identity, fixture maps, in-memory repositories and a local WebSocket hub behind the same ports. Local-only shortcuts cannot be enabled in an AWS environment.
- No backend handler reimplements graph, situation, regroup or notification rules from `@loopin/convoy-core`.
- Every independently verifiable task uses a new `codex/` branch and a focused commit. A pull request targets `dev` only after explicit authorization.

## Runtime boundaries

```text
Flutter/simulator
  |-- local: HTTPS telemetry --> local gateway --> application services
  `-- AWS: MQTT/WSS --> IoT rule --> Kinesis --> telemetry Lambda
                                              |-- DynamoDB live state
                                              |-- EventBridge derived facts
                                              `-- AppSync Events publisher

React/Flutter
  |-- snapshot/commands --> HTTP API --> API Lambda --> application services
  `-- derived updates ----> local WebSocket or AppSync Events
```

The application layer depends on ports, not AWS SDK clients:

```ts
interface TripStateRepository {}
interface IdempotencyRepository {}
interface RawTelemetryArchive {}
interface DomainEventPublisher {}
interface RealtimePublisher {}
interface MapsProvider {}
interface Clock {}
```

## Planned repository structure

```text
packages/contracts/                 # external Zod schemas and examples
services/application/              # use-cases and ports, no AWS SDK
services/api/                      # HTTP API request/response adapters
services/telemetry/                # Kinesis and HTTPS telemetry adapters
services/local-dev/                # in-memory HTTP/WebSocket runtime
infrastructure/cdk/                # stacks, handlers, policies and assertions
test/system/                       # cross-workspace local/AWS-shaped journeys
```

## Task 1: Establish versioned service contracts

**Branch:** `codex/service-contracts`

1. Add failing tests for telemetry, event envelopes, snapshots, situations, notifications, API errors and idempotent command envelopes.
2. Create `@loopin/contracts` and move external Zod schemas out of `@loopin/convoy-core`; the core package imports or re-exports them without changing behavior.
3. Add strict HTTP request/response schemas for the vertical-slice routes:
   - `POST /v1/trips/join`
   - `POST /v1/trips/{tripId}/members/{memberId}/readiness`
   - `GET /v1/trips/{tripId}/live-snapshot`
   - `POST /v1/telemetry`
   - `POST /v1/trips/{tripId}/recommendations/{recommendationId}/approve`
   - `GET /v1/trips/{tripId}/summary`
4. Define realtime snapshot/delta envelopes with `snapshotRevision`, `graphRevision`, `eventId`, audience and expiry.
5. Add valid and invalid JSON examples derived from TRIP001. These become the source for the later Dart generation pipeline.
6. Verify contract, core, simulator and web tests; commit `feat(contracts): define service boundaries`.

## Task 2: Build application services and memory adapters

**Branch:** `codex/service-application`

1. Add failing use-case tests for join, readiness, snapshot authorization, telemetry acceptance, duplicate/stale/history-only handling, split confirmation, regroup approval and summary access.
2. Define repository and publisher ports with explicit optimistic revisions, conditional member sequences and TTL-backed idempotency semantics.
3. Implement `ProcessTelemetry` as one ordered trip operation:
   - validate identity, payload and route projection;
   - reserve the event ID and member sequence;
   - call pure ingestion, graph, situation and notification functions;
   - persist a new snapshot only when authoritative state changes;
   - publish immutable derived events after persistence.
4. Implement `JoinTrip`, `SetReadiness`, `GetLiveSnapshot`, `ApproveRegroup` and `GetTripSummary` with role and membership checks.
5. Add fixture `MapsProvider`, deterministic clock, memory repositories and recording publishers. Seed only normalized TRIP001 data from `@loopin/demo-scenarios`.
6. Prove failed or duplicate persistence cannot create duplicate graph revisions or notifications.
7. Commit `feat(services): add convoy application use cases` after unit and property tests pass.

## Task 3: Add the local HTTP and realtime runtime

**Branch:** `codex/local-service-runtime`

1. Add failing black-box tests around a real ephemeral local port.
2. Implement the HTTP routes using thin adapters that validate through `@loopin/contracts`, create correlation IDs and map typed service errors to the shared `ApiError` contract.
3. Add a local-only identity adapter using explicit fixture bearer tokens. Reject missing identity and forbid the adapter when `LOOPIN_ENV` is not `local` or `test`.
4. Add a WebSocket hub for trip state, situation and member-alert channels. Authorize each subscription against active membership and visibility; never expose raw telemetry.
5. Add graceful shutdown, bounded body size, CORS allowlist, request timeouts and coordinate-redacted structured logs.
6. Add `npm run dev:services` and a health/readiness endpoint. The server prints public local endpoints but no secrets or coordinates.
7. Prove the simulator can submit TRIP001 telemetry and the local subscriber observes contiguous revisions through split, approval and reconnection.
8. Commit `feat(local): run the convoy service boundary`.

## Task 4: Implement AWS persistence, handlers and publishers

**Branch:** `codex/aws-service-adapters`

1. Add AWS adapter contract tests with mocked SDK clients and DynamoDB condition-failure cases.
2. Implement DynamoDB repositories for trip/member, current graph, situation, recommendation and idempotency items. Use conditional expressions for member sequence, graph revision, recommendation state and command keys.
3. Implement HTTP API Lambda handlers that adapt API Gateway v2 requests to the same application use-cases. Trust JWT verification at the gateway, then re-check membership and role in the service.
4. Implement the Kinesis handler with record decoding, strict schema validation, correlation propagation and `ReportBatchItemFailures`. Return the earliest failed sequence checkpoint and quarantine bounded failures.
5. Add AppSync Events and EventBridge publishers. Publish derived permission-filtered envelopes only after state persistence; deterministic IDs make retries safe.
6. Add Firehose/S3 archival metadata without writing coordinates to ordinary logs.
7. Use AWS SDK v3 clients initialized outside handlers, ARM64-compatible bundles and least-privilege resource interfaces.
8. Commit `feat(aws): adapt convoy services to managed state`.

## Task 5: Define the CDK deployment

**Branch:** `codex/aws-cdk-vertical-slice`

1. Add failing CDK assertions before constructs. Assert encryption, removal policy, TTL, log retention, dead-letter handling, least-privilege grants and no public S3 access.
2. Create environment-aware CDK stacks for:
   - Cognito user pool/app clients and temporary mobile identity;
   - DynamoDB on-demand live-state table;
   - encrypted Kinesis stream, Firehose delivery and S3 archive;
   - IoT rule with Kinesis and Firehose actions plus an error action;
   - telemetry/API Lambdas and HTTP API JWT authorizer;
   - AppSync Event API with Cognito subscribers and IAM-only service publishing;
   - channel namespace subscribe authorization against trip membership;
   - CloudWatch logs, metrics, alarms, dashboard and a monthly budget.
3. Make `local`, `dev` and `prod` configuration explicit. Dev uses short log/archive retention and destroyable noncritical data; production uses retained data, point-in-time recovery and termination protection.
4. Keep RDS, NAT Gateway, OpenSearch, Flink, Bedrock and WAF out of the service slice unless an environment flag and measured requirement enable them.
5. Configure Kinesis batching at 50 records, at most one second, parallelization `1`, bounded retry/record age and partial batch response. Document why higher concurrency requires graph conditional-write load tests.
6. Add outputs for public API/AppSync/IoT identifiers only; secrets remain in managed stores.
7. Verify `cdk synth`, assertions, IAM snapshot review and `cdk diff` when AWS credentials are available.
8. Commit `feat(infra): define the AWS convoy vertical slice`.

## Task 6: Prove authorization and end-to-end behavior

**Branch:** `codex/service-system-tests`

1. Add a local system harness that starts services on an ephemeral port and drives the shared TRIP001 replay through HTTP.
2. Prove leader and member identities receive different data and alerts; a nonmember cannot fetch, subscribe, approve or publish.
3. Prove duplicates, stale sequences, offline replay, low confidence and revision gaps do not create false live incidents.
4. Prove the exact golden outputs: `split:TRIP001:M003:M004`, POI001 selected, POI002 excluded, peak gap `900 m`, then one resolved split and one final component.
5. Add deploy-time smoke scripts for Cognito token acquisition, HTTPS fallback telemetry, IoT-to-Kinesis delivery, DynamoDB state, AppSync subscription filtering and S3 archive arrival.
6. Keep AWS integration tests opt-in and account/region guarded; local tests remain mandatory in CI.
7. Commit `test(system): verify the service vertical slice`.

## Task 7: CI, cost and operational handoff

**Branch:** `codex/aws-service-release`

1. Add pull-request checks for contracts, service tests, system tests, CDK assertions/synth, lint, typecheck, web build and existing Playwright/golden replay suites.
2. Add GitHub OIDC deployment-role documentation; never add static AWS keys.
3. Document bootstrap, local startup, dev deploy, smoke test, rollback and teardown commands.
4. Add runbooks for telemetry lag, poison records, IoT authorization, DynamoDB throttling, AppSync degradation and unexpected spend.
5. Record the cost floor and environment flags from synthesized resources; do not quote an unverified bill as a guarantee.
6. Run the release gate:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run simulate -- --json
npm.cmd run test:system
npm.cmd run cdk:synth
npm.cmd audit --audit-level=high
```

7. Commit `docs(operations): hand off the AWS service slice` only after verification evidence is recorded.

## Scale and failure logic to preserve

- `tripId` is the initial Kinesis partition key so one convoy is processed in order. Large events move to stable subgroups only after subgroup aggregation semantics are implemented.
- Lambda/Kinesis is at least once. Event ID, member sequence, conditional revision and stable notification keys are all required; none is a substitute for the others.
- A failed record cannot block a shard forever: retries and age are bounded, failure is quarantined, and operators see observation age/lag.
- Current state rejects old sequences and stale offline data. Accepted offline replay may enrich history but cannot open a new live situation.
- DynamoDB writes remain authoritative before realtime publication. A publisher retry can repeat an envelope ID; clients deduplicate and refetch after revision gaps.
- Low-confidence GPS may update a stale/degraded UI but cannot independently confirm a split.
- Realtime fanout contains rate-controlled graph/situation/member data, never every GPS point.
- Application ports allow a later Lambda-to-Flink/ECS processor migration without changing mobile or web contracts.

## External validation gates

- Tasco route matching and POI SDK/API behavior, quota and licensing.
- AWS IoT MQTT/WSS Cognito or custom-authorizer credential flow for trip-scoped publish permissions.
- AppSync Events Flutter protocol support and per-channel membership enforcement.
- AWS quota and cost review in `ap-southeast-1` before load testing.
- Production privacy, retention and Vietnamese road-safety review.

## Primary AWS references

- [AWS IoT Core Kinesis rule action](https://docs.aws.amazon.com/iot/latest/developerguide/kinesis-rule-action.html)
- [API Gateway HTTP API JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- [AWS AppSync Event API concepts](https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-concepts.html)
- [AWS AppSync channel namespace handlers](https://docs.aws.amazon.com/appsync/latest/eventapi/channel-namespace-handlers.html)
- [Lambda partial batch response for Kinesis](https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-batchfailurereporting.html)
- [Lambda processing and ordering for Kinesis](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html)

## Definition of done

The slice is complete only when the local runtime and AWS adapters share the same use-cases, contract tests prevent schema drift, ordering/idempotency/authorization failure cases pass, CDK assertions prove the intended security posture, the golden split-regroup-reconnect journey passes, and deployment/runbook documentation can be followed without hidden credentials. CDK synthesis alone is not a deployed-system claim.
