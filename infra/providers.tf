provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "loopin"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
