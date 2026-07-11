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

data "archive_file" "upsert_profile" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/upsert-profile"
  output_path = "${path.module}/.build/upsert-profile.zip"
}

data "archive_file" "get_profile" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/get-profile"
  output_path = "${path.module}/.build/get-profile.zip"
}

data "archive_file" "accept_invite" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/accept-invite"
  output_path = "${path.module}/.build/accept-invite.zip"
}

data "archive_file" "transfer_leader" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/transfer-leader"
  output_path = "${path.module}/.build/transfer-leader.zip"
}

data "archive_file" "list_my_teams" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/list-my-teams"
  output_path = "${path.module}/.build/list-my-teams.zip"
}

data "archive_file" "list_team_members" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/list-team-members"
  output_path = "${path.module}/.build/list-team-members.zip"
}

data "archive_file" "remove_member" {
  type        = "zip"
  source_dir  = "${path.module}/${var.backend_dist_dir}/remove-member"
  output_path = "${path.module}/.build/remove-member.zip"
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
  table_name       = module.data.table_name
  table_arn        = module.data.table_arn
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

  upsert_profile_zip  = data.archive_file.upsert_profile.output_path
  upsert_profile_hash = data.archive_file.upsert_profile.output_base64sha256
  get_profile_zip     = data.archive_file.get_profile.output_path
  get_profile_hash    = data.archive_file.get_profile.output_base64sha256

  accept_invite_zip      = data.archive_file.accept_invite.output_path
  accept_invite_hash     = data.archive_file.accept_invite.output_base64sha256
  transfer_leader_zip    = data.archive_file.transfer_leader.output_path
  transfer_leader_hash   = data.archive_file.transfer_leader.output_base64sha256
  list_my_teams_zip      = data.archive_file.list_my_teams.output_path
  list_my_teams_hash     = data.archive_file.list_my_teams.output_base64sha256
  list_team_members_zip  = data.archive_file.list_team_members.output_path
  list_team_members_hash = data.archive_file.list_team_members.output_base64sha256
  remove_member_zip      = data.archive_file.remove_member.output_path
  remove_member_hash     = data.archive_file.remove_member.output_base64sha256
  allowed_origins        = concat(var.allowed_web_origins, [module.web.url])
}

# --- Static React/Vite delivery ----------------------------------------------

module "web" {
  source = "./modules/web"

  name_prefix = local.name_prefix
  web_acl_arn = var.web_acl_arn
}

# --- Push notifications (optional; needs APNs/FCM credentials) -----------------

module "notifications" {
  source         = "./modules/notifications"
  name_prefix    = local.name_prefix
  enable_push    = var.enable_push
  fcm_credential = var.fcm_credential
}
