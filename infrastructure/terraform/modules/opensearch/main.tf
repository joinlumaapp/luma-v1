# ─── OpenSearch Module ─────────────────────────────────────
# Managed OpenSearch (Elasticsearch-compatible) for discovery search.

resource "aws_security_group" "opensearch" {
  name_prefix = "${var.project}-${var.environment}-opensearch-"
  description = "Security group for OpenSearch"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTPS from ECS"
    from_port       = 443
    to_port         = 443
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
    Name        = "${var.project}-${var.environment}-opensearch-sg"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_opensearch_domain" "main" {
  domain_name    = "${var.project}-${var.environment}"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type  = var.environment == "production" ? "r6g.large.search" : "t3.small.search"
    instance_count = var.environment == "production" ? 2 : 1

    zone_awareness_enabled = var.environment == "production"

    dynamic "zone_awareness_config" {
      for_each = var.environment == "production" ? [1] : []
      content {
        availability_zone_count = 2
      }
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_size = var.environment == "production" ? 50 : 10
    volume_type = "gp3"
  }

  vpc_options {
    subnet_ids         = var.environment == "production" ? slice(var.private_subnet_ids, 0, 2) : [var.private_subnet_ids[0]]
    security_group_ids = [aws_security_group.opensearch.id]
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-opensearch"
    Environment = var.environment
    Project     = var.project
  }
}

# ─── Access Policy ──────────────────────────────────────────
resource "aws_opensearch_domain_policy" "main" {
  domain_name = aws_opensearch_domain.main.domain_name

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = "es:*"
      Resource  = "${aws_opensearch_domain.main.arn}/*"
    }]
  })
}
