# Safety, security and privacy

## 1. Safety position

Loopin coordinates people; it does not control vehicles. Every feature must preserve driver agency and avoid implying sensor precision the system does not possess.

## 2. Mandatory driver guardrails

Loopin must never instruct a driver to:

- Speed up to catch the convoy.
- Brake suddenly.
- Stop on an unverified shoulder or illegal curb.
- Follow a leader who has left the planned route.
- Interact with a complex screen while moving.
- Treat an approximate phone coordinate as collision-avoidance data.

Preferred language:

- “Maintain a safe speed.”
- “When safe, ease back to convoy pace.”
- “Continue on the planned route.”
- “Wait at the approved stop.”
- “Do not stop suddenly.”

## 3. Deterministic authority

Rules and versioned policies own:

- Location-confidence gates
- Route deviation
- Edge and component state
- Severity
- Candidate exclusion
- Regroup scoring
- Allowed actions
- Alert escalation and expiry

AI is a nonauthoritative language layer. AI responses are constrained by structured facts, word limits and allowed actions. A timeout or refusal activates a deterministic template.

## 4. Identity and authorization

- Cognito authenticates users.
- APIs authorize active trip membership and role on every operation.
- IoT policies restrict publish/subscribe topics to the authenticated member and trip.
- AppSync subscriptions are trip- and member-scoped.
- Join codes are short-lived, single-purpose and revocable.
- Leadership transfer requires explicit confirmation and audit.
- Public links expose no live location by default.

## 5. Location consent

Before tracking, the member sees:

- Who can see their live location.
- When sharing starts and ends.
- Which history is retained.
- How to pause, leave or delete history.
- What degraded behavior follows a permission change.

Visibility options can include group-visible, leader-only and paused. A paused member is shown as paused with last-update age; the old marker is not presented as current.

## 6. Community presence and reviews

- Place ratings and comments are user-generated community data and must remain visually and contractually separate from Tasco place facts.
- Place presence is approximate, opt-in and revocable; it may show city, broad date window, interests and shared Tasco place references.
- Community presence must not include exact accommodation, coordinates, street address, check-in time, full itinerary details or active trip membership.
- Block lists apply in both directions: people a viewer blocked and people who blocked the viewer are hidden from each other on community surfaces.
- Trusted moderation roles come from authenticated server context. User-submitted profile or request body flags do not grant moderation authority.
- Partner-facing analytics use aggregated or anonymized patterns by default and never expose raw live trip traces.

## 7. Retention defaults

| Data | Proposed retention |
|---|---:|
| DynamoDB live state | Trip plus 24 hours |
| Raw high-frequency GPS | 7–30 days |
| Downsampled history | 6–12 months with consent |
| Incidents and approvals | 12 months |
| Trip summary | Until user deletion or account policy |
| Ordinary application logs | 7–14 days |
| Security audit trail | 12 months |

Final periods require legal and customer review. S3 lifecycle policies and DynamoDB TTL implement the approved values.

## 8. Data protection

- TLS for HTTP, MQTT/WSS and database connections.
- KMS encryption for S3, DynamoDB, Kinesis, queues, logs and databases where supported.
- Secrets Manager for backend credentials.
- No secrets or private endpoints in frontend bundles.
- Precise location excluded from ordinary logs and analytics identifiers.
- Data exports are short-lived, encrypted and authorization checked.
- Backups inherit retention and deletion requirements.

## 9. Threat controls

### Spoofed telemetry

Use device/session identity, sequence numbers, plausible-motion validation, trip membership and anomaly flags. A spoof suspicion reduces confidence instead of silently controlling the graph.

### Replay and duplicates

Use event IDs, member sequences, observation time, conditional writes and TTL-backed idempotency.

### Unauthorized observation

Enforce channel and API authorization server-side. Never depend on hidden client UI for access control.
Public community links must not reveal active trip membership, live route progress or precise coordinates.

### Join-code abuse

Rate-limit attempts, expire codes, bind redemption to authenticated users and allow leader revocation.

### Notification injection

Only the notification service may publish authoritative alert envelopes. Clients render signed/authorized structured alerts rather than arbitrary peer prose.

### Resource exhaustion

Apply API throttles, IoT quotas, Lambda reserved concurrency, queue limits, payload limits, WAF rules and cost anomaly alarms.

## 10. Emergency behavior

- A user-reported emergency is immediately high priority.
- An unexpected stop first triggers a safety check unless stronger evidence exists.
- Failure to respond can escalate according to policy but is not described as a confirmed accident.
- Emergency contact or external-service integration requires separate consent, legal review and operational ownership.

## 11. Required reviews before production

- Vietnamese road-safety review of wording and distance policy
- Privacy and retention review
- Mobile permission and platform-policy review
- Tasco Maps data-license and API review
- Accessibility and low-distraction UX review
- Incident-response ownership and escalation review
