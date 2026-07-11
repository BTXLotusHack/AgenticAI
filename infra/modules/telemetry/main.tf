variable "name_prefix" { type = string }
variable "region" { type = string }
variable "account_id" { type = string }
variable "kinesis_on_demand" { type = bool }
variable "kinesis_shard_count" { type = number }
variable "processor_batch_size" { type = number }
variable "lambda_zip" { type = string }
variable "lambda_hash" { type = string }
variable "maps_trace_url" { type = string }
variable "maps_api_key" {
  type      = string
  sensitive = true
}
variable "appsync_http_url" { type = string }
variable "appsync_api_arn" { type = string }

locals {
  # Riders publish to teams/{team_id}/riders/{rider_id}/telemetry.
  topic_filter = "teams/+/riders/+/telemetry"
}

# --- Kinesis stream: buffers telemetry, absorbs spikes, decouples ingest ------
resource "aws_kinesis_stream" "telemetry" {
  name = "${var.name_prefix}-telemetry"

  # shard_count is ignored in ON_DEMAND mode but must be omitted; use dynamic.
  shard_count = var.kinesis_on_demand ? null : var.kinesis_shard_count

  retention_period = 24
  encryption_type  = "KMS"
  kms_key_id       = "alias/aws/kinesis"

  stream_mode_details {
    stream_mode = var.kinesis_on_demand ? "ON_DEMAND" : "PROVISIONED"
  }
}

resource "aws_sqs_queue" "quarantine" {
  name                      = "${var.name_prefix}-telemetry-quarantine"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

# --- IoT topic rule: forwards MQTT telemetry into Kinesis ---------------------
resource "aws_iam_role" "iot_to_kinesis" {
  name = "${var.name_prefix}-iot-kinesis"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "iot.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "iot_to_kinesis" {
  name = "put-records"
  role = aws_iam_role.iot_to_kinesis.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["kinesis:PutRecord"]
      Resource = aws_kinesis_stream.telemetry.arn
    }]
  })
}

resource "aws_iot_topic_rule" "telemetry" {
  name        = replace("${var.name_prefix}_telemetry", "-", "_")
  enabled     = true
  # Bind client claims to trusted broker context before records enter Kinesis.
  # The processor rejects records where the payload identity differs.
  sql         = "SELECT *, topic(2) AS _topicTeamId, topic(4) AS _topicRiderId, principal() AS _publisherPrincipal FROM '${local.topic_filter}'"
  sql_version = "2016-03-23"

  kinesis {
    role_arn    = aws_iam_role.iot_to_kinesis.arn
    stream_name = aws_kinesis_stream.telemetry.name
    # Partition by team so a team's points land in order on one shard.
    partition_key = "$${topic(2)}"
  }
}

# --- Processor Lambda ---------------------------------------------------------
resource "aws_iam_role" "processor" {
  name = "${var.name_prefix}-processor"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "processor" {
  name = "processor-access"
  role = aws_iam_role.processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:${var.region}:${var.account_id}:*"
      },
      {
        Sid    = "KinesisConsume"
        Effect = "Allow"
        Action = [
          "kinesis:GetRecords",
          "kinesis:GetShardIterator",
          "kinesis:DescribeStream",
          "kinesis:DescribeStreamSummary",
          "kinesis:ListShards",
        ]
        Resource = aws_kinesis_stream.telemetry.arn
      },
      {
        Sid      = "AppSyncPublish"
        Effect   = "Allow"
        Action   = ["appsync:GraphQL"]
        Resource = "${var.appsync_api_arn}/types/Mutation/fields/publishRiderPosition"
      },
      {
        Sid      = "QuarantineFailedBatch"
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.quarantine.arn
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "processor" {
  name              = "/aws/lambda/${var.name_prefix}-telemetry-processor"
  retention_in_days = 14
}

resource "aws_lambda_function" "processor" {
  function_name    = "${var.name_prefix}-telemetry-processor"
  role             = aws_iam_role.processor.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = var.lambda_zip
  source_code_hash = var.lambda_hash
  timeout          = 15
  memory_size      = 256
  depends_on       = [aws_cloudwatch_log_group.processor]

  environment {
    variables = {
      APPSYNC_HTTP_URL = var.appsync_http_url
      MAPS_TRACE_URL   = var.maps_trace_url
      MAPS_API_KEY     = var.maps_api_key
    }
  }
}

resource "aws_lambda_event_source_mapping" "kinesis" {
  event_source_arn                   = aws_kinesis_stream.telemetry.arn
  function_name                      = aws_lambda_function.processor.arn
  starting_position                  = "LATEST"
  batch_size                         = var.processor_batch_size
  maximum_batching_window_in_seconds = 2
  # Poison records are retried a bounded number of times then skipped so one bad
  # payload cannot stall the shard.
  maximum_retry_attempts         = 5
  maximum_record_age_in_seconds  = 300
  bisect_batch_on_function_error = true
  function_response_types        = ["ReportBatchItemFailures"]

  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.quarantine.arn
    }
  }
}

output "stream_name" {
  value = aws_kinesis_stream.telemetry.name
}

output "topic_filter" {
  value = local.topic_filter
}

output "quarantine_queue_url" {
  value = aws_sqs_queue.quarantine.url
}
