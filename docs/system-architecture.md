# System architecture

> **Deployment status (2026-07).** This document describes the *target* architecture. What `infra/` (Terraform) + `backend/` actually deploy today is a subset: Cognito, API Gateway HTTP API + Lambda, IoT Core, Kinesis, a **DynamoDB single-table** (the only datastore), AppSync **GraphQL subscriptions**, and SNS push. Not yet provisioned: **PostgreSQL/PostGIS/Aurora, S3/Firehose/Athena raw archive, EventBridge, and SQS**. Where the flows below name those services (§3.2, §3.3, §8), treat them as planned, not current. See `CLAUDE.md` and `README.md` for the deployed-vs-planned split.

## 1. Architectural style

Loopin uses a serverless-first, event-driven architecture with pure domain packages and versioned contracts. The initial implementation favors managed AWS services and Lambda. Continuous processors are introduced only when sustained load or event-time complexity demonstrates the need.

The architecture separates:

- **Control plane:** users, trips, membership, routes, policies and administrative APIs.
- **Telemetry plane:** high-frequency GPS ingestion, validation, ordering and archival.
- **Intelligence plane:** graph calculation, situation state machines and regroup scoring.
- **Experience plane:** web, mobile, real-time state, voice and notifications.
- **Analytics plane:** raw telemetry, downsampling, replay and post-trip analysis.

## 2. Component boundaries

| Component | Responsibility | Must not own |
|---|---|---|
| React web | Planning, coordination, observation and incident UI | Domain rules or raw telemetry ingestion |
| Flutter mobile | GPS capture, offline buffer, driver UX and voice | Convoy-wide authoritative state |
| API Lambdas | Trip and membership commands and queries | Continuous telemetry processing |
| Telemetry processor | Validation, map matching, route progress and current state | User-facing prose or regroup approval |
| Convoy graph package | Nodes, adjacent edges and connected components | AWS access or UI state |
| Situation engine | Deterministic detection and lifecycle | Free-form LLM judgment |
| Regroup engine | Candidate exclusion and scoring | Inventing places |
| AI worker | Intent parsing, explanation and summary | Safety authority |
| Notification service | Recipient policy, templates, delivery and expiry | Incident detection |
| Maps adapter | Vendor-neutral route and POI operations | Product policy |

## 3. End-to-end flows

### 3.1 Trip command flow

```text
Web/mobile → Cognito → API Gateway → Lambda → PostgreSQL/DynamoDB
```

Commands use optimistic concurrency and return a new aggregate version. Queries return permission-filtered DTOs.

### 3.2 Telemetry flow

```text
Mobile → AWS IoT Core → Kinesis → telemetry Lambda
                                  ├→ DynamoDB live state
                                  ├→ EventBridge derived events
                                  └→ Firehose/S3 raw archive
```

The telemetry path never waits for PostgreSQL, Bedrock or client delivery.

### 3.3 Situation flow

```text
Graph change → EventBridge → SQS → situation Lambda
                                    ├→ incident state
                                    ├→ regroup request
                                    ├→ notification request
                                    └→ AI explanation queue
```

SQS isolates downstream failures and gives each consumer independent retry, concurrency and expiry behavior.

### 3.4 Client real-time flow

```text
Client opens trip
→ fetch authorized snapshot
→ connect to AppSync (GraphQL subscriptions)
→ subscribe to trip channel
→ apply versioned deltas
→ refetch snapshot after reconnect or version gap
```

Raw GPS is not broadcast directly. Clients receive derived, rate-controlled state.

### 3.5 Implemented live-state adapter

The current deployed-shaped telemetry processor validates `LocationTelemetryV1`
plus `ProjectedLocationV1`, invokes `@loopin/convoy-core`, persists `LIVE#STATE`,
`LIVE#SNAPSHOT`, `LIVE#MEMBER#...`, telemetry idempotency and realtime event
items in the DynamoDB single table, then publishes `RealtimeEventV1` through
AppSync `publishRealtimeEvent`. AppSync subscribers receive derived events such
as `liveSnapshotUpdated` and `driverAlertIssued`; they do not receive raw GPS
points.

## 4. Reliability principles

- End-to-end exactly-once delivery is not assumed.
- Every message has `eventId`, `schemaVersion`, source identity and timestamps.
- Every consumer is idempotent.
- State updates reject older member sequence numbers.
- Derived incidents use stable `situationId` values.
- Expiring actions include `expiresAt`.
- Poison records are quarantined after bounded retries.
- Degraded modes are explicit user-visible states.

## 5. AI boundary

AI may:

- Map a transcript to an allowed structured intent.
- Explain an approved incident or regroup recommendation.
- Answer questions using permission-filtered structured state.
- Generate a narrative summary from measured facts.

AI may not:

- Detect a split by itself.
- Assign authoritative severity.
- Invent or approve a stop.
- Override privacy.
- instruct acceleration, sudden braking or dangerous maneuvers.

Every critical message has a bilingual deterministic template fallback.

## 6. Maps boundary

All vendor access is behind `MapsProvider`:

```ts
interface MapsProvider {
  getRoute(request: RouteRequest): Promise<RouteResult>
  matchLocation(request: MatchLocationRequest): Promise<MapMatchResult>
  calculateEta(request: EtaRequest): Promise<EtaResult>
  findRegroupCandidates(request: RegroupSearchRequest): Promise<PlaceCandidate[]>
}
```

Tasco Maps is the preferred provider. Development and degraded-mode adapters can use fixture routes and MapLibre-compatible geometry. Provider responses are normalized before reaching domain logic.

## 7. Scaling evolution

### Initial

- Kinesis-triggered Lambda calculates route and graph state.
- DynamoDB holds current state and idempotency.
- API and background work use Lambda.

### Sustained growth

- Tune Kinesis capacity, Lambda batching and reserved concurrency.
- Introduce Aurora readers and predictable capacity where justified.
- Downsample telemetry before long retention.

### Stateful high scale

Move only the telemetry/graph processor to Managed Apache Flink or ECS when consumer lag, cross-node reads, event-time windows or sustained Lambda duration cross documented thresholds. Input and output contracts remain unchanged.

## 8. Architecture decisions

- React + Vite is used because the primary web experience is authenticated and interactive; static S3/CloudFront hosting minimizes the frontend cost floor.
- Flutter/Dart is used for drivers because reliable background GPS requires native platform services and the selected product direction favors one cross-platform mobile codebase.
- Generated language-neutral schemas and shared golden fixtures prevent Dart contracts from drifting from the authoritative TypeScript/Zod boundaries.
- Lambda is used initially because traffic is bursty and batchable.
- DynamoDB is the authoritative hot-state store; PostgreSQL is not exposed to every GPS point.
- PostgreSQL/PostGIS owns routes, POIs and relational history.
- AppSync (GraphQL subscriptions) owns WebSocket scale; application Lambdas do not host persistent connections.
- The legal/safety following minimum is distinct from the product's maximum convoy-cohesion threshold.

The mobile selection, cross-language contract boundary and device-verification requirements are recorded in [ADR 0001](adr/0001-use-flutter-for-driver-client.md).
