variable "name_prefix" {
  type = string
}

variable "region" {
  type = string
}

variable "user_pool_id" {
  type = string
}

variable "user_pool_region" {
  type = string
}

# AppSync is the serverless real-time broker. Default auth is Cognito user pools
# (client subscriptions); IAM is added so the processor Lambda can invoke the
# publish mutation. AppSync handles WebSocket fan-out natively.
resource "aws_appsync_graphql_api" "main" {
  name                = "${var.name_prefix}-realtime"
  authentication_type = "AMAZON_COGNITO_USER_POOLS"

  user_pool_config {
    user_pool_id   = var.user_pool_id
    aws_region     = var.user_pool_region
    default_action = "ALLOW"
  }

  additional_authentication_provider {
    authentication_type = "AWS_IAM"
  }

  schema = file("${path.module}/schema.graphql")

  xray_enabled = true
}

# Local (NONE) data source: the publish mutation is a pass-through whose only
# job is to trigger the onRiderPosition subscription.
resource "aws_appsync_datasource" "none" {
  api_id = aws_appsync_graphql_api.main.id
  name   = "local_passthrough"
  type   = "NONE"
}

# Pass-through resolver: echo the input as the mutation result so subscribers
# receive the full RiderPosition payload.
resource "aws_appsync_resolver" "publish_rider_position" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Mutation"
  field       = "publishRiderPosition"
  data_source = aws_appsync_datasource.none.name

  request_template = <<-VTL
    {
      "version": "2017-02-28",
      "payload": $util.toJson($context.arguments.input)
    }
  VTL

  response_template = "$util.toJson($context.result)"
}

output "api_id" {
  value = aws_appsync_graphql_api.main.id
}

output "api_arn" {
  value = aws_appsync_graphql_api.main.arn
}

output "graphql_url" {
  value = aws_appsync_graphql_api.main.uris["GRAPHQL"]
}

output "realtime_url" {
  value = aws_appsync_graphql_api.main.uris["REALTIME"]
}
