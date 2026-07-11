# Contributing to Loopin

Loopin contains safety-sensitive coordination logic. Changes must be understandable, testable and traceable to a versioned requirement or policy.

## Before changing code

1. Read [the documentation index](docs/README.md).
2. Identify the owning specification.
3. Update the local `dev` branch with a fast-forward-only pull.
4. Create a new short-lived branch from `dev` for this unit of work.
5. For architectural changes, add an ADR under `docs/adr/`.
6. For safety-policy changes, describe evidence, affected scenarios, rollout and rollback.
7. Keep the unit of work small enough to verify independently.

## Branching workflow

`dev` is the integration branch and must exist in every repository clone and remote used for collaboration.

For every unit of work:

```bash
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c codex/<short-unit-name>
```

- Always create a new branch from the latest `dev`; do not reuse a completed feature branch.
- Use the `codex/` prefix for agent-created branches. Human contributors may use the team's approved equivalent.
- Do not commit directly to `dev` or `main`.
- Keep unrelated work on separate branches.
- Do not force-push a shared branch.
- If `dev` is missing during repository bootstrap, create it from the current approved `main`, publish it, and protect it before feature work begins.

All ordinary pull requests target `dev`:

```text
codex/<unit> → dev
```

`main` is the release branch. The only normal pull request targeting `main` is an explicitly approved release promotion:

```text
dev → main
```

Emergency exceptions require explicit maintainer authorization and a documented follow-up merge back into `dev`.

## Engineering standards

- TypeScript strict mode is required.
- Validate every external boundary with a versioned Zod schema.
- Keep domain packages free of React, AWS SDK and database dependencies.
- Keep Lambda handlers thin: authenticate, validate, invoke domain behavior and map results.
- Make event consumers idempotent.
- Reject stale telemetry with conditional state updates.
- Use UTC ISO 8601 timestamps and explicit units in field names.
- Do not log precise location, tokens, join codes or raw voice content by default.
- Do not add an AWS service without documenting cost, failure behavior and deletion lifecycle.
- Do not place safety authority in an LLM prompt or UI component.

## Testing expectations

- Write or update unit tests for every domain rule.
- Add a regression fixture for every corrected graph, safety or notification defect.
- Verify duplicate, late, stale, low-confidence and offline-replay inputs.
- Run contract, simulator and end-to-end tests proportional to the changed boundary.
- A changed safety policy must pass the golden workbook scenarios.

## Pull request checklist

- [ ] Scope and user impact are explained.
- [ ] The owning specification or ADR is linked.
- [ ] Tests cover success, failure and degraded behavior.
- [ ] Telemetry units and time semantics are explicit.
- [ ] Authorization and privacy impact are reviewed.
- [ ] Cost and scaling impact are reviewed.
- [ ] Observability and rollback are included where relevant.
- [ ] Documentation matches the resulting behavior.

## Commit and release practices

- Commit every completed unit of work before starting another unit or handing the branch off.
- A unit-of-work commit must include its proportional tests and documentation updates.
- Use focused commits with imperative messages; do not combine unrelated units in one commit.
- Do not create empty checkpoint commits or commit known-broken intermediate states merely to satisfy the commit rule.
- Never commit credentials, generated production data or precise user traces.
- Deploy development first, then run the dataset replay and smoke trip.
- Every ordinary PR must declare `dev` as its base and pass protected checks.
- Production promotion uses an approved `dev` to `main` release PR.
- Database migrations and event-contract changes remain backward-compatible during rollout.
