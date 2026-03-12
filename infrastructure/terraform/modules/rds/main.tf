# ─── RDS Module ────────────────────────────────────────────
# PostgreSQL 16 on RDS with Multi-AZ for production.

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.project}-${var.environment}-db-subnet"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project}-${var.environment}-rds-"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
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
    Name        = "${var.project}-${var.environment}-rds-sg"
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project}-${var.environment}"

  engine               = "postgres"
  engine_version       = "16"
  instance_class       = var.instance_class
  allocated_storage    = var.environment == "production" ? 100 : 20
  max_allocated_storage = var.environment == "production" ? 500 : 50
  storage_type         = "gp3"
  storage_encrypted    = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  multi_az               = var.environment == "production"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.environment == "production" ? 14 : 3
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.project}-${var.environment}-final" : null

  performance_insights_enabled          = var.environment == "production"
  performance_insights_retention_period = var.environment == "production" ? 7 : 0

  parameter_group_name = aws_db_parameter_group.main.name

  tags = {
    Name        = "${var.project}-${var.environment}-postgres"
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_db_parameter_group" "main" {
  name_prefix = "${var.project}-${var.environment}-pg16-"
  family      = "postgres16"

  parameter {
    name  = "log_min_duration_statement"
    value = var.environment == "production" ? "1000" : "500"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}
