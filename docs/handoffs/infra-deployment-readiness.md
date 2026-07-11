# Infrastructure deployment readiness handoff

**Status:** Draft engineering handoff. No AWS deployment has occurred. The pull request must be created as draft, remain draft, and not be merged until every applicable Critical blocker and deployment gate below is closed with reviewed evidence.

## Provenance and integration boundary

| Item | Audited value |
|---|---|
| Application branch | `codex/infra-handoff` |
| Application head before this handoff task | `84634fb0d7cfc14e31990d75f1aff56015239d70` |
| Pull-request base | `origin/dev` at `1b5e8f476f2cdd9ee3137a5cd6afe26cb351ecdc` |
| Backend/Terraform source commit | `0594a35afad83d8b860a57fac38d3f488d7566e2` (`infra+be: scaffold`) |
| Backend merge on `dev` | `1b5e8f476f2cdd9ee3137a5cd6afe26cb351ecdc`, which merges `0594a35` |

The application branch intentionally does not merge `origin/dev`. GitHub's proposed merge into `dev` is the review boundary that combines the reviewed application history with the backend and Terraform scaffold while preserving the backend authorship. This handoff does not approve that proposed result for deployment.

## Current readiness by surface

| Surface | Ready now | Not yet deployment-ready |
|---|---|---|
| React/Vite web | The landing page and deterministic setup, live replay, regroup approval, reconnection and summary journey build as a static site. | It uses demo/session adapters, has an incomplete production membership/API journey, and has no S3/CloudFront hosting or delivery workflow. |
| Flutter driver app | Android/iOS project foundation, generated contract boundary, local adapters and automated format/analyze/test entry points exist. | Production Cognito, IoT, AppSync, maps, background location and notification adapters still require implementation and device validation. |
| Convoy/domain packages | Versioned contracts and deterministic graph, situation, notification, regroup, replay and summary behavior are the authoritative safety/domain implementation. | Production adapters must call these operations without moving safety authority into Lambda handlers, clients or AI. |
| Local services | Production-shaped HTTP/WebSocket boundaries exercise application use-cases with fixture identity and in-memory state. | Fixture authentication and local WebSockets are forbidden outside local/test and are not production identity, persistence or realtime infrastructure. |
| Backend Lambda scaffold on `dev` | TypeScript handlers cover team creation, invitation and telemetry processing, with DynamoDB, maps, AppSync and push helper seams. The read-only audit passed `npm ci`, typecheck, build, 14 tests and the production dependency audit. | It is a scaffold with an incomplete API surface, incomplete durable telemetry semantics, non-hermetic bundles and incomplete stream failure handling. It is not yet integrated with the authoritative application/domain contracts. |
| Terraform scaffold on `dev` | Modules describe Cognito, API Gateway, DynamoDB, Kinesis, IoT, AppSync and optional notifications. | It has unsafe local state, no delivery workflow, no frontend hosting, incomplete operational controls, and documentation drift over whether Terraform or CDK owns deployment. No plan or apply has been approved. |

The positive backend results above are evidence from the completed read-only audit only. They do not prove Terraform validity, deployed behavior, cross-service authorization, AWS quotas or end-to-end safety semantics.

## Critical blockers

1. **AppSync cross-team subscription disclosure.** Cognito authentication alone allows a user-pool principal to request another team's location channel because subscription authorization does not verify active team membership. Add server-side channel authorization against current membership, deny by default, and test former, cross-team and malformed principals before any shared deployment.
2. **Unbound and unprovisioned IoT telemetry identity.** Device/session provisioning, short-lived credentials, least-privilege topic policy, credential/session revocation and topic-to-payload identity binding are absent. A publisher can therefore make an untrusted payload identity claim. Provision and bind identity server-side; never authorize telemetry from a client-supplied team/member identifier alone.
3. **Unsafe local Terraform state.** The scaffold defaults to local, unlocked state. Bootstrap an encrypted, versioned remote backend with locking, restricted access, recovery and audited state migration before any shared or CI-driven plan/apply.
4. **No frontend hosting or CI.** There is no reviewed S3/CloudFront/WAF frontend path and no workflow that builds, scans, promotes or rolls it back. The web artifact cannot be called deployable until hosting, cache/security headers, origin access, domain/TLS, invalidation and protected delivery are implemented and tested.

## Important blockers

