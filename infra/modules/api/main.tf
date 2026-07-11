variable "name_prefix" { type = string }
variable "region" { type = string }
variable "table_name" { type = string }
variable "table_arn" { type = string }
variable "user_pool_id" { type = string }
variable "client_id" { type = string }
variable "create_team_zip" { type = string }
variable "create_team_hash" { type = string }
variable "invite_user_zip" { type = string }
variable "invite_user_hash" { type = string }
variable "allowed_origins" { type = list(string) }
variable "upsert_profile_zip" { type = string }
variable "upsert_profile_hash" { type = string }
variable "get_profile_zip" { type = string }
variable "get_profile_hash" { type = string }
variable "accept_invite_zip" { type = string }
variable "accept_invite_hash" { type = string }
variable "transfer_leader_zip" { type = string }
variable "transfer_leader_hash" { type = string }
variable "list_my_teams_zip" { type = string }
variable "list_my_teams_hash" { type = string }
variable "list_team_members_zip" { type = string }
variable "list_team_members_hash" { type = string }
variable "remove_member_zip" { type = string }
variable "remove_member_hash" { type = string }

# --- Shared Lambda execution role (control plane) -----------------------------
resource "aws_iam_role" "api" {
  name = "${var.name_prefix}-api"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "api" {
  name = "api-access"
  role = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.region}:*:*"
      },
      {
        Sid    = "TableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:TransactWriteItems",
        ]
        Resource = [var.table_arn, "${var.table_arn}/index/*"]
      },
      {
        Sid      = "Push"
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = "*"
      },
    ]
  })
}

# --- HTTP API + Cognito JWT authorizer ----------------------------------------
resource "aws_apigatewayv2_api" "http" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"

  dynamic "cors_configuration" {
    for_each = length(var.allowed_origins) == 0 ? [] : [1]
    content {
      allow_origins  = var.allowed_origins
      allow_methods  = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
      allow_headers  = ["authorization", "content-type", "x-request-id"]
      expose_headers = ["x-request-id"]
      max_age        = 3600
    }
  }
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.http.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-jwt"

  jwt_configuration {
    audience = [var.client_id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${var.user_pool_id}"
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = true
    throttling_burst_limit   = 100
    throttling_rate_limit    = 50
  }
}

# --- Handlers -----------------------------------------------------------------
resource "aws_lambda_function" "create_team" {
  function_name    = "${var.name_prefix}-create-team"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.create_team_zip
  source_code_hash = var.create_team_hash
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

resource "aws_lambda_function" "invite_user" {
  function_name    = "${var.name_prefix}-invite-user"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.invite_user_zip
  source_code_hash = var.invite_user_hash
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

resource "aws_lambda_function" "upsert_profile" {
  function_name    = "${var.name_prefix}-upsert-profile"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.upsert_profile_zip
  source_code_hash = var.upsert_profile_hash
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

resource "aws_lambda_function" "get_profile" {
  function_name    = "${var.name_prefix}-get-profile"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.get_profile_zip
  source_code_hash = var.get_profile_hash
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

resource "aws_lambda_function" "accept_invite" {
  function_name    = "${var.name_prefix}-accept-invite"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.accept_invite_zip
  source_code_hash = var.accept_invite_hash
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

resource "aws_lambda_function" "transfer_leader" {
  function_name    = "${var.name_prefix}-transfer-leader"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.transfer_leader_zip
  source_code_hash = var.transfer_leader_hash
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

resource "aws_lambda_function" "list_my_teams" {
  function_name    = "${var.name_prefix}-list-my-teams"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.list_my_teams_zip
  source_code_hash = var.list_my_teams_hash
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

resource "aws_lambda_function" "list_team_members" {
  function_name    = "${var.name_prefix}-list-team-members"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.list_team_members_zip
  source_code_hash = var.list_team_members_hash
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

resource "aws_lambda_function" "remove_member" {
  function_name    = "${var.name_prefix}-remove-member"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.remove_member_zip
  source_code_hash = var.remove_member_hash
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

# --- Integrations + routes ----------------------------------------------------
resource "aws_apigatewayv2_integration" "create_team" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_team.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "invite_user" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.invite_user.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "upsert_profile" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.upsert_profile.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "get_profile" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_profile.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "accept_invite" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.accept_invite.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "transfer_leader" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.transfer_leader.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "list_my_teams" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.list_my_teams.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "list_team_members" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.list_team_members.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "remove_member" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.remove_member.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "create_team" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /teams"
  target             = "integrations/${aws_apigatewayv2_integration.create_team.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "invite_user" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /teams/{teamId}/invites"
  target             = "integrations/${aws_apigatewayv2_integration.invite_user.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "upsert_profile" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "PUT /me/profile"
  target             = "integrations/${aws_apigatewayv2_integration.upsert_profile.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_profile" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /me/profile"
  target             = "integrations/${aws_apigatewayv2_integration.get_profile.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "accept_invite" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /teams/{teamId}/invites/{inviteId}/accept"
  target             = "integrations/${aws_apigatewayv2_integration.accept_invite.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "transfer_leader" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "PUT /teams/{teamId}/leader"
  target             = "integrations/${aws_apigatewayv2_integration.transfer_leader.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "list_my_teams" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /me/teams"
  target             = "integrations/${aws_apigatewayv2_integration.list_my_teams.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "list_team_members" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /teams/{teamId}/members"
  target             = "integrations/${aws_apigatewayv2_integration.list_team_members.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "remove_member" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "DELETE /teams/{teamId}/members/{userId}"
  target             = "integrations/${aws_apigatewayv2_integration.remove_member.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# --- Invoke permissions -------------------------------------------------------
resource "aws_lambda_permission" "create_team" {
  statement_id  = "AllowApiGwCreateTeam"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_team.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "invite_user" {
  statement_id  = "AllowApiGwInviteUser"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.invite_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "upsert_profile" {
  statement_id  = "AllowApiGwUpsertProfile"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upsert_profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_profile" {
  statement_id  = "AllowApiGwGetProfile"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "accept_invite" {
  statement_id  = "AllowApiGwAcceptInvite"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.accept_invite.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "transfer_leader" {
  statement_id  = "AllowApiGwTransferLeader"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.transfer_leader.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "list_my_teams" {
  statement_id  = "AllowApiGwListMyTeams"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_my_teams.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "list_team_members" {
  statement_id  = "AllowApiGwListTeamMembers"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.list_team_members.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "remove_member" {
  statement_id  = "AllowApiGwRemoveMember"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.remove_member.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

output "api_endpoint" {
  value = aws_apigatewayv2_stage.default.invoke_url
}
