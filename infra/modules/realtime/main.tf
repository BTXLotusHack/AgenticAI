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

variable "table_name" {
  type = string
}

variable "table_arn" {
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

resource "aws_iam_role" "membership_reader" {
  name = "${var.name_prefix}-appsync-membership"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "appsync.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "membership_reader" {
  name = "read-membership"
  role = aws_iam_role.membership_reader.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem"]
      Resource = var.table_arn
    }]
  })
}

resource "aws_appsync_datasource" "membership" {
  api_id           = aws_appsync_graphql_api.main.id
  name             = "membership_authorizer"
  type             = "AMAZON_DYNAMODB"
  service_role_arn = aws_iam_role.membership_reader.arn

  dynamodb_config {
    table_name = var.table_name
    region     = var.region
  }
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

# A teamId argument is only a filter, not authorization. Resolve every
# subscription registration against the caller's current membership item.
resource "aws_appsync_resolver" "authorize_rider_position_subscription" {
  api_id      = aws_appsync_graphql_api.main.id
  type        = "Subscription"
  field       = "onRiderPosition"
  data_source = aws_appsync_datasource.membership.name

  request_template = <<-VTL
    #if($util.isNullOrBlank($ctx.identity.sub))
      $util.unauthorized()
    #end
    {
      "version": "2018-05-29",
      "operation": "GetItem",
      "key": {
        "PK": $util.dynamodb.toDynamoDBJson("USER#$ctx.identity.sub"),
        "SK": $util.dynamodb.toDynamoDBJson("TEAM#$ctx.arguments.teamId")
      },
      "consistentRead": true
    }
  VTL

  response_template = <<-VTL
    #if($util.isNull($ctx.result))
      $util.unauthorized()
    #end
    $util.toJson(null)
  VTL
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
