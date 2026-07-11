# Contributing to Loopin

Loopin contains safety-sensitive coordination logic. Changes must be understandable, testable and traceable to a versioned requirement or policy.

## Before changing code

1. Read [the documentation index](docs/README.md).
2. Identify the owning specification.
3. For architectural changes, add an ADR under `docs/adr/`.
4. For safety-policy changes, describe evidence, affected scenarios, rollout and rollback.
5. Keep the unit of work small enough to verify independently.

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
- Visually led frontend changes must follow `docs/frontend-standards.md` and invoke `frontend-skill` before implementation.
- Landing-page work requires an approved visual thesis, content plan and interaction thesis.
- External visual assets and imported community components require source and license records.

## Testing expectations

- Write or update unit tests for every domain rule.
- Add a regression fixture for every corrected graph, safety or notification defect.
- Verify duplicate, late, stale, low-confidence and offline-replay inputs.
- Run contract, simulator and end-to-end tests proportional to the changed boundary.
- A changed safety policy must pass the golden workbook scenarios.
- Frontend changes must verify responsive layouts, keyboard behavior, reduced motion, accessibility, production build output and real-browser interaction.

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

- Use focused commits with imperative messages.
- Never commit credentials, generated production data or precise user traces.
- Deploy development first, then run the dataset replay and smoke trip.
- Production deployment requires protected approval.
- Database migrations and event-contract changes remain backward-compatible during rollout.
