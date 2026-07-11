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
- **AppSync** uses the user pool for client subscriptions; the processor Lambda
  publishes via IAM. Subscriptions are scoped by `teamId`.

## Deploy

Lambda code must be built first — Terraform zips `../backend/dist`, it does not
compile TypeScript.

```bash
# 1. Build handler bundles
cd ../backend && npm install && npm run build && cd ../infra

# 2. Init + validate
terraform init
terraform validate

# 3. Plan / apply an environment
terraform plan  -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

State is local by default; see `backend.tf` to switch to an S3 backend for
shared/CI use. Secrets (e.g. `maps_api_key`, push credentials) should be passed
via `TF_VAR_*` in CI, not committed to tfvars.

## Not yet wired (needs external validation)

- Tasco Maps `/trace_attributes` is validated (Valhalla 3.7.0 at
  `https://tasco-maps.dnpwater.vn/route/`, no auth; set as `maps_trace_url`).
  Still open: production auth/quotas, and the `map_snap` 2000 m breakage limit
  on sparse traces (see `backend/README.md`).
- APNs/FCM credentials for `enable_push` (platform applications are `count = 0`
  until provided).
- IoT device provisioning/certificates for real riders (the rule and stream are
  in place; per-device onboarding is a follow-up).
