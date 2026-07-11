output "region" {
  value = var.region
}

output "dynamodb_table_name" {
  value = module.data.table_name
}

output "cognito_user_pool_id" {
  value = module.identity.user_pool_id
}

output "cognito_user_pool_client_id" {
  value = module.identity.user_client_id
}

output "cognito_issuer" {
  description = "OIDC issuer used as the API Gateway JWT authorizer issuer."
  value       = "https://cognito-idp.${var.region}.amazonaws.com/${module.identity.user_pool_id}"
}

output "api_endpoint" {
  description = "Base URL of the control-plane HTTP API."
  value       = module.api.api_endpoint
}

output "appsync_graphql_url" {
  description = "AppSync GraphQL HTTP endpoint (mutations/queries)."
  value       = module.realtime.graphql_url
}

output "appsync_realtime_url" {
  description = "AppSync real-time WebSocket endpoint (subscriptions)."
  value       = module.realtime.realtime_url
}

output "iot_telemetry_topic_filter" {
  description = "MQTT topic filter riders publish telemetry to."
  value       = module.telemetry.topic_filter
}

output "kinesis_stream_name" {
  value = module.telemetry.stream_name
}

output "web_bucket_name" {
  value = module.web.bucket_name
}

output "web_distribution_id" {
  value = module.web.distribution_id
}

output "web_url" {
  value = module.web.url
}
