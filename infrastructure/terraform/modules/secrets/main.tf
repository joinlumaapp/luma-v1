# ─── Secrets Manager Module ─────────────────────────────────
# Manages application secrets via AWS Secrets Manager and
# SSM Parameter Store for ECS task injection.

# ─── Random Password for DB (if not provided) ──────────────
resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}|:?"
}

# ─── Database Credentials Secret ────────────────────────────
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project}/${var.environment}/db-credentials"
  description             = "RDS PostgreSQL credentials for ${var.project} ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name        = "${var.project}-${var.environment}-db-credentials"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password != "" ? var.db_password : random_password.db.result
    engine   = "postgres"
    host     = var.db_host
    port     = 5432
    dbname   = var.db_name
  })
}

# ─── JWT Secrets ─────────────────────────────────────────────
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

# ─── SSM Parameters (injected into ECS task definitions) ────
resource "aws_ssm_parameter" "database_url" {
  name        = "/${var.project}/${var.environment}/database-url"
  description = "PostgreSQL connection URL"
  type        = "SecureString"
  value       = var.database_url

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "redis_url" {
  name        = "/${var.project}/${var.environment}/redis-url"
  description = "Redis connection URL"
  type        = "SecureString"
  value       = var.redis_url

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project}/${var.environment}/jwt-secret"
  description = "JWT signing secret"
  type        = "SecureString"
  value       = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "jwt_refresh_secret" {
  name        = "/${var.project}/${var.environment}/jwt-refresh-secret"
  description = "JWT refresh token signing secret"
  type        = "SecureString"
  value       = var.jwt_refresh_secret != "" ? var.jwt_refresh_secret : random_password.jwt_refresh_secret.result

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_ssm_parameter" "elasticsearch_url" {
  name        = "/${var.project}/${var.environment}/elasticsearch-url"
  description = "OpenSearch/Elasticsearch endpoint URL"
  type        = "SecureString"
  value       = var.elasticsearch_url

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

# ─── Optional Third-Party API Keys ──────────────────────────
# These are created as empty placeholders. Fill via AWS Console or CLI.

resource "aws_ssm_parameter" "netgsm_usercode" {
  name        = "/${var.project}/${var.environment}/netgsm-usercode"
  description = "Netgsm SMS provider user code"
  type        = "SecureString"
  value       = var.netgsm_usercode != "" ? var.netgsm_usercode : "PLACEHOLDER"

  tags = {
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "netgsm_password" {
  name        = "/${var.project}/${var.environment}/netgsm-password"
  description = "Netgsm SMS provider password"
  type        = "SecureString"
  value       = var.netgsm_password != "" ? var.netgsm_password : "PLACEHOLDER"

  tags = {
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "firebase_project_id" {
  name        = "/${var.project}/${var.environment}/firebase-project-id"
  description = "Firebase project ID for push notifications"
  type        = "SecureString"
  value       = var.firebase_project_id != "" ? var.firebase_project_id : "PLACEHOLDER"

  tags = {
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "firebase_private_key" {
  name        = "/${var.project}/${var.environment}/firebase-private-key"
  description = "Firebase service account private key"
  type        = "SecureString"
  value       = var.firebase_private_key != "" ? var.firebase_private_key : "PLACEHOLDER"

  tags = {
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "sentry_dsn" {
  name        = "/${var.project}/${var.environment}/sentry-dsn"
  description = "Sentry DSN for error tracking"
  type        = "SecureString"
  value       = var.sentry_dsn != "" ? var.sentry_dsn : "PLACEHOLDER"

  tags = {
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "revenuecat_api_key" {
  name        = "/${var.project}/${var.environment}/revenuecat-api-key"
  description = "RevenueCat API key for in-app purchases"
  type        = "SecureString"
  value       = var.revenuecat_api_key != "" ? var.revenuecat_api_key : "PLACEHOLDER"

  tags = {
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    ignore_changes = [value]
  }
}
