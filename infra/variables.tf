variable "project" {
  description = "Project name prefix for resource naming."
  type        = string
  default     = "loopin"
}

variable "environment" {
  description = "Deployment environment (dev, prod)."
  type        = string
}

variable "region" {
  description = "AWS region. Loopin's primary region is ap-southeast-1 (Singapore)."
  type        = string
  default     = "ap-southeast-1"
}

variable "backend_dist_dir" {
  description = "Path to the backend build output (esbuild dist/), relative to this module."
  type        = string
  default     = "../backend/dist"
}

# --- Maps (Tasco / Valhalla) --------------------------------------------------

variable "maps_trace_url" {
  description = "Valhalla /trace_attributes endpoint used for map-matching."
  type        = string
}

variable "maps_api_key" {
  description = "Optional Tasco Maps bearer token. Empty disables auth header."
  type        = string
  default     = ""
  sensitive   = true
}

# --- Telemetry tuning ---------------------------------------------------------

variable "kinesis_shard_count" {
  description = "Provisioned Kinesis shards. Ignored when kinesis_on_demand = true."
  type        = number
  default     = 1
}

variable "kinesis_on_demand" {
  description = "Use Kinesis on-demand capacity mode."
  type        = bool
  default     = true
}

variable "processor_batch_size" {
  description = "Max Kinesis records delivered to the processor Lambda per batch."
  type        = number
  default     = 100
}

# --- Push notifications -------------------------------------------------------

variable "enable_push" {
  description = "Create SNS platform applications for APNs/FCM. Requires real credentials."
  type        = bool
  default     = false
}

variable "allowed_web_origins" {
  description = "Exact HTTPS origins allowed by the HTTP API. Empty disables browser CORS."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for origin in var.allowed_web_origins : can(regex("^https://", origin)) || can(regex("^http://(localhost|127\\.0\\.0\\.1)(:[0-9]+)?$", origin))])
    error_message = "Origins must use HTTPS, except explicit localhost development origins."
  }
}

variable "web_acl_arn" {
  description = "Optional us-east-1 CloudFront WAFv2 web ACL ARN."
  type        = string
  default     = null
}
