locals {
  name_prefix = "${var.project}-${var.environment}"
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# --- Lambda bundles (built by `npm run build` in ../backend) -------------------
# esbuild writes dist/<name>/index.js; we zip each handler directory. Run the
# backend build before `terraform apply`.

data "archive_file" "telemetry_processor" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/telemetry-processor"
  output_path = "${path.module}/.build/telemetry-processor.zip"
}

data "archive_file" "create_team" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/create-team"
  output_path = "${path.module}/.build/create-team.zip"
}

data "archive_file" "invite_user" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/invite-user"
  output_path = "${path.module}/.build/invite-user.zip"
}

# --- Control-plane data store -------------------------------------------------

module "data" {
  source      = "./modules/data"
  name_prefix = local.name_prefix
}

# --- Identity (Cognito) -------------------------------------------------------

module "identity" {
  source      = "./modules/identity"
  name_prefix = local.name_prefix
}

# --- Real-time distribution (AppSync) -----------------------------------------

module "realtime" {
  source           = "./modules/realtime"
  name_prefix      = local.name_prefix
  region           = var.region
  user_pool_id     = module.identity.user_pool_id
  user_pool_region = var.region
}

# --- Telemetry fast path (IoT + Kinesis + processor Lambda) -------------------

module "telemetry" {
  source = "./modules/telemetry"

  name_prefix          = local.name_prefix
  region               = var.region
  account_id           = data.aws_caller_identity.current.account_id
  kinesis_on_demand    = var.kinesis_on_demand
  kinesis_shard_count  = var.kinesis_shard_count
  processor_batch_size = var.processor_batch_size

  lambda_zip  = data.archive_file.telemetry_processor.output_path
  lambda_hash = data.archive_file.telemetry_processor.output_base64sha256

  maps_trace_url   = var.maps_trace_url
  maps_api_key     = var.maps_api_key
  appsync_http_url = module.realtime.graphql_url
  appsync_api_arn  = module.realtime.api_arn
}

# --- Control plane API (API Gateway + Cognito JWT + Lambdas) -------------------

module "api" {
  source = "./modules/api"

  name_prefix  = local.name_prefix
  region       = var.region
  table_name   = module.data.table_name
  table_arn    = module.data.table_arn
  user_pool_id = module.identity.user_pool_id
  client_id    = module.identity.user_client_id

  create_team_zip  = data.archive_file.create_team.output_path
  create_team_hash = data.archive_file.create_team.output_base64sha256
  invite_user_zip  = data.archive_file.invite_user.output_path
  invite_user_hash = data.archive_file.invite_user.output_base64sha256
}

# --- Push notifications (optional; needs APNs/FCM credentials) -----------------

module "notifications" {
  source         = "./modules/notifications"
  name_prefix    = local.name_prefix
  enable_push    = var.enable_push
  fcm_credential = var.fcm_credential
}
