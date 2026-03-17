# ─── LUMA Production Environment ───────────────────────────
# Full production AWS stack with HA and Multi-AZ.
#
# Usage:
#   cd infrastructure/terraform/environments/production
#   terraform init
#   terraform plan
#   terraform apply

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Enable after running: cd infrastructure/terraform/bootstrap && terraform apply
  backend "s3" {
    bucket         = "luma-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "luma-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "luma"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  project     = "luma"
  environment = "production"
}

# ─── VPC ───────────────────────────────────────────────────
module "vpc" {
  source = "../../modules/vpc"

  project            = local.project
  environment        = local.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# ─── ECR ───────────────────────────────────────────────────
module "ecr" {
  source = "../../modules/ecr"

  project     = local.project
  environment = local.environment
}

# ─── ALB ───────────────────────────────────────────────────
module "alb" {
  source = "../../modules/alb"

  project           = local.project
  environment       = local.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = var.certificate_arn
}

# ─── ECS ───────────────────────────────────────────────────
module "ecs" {
  source = "../../modules/ecs"

  project               = local.project
  environment           = local.environment
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_security_group_id = module.alb.security_group_id
  target_group_arn      = module.alb.target_group_arn
  ecr_repository_url    = module.ecr.repository_url
  cloudfront_url        = "https://${module.s3_cloudfront.cloudfront_domain_name}"
  cors_origins          = var.domain_name != "" ? "https://api.${var.domain_name}" : "*"

  cpu           = var.backend_cpu
  memory        = var.backend_memory
  desired_count = var.backend_desired_count
  min_count     = var.backend_min_count
  max_count     = var.backend_max_count

  depends_on = [module.secrets]
}

# ─── RDS ───────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  project               = local.project
  environment           = local.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  ecs_security_group_id = module.ecs.security_group_id
  instance_class        = var.db_instance_class
  db_name               = var.db_name
  db_username           = var.db_username
  db_password           = var.db_password
}

# ─── ElastiCache (Redis) ──────────────────────────────────
module "elasticache" {
  source = "../../modules/elasticache"

  project               = local.project
  environment           = local.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  ecs_security_group_id = module.ecs.security_group_id
  node_type             = var.redis_node_type
}

# ─── OpenSearch ────────────────────────────────────────────
module "opensearch" {
  source = "../../modules/opensearch"

  project               = local.project
  environment           = local.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  ecs_security_group_id = module.ecs.security_group_id
}

# ─── S3 + CloudFront ──────────────────────────────────────
module "s3_cloudfront" {
  source = "../../modules/s3-cloudfront"

  project     = local.project
  environment = local.environment
}

# ─── Secrets Manager + SSM Parameters ─────────────────────
module "secrets" {
  source = "../../modules/secrets"

  project     = local.project
  environment = local.environment

  db_host           = module.rds.address
  db_name           = var.db_name
  db_username       = var.db_username
  db_password       = var.db_password
  database_url      = module.rds.database_url
  redis_url         = module.elasticache.redis_url
  elasticsearch_url = "https://${module.opensearch.endpoint}"
}

# ─── CloudWatch Monitoring ────────────────────────────────
module "monitoring" {
  source = "../../modules/monitoring"

  project     = local.project
  environment = local.environment
  aws_region  = var.aws_region

  alert_email = var.alert_email

  ecs_cluster_name   = module.ecs.cluster_name
  ecs_service_name   = module.ecs.service_name
  ecs_log_group_name = module.ecs.log_group_name

  alb_arn_suffix            = module.alb.alb_arn_suffix
  target_group_arn_suffix   = module.alb.target_group_arn_suffix

  rds_instance_id            = module.rds.instance_id
  redis_replication_group_id = module.elasticache.replication_group_id
}

# ─── Route 53 ────────────────────────────────────────────
module "route53" {
  source = "../../modules/route53"

  project     = local.project
  environment = local.environment

  domain_name            = var.domain_name
  create_certificate     = var.create_dns_certificate
  alb_dns_name           = module.alb.alb_dns_name
  alb_zone_id            = module.alb.alb_zone_id
  cloudfront_domain_name = module.s3_cloudfront.cloudfront_domain_name
}
