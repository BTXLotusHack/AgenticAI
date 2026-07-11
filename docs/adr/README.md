# Architecture Decision Records

Architecture Decision Records document consequential choices that affect multiple boundaries, long-term maintenance, safety, cost or migration.

Name records as:

```text
NNNN-short-decision-title.md
```

Use this structure:

```markdown
# NNNN: Decision title

Date: YYYY-MM-DD
Status: proposed | accepted | superseded

## Context

What problem and constraints require a decision?

## Decision

What is being chosen?

## Alternatives

What credible options were considered and why were they not selected?

## Consequences

What becomes easier, harder, more expensive or riskier?

## Verification and rollback

How will the decision be validated, and how can it be reversed?
```

The initial design baseline is captured in `docs/superpowers/specs/2026-07-11-loopin-group-drive-platform-design.md`. Add ADRs when implementation introduces or changes consequential choices.
