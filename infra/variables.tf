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
