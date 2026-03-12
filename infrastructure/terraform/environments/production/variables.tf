# ─── Production Variables ──────────────────────────────────

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.1.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS (required for production)"
  type        = string
}

# ─── Backend (ECS) ────────────────────────────────────────
variable "backend_cpu" {
  type    = number
  default = 512
}

variable "backend_memory" {
  type    = number
  default = 1024
}

variable "backend_desired_count" {
  type    = number
  default = 2
}

variable "backend_min_count" {
  type    = number
  default = 2
}

variable "backend_max_count" {
  type    = number
  default = 10
}

# ─── Database ─────────────────────────────────────────────
variable "db_instance_class" {
  type    = string
  default = "db.r6g.large"
}

variable "db_name" {
  type    = string
  default = "luma"
}

variable "db_username" {
  type      = string
  default   = "luma_admin"
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

# ─── Redis ───────────────────────────────────────────────
variable "redis_node_type" {
  type    = string
  default = "cache.r6g.large"
}

# ─── Domain ──────────────────────────────────────────────
variable "domain_name" {
  description = "Root domain for DNS records (e.g., luma.dating)"
  type        = string
  default     = ""
}

variable "create_dns_certificate" {
  description = "Whether to create and validate an ACM certificate via Route 53 DNS"
  type        = bool
  default     = false
}

# ─── Monitoring ──────────────────────────────────────────
variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = ""
}
