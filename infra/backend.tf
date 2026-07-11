# State backend.
#
# Local state is the default so the scaffold works out of the box. For shared /
# CI use, uncomment the S3 backend below (create the bucket + lock table first)
# and run `terraform init -migrate-state`.
#
# terraform {
#   backend "s3" {
#     bucket         = "loopin-tfstate-<account-id>"
#     key            = "loopin/${terraform.workspace}.tfstate"
#     region         = "ap-southeast-1"
#     dynamodb_table = "loopin-tflock"
#     encrypt        = true
#   }
# }
