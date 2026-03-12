variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "domain_name" {
  description = "Root domain name (e.g., luma.dating). Leave empty to skip DNS."
  type        = string
  default     = ""
}

variable "create_certificate" {
  description = "Whether to create an ACM certificate and validate via DNS"
  type        = bool
  default     = false
}

variable "alb_dns_name" {
  description = "ALB DNS name for API A record"
  type        = string
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID for alias record"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "CloudFront distribution domain for CDN CNAME"
  type        = string
  default     = ""
}
