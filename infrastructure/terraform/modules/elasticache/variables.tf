variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "ecs_security_group_id" {
  type = string
}

variable "node_type" {
  type    = string
  default = "cache.t3.small"
}

variable "auth_token" {
  description = "Auth token for Redis transit encryption (must be 16-128 chars)"
  type        = string
  sensitive   = true
}
