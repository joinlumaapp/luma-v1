# ─── ElastiCache Module ────────────────────────────────────
# Redis 7 cluster for caching and session storage.

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.project}-${var.environment}-redis-"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from ECS"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project}-${var.environment}-redis-sg"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.project}-${var.environment}-redis7"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project}-${var.environment}"
  description          = "Redis for ${var.project} ${var.environment}"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  parameter_group_name = aws_elasticache_parameter_group.main.name

  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled           = var.environment == "production"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false

  snapshot_retention_limit = var.environment == "production" ? 7 : 0
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "Mon:05:00-Mon:06:00"

  tags = {
    Name        = "${var.project}-${var.environment}-redis"
    Environment = var.environment
  }
}
