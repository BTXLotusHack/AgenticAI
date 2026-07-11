# Real-time telemetry specification

> **Deployment status (2026-07).** The deployed telemetry path is IoT Core -> Kinesis -> `telemetry-processor` Lambda -> DynamoDB single-table -> AppSync GraphQL subscriptions. Firehose/S3 raw archival, SQS queues, PostgreSQL and downstream analytics stores are not provisioned in the current deployed spec and require a future ADR before introduction.

## 1. Goals

- Accept intermittent, duplicated and delayed mobile GPS without corrupting state.
- Update the live map within three seconds at p95 under initial load.
- Preserve enough current state for live coordination while controlling privacy and cost.
- Keep AI, summaries and analytics outside the critical alert path.
- Provide an explicit migration path from Lambda to stateful stream processing.

## 2. Mobile sampling

Proposed adaptive policy:

| Context | Interval |
|---|---:|
| Normal active driving | 5 seconds |
| Suspected incident or route deviation | 2 seconds |
| Expected stationary stop | 15-30 seconds |
| Offline | Buffer locally and retry with bounded storage |

The native app assigns a monotonic sequence per trip/member session and records both observation and send time.

## 3. Telemetry contract

```ts
type LocationTelemetryV1 = {
  schemaVersion: 1
  eventId: string
  tripId: string
  memberId: string
  deviceId: string
  sequence: number
  observedAt: string
  sentAt: string
  latitude: number
  longitude: number
  accuracyMeters: number
  speedKmh: number | null
  headingDegrees: number | null
  batteryPercent: number | null
  networkQuality: "good" | "weak" | "offline-replay"
  source: "gps" | "simulator"
}
```

Maximum accepted clock skew, coordinate accuracy, payload size and replay age are versioned configuration values.

## 4. MQTT topic layout

```text
trips/{tripId}/members/{memberId}/telemetry
trips/{tripId}/members/{memberId}/status
trips/{tripId}/commands
trips/{tripId}/alerts/{memberId}
```

IoT policies restrict a credential to the authenticated member and active trip. QoS 1 provides at-least-once delivery; it does not remove the need for idempotency.

## 5. Processing pipeline

For every record:

1. Parse and validate the versioned telemetry and projected-location schemas.
2. Verify trip membership and active-trip authorization.
3. Deduplicate by `eventId` and reject a sequence not newer than current accepted state.
4. Validate timestamps, coordinate range, accuracy and plausible motion.
5. Map-match to the planned route and produce `ProjectedLocationV1`.
6. Calculate route progress, route deviation and confidence.
7. Run the shared convoy-core reducers in the backend adapter.
8. Persist `LIVE#STATE`, `LIVE#SNAPSHOT`, `LIVE#MEMBER#...`, idempotency records and realtime event items in the DynamoDB single table with TTL.
9. Publish derived AppSync `RealtimeEventV1` records only after authoritative state changes or member-visible live state changes.
10. Treat raw archive/fan-out as a future ADR-backed addition, not current deployed behavior.

## 6. Ordering and partitioning

Initial Kinesis partition key:

```text
partitionKey = tripId
```

This preserves one ordinary convoy's ordering. For very large organized events, use `tripId + subgroupId` and aggregate subgroup outputs by trip. A single hot partition must not exceed the stream's per-partition/shard limits.

## 7. Lambda event source settings

Initial proposed settings:

| Setting | Value |
|---|---|
| Batch size | 50-200 |
| Batch window | 0-1 second |
| Parallelization factor | 1 |
| Partial batch response | Enabled |
| Bisect batch on error | Enabled |
| Maximum retry attempts | 2-3 |
| Maximum record age | 5-15 minutes |
| Failure destination | Not currently provisioned; future encrypted quarantine/DLQ requires ADR |

Parallelization must not increase until conditional-update and graph-concurrency tests demonstrate correctness.

## 8. GPS confidence

Suggested starting classification:

- `high`: accuracy under 20 m, age under 10 seconds and strong route match.
- `medium`: accuracy under 50 m, age under 30 seconds and usable route match.
- `low`: lower accuracy, stale observation or ambiguous route match.

Threshold-boundary decisions incorporate combined uncertainty. A low-confidence observation may update the UI with an accuracy halo but cannot independently confirm a split.

## 9. Offline replay

- The mobile app stores a bounded encrypted queue.
- Replayed records retain original `observedAt` and set `networkQuality=offline-replay`.
- Replayed data may fill trip history and analytics.
- It must not trigger a new current incident.
- Current state accepts a replay only if it is newer than the stored sequence and still within the live freshness window.

## 10. Client broadcasting

Do not publish every GPS point to every subscriber. Publish:

- Rate-controlled graph or member deltas.
- Immediate confirmed incidents.
- Material confidence/connectivity changes.
- Approved actions and acknowledgements.

Clients interpolate between fresh authoritative points for smooth rendering, stop extrapolating after 10-15 seconds and visibly mark stale members.

Current generated contract artifacts include:

- `MemberTelemetryInputV1` for the mobile publish boundary over MQTT, WSS or simulator transport, including offline queue metadata without changing the underlying GPS observation.
- `LiveMemberSnapshotV1` for per-member current location, route progress, freshness, confidence, connectivity and source telemetry evidence.
- `LiveSnapshotV1` for the viewer-scoped graph, member snapshots, active situations, recommendations and member notifications.
- `ConvoySituationEventV1` for typed situation create/update realtime payloads.
- `DriverAlertV1` and `DriverAlertAcknowledgementV1` for driver-visible alerts and idempotent acknowledgement commands/events.
- `RealtimeEventV1` with event types `liveSnapshotUpdated`, `convoySituationCreated`, `convoySituationUpdated`, `regroupCandidateSelected`, `driverAlertIssued` and `driverAlertAcknowledged`.

## 11. Scale model

```text
messages/month = vehicles x activeHoursPerDay x 3,600 / intervalSeconds x 30
```

At 100,000 simultaneously active vehicles and one 500-byte update every five seconds, ingestion is approximately 20,000 records/second, 10 MB/second and 864 GB/day before compression.

Therefore:

- Raw telemetry does not enter PostgreSQL.
- S3/raw archive is not part of the current deployed spec and requires a future ADR before provisioning.
- Live state uses DynamoDB TTL.
- UI updates are derived and downsampled.
- AI is invoked per confirmed situation or user request, never per GPS point.

## 12. Backpressure

When consumer lag grows:

1. Kinesis retains the records.
2. Alarms trigger on `MillisBehindLatest` and end-to-end event age.
3. Lambda concurrency scales within a trip-safe bound.
4. Noncritical AI, summaries and analytics yield capacity.
5. Obsolete guidance expires by `expiresAt`.
6. The UI shows data age rather than pretending state is current.

## 13. Migration triggers

Replace the telemetry Lambda with Managed Apache Flink or ECS when one or more are sustained:

- Consumer lag violates the live-state SLO after tuning.
- DynamoDB cross-node reads dominate cost or latency.
- Event-time windows and late-event handling become materially complex.
- Sustained Lambda duration costs more than continuous compute.
- Large trips require multi-shard state aggregation.
- Stateful checkpoint and replay semantics become operational requirements.
