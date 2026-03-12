# ─── Production Outputs ────────────────────────────────────

output "alb_dns_name" {
  description = "ALB DNS name for API access"
  value       = module.alb.alb_dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker push"
  value       = module.ecr.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.primary_endpoint
}

output "opensearch_endpoint" {
  description = "OpenSearch endpoint"
  value       = module.opensearch.endpoint
}

output "cloudfront_domain" {
  description = "CloudFront CDN domain for photos"
  value       = module.s3_cloudfront.cloudfront_domain_name
}

output "assets_cloudfront_domain" {
  description = "CloudFront CDN domain for app assets"
  value       = module.s3_cloudfront.assets_cloudfront_domain_name
}

output "photos_bucket" {
  description = "S3 bucket for photos"
  value       = module.s3_cloudfront.photos_bucket_name
}

output "assets_bucket" {
  description = "S3 bucket for app assets"
  value       = module.s3_cloudfront.assets_bucket_name
}

output "monitoring_dashboard" {
  description = "CloudWatch dashboard name"
  value       = module.monitoring.dashboard_name
}

output "api_domain" {
  description = "API FQDN (if domain configured)"
  value       = module.route53.api_fqdn
}

output "cdn_domain" {
  description = "CDN FQDN (if domain configured)"
  value       = module.route53.cdn_fqdn
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}
