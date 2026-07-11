# Testing and operations

## 1. Verification strategy

Testing follows the risk hierarchy: pure graph and policy logic receives exhaustive deterministic tests; AWS integrations receive contract and environment tests; complete trips are replayed end to end.

## 2. Test layers

### Unit tests

- Route-progress ordering
- Adjacent gap calculation
- Uncertainty bounds
- Edge hysteresis
- Connected components
- Overtaking stability
- Incident state transitions
- Candidate hard exclusions
- Regroup score calculations
- Recipient notification selection
- Idempotency and stale-sequence rejection

### Property-based tests

- Reordering nodes does not change components after sorting by progress.
- Adding a healthy internal edge cannot increase component count.
- Duplicate telemetry does not change graph revision.
- Lower-confidence evidence cannot increase authoritative severity by itself.
- A hard-excluded POI can never win scoring.

### Contract tests

- Zod schemas accept published examples and reject incompatible versions.
- API and event envelopes preserve correlation and idempotency fields.
- Tasco adapter normalizes fixture responses.
- AppSync deltas can rebuild state when applied after the matching snapshot.

### Integration tests

- IoT publish reaches Kinesis.
- Kinesis invokes telemetry Lambda with expected batching.
- Conditional DynamoDB update rejects old sequence.
- EventBridge routes to the correct SQS consumer.
- Failed records reach quarantine without blocking healthy records.
- AppSync subscription authorization filters members correctly.
- RDS Proxy protects PostgreSQL connections under Lambda concurrency.

### End-to-end tests

- Create, join, ready and start a trip.
- Observe live markers.
- Stretch and break an edge.
- Receive different front/rear notifications.
- Approve and deliver regroup.
- Reconnect components and resolve incident.
- Complete and summarize trip.

## 3. Dataset-driven simulator

The supplied workbook contains:

- Five group trips
- Nineteen members
- Route waypoints
- Regroup POIs
- 133 GPS trace rows plus header
- Eleven trip events
- Eight bilingual voice commands
- Mock API examples
- Public evaluation scenarios

The planned simulator converts workbook rows into versioned telemetry and command events. Its target adapters are wall-clock, accelerated and step modes.

### Implemented golden replay

`packages/demo-scenarios` now provides the accelerated deterministic TRIP001 frames and controller. It normalizes workbook identities, route, members, event intent and regroup POIs, then supplies 5-second fixture route projections to the pure convoy engine. `apps/simulator` and `apps/web` consume that shared package. Run:

```powershell
npm.cmd run test:core
npm.cmd run simulate
npm.cmd run simulate -- --json
```

The replay verifies duplicate and stale-sequence handling, offline history-only replay, low-confidence degradation, persistent stretch/split transitions, exact M003–M004 component boundaries, recipient-specific alerts, unsafe POI exclusion, POI001 selection, reconnect hysteresis and one measured summary. Wall-clock and interactive step controls remain future simulator adapters; they must reuse the same scenario runner and reducers.

### Implemented web trip journey

The browser demo exposes `/trip/new`, `/trips/TRIP001/live` and `/trips/TRIP001/summary`. A direct `/trips/TRIP001/live?autoplay=true` entry creates a schema-validated demo session and pauses at the confirmed split. The live page cannot approve a hard-excluded candidate or advance automatic playback beyond the split without an eligible regroup approval.

Run the browser matrix from the repository root:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

The matrix currently runs 21 checks across desktop Chromium, mobile Chromium and reduced-motion Chromium. It proves the full setup-to-summary path, serious/critical WCAG scanning, console health, keyboard-operable semantic controls, reduced-motion completeness and overflow guards at 320, 360, 390, 768, 1024, 1280 and 1440 CSS pixels.

Browser, trace, video and HTML-report artifacts are generated under `apps/web/test-results` and `apps/web/playwright-report` only when configured or when failures require evidence. They are ignored by Git and must not be included in commits. Browser-review screenshots are likewise external verification artifacts, not product assets.

Required scenarios:

- Normal line formation
- Growing adjacent gap
- Two connected components
- Vehicle overtaking
- Member ahead of leader
- Wrong turn and route deviation
- Unexpected stop
- Weak GPS and stale GPS
- Duplicate and delayed events
- Offline replay
- Leader GPS loss
- Rest request
- EV low battery
- Unsafe regroup candidate

## 4. Golden scenario

The primary demo uses the Hà Nội to Hạ Long family trip:

