variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = ""
}

# ─── ECS ─────────────────────────────────────────────────────
variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_name" {
  type = string
}

variable "ecs_log_group_name" {
  description = "CloudWatch log group name for ECS backend"
  type        = string
}

# ─── ALB ─────────────────────────────────────────────────────
variable "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch dimensions"
  type        = string
}

variable "target_group_arn_suffix" {
  description = "Target group ARN suffix for CloudWatch dimensions"
  type        = string
}

# ─── RDS ─────────────────────────────────────────────────────
variable "rds_instance_id" {
  description = "RDS instance identifier"
  type        = string
}

# ─── Redis ───────────────────────────────────────────────────
variable "redis_replication_group_id" {
  description = "ElastiCache replication group ID"
  type        = string
}
