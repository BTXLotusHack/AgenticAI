# Data and API contracts

## 1. Contract principles

- Every external and asynchronous contract has a numeric `schemaVersion`.
- Commands have idempotency keys.
- Events are immutable facts written in past tense.
- State updates have aggregate or graph revision numbers.
- Clients detect revision gaps and refetch a snapshot.
- Sensitive fields are excluded unless the caller is authorized for the trip and role.

## 2. Core relational entities

### User

Identity reference, alias, locale and consent preferences. Authentication secrets remain in Cognito.

### Trip

```text
id, name, state, leaderMemberId, routeId, departureTime,
safetyPolicyVersion, createdAt, startedAt, completedAt, version
```

### TripMember

```text
id, tripId, userId, role, displayName, vehicleId,
visibilityPolicy, readinessState, joinedAt, leftAt
```

### Vehicle

```text
id, type, label, color, optional plate suffix,
optional length, fuel/charging capabilities
```

### Route

Canonical provider reference, encoded geometry, origin, destination, waypoints, distance, expected duration and provider/version metadata.

### SafetyPolicy

Versioned distance bands, persistence windows, confidence requirements, notification cooldowns, incident rules and regroup weights.

### PlaceCandidate

POI identity, route, coordinates, type, safety attributes, parking, restroom, fuel/charging, opening status and source confidence.

### DestinationSuggestionDataset

Structured POI dataset for AI-assisted destination recommendations and trip-planning features. Records include crawl provenance, corridor, segment, location, type, coordinates, rating, review counts, opening signals, source confidence, AI use cases and safety-boundary flags. The dataset excludes raw crawl payloads and reviewer identity/profile fields. It is not authoritative for safe regroup decisions, route detours, road direction, safe entry/exit, live ETA or convoy separation.

The current implementation handoff, artifact paths, row counts, coverage gaps,
column groups and AI usage rules are documented in
[AI Trip Planning Data](ai-trip-planning-data.md). The primary application
artifact is `data_pipeline/apify_roadtrip_pipeline_v2/data/processed/places_ai_suggestions.jsonl`.

### Situation

Stable incident identity, type, lifecycle, severity, affected members/components, evidence, policy version, confidence, action, timestamps and resolution.

### Recommendation

Situation reference, evaluated candidates, exclusions, score breakdown, selected candidate, approval state, approver and expiration.

## 3. DynamoDB hot-state design

Initial single-table access patterns:

```text
PK=TRIP#{tripId}  SK=GRAPH#CURRENT
PK=TRIP#{tripId}  SK=MEMBER#{memberId}
PK=TRIP#{tripId}  SK=EDGE#{aheadId}#{behindId}
PK=TRIP#{tripId}  SK=SITUATION#{situationId}
PK=EVENT#{eventId} SK=IDEMPOTENCY
```

Every current-state item includes `updatedAt`, `expiresAt`, revision and relevant sequence. Conditional expressions reject stale writes.

## 4. Domain events

Common envelope:

```ts
type EventEnvelope<TType extends string, TPayload> = {
  schemaVersion: 1
  eventId: string
  eventType: TType
  occurredAt: string
  producedAt: string
  correlationId: string
  causationId?: string
  tripId: string
  producer: string
  payload: TPayload
}
```

Initial event catalog:

```text
TripCreated
MemberJoined
MemberReadinessChanged
TripStarted
MemberLocationAccepted
MemberConnectivityChanged
ConvoyGraphChanged
ConvoyEdgeStretched
ConvoyEdgeBroken
ConvoyComponentsChanged
SituationConfirmed
SituationAcknowledged
RegroupRecommended
RegroupApproved
NotificationRequested
NotificationDelivered
TripCompleted
TripSummaryGenerated
```

## 5. Graph change payload

```ts
type ConvoyGraphChangedV1 = {
  graphRevision: number
  calculatedAt: string
  overallState: "together" | "stretched" | "split" | "degraded"
  orderedMemberIds: string[]
  changedEdges: ConvoyEdge[]
  components: ConvoyComponent[]
  policyVersion: string
}
```

## 6. Situation evidence

Evidence is structured rather than prose:

```ts
type SituationEvidence = {
  frontBoundaryMemberId?: string
  rearBoundaryMemberId?: string
  routeGapMeters?: number
  etaGapSeconds?: number
  durationSeconds: number
  locationConfidence: "high" | "medium" | "low"
  graphRevision: number
  sourceEventIds: string[]
}
```

## 7. HTTP API surface

### Trips

