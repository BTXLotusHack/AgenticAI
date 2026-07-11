# Loopin AI Group Drive Platform design

**Date:** 2026-07-11
**Status:** Written design baseline for user review

## Objective

Design a complete, AWS-deployed AI group-drive assistant that coordinates a line of vehicles in real time, detects route-aware separation and abnormal situations, recommends safe regroup points, supports low-distraction voice interaction and scales from a hackathon demonstration to a maintainable production platform.

## Approved direction

- React + Vite web application delivered through S3 and CloudFront.
- Flutter/Dart driver application for reliable background GPS, offline buffering and native alerts.
- Serverless-first AWS backend using API Gateway, Lambda, IoT Core, Kinesis, DynamoDB, EventBridge, SQS and AppSync Events.
- PostgreSQL/PostGIS for relational routes and safe POIs; S3 for raw telemetry.
- Every vehicle is a route-projected graph node.
- Adjacent gaps form edges; connected components form contiguous convoy sections.
- Boundary nodes determine the distance between separated sections.
- Vehicle order follows stable route progress, allowing overtaking.
- Minimum following safety and maximum convoy-cohesion distance are separate policies.
- Deterministic engines own safety decisions; AI owns constrained language tasks.

## Architecture summary

```text
Flutter GPS → IoT Core → Kinesis → telemetry Lambda → DynamoDB graph state
                                      ├→ Firehose/S3
                                      └→ EventBridge/SQS
                                           → situation/regroup Lambdas
                                           → AppSync/IoT/push
                                           → Bedrock explanation queue

React/Vite → CloudFront/S3
React/Flutter → Cognito → API Gateway/Lambda → PostgreSQL/DynamoDB
```

## Specification map

- [Root project README](../../../README.md)
- [Documentation index](../../README.md)
- [Product specification](../../product-spec.md)
- [System architecture](../../system-architecture.md)
- [Convoy intelligence](../../convoy-intelligence.md)
- [Real-time telemetry](../../realtime-telemetry.md)
- [AWS deployment](../../aws-deployment.md)
- [Data and API contracts](../../data-and-api-contracts.md)
- [Safety, security and privacy](../../safety-security-privacy.md)
- [Testing and operations](../../testing-and-operations.md)
- [Roadmap](../../roadmap.md)

## Design completeness

The linked specifications cover architecture, isolated component responsibilities, data flow, failure/degraded behavior, error handling, privacy, security, testing, observability, cost controls and migration triggers. Proposed numeric policy values are explicitly identified as calibration defaults rather than guaranteed legal or safety measurements.

## Implementation gate

This design must be reviewed by the user before an implementation plan is created. After approval, the next artifact is a task-level implementation plan produced with the planning workflow; implementation does not begin from this document alone.
