# Hackathon-to-production roadmap

## 1. Delivery principle

Build vertical slices that demonstrate complete behavior. Do not create a large set of empty microservices. Preserve domain contracts so infrastructure can evolve without rewriting the product model.

## 2. Phase 0: foundation

- Monorepo with npm workspaces
- Shared TypeScript, linting and test configuration
- Versioned Zod contracts
- Terraform (`infra/`) environment/account structure
- React/Vite shell and Flutter shell
- Dataset import and simulator fixtures
- CI with OIDC and `terraform plan`

Exit: one synthetic location event travels through the local/domain pipeline and its contract is verified.

## 3. Phase 1: hackathon vertical slice

### Product

- Create and join trip
- Leader/member readiness
- R001 route and members
- Live web map and driver state
- Graph nodes, adjacent edges and components
- Falling-behind, split and route-deviation incidents
- Role-specific alerts
- Deterministic regroup ranking
- Leader approval
- Reconnection and trip summary

### AWS

- Cognito
- API Gateway and Lambda
- IoT Core
- Kinesis and telemetry Lambda
- DynamoDB current state
- S3/Firehose archive
- AppSync Events
- RDS PostgreSQL/PostGIS
- Bedrock explanation with template fallback

Exit: the golden Hà Nội–Hạ Long scenario works live or as a repeatable recorded demonstration.

## 4. Phase 2: production hardening

- Native background GPS and offline buffer verified on representative Android/iOS devices
- Full permission and privacy UX
- All dataset scenarios
- Unexpected stop, connectivity, rest and EV detectors
- RDS Proxy and Aurora production configuration
- WAF, KMS, CloudTrail and bounded logs
- Push notifications and acknowledgement
- Incident and deletion runbooks
- Load, failure and recovery testing
- Legal, road-safety and Tasco integration review

Exit: controlled pilot with explicit support ownership and measurable reliability.

## 5. Phase 3: customer pilot

- Policy profiles for family, motorcycle, tourism and fleet trips
- Tasco live route/map-match/traffic integrations
- Multilingual notification templates
- Observer and coordinator roles
- Downsampled trip analytics
- Feature flags and staged rollout
- Cost per active vehicle-hour dashboard
- Shadow mode comparing proposed alerts with coordinator judgment

Exit: evidence that incident precision, alert usefulness, latency and cost meet pilot targets.

## 6. Phase 4: scale

Introduce only when measured triggers occur:

- Managed Apache Flink or ECS stateful processor
- Large-convoy subgroup partitioning
- Aurora readers or predictable provisioned capacity
- Regional disaster recovery
- Dedicated analytics pipeline
- Enterprise federation and fleet administration

Exit: the platform scales while preserving the same event contracts, policies and client behavior.

## 7. Feature priority

### Must have

- Trip lifecycle and membership
- Reliable native GPS
- Route progress
- Graph and component separation
- Low-distraction notifications
- Safe regroup recommendation
- Live map
- Offline/degraded behavior
- Dataset simulator

### Should have

- Voice command interpretation
- Push delivery
- Unexpected stop and EV context
- Observer/coordinator experience
- Post-trip summary and timeline

### Later

- Advanced fleet analytics
- Predictive incident models
- Large public events
- Multi-region active-active
- Developer APIs

## 8. Product questions to validate through pilots

- Which convoy types need fixed expected order versus free overtaking?
- Which road-specific cohesion windows minimize false splits?
- When should regroup be automatic, suggested or leader-approved?
- Which members need audible versus visual notifications at each severity?
- How frequently will users permit background GPS?
- What level of POI safety metadata Tasco can provide?
- What precise retention and deletion policy customers accept?

These are validation questions, not undocumented implementation choices. Initial defaults are defined in the specifications and changed through versioned policy.
