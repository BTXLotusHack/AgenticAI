# Loopin documentation

This directory is the system-design source of truth for Loopin. Documents are organized by concern so product behavior, real-time processing, infrastructure and safety can evolve independently through explicit contracts.

## Reading order

1. [Product Specification](product-spec.md)
2. [System Architecture](system-architecture.md)
3. [Convoy Intelligence](convoy-intelligence.md)
4. [Real-time Telemetry](realtime-telemetry.md)
5. [Data and API Contracts](data-and-api-contracts.md)
6. [AWS Deployment](aws-deployment.md)
7. [Safety, Security and Privacy](safety-security-privacy.md)
8. [Testing and Operations](testing-and-operations.md)
9. [Roadmap](roadmap.md)
10. [Frontend Experience Standards](frontend-standards.md)
11. [Runnable Convoy Core Demo](core-demo-slice.md)

Cross-cutting project practices are defined in [CONTRIBUTING.md](../CONTRIBUTING.md) and [AGENTS.md](../AGENTS.md). Consequential implementation decisions belong in [Architecture Decision Records](adr/README.md).

Design records:

- [2026-07-11 Loopin Group Drive Platform Design](superpowers/specs/2026-07-11-loopin-group-drive-platform-design.md)
- [2026-07-11 Loopin Landing Page Design](superpowers/specs/2026-07-11-loopin-landing-page-design.md)
- [2026-07-11 Loopin Core Demo Slice Plan](superpowers/plans/2026-07-11-loopin-core-demo-slice.md)

## Ownership map

| Concern | Source of truth |
|---|---|
| User roles, journeys and feature acceptance | `product-spec.md` |
| Service boundaries and architectural decisions | `system-architecture.md` |
| Node, edge, component and incident algorithms | `convoy-intelligence.md` |
| GPS schema, stream processing and large-scale behavior | `realtime-telemetry.md` |
| Entities, keys, events and HTTP operations | `data-and-api-contracts.md` |
| AWS resources and deployment process | `aws-deployment.md` |
| Driver guardrails, authorization and retention | `safety-security-privacy.md` |
| Verification, SLOs, alarms and incident response | `testing-and-operations.md` |
| Delivery phases and migration triggers | `roadmap.md` |
| Public-page art direction, motion, accessibility and visual QA | `frontend-standards.md` |

## Documentation rules

- A behavior is not complete until its success, failure and degraded modes are specified.
- Safety-critical decisions must identify their deterministic rule and policy version.
- Every event contract is versioned and idempotent.
- Every live datum shown to a user includes freshness and confidence.
- Proposed infrastructure must include a cost and scale rationale.
- Architectural changes that cross document boundaries require an Architecture Decision Record in `docs/adr/` when implementation begins.
- No document may describe AI as the sole detector or approver of a driving-safety action.

## Status terminology

| Term | Meaning |
|---|---|
| Approved design | Agreed product or architectural direction |
| Proposed default | Starting value that requires simulation or field calibration |
| External validation | Dependency that must be confirmed with Tasco, AWS, legal or device testing |
| Implemented | Present in code and covered by proportional verification |

These specifications are approved design material. They do not imply that the corresponding application code has already been implemented.
