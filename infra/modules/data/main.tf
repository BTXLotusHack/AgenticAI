variable "name_prefix" {
  type = string
}

# Single-table design: one table serves every control-plane access pattern via
# PK/SK. TTL auto-expires invites (and any other item that sets `ttl`).
resource "aws_dynamodb_table" "main" {
  name         = "${var.name_prefix}-app"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  deletion_protection_enabled = false
}

output "table_name" {
  value = aws_dynamodb_table.main.name
}

output "table_arn" {
  value = aws_dynamodb_table.main.arn
}