1. Four members join.
2. Route R001 is loaded.
3. Car 3 deviates near the highway ramp.
4. Car 4 falls behind after the toll area.
5. The graph identifies the exact broken boundary.
6. Minh Châu Rest Stop wins over the unsafe shoulder.
7. Front and rear components receive role-specific alerts.
8. Members regroup and the incident resolves.

Expected graph, incident, recommendation and notification outputs are stored as golden fixtures.

## 5. Service-level objectives

Initial production objectives:

| Signal | Objective |
|---|---|
| Telemetry accepted to live-state update | p95 under 3 seconds |
| Confirmed incident to first alert | p95 under 5 seconds |
| Snapshot revision consistency | 100% detected gaps trigger refetch |
| Duplicate incident notifications | zero for identical transition |
| AI dependency on critical alert path | zero |
| Poison-record trip blockage | zero |

Availability targets are set after real customer and operational requirements exist; the system must not claim an untested availability number.

## 6. Operational metrics

### Telemetry

- IoT publish errors and throttles
- Kinesis incoming records/bytes
- `MillisBehindLatest`
- Accepted, duplicate, stale and rejected record rates
- Map-match latency and failure rate
- End-to-end observation age

### Graph and situations

- Graph calculation duration
- Edge state-transition counts
- Component split counts
- Low-confidence decision deferrals
- Incident confirmation and resolution latency
- Notification deduplication count

### Delivery and AI

- AppSync publish errors
- Alert delivery and acknowledgement latency
- Push delivery failures
- Bedrock latency, timeout and template-fallback rate
- Transcribe session errors

### Cost

- Cost per active vehicle-hour
- Cost per million telemetry events
- CloudWatch ingestion volume
- Bedrock cost per confirmed incident
- S3 retained bytes by data class

## 7. Alarms

Page or urgently notify operators when:

- End-to-end telemetry age violates the safety SLO for active trips.
- Kinesis lag grows continuously.
- Situation processing DLQ receives messages.
- AppSync or IoT delivery fails for high-severity alerts.
- Database connections or capacity approach limits.
- Authentication failures or join-code attempts spike.
- Cost anomaly detection identifies unexpected spend.

Lower-priority tickets cover summary, analytics and noncritical AI delay.

## 8. Runbooks

Required runbooks before production:

- Telemetry consumer lag
- IoT authorization outage
- Tasco Maps outage or quota exhaustion
- DynamoDB throttling
- PostgreSQL unavailable
- AppSync delivery degradation
- Bedrock/Transcribe outage
- Incorrect or noisy incident policy
- Credential or join-code abuse
- Unexpected AWS spend
- Location data deletion request

Every runbook identifies detection, user-visible degraded behavior, mitigation, recovery verification and follow-up owner.

## 9. Release gates

- All deterministic domain tests pass.
- Golden workbook scenarios match expected outputs.
- No unresolved high-severity security or privacy finding.
- CDK diff is reviewed.
- Database migration is backward-compatible.
- Rollback or feature-disable mechanism exists for changed safety policy.
- Production smoke trip succeeds after deployment.

For the implemented local vertical slice, run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run simulate -- --json
npm.cmd audit --audit-level=high
```

The web and simulator must agree on situation `split:TRIP001:M003:M004`, selected `POI001`, excluded `POI002`, final one-component/together state, one resolved split and a peak route gap of `900 m`.

### Local service boundary

Run the real-port HTTP/WebSocket integration checks with:

```powershell
npm.cmd test --workspace @loopin/local-dev -- --run
npm.cmd run dev:services
```

The automated checks cover health, missing authentication, join and readiness, contract/media/body rejection, CORS and WebSocket-origin denial, browser-compatible fixture authentication, nonmember/member-channel authorization, membership revalidation, bounded active-socket shutdown, indeterminate deadlines, coordinate-free logs and realtime graph delivery. They also submit the canonical duplicate, stale, offline, weak, split and reconnect telemetry through HTTP, prove the exact `M003`–`M004` boundary and POI exclusions, approve POI001, explicitly complete at 75 seconds, verify contiguous subscriber revisions and role-specific rear alerts, and confirm the generated summary has one resolved split, eight notifications and a `900 m` maximum confirmed gap. Fixture credentials, trusted replay time and in-memory state are restricted to local/test use and do not substitute for Cognito, DynamoDB or deployed AWS smoke tests.
