# AWS deployment specification

## 1. Deployment goals

- Low fixed cost for hackathon and early production.
- Isolated development, staging and production state.
- Repeatable deployment through AWS CDK.
- No long-lived AWS credentials in CI.
- Independent scaling of telemetry, APIs, AI and client delivery.
- Clear migration from Lambda without contract changes.

## 2. Region and accounts

Primary region: `ap-southeast-1` (Singapore).

Recommended AWS accounts:

```text
loopin-development
loopin-staging
loopin-production
```

Production must not share data stores, IoT policies or Cognito resources with development.

## 3. CDK stacks

### FoundationStack

- Route 53 hosted zone references
- ACM certificates
- KMS keys and aliases
- common tags and configuration

### IdentityStack

- Cognito User Pool
- web and mobile app clients
- identity/temporary credential roles where required
- trip-scoped authorization integration

### DataStack

- DynamoDB live-state table with TTL and point-in-time recovery in production
- PostgreSQL/PostGIS: single-AZ RDS in development, Aurora PostgreSQL in production
- RDS Proxy
- S3 web, telemetry, quarantine and export buckets
- Glue catalog and Athena workgroup
- Secrets Manager entries

### RealtimeStack

- AWS IoT Core policies and rules
- Kinesis telemetry stream
- Firehose delivery to S3
- AppSync Event API and namespaces
- EventBridge buses and schemas

### ComputeStack

- API Gateway HTTP API
- API, telemetry, situation, regroup, notification, AI and summary Lambdas
- SQS queues and dead-letter queues
- least-privilege IAM roles
- reserved concurrency and expiry configuration

### FrontendStack

- private S3 origin
- CloudFront distribution with Origin Access Control
- WAF web ACL
- SPA fallback behavior
- Route 53 alias record

### ObservabilityStack

- CloudWatch dashboards
- latency, error, lag and freshness alarms
- X-Ray/OpenTelemetry configuration
- cost budgets and anomaly detection
- bounded log retention

## 4. Web deployment

React + Vite builds to `apps/web/dist`.

```text
GitHub Actions
→ pnpm build
→ upload hashed assets to private S3
→ upload index.html with short cache
→ invalidate CloudFront HTML paths
```

CloudFront configuration:

- Immutable cache for fingerprinted assets.
- Short cache for `index.html` and runtime configuration.
- SPA fallback for React Router routes.
- Security headers and WAF protection.
- No public S3 bucket access.

## 5. API deployment

- Use API Gateway HTTP API rather than REST API unless an unsupported feature requires REST.
- Group related operations into bounded-context Lambdas rather than one function per trivial endpoint or one monolithic handler.
- Validate Cognito claims and trip membership at the boundary.
- Use RDS Proxy for PostgreSQL access.
- Use DynamoDB for current state and idempotency.
- Apply reserved concurrency to database-writing functions.

## 6. Mobile connectivity

- Cognito authenticates the user.
- The backend grants time-limited, trip-scoped IoT permissions.
- The mobile client connects with MQTT over secure WebSockets.
- IoT policy restricts publish to the user's member topic and subscribe to authorized alert topics.
- Transcribe streaming uses short-lived authorization; Lambda does not hold an audio stream.

## 7. Network strategy

### Development and hackathon

- Avoid NAT Gateway fixed cost where a safe managed-service design is available.
- Keep PostgreSQL private.
- Prefer AWS public service endpoints over routing all traffic through custom compute.
- Destroy unused ephemeral environments through CDK.

### Production

- Database subnets are private across at least two Availability Zones.
- Lambda VPC access is limited to functions that require RDS/Proxy.
- Compare NAT Gateway traffic with VPC endpoint hourly cost before adding endpoints.
- Security groups allow only explicit service-to-service paths.
- WAF, KMS, Secrets Manager and CloudTrail are enabled.

## 8. CI/CD

GitHub Actions assumes an AWS deployment role through OIDC.

### Pull request

```text
install → lint → type-check → unit tests → simulation tests
→ web build → Playwright → CDK synth → CDK diff
```

### Main branch

```text
deploy development → integration smoke tests → dataset replay
→ protected production approval → CDK deploy production
→ web upload → CloudFront invalidation → production smoke test
```

Database migrations run as an explicitly approved deployment job and are backward-compatible with the currently deployed application version.

## 9. Configuration and secrets

- Nonsecret runtime configuration is versioned and deployed through CDK.
- Secrets are stored in Secrets Manager, never repository files or frontend bundles.
- Safety policies are versioned data with approval history.
- Client runtime configuration exposes only public identifiers and endpoints.
- Each environment has separate KMS keys and secret namespaces.

## 10. Cost controls

- Use S3/CloudFront instead of frontend compute.
- Use ARM64 Lambda where dependencies allow.
- Keep Lambda bundles small and initialize SDK clients outside handlers.
- Use Kinesis batching so one invocation processes many telemetry points.
- Do not enable Managed Flink, OpenSearch, EKS or multi-region active-active before measured need.
- Set CloudWatch log retention to 7–14 days for ordinary application logs.
- Archive raw GPS directly to S3, not CloudWatch.
- Run Bedrock per confirmed situation or user request.
- Use AWS Budgets, cost-allocation tags and Cost Anomaly Detection from the first deployment.

Planning ranges before Tasco Maps, tax and external services:

| Stage | Monthly range |
|---|---:|
| Temporary hackathon | USD 5–25 |
| Always-on hackathon | USD 20–70 |
| Lean production | USD 100–350 |
| Early growth | USD 500–2,500+ |

## 11. Disaster recovery

Initial production targets backup and rebuild rather than active-active operation:

- CDK can recreate infrastructure.
- DynamoDB point-in-time recovery is enabled.
- Aurora automated backups and tested snapshots are enabled.
- S3 versioning/lifecycle is configured for critical buckets.
- Secrets and configuration restoration is documented.
- A second-region strategy is introduced only after recovery objectives and customer requirements are explicit.