```text
POST   /v1/trips
GET    /v1/trips
GET    /v1/trips/{tripId}
PATCH  /v1/trips/{tripId}
POST   /v1/trips/{tripId}/stops
PATCH  /v1/trips/{tripId}/stops/{stopId}
DELETE /v1/trips/{tripId}/stops/{stopId}
POST   /v1/trips/{tripId}/routes/refresh
POST   /v1/trips/{tripId}/invites
POST   /v1/trips/join
POST   /v1/trips/{tripId}/start
POST   /v1/trips/{tripId}/pause
POST   /v1/trips/{tripId}/complete
```

The local `@loopin/trips` service now exposes a pure HTTP-router boundary for these planning endpoints. It validates
commands with the trip-planning domain package and is intended to be wrapped by API Gateway/Lambda adapters. The local
handler is implemented and tested, but it is not a deployed AWS API until the backend adapter and authorization wiring
are connected.

Shared planning DTOs:

```ts
type TascoPlaceRef = {
  id: string
  provider: "tasco"
  name: string
  address: string
  coordinates: { lat: number; lon: number }
  categories: string[]
  ratingSummary?: { averageRating: number; reviewCount: number; source: "tasco" }
  sourceVersion: string
}

type TripPlanSummary = {
  tripId: string
  title: string
  lifecycle: "draft" | "ready" | "active" | "completed" | "archived"
  origin: TascoPlaceRef
  destination: TascoPlaceRef
  stops: TripStop[]
  routeSummary: { distanceMeters: number; durationSeconds: number }
  departureTime: string
  policyId: string
  memberCount: number
}
```

Tasco-derived facts such as ratings, categories, route distance and route geometry must come from the Tasco facade or a
trusted Tasco-backed adapter. Client preferences may influence search and route requests, but callers must not be allowed
to submit their own provider ratings, source labels or route candidates as trusted facts.

Join codes are opaque 16-character non-enumerable tokens. Idempotency reservations for trip commands have a bounded
24-hour lifetime in the local repository and must use an equivalent TTL-backed record in DynamoDB when adapted to AWS.

### Membership

```text
POST   /v1/trips/{tripId}/join-code
POST   /v1/trips/join
GET    /v1/trips/{tripId}/members
PATCH  /v1/trips/{tripId}/members/{memberId}
POST   /v1/trips/{tripId}/members/{memberId}/readiness
POST   /v1/trips/{tripId}/leadership-transfer
```

### Live state

```text
GET    /v1/trips/{tripId}/live-snapshot
GET    /v1/trips/{tripId}/situations
POST   /v1/trips/{tripId}/situations/{situationId}/acknowledge
```

### Regroup and commands

```text
POST   /v1/trips/{tripId}/situations/{situationId}/regroup-options
POST   /v1/trips/{tripId}/recommendations/{recommendationId}/approve
POST   /v1/trips/{tripId}/commands
```

### History

```text
GET    /v1/trips/{tripId}/summary
GET    /v1/trips/{tripId}/timeline
DELETE /v1/trips/{tripId}/history
```

### Community, profile and privacy

```text
GET    /v1/places/{placeId}/community-summary
GET    /v1/places/{placeId}/reviews
POST   /v1/places/{placeId}/reviews
PATCH  /v1/reviews/{reviewId}
DELETE /v1/reviews/{reviewId}
POST   /v1/reports
GET    /v1/moderation/reports
POST   /v1/moderation/reports/{reportId}/actions
GET    /v1/users/me/profile
PATCH  /v1/users/me/profile
GET    /v1/users/me/privacy
PATCH  /v1/users/me/privacy
GET    /v1/presence/places/{placeId}
PATCH  /v1/users/me/presence-settings
```

Community review and presence payloads are user-generated. Tasco place facts remain provider-sourced and must not be overwritten by review text, ratings or report metadata. Place presence is approximate, opt-in and block-list aware; it never exposes active trip live state.

## 8. Real-time channels

```text
/trip/{tripId}/state
/trip/{tripId}/situations
/trip/{tripId}/member/{memberId}/alerts
/trip/{tripId}/leader/actions
```

Subscription authorization checks Cognito identity, active membership, role and visibility policy. A snapshot revision accompanies every delta.

## 9. Error contract

```ts
type ApiError = {
  code: string
  message: string
  correlationId: string
  details?: Record<string, unknown>
  retryable: boolean
}
```

User-facing messages do not expose internal AWS, database or policy details. Logs use the correlation ID and redact coordinates unless explicitly required in a secured diagnostic context.
