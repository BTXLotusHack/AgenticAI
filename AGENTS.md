# Agent instructions

These instructions apply to automated contributors working in this repository.

## Required context

Before planning or editing, read:

1. `README.md`
2. `docs/README.md`
3. The specification that owns the requested behavior
4. `CONTRIBUTING.md`

Do not infer that a designed component is already implemented. Inspect the repository first.

## Mandatory Git workflow

- `main` is the only integration and pull-request base branch.
- Before each unit, fetch `origin`, update local `main` with fast-forward only, and create a new `codex/<unit>` branch from `origin/main`.
- Never commit directly to `main`; open a pull request from the unit branch to `main`.
- Commit every independently verifiable unit after fresh checks. Do not push or open a pull request without user authorization.

## Frontend experience rules

For landing pages, websites, prototypes and visually led product work:

- Invoke `frontend-skill` before design or implementation.
- Read `docs/frontend-standards.md` and the owning page specification.
- Write and approve a visual thesis, content plan and interaction thesis before code.
- Preserve a full-bleed, image-led landing hero unless the approved specification says otherwise.
- Avoid generic SaaS card grids, fabricated proof, excessive typefaces and competing accents.
- Use 21st.dev patterns only after reviewing accessibility, performance, dependencies, framework compatibility and licensing.
- Support responsive layouts, keyboard use and `prefers-reduced-motion` from the first implementation.
- Verify visually in a real browser at desktop and mobile sizes before completion.
- Record sources and licenses for external imagery and imported components.

## Architectural invariants

- React/Vite owns web presentation, not safety rules.
- Flutter owns device capture and driver experience, not authoritative convoy state.
- Flutter/Dart models consume generated versioned contract artifacts and shared golden fixtures; do not hand-copy or reinterpret safety contracts.
- Pure packages own graph, geo, policy and regroup logic.
- AWS handlers adapt external events to pure domain operations.
- DynamoDB owns current live state; PostgreSQL owns relational/geospatial history; S3 owns raw telemetry.
- AppSync and IoT own persistent real-time connections.
- AI interprets and explains; deterministic code detects and authorizes.

## Safety invariants

- Never instruct a driver to speed up, brake suddenly or stop at an unverified location.
- Never describe phone GPS as collision-avoidance precision.
- Never create a regroup POI solely from model output.
- Preserve freshness, confidence, policy version and evidence in safety decisions.
- A critical workflow must have a deterministic fallback when AI is unavailable.

## Change discipline

- Prefer focused modules and explicit interfaces.
- Use versioned schemas for API and event changes.
- Add tests before or with safety and graph behavior changes.
- Preserve idempotency and late/duplicate-event handling.
- Avoid unrelated refactors.
- Update the owning specification when behavior changes.
- Add an ADR for changes that affect multiple architectural boundaries.

## Verification

Before claiming completion, run the narrow tests, type checks and contract checks for the change, then the relevant simulator scenario. Report what was verified and any external dependency that remains unvalidated.

Visually led frontend work also requires a production build, accessibility check, reduced-motion check, responsive screenshots and real-browser interaction verification.