- **No GitHub OIDC or workflows.** Add branch-scoped, short-lived AWS federation and least-privilege plan/deploy roles; do not add long-lived cloud keys to GitHub.
- **No CORS policy.** API origins, methods, headers, credentials behavior and preflight responses need an explicit deny-by-default configuration tied to the deployed web origins.
- **Placeholder maps integration.** The development maps endpoint and null-confidence fallback are not map-matched safety evidence. Integrate and validate the selected provider, or preserve a deterministic degraded path that cannot authorize a safety action.
- **Swallowed AppSync failures and no partial-batch quarantine.** Publishing failures must be observable and retryable. Kinesis processing needs per-record failure reporting, bounded retries, poison-record quarantine and replay procedures so one bad record neither disappears nor retries a successful batch indefinitely.
- **Missing telemetry idempotency, freshness, confidence and current-state semantics.** Define conditional updates, deterministic event IDs, late/duplicate handling, explicit measured/received time, confidence propagation and authoritative current-state selection before accepting live telemetry.
- **Non-hermetic Lambda bundles.** Runtime dependencies are externalized. Produce reproducible self-contained artifacts and run an exact Node.js 22 cold-start/import smoke test in the target Lambda architecture.
- **Missing observability, rate, cost and deletion controls.** Add structured privacy-safe signals, alarms and runbooks; API/IoT abuse controls; budgets and spend alarms; retention, TTL, backup and deletion lifecycles; and rollback evidence.
- **Incomplete membership journey.** Joining, consent, role changes, removal/revocation and reconnect behavior are not connected end to end across web/mobile, Cognito, API and realtime authorization.
- **Incomplete API surface.** The scaffold does not yet provide the full versioned trip, membership, snapshot, incident, regroup, acknowledgement and summary operations consumed by the clients.
- **Terraform/CDK documentation drift.** Current architecture documents assign infrastructure to AWS CDK while the team scaffold is Terraform. Record one owning decision in an ADR, define migration/compatibility boundaries and update deployment documents before production convergence.

## Minimal secure deployment sequence

The steps are ordered dependencies; passing a later step does not waive an earlier gate.

1. Keep the PR draft and review the synthetic proposed merge against exactly `origin/dev` at `1b5e8f4`. Re-run application, mobile, contracts, simulator and backend gates on that exact tree.
2. Approve and record the Terraform-versus-CDK ownership ADR. Pin tool/provider versions and reconcile resource names, contracts, regions, environments, cost, failure and deletion behavior with the owning specifications.
3. Close the two identity boundaries: membership-authorized AppSync subscriptions and server-bound, provisioned IoT publisher identity. Add negative authorization and revocation tests.
4. Connect Lambda adapters to the authoritative versioned contracts and pure application/domain operations. Implement durable current-state, idempotency, freshness/confidence and late/duplicate-event semantics.
5. Make stream and realtime delivery failure-safe: partial-batch responses, quarantine and replay; surfaced AppSync failures; bounded retry/deduplication; privacy-safe observability and alarms.
6. Complete the required API and membership journeys, production maps adapter/degraded fallback, explicit CORS, rate limits, WAF/abuse controls and retention/deletion behavior.
7. Make Lambda artifacts hermetic and verify Node.js 22 cold starts. Implement the S3/CloudFront/WAF frontend path with TLS, origin access, security headers, cache/invalidation and rollback behavior.
8. Bootstrap encrypted versioned remote Terraform state and locking out of band. Add GitHub OIDC workflows with separate least-privilege plan and protected deploy roles; keep state and cloud credentials out of artifacts and logs.
9. Run `terraform fmt -check`, pinned-provider `terraform init`, `terraform validate`, a security scan and a reviewed saved plan for an isolated development environment. Require explicit human approval before the first apply.
10. Deploy only to isolated development, then run authenticated API, IoT-to-stream, current-state, cross-team AppSync denial, frontend, alarms, deletion and rollback smoke tests plus the deterministic convoy scenario. Record evidence before marking the PR ready; merge only when every applicable blocker is closed.

## Explicitly unverified gates

No Terraform CLI validation, security scan, saved plan or apply is evidenced by this handoff. No AWS credentials were used, and no AWS resources were created or changed. The following remain unverified until fresh evidence is attached to the draft PR:

- remote-state bootstrap, locking, encryption, recovery and state-access controls;
- `terraform fmt -check`, pinned-provider initialization, validation, security scanning and reviewed plan output;
- IAM least privilege, OIDC claim restrictions, service quotas, regional availability and cost estimates in `ap-southeast-1`;
- Cognito membership revocation, AppSync cross-team denial and IoT topic/payload identity binding in AWS;
- Lambda Node.js 22 cold start, partial-batch retry/quarantine, DynamoDB conditional-state behavior and AppSync failure recovery;
- production maps accuracy/confidence behavior and deterministic degraded behavior;
- S3/CloudFront/WAF/TLS/CORS/security-header behavior, cache invalidation and rollback;
- end-to-end web/mobile membership, telemetry, notification, regroup and deletion flows on supported devices;
- alarms, rate limits, budgets, retention, backup, teardown and incident runbooks.

No credentials, secrets or precise location traces belong in this document, the future PR, CI logs or deployment evidence. No PR existed during this documentation task. It must be created as draft, remain draft, and not be merged until the applicable blockers and gates above have reviewed evidence. No AWS deployment has occurred.
