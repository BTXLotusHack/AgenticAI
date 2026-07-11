# Agent instructions

These instructions apply to automated contributors working in this repository.

## Required context

Before planning or editing, read:

1. `README.md`
2. `docs/README.md`
3. The specification that owns the requested behavior
4. `CONTRIBUTING.md`

Do not infer that a designed component is already implemented. Inspect the repository first.

## Architectural invariants

- React/Vite owns web presentation, not safety rules.
- Expo owns device capture and driver experience, not authoritative convoy state.
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
