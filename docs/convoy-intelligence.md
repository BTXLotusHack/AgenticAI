# Convoy intelligence specification

## 1. Purpose

This specification defines how Loopin converts noisy vehicle telemetry into an ordered route graph, connected convoy components, stable situations and recipient-specific notifications.

## 2. Route-projected node

Each active vehicle becomes a node only after its location has been validated and map-matched.

```ts
type VehicleNode = {
  tripId: string
  memberId: string
  role: "leader" | "member"
  routeProgressMeters: number
  routeDeviationMeters: number
  speedKmh: number | null
  headingDegrees: number | null
  accuracyMeters: number
  observedAt: string
  confidence: "high" | "medium" | "low"
  connectivity: "healthy" | "degraded" | "stale" | "lost"
}
```

`routeProgressMeters` is distance traveled along the canonical route polyline. It is not straight-line distance from the origin.

## 3. Ordering

At each accepted graph revision:

1. Exclude lost, unmatchable and explicitly independent nodes from authoritative formation edges.
2. Sort remaining nodes by descending route progress.
3. Compare adjacent nodes only.
4. Accept an overtake/order change after it remains stable for the configured reorder window, initially 10–15 seconds.
5. Treat a node ahead of the leader as a special role-relative condition, not automatically as a split.

Sorting makes the model independent of join order and handles Car 5 passing Car 4.

## 4. Edge

```ts
type ConvoyEdge = {
  aheadMemberId: string
  behindMemberId: string
  routeGapMeters: number
  etaGapSeconds: number | null
  combinedUncertaintyMeters: number
  confidentLowerGapMeters: number
  state: "healthy" | "stretched" | "broken" | "recovering" | "unknown"
  stateSince: string
  policyVersion: string
}
```

Combined uncertainty is derived from both device accuracies. A conservative lower bound is used before declaring an excessive gap:

```text
confidentLowerGap = measuredRouteGap − combinedUncertainty
```

If uncertainty overlaps a boundary, the edge enters `unknown` or remains in its prior state instead of producing a high-confidence change.

## 5. Distance policy

Following safety and convoy cohesion are different policies.

### 5.1 Product safety minimums

The initial conservative product defaults are 50 m under 60 km/h, 70 m from 60–80 km/h and 100 m from 80–100 km/h. These are advisory product values, not a claim of exact legal requirements. Phone GPS must not be used as collision-avoidance equipment or as a precise bumper-to-bumper sensor.

Current legal baselines and context-specific requirements must be verified with Vietnamese road-safety counsel and Tasco before production release.

### 5.2 Cohesion thresholds

| Speed band | Stretched | Broken | Reconnect |
|---|---:|---:|---:|
| Under 60 km/h | 250 m | 400 m | 280 m |
| 60–80 km/h | 400 m | 600 m | 420 m |
| 80–100 km/h | 550 m | 800 m | 560 m |
| 100–120 km/h | 700 m | 1,000 m | 700 m |

These are proposed starting values requiring simulation and field calibration. A dynamic reference is:

```text
brokenDistance = clamp(convoySpeed × 30 seconds, 300 m, 1,000 m)
```

Weather, visibility, road type, toll areas, planned stops and vehicle type may increase the policy distance or persistence duration.

## 6. Edge state machine

```text
HEALTHY → STRETCHED → BROKEN → RECOVERING → HEALTHY
```

- `STRETCHED`: confidently above the stretched threshold for initially 15 seconds.
- `BROKEN`: confidently above the broken threshold for initially 30 seconds.
- `RECOVERING`: below reconnect threshold but not stable long enough.
- `HEALTHY`: below reconnect threshold for initially 30–60 seconds.

Separate break and reconnect thresholds provide hysteresis and prevent alert flapping.

## 7. Components

Connected components are built from nonbroken adjacent edges.

```text
Leader ─ Car 2 ─ Car 3 ───── gap ───── Car 4 ─ Car 5
└────── front component ─────┘          └ rear component ┘
```

The inter-component distance is measured between boundary nodes:

```text
componentGap = routeProgress(Car 3) − routeProgress(Car 4)
```

It is not leader-to-tail distance.

```ts
type ConvoyComponent = {
  componentId: string
  memberIds: string[]
  frontBoundaryMemberId: string
  rearBoundaryMemberId: string
  containsLeader: boolean
  averageSpeedKmh: number | null
}
```

## 8. Overall graph state

```text
All authoritative edges healthy    → TOGETHER
At least one stretched edge        → STRETCHED
At least one broken edge           → SPLIT
Insufficient reliable telemetry    → DEGRADED
```

## 9. Situation detectors

### 9.1 Falling behind

Uses adjacent route gap, gap trend, ETA gap and persistence. The affected vehicle is never instructed to speed up.

### 9.2 Ahead of leader

Requires stable order and valid leader GPS. The member is advised to ease back when safe or wait at an approved forward stop; never to brake suddenly.

### 9.3 Off-route or wrong turn

Uses route-deviation distance, heading disagreement, match confidence and consecutive observations. If the leader is off-route, other members retain the planned route as navigation authority.

### 9.4 Unexpected stop

Requires sustained low speed, a moving convoy, no expected safe stop and adequate location confidence. The first action is a safety check, not an emergency declaration.

### 9.5 Connectivity loss

```text
HEALTHY → DEGRADED → STALE → LOST → RECONNECTING → HEALTHY
```

Historical points uploaded after reconnection update analytics but cannot create a new live incident.

## 10. Incident lifecycle

```text
CANDIDATE → CONFIRMED → NOTIFIED → ACKNOWLEDGED → RESOLVED
                                      ├→ ESCALATED
                                      └→ EXPIRED
```

Each incident has one stable `situationId`. Repeated telemetry updates evidence rather than creating new incidents. Notifications are emitted on meaningful transitions, material evidence changes, approved actions and resolution.

## 11. Recipient policy

### Front component

> Cars 4 and 5 are behind the front section. Maintain a safe pace while the leader coordinates.

### Rear component

> Your section is approximately 1.3 km behind. Continue safely on the planned route.

### Front boundary driver

> The following section has fallen behind you. Do not stop suddenly.

### Rear boundary driver

> The front section is ahead. Maintain a safe speed; do not rush to catch up.

### Leader

Receives boundary identities, route and ETA gap, confidence, evidence and allowed actions.

## 12. Regroup logic

Hard exclusions run before scoring:

- Illegal or unsafe stopping area
- Road shoulder without explicit approval
- Closed or inaccessible POI
- Insufficient vehicle compatibility or parking
- Reverse-direction travel or unsafe U-turn
- Excessive detour
- Low map-data confidence

Remaining candidates are scored initially as:

```text
35% safety
20% route compatibility
15% maximum-member ETA fairness
10% parking suitability
10% detour cost
 5% fuel or charging relevance
 5% amenities and connectivity
```

Weights are versioned data in `SafetyPolicy`. AI may explain the selected candidate but cannot introduce a candidate or alter hard exclusions.
