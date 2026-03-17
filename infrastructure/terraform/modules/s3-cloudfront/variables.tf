variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "cdn_certificate_arn" {
  description = "ACM certificate ARN (us-east-1) for custom CloudFront domain. Leave empty for default."
  type        = string
  default     = ""
}

variable "cdn_domain_name" {
  description = "Custom domain for CloudFront (e.g., cdn.luma.dating). Leave empty for default."
  type        = string
  default     = ""
}

variable "cors_allowed_origins" {
  description = "Allowed origins for S3 CORS. Use [\"*\"] for dev, restrict for production."
  type        = list(string)
  default     = ["https://api.luma.dating", "https://luma.dating"]
}
