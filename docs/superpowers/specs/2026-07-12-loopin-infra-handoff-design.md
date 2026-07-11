# Loopin Infrastructure Handoff Branch Design

**Date:** 2026-07-12

**Status:** Approved branch composition; this document defines the integration handoff, not an AWS deployment approval.

## Objective

Create one remote branch that an infrastructure engineer can clone and use without reconstructing Loopin from disconnected feature branches. The branch combines the reviewed React/Vite frontend, Flutter foundation, deterministic convoy packages, production-shaped local service boundary, and the backend/Terraform scaffold already merged on `origin/dev`.

## Branch and provenance

- Branch: `codex/infra-handoff`.
- Application parent: `f5d17aa`, the reviewed Flutter-foundation tip containing the complete web, domain, simulator, contracts, local services, and mobile foundation history.
- Infrastructure parent: `origin/dev` at `1b5e8f4`, which contains merge commit `infra-be` and preserves its original backend/Terraform authorship.
- Integration method: a normal merge of `origin/dev` into `codex/infra-handoff`; do not squash or copy files manually.
- Collaboration target: any later pull request from this branch targets `dev`, never `main`.

## Included work

| Area | Included source | Handoff status |
|---|---|---|
| Web frontend | `apps/web` | Production static build available in `apps/web/dist`; currently uses the deterministic demo adapter |
| Mobile | `apps/mobile` | Flutter Android/iOS foundation and generated contracts; feature delivery remains in progress |
| Domain and replay | `packages/convoy-core`, `packages/demo-scenarios`, `apps/simulator` | Authoritative tested graph, situation, notification, regroup, replay and summary behavior |
| Application services | `services/application`, `services/local-dev` | Tested use-cases plus local HTTP/WebSocket adapters; fixture identity is forbidden outside local/test |
| Team backend | `backend` from `origin/dev` | Lambda/Terraform scaffold to be hardened and connected to authoritative contracts/use-cases |
| Infrastructure | `infra` from `origin/dev` | Terraform scaffold for Cognito, API Gateway, DynamoDB, Kinesis, IoT, AppSync and optional push |
| Documentation | `docs` | Architecture, safety, deployment and explicit handoff findings |

## Explicit exclusions

- Do not restore `stash@{0}` (`wip/aws-service-adapters-handoff`). It contains an incomplete competing AWS adapter experiment and would create two production backend directions.
- Do not claim that the local fixture-auth WebSocket server is deployable production infrastructure.
- Do not run `terraform apply`, create AWS resources, push to `dev`, or open a pull request as part of branch assembly.
- Do not auto-accept Android SDK licenses or claim physical iOS/device validation.

## Required deployment warning

The merged branch is an engineering handoff, not a safe shared-dev deployment. The handoff document must prominently record these blockers:

1. AppSync subscriptions do not verify active team membership, allowing an authenticated user-pool principal to request another team's location channel.
2. IoT device/session provisioning and topic-to-payload identity binding are absent; telemetry identity is therefore not deployable safely.
3. Terraform state is local and unlocked; shared/CI applies require encrypted, versioned remote state and locking.
4. GitHub Actions/OIDC and frontend S3/CloudFront hosting are absent.
5. The dev maps endpoint is a reserved placeholder; null-confidence fallback cannot be treated as map-matched safety evidence.
6. Stream partial-batch failure handling, quarantine, durable current-state/idempotency semantics, observability and rate/cost guardrails remain incomplete.
7. The Lambda zip build externalizes runtime dependencies and needs hermetic bundles plus an exact Node.js 22 cold-start smoke test.
8. The Terraform implementation and older backend contracts differ from the current Flutter/CDK-oriented architecture documents and need an explicit owning ADR before production convergence.

## Handoff verification

After the merge, verify all independent surfaces without AWS credentials:

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd run contracts:check
npm.cmd run simulate -- --json

Push-Location backend
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --omit=dev
Pop-Location

npm.cmd run mobile:format-check
npm.cmd run mobile:analyze
npm.cmd run mobile:test
Push-Location apps/mobile
flutter build apk --debug
Pop-Location

git diff --check origin/dev...HEAD
```

Terraform validation is a required infrastructure follow-up. If Terraform is not installed locally, record `terraform fmt -check`, `terraform init`, `terraform validate`, security scanning and a reviewed `terraform plan` as unverified rather than inferring success from static files.

## Remote handoff

After the merge, verification and review are clean:

1. Push only `codex/infra-handoff` to `origin`.
2. Do not create or merge a pull request automatically.
3. Give the infrastructure engineer the branch name, commit hash, verification summary, and blocker document path.
4. The engineer may branch from this handoff or propose a pull request to `dev` after closing the applicable security and deployment gates.

## Success criteria

- One remote branch contains both current application work and the team's original backend/Terraform history.
- No reviewed application branch or stash is rewritten or deleted.
- Frontend, backend, mobile, contracts and simulator verification pass locally.
- Deployment blockers are explicit and cannot be mistaken for completed controls.
- No AWS resources or pull requests are created during handoff assembly.

