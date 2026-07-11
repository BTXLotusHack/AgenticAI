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

Before every unit of work:

1. Confirm that `dev` exists locally and on the collaboration remote.
2. Fetch the remote and update `dev` using fast-forward only.
3. Create a new `codex/<short-unit-name>` branch from the updated `dev`.
4. Use an isolated worktree when available and appropriate.
5. Make only the scoped unit's changes on that branch.

Never commit directly to `dev` or `main`. If the repository is being bootstrapped and `dev` is absent, create `dev` from the current approved `main` before creating the unit branch.

Commit every completed unit of work after fresh verification and before beginning a different unit or handing work off. A unit commit includes its tests and documentation. Do not create meaningless checkpoint commits or knowingly broken commits.

Every ordinary pull request must target `dev`:

```text
codex/<unit> → dev
```

Only an explicitly approved release promotion normally targets `main`:

```text
dev → main
```

Before opening a PR, verify the base branch explicitly. Never silently default a feature PR to `main`.

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
- Keep one unit of work per branch and commit it after verification.

## Verification

Before claiming completion, run the narrow tests, type checks and contract checks for the change, then the relevant simulator scenario. Report what was verified and any external dependency that remains unvalidated.

For documentation-only changes, at minimum scan for unfinished markers, validate relative links and run `git diff --check` before committing.
