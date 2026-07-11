# Loopin infrastructure (Terraform)

Terraform for Loopin's two backend planes. Excludes the historical analytics
store (Firehose/S3/Athena) and the SQS buffering layer by design.

Primary region: `ap-southeast-1`.

## Modules

| Module | Resources | Plane |
|---|---|---|
| `data` | DynamoDB single table (PK/SK, TTL, PITR) | Control |
| `identity` | Cognito user pool + app client | Both |
| `realtime` | AppSync GraphQL API (Cognito + IAM auth), NONE data source, publish resolver | Fast |
| `telemetry` | Kinesis stream, IoT topic rule + role, processor Lambda, event source mapping | Fast |
| `api` | HTTP API, Cognito JWT authorizer, `create-team` + `invite-user` Lambdas, routes | Control |
| `notifications` | SNS platform applications for APNs/FCM (optional, `enable_push`) | Control |
| `web` | Private S3 origin, CloudFront OAC, TLS redirect, security headers and SPA fallback | Delivery |

## Fast path

```
Mobile → IoT Core (MQTT: teams/+/riders/+/telemetry)
       → IoT topic rule → Kinesis → processor Lambda
       → Valhalla /trace_attributes (map-match)
       → AppSync publishRiderPosition mutation (IAM)
       → onRiderPosition subscription → React / Flutter (Cognito JWT)
```

## Control path

```
Client (Cognito JWT) → API Gateway (JWT authorizer) → Lambda → DynamoDB
                                                            └→ SNS push (invite)
```

## Identity flow

Cognito authorizes **both** planes:

- **API Gateway** JWT authorizer validates the user-pool token (issuer + client
  audience) before invoking control-plane Lambdas.
- **AppSync** uses the user pool for client subscriptions; a DynamoDB resolver
  requires the caller's current membership before registering a `teamId`
  channel. The processor Lambda publishes via IAM.

## Validate locally

Lambda code must be built first — Terraform zips `../backend/dist`, it does not
compile TypeScript.

```bash
# 1. Build handler bundles
cd ../backend && npm install && npm run build && cd ../infra

# 2. Init without connecting to shared state
terraform init -backend=false
terraform validate
```

`node --test test/architecture.test.mjs` verifies the high-risk authorization,
state, hosting and workflow invariants without cloud credentials.

## One-time development bootstrap

The application stack never falls back to local state. An AWS administrator
runs `infra/bootstrap` once to create the encrypted, versioned state bucket and
the GitHub OIDC deployment role. Bootstrap state is intentionally separate and
must be retained securely by the administrator.

```bash
cd bootstrap
terraform init
terraform apply \
  -var="state_bucket_name=loopin-terraform-state-ACCOUNT_ID" \
  -var="github_organization=BTXLotusHack" \
  -var="github_repository=AgenticAI"
```

If the account already has the GitHub OIDC provider, import it instead of
creating a duplicate. Record the two outputs as GitHub `development`
environment variables `TF_STATE_BUCKET` and `AWS_DEPLOY_ROLE_ARN`. Configure
`TASCO_MAPS_TRACE_URL` as an environment variable and `TASCO_MAPS_API_KEY` as an
environment secret. Never commit either credential or Terraform state.

## Development deployment

`.github/workflows/deploy-development.yml` is manual-only, checks out `main`,
requires the exact `DEPLOY_DEV` confirmation, and assumes the development role
through OIDC. Add required reviewers to the GitHub `development` environment.
It validates and applies Terraform, uploads `apps/web/dist` with split cache
policies, and invalidates CloudFront HTML. There is no production deployment
workflow.

For a manual plan, copy the backend example, substitute the real bucket, then:

```bash
terraform init -backend-config=environments/dev.s3.tfbackend
terraform plan -var-file=environments/dev.tfvars
```

Secrets such as `maps_api_key` are supplied through protected CI environment
secrets or `TF_VAR_*`; they do not belong in tfvars, plans, logs or frontend
bundles.

## Not yet wired (needs external validation)

- Tasco Maps auth/quotas and the exact `/trace_attributes` response shape.
- APNs/FCM credentials for `enable_push` (platform applications are `count = 0`
  until provided).
- IoT device provisioning/certificates and revocation for real riders. The rule
  binds broker topic/principal metadata to each payload, but least-privilege
  session issuance remains an application integration follow-up.
- A real AWS plan, apply and cross-team authorization smoke test. No resource is
  created by repository validation alone.
