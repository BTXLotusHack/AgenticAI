# Loopin Infrastructure Handoff Branch Design

**Date:** 2026-07-12

**Status:** Approved PR handoff; this document defines the integration review, not an AWS deployment approval.

## Objective

Create one remote branch and draft pull request that an infrastructure engineer can review without reconstructing Loopin from disconnected feature branches. The branch supplies the reviewed React/Vite frontend, Flutter foundation, deterministic convoy packages and production-shaped local service boundary. The PR targets `dev`, where the backend/Terraform scaffold is already present, so the proposed PR result contains both bodies of work without merging `dev` into the feature branch.

## Branch and provenance

- Branch: `codex/infra-handoff`.
- Application parent: `f5d17aa`, the reviewed Flutter-foundation tip containing the complete web, domain, simulator, contracts, local services, and mobile foundation history.
- Pull-request base: `origin/dev` at `1b5e8f4`, which already contains merge commit `infra-be` and preserves its original backend/Terraform authorship.
- Integration method: do not merge `origin/dev` into `codex/infra-handoff`. Push the feature branch and let GitHub calculate the proposed merge against `dev`.
- Collaboration target: create a draft pull request from `codex/infra-handoff` to `dev`, never `main`, and do not merge it automatically.

## Included work

| Area | Included source | Handoff status |
|---|---|---|
| Web frontend | `apps/web` | Production static build available in `apps/web/dist`; currently uses the deterministic demo adapter |
| Mobile | `apps/mobile` | Flutter Android/iOS foundation and generated contracts; feature delivery remains in progress |
| Domain and replay | `packages/convoy-core`, `packages/demo-scenarios`, `apps/simulator` | Authoritative tested graph, situation, notification, regroup, replay and summary behavior |
| Application services | `services/application`, `services/local-dev` | Tested use-cases plus local HTTP/WebSocket adapters; fixture identity is forbidden outside local/test |
| Team backend | Already on PR base `dev` | Lambda/Terraform scaffold to be hardened and connected to authoritative contracts/use-cases |
| Infrastructure | Already on PR base `dev` | Terraform scaffold for Cognito, API Gateway, DynamoDB, Kinesis, IoT, AppSync and optional push |
| Documentation | `docs` | Architecture, safety, deployment and explicit handoff findings |

## Explicit exclusions

- Do not restore `stash@{0}` (`wip/aws-service-adapters-handoff`). It contains an incomplete competing AWS adapter experiment and would create two production backend directions.
- Do not claim that the local fixture-auth WebSocket server is deployable production infrastructure.
- Do not run `terraform apply`, create AWS resources, push directly to `dev`, or merge the pull request.
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

Verify the feature branch and both sides of the proposed PR without AWS credentials:

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
git merge-tree --write-tree origin/dev HEAD
```

Terraform validation is a required infrastructure follow-up. If Terraform is not installed locally, record `terraform fmt -check`, `terraform init`, `terraform validate`, security scanning and a reviewed `terraform plan` as unverified rather than inferring success from static files.

## Remote handoff

After verification and review are clean:

1. Push only `codex/infra-handoff` to `origin`.
2. Create a draft pull request with base `dev` and head `codex/infra-handoff`.
3. Do not merge, auto-merge or retarget the pull request.
4. Give the infrastructure engineer the branch name, PR URL, commit hash, verification summary and blocker document path.
5. The infrastructure engineer reviews and closes the applicable security/deployment gates before marking the PR ready or merging it.

## Success criteria

- One remote branch contains the current application work, while its draft PR targets the `dev` branch that owns the team's backend/Terraform history.
- No reviewed application branch or stash is rewritten or deleted.
- Frontend, backend, mobile, contracts and simulator verification pass locally.
- Deployment blockers are explicit and cannot be mistaken for completed controls.
- No AWS resources or pull requests are created during handoff assembly.
