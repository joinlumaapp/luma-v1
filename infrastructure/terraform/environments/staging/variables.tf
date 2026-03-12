# ─── Staging Variables ─────────────────────────────────────

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["eu-west-1a", "eu-west-1b"]
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS (leave empty to skip)"
  type        = string
  default     = ""
}

# ─── Backend (ECS) ────────────────────────────────────────
variable "backend_cpu" {
  type    = number
  default = 256
}

variable "backend_memory" {
  type    = number
  default = 512
}

variable "backend_desired_count" {
  type    = number
  default = 1
}

variable "backend_min_count" {
  type    = number
  default = 1
}

variable "backend_max_count" {
  type    = number
  default = 3
}

# ─── Database ─────────────────────────────────────────────
variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
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
  default = "cache.t3.micro"
}

# ─── Domain (optional) ──────────────────────────────────
variable "domain_name" {
  description = "Root domain for DNS records (e.g., luma.dating). Leave empty to skip."
  type        = string
  default     = ""
}

# ─── Monitoring ──────────────────────────────────────────
variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = ""
}
