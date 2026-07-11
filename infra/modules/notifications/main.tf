variable "name_prefix" { type = string }
variable "enable_push" { type = bool }

variable "apns_platform" {
  description = "APNS or APNS_SANDBOX."
  type        = string
  default     = "APNS_SANDBOX"
}

variable "apns_credential" {
  description = "APNs signing key / certificate. Required when enable_push = true."
  type        = string
  default     = ""
  sensitive   = true
}

variable "fcm_credential" {
  description = "FCM/GCM server key. Required when enable_push = true."
  type        = string
  default     = ""
  sensitive   = true
}

# Per-user endpoint ARNs are created at runtime and stored in DynamoDB; these
# platform applications are their parents. They need real credentials.
#
# APNs is DISABLED until a real APNs signing key is supplied. FCM is active and
# reads fcm_credential (wire it via TF_VAR_fcm_credential; never commit it).
#
# resource "aws_sns_platform_application" "apns" {
#   count               = var.enable_push ? 1 : 0
#   name                = "${var.name_prefix}-apns"
#   platform            = var.apns_platform
#   platform_credential = var.apns_credential
# }

resource "aws_sns_platform_application" "fcm" {
  count               = var.enable_push ? 1 : 0
  name                = "${var.name_prefix}-fcm"
  platform            = "GCM"
  platform_credential = var.fcm_credential
}

output "apns_platform_application_arn" {
  value = ""
}

output "fcm_platform_application_arn" {
  value = var.enable_push ? aws_sns_platform_application.fcm[0].arn : ""
}
