# ─── Global Variables ──────────────────────────────────────
variable "project" {
  description = "Project name"
  type        = string
  default     = "luma"
}

variable "environment" {
  description = "Deployment environment (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
}

# ─── Database ──────────────────────────────────────────────
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "luma"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "luma_admin"
  sensitive   = true
}

# ─── ECS ───────────────────────────────────────────────────
variable "backend_cpu" {
  description = "Backend task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Backend task memory in MiB"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 2
}

variable "backend_min_count" {
  description = "Minimum number of backend tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "backend_max_count" {
  description = "Maximum number of backend tasks for auto-scaling"
  type        = number
  default     = 6
}

# ─── Redis ─────────────────────────────────────────────────
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.small"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

# ─── Domain ────────────────────────────────────────────────
variable "domain_name" {
  description = "Root domain name (e.g., luma.app)"
  type        = string
  default     = ""
}
