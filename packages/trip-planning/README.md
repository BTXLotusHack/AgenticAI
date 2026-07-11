# Trip planning domain

Pure TypeScript package for Loopin multi-day trip planning. Every itinerary stop references a Tasco place ID; recommendations rank Tasco-backed candidates only.

## Modules

| Module | Responsibility |
|---|---|
| `contracts.ts` | Versioned Zod schemas for trips, itinerary, budget, collaborators, route requests and recommendations |
| `validation.ts` | Duplicate-stop, date-order and Tasco place reference checks |
| `ordering.ts` | Day and stop ordering helpers |
| `estimates.ts` | Deterministic time, distance and budget heuristics |
| `recommendations.ts` | Explainable scoring for Tasco place candidates |
| `routes.ts` | Route request generation from ordered stops (no map provider calls) |
| `lifecycle.ts` | Draft → published → active → completed transitions |
| `permissions.ts` | Owner/editor/viewer authorization helpers |
| `fixtures/golden-halong.fixture.ts` | Workbook-aligned deterministic fixture |

## Run tests

```powershell
npm.cmd run test --workspace @loopin/trip-planning -- --run
```

Application orchestration lives in `services/trips` (`@loopin/trips`).
