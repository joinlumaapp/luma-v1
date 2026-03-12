variable "project" {
  type = string
}

variable "environment" {
  type = string
}

# ─── Database ──────────────────────────────────────────────
variable "db_host" {
  description = "RDS endpoint host"
  type        = string
}

variable "db_name" {
  type    = string
  default = "luma"
}

variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  description = "DB password. If empty, a random password is generated."
  type        = string
  default     = ""
  sensitive   = true
}

variable "database_url" {
  description = "Full PostgreSQL connection URL for SSM"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Full Redis connection URL for SSM"
  type        = string
  sensitive   = true
}

variable "elasticsearch_url" {
  description = "OpenSearch endpoint URL for SSM"
  type        = string
}

# ─── JWT ─────────────────────────────────────────────────────
variable "jwt_secret" {
  description = "JWT secret. If empty, a random one is generated."
  type        = string
  default     = ""
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh secret. If empty, a random one is generated."
  type        = string
  default     = ""
  sensitive   = true
}

# ─── Third-party API Keys (all optional) ────────────────────
variable "netgsm_usercode" {
  type    = string
  default = ""
}

variable "netgsm_password" {
  type      = string
  default   = ""
  sensitive = true
}

variable "firebase_project_id" {
  type    = string
  default = ""
}

variable "firebase_private_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "sentry_dsn" {
  type    = string
  default = ""
}

variable "revenuecat_api_key" {
  type      = string
  default   = ""
  sensitive = true
}
