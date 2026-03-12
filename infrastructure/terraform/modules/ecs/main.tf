# ─── ECS Module ────────────────────────────────────────────
# Fargate cluster and service for backend API.

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-cluster"
    Environment = var.environment
    Project     = var.project
  }
}

# ─── Task Execution Role ──────────────────────────────────
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project}-${var.environment}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow pulling secrets from SSM Parameter Store and Secrets Manager
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${var.project}-${var.environment}-ecs-secrets"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project}/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# ─── Task Role ─────────────────────────────────────────────
resource "aws_iam_role" "ecs_task" {
  name = "${var.project}-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

# S3 access for photo uploads, Rekognition for moderation, SES for email
resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "${var.project}-${var.environment}-ecs-s3"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project}-photos-${var.environment}",
          "arn:aws:s3:::${var.project}-photos-${var.environment}/*",
          "arn:aws:s3:::${var.project}-voice-${var.environment}",
          "arn:aws:s3:::${var.project}-voice-${var.environment}/*",
          "arn:aws:s3:::${var.project}-assets-${var.environment}",
          "arn:aws:s3:::${var.project}-assets-${var.environment}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "rekognition:CompareFaces",
          "rekognition:DetectFaces",
          "rekognition:DetectModerationLabels"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

# ─── Security Group ────────────────────────────────────────
resource "aws_security_group" "ecs" {
  name_prefix = "${var.project}-${var.environment}-ecs-"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow traffic from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project}-${var.environment}-ecs-sg"
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ─── CloudWatch Log Group ─────────────────────────────────
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project}-${var.environment}/backend"
  retention_in_days = var.environment == "production" ? 90 : 14

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

# ─── Task Definition ──────────────────────────────────────
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project}-${var.environment}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${var.ecr_repository_url}:latest"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = var.environment == "production" ? "production" : "staging" },
      { name = "PORT", value = "3000" },
      { name = "APP_NAME", value = var.project },
      { name = "JWT_ACCESS_EXPIRY", value = "15m" },
      { name = "JWT_REFRESH_EXPIRY", value = "7d" },
      { name = "JWT_REFRESH_EXPIRY_DAYS", value = "7" },
      { name = "THROTTLE_TTL", value = "60" },
      { name = "THROTTLE_LIMIT", value = var.environment == "production" ? "100" : "200" },
      { name = "CORS_ORIGINS", value = var.cors_origins },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "S3_BUCKET_NAME", value = "${var.project}-photos-${var.environment}" },
      { name = "CLOUDFRONT_URL", value = var.cloudfront_url },
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/database-url" },
      { name = "REDIS_URL", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/redis-url" },
      { name = "ELASTICSEARCH_URL", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/elasticsearch-url" },
      { name = "JWT_SECRET", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/jwt-secret" },
      { name = "JWT_REFRESH_SECRET", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/jwt-refresh-secret" },
      { name = "NETGSM_USERCODE", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/netgsm-usercode" },
      { name = "NETGSM_PASSWORD", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/netgsm-password" },
      { name = "FIREBASE_PROJECT_ID", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/firebase-project-id" },
      { name = "FIREBASE_PRIVATE_KEY", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/firebase-private-key" },
      { name = "SENTRY_DSN", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/sentry-dsn" },
      { name = "REVENUECAT_API_KEY", valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/revenuecat-api-key" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "backend"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health/ping || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
  }])

  tags = {
    Environment = var.environment
    Project     = var.project
  }
}

data "aws_caller_identity" "current" {}

# ─── Service ──────────────────────────────────────────────
resource "aws_ecs_service" "backend" {
  name            = "${var.project}-${var.environment}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "backend"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  tags = {
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# ─── Auto Scaling ──────────────────────────────────────────
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = var.max_count
  min_capacity       = var.min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "${var.project}-${var.environment}-backend-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "backend_memory" {
  name               = "${var.project}-${var.environment}-backend-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
