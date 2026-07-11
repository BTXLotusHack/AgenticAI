# Product specification

## 1. Product definition

Loopin is an AI-assisted group-drive coordinator that understands the state of an entire convoy and helps participants remain coordinated without encouraging unsafe driver behavior.

The initial target is the Tasco Maps AI Group Drive challenge. The long-term platform supports consumer trips, motorcycle clubs, tourism convoys, event transport, EV groups and commercial fleets.

## 2. Success criteria

Loopin succeeds when it can:

- Create and manage a multi-vehicle trip.
- Show fresh, permission-scoped vehicle locations on web and mobile.
- Detect route deviation, growing gaps, component separation, unexpected stops and connectivity loss.
- Explain where a convoy line broke and which vehicles belong to each section.
- Recommend a safe, forward-compatible regroup point.
- Deliver short, role-specific visual and voice alerts.
- Continue safely when AI, GPS, network or map integrations are degraded.
- Replay the supplied dataset scenarios and produce auditable results.

## 3. Roles

### 3.1 Trip leader

The leader creates and starts the trip, sees full incident evidence, approves ordinary regroup recommendations, changes convoy policy, transfers leadership and ends the trip.

### 3.2 Trip member

A member shares location with consent, receives driver-appropriate alerts, acknowledges status, requests rest, reports a route issue, temporarily leaves formation or reports an emergency.

### 3.3 Observer or coordinator

An observer can view authorized trips and incident state but does not publish a vehicle location or control the convoy unless explicitly granted coordinator privileges.

## 4. Trip lifecycle

```text
DRAFT → READY → ACTIVE → PAUSED → COMPLETED → ARCHIVED
```

- `DRAFT`: route and policy can be edited; no live tracking.
- `READY`: members join and complete readiness checks.
- `ACTIVE`: telemetry, live state and alerts are enabled.
- `PAUSED`: the trip is intentionally stopped at a safe place; separation alerts are suppressed.
- `COMPLETED`: live location access expires and summary generation begins.
- `ARCHIVED`: retained history is read-only and subject to deletion policy.

## 5. Functional requirements

### F-01 Trip planning

- Create a trip with origin, destination, route, planned stops, departure time and vehicle policy.
- Generate expiring join codes and QR links.
- Support route refresh before departure.
- Store an offline route summary on participating devices.

### F-02 Membership and readiness

- Join with alias, vehicle type and consent settings.
- Verify foreground and background location permissions.
- Show GPS, connectivity, voice and battery readiness to the leader.
- Prevent an unready member from appearing as reliably tracked.

### F-03 Live tracking

- Publish adaptive location telemetry from the native driver app.
- Show planned route, authorized members, location accuracy and data age.
- Fetch a current snapshot before subscribing to incremental updates.
- Stop animating a marker when its data becomes stale.

### F-04 Convoy graph

- Represent every active vehicle as a route-projected node.
- Sort nodes by stable route progress rather than fixed join order.
- Calculate adjacent gaps and edge state.
- Derive connected components and boundary vehicles.
- Handle overtaking, temporary independence and leadership transfer.

### F-05 Situation understanding

- Detect falling behind, moving ahead of the leader, component split, off-route movement, wrong turn, unexpected stop, GPS degradation, lost connectivity, rest request and emergency report.
- Maintain a stable situation lifecycle and suppress duplicate alerts.
- Attach confidence, evidence and policy version to each incident.

### F-06 Notifications

- Tailor content to leader, affected member, front section, rear section and observer.
- Avoid instructions to speed, brake suddenly or follow an invalid route.
- Support visual, voice, haptic and background push delivery.
- Expire obsolete instructions and acknowledge delivery where appropriate.

### F-07 Regrouping

- Generate candidates ahead of relevant convoy sections.
- Hard-filter illegal, unsafe, closed, inaccessible or reverse-direction candidates.
- Score safety, route compatibility, ETA fairness, parking, detour and relevant amenities.
- Require leader approval for ordinary regrouping.
- Provide deterministic fallback when AI is unavailable.

### F-08 Voice interaction

- Transcribe Vietnamese and English driver commands.
- Convert language into a restricted structured intent.
- Validate permission and safety before executing an action.
- Produce a short native-TTS response.

### F-09 Post-trip summary

- Report duration, route deviation, component splits, regroups, delays, connectivity events and acknowledged incidents.
- Separate measured facts from AI narrative.
- Allow authorized export and deletion.

### F-10 Public landing experience

- Explain the consumer group-drive value before technical architecture.
- Demonstrate route-aware component separation and regrouping without requiring a live backend.
- Provide primary user, secondary explanation and organization pathways.
- Present only validated proof and avoid fabricated statistics, testimonials, partnerships or pricing.
- Meet the responsive, accessibility, motion and performance requirements in `docs/frontend-standards.md`.

## 6. Notification examples

### Rear section

> Your section is approximately 1.3 km behind the front section. Continue safely on the planned route.

### Front section

> Cars 4 and 5 are behind the front section. Maintain a safe pace while the leader coordinates.

### Member ahead of leader

> You have moved ahead of the trip leader. When safe, ease back to convoy pace or wait at the next approved stop.

### Confirmed regroup

> Continue safely to Minh Châu Rest Stop. The group will regroup there.

## 7. Nonfunctional requirements

- Live map update latency: under three seconds at p95 under the initial production load.
- Confirmed alert delivery: under five seconds after its persistence window completes.
- Duplicate input must not produce duplicate situations or notifications.
- A malformed telemetry record must not block a trip stream.
- AI outage must not block deterministic safety alerts.
- Stale, low-confidence and replayed GPS data must be visibly distinguished.
- All privileged actions must be auditable.
- The initial architecture must support the hackathon while retaining stable contracts for production migration.

## 8. Out of scope

- Autonomous vehicle control
- Collision avoidance or exact bumper-distance enforcement
- Commands to accelerate or brake
- General social messaging while driving
- Public exposure of live locations
- LLM-generated routes or regroup POIs without map and policy validation
