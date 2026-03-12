output "db_credentials_secret_arn" {
  value = aws_secretsmanager_secret.db_credentials.arn
}

output "ssm_database_url_arn" {
  value = aws_ssm_parameter.database_url.arn
}

output "ssm_redis_url_arn" {
  value = aws_ssm_parameter.redis_url.arn
}

output "ssm_jwt_secret_arn" {
  value = aws_ssm_parameter.jwt_secret.arn
}

output "ssm_jwt_refresh_secret_arn" {
  value = aws_ssm_parameter.jwt_refresh_secret.arn
}

output "ssm_parameter_arns" {
  description = "All SSM parameter ARNs for IAM policy attachment"
  value = [
    aws_ssm_parameter.database_url.arn,
    aws_ssm_parameter.redis_url.arn,
    aws_ssm_parameter.jwt_secret.arn,
    aws_ssm_parameter.jwt_refresh_secret.arn,
    aws_ssm_parameter.elasticsearch_url.arn,
    aws_ssm_parameter.netgsm_usercode.arn,
    aws_ssm_parameter.netgsm_password.arn,
    aws_ssm_parameter.firebase_project_id.arn,
    aws_ssm_parameter.firebase_private_key.arn,
    aws_ssm_parameter.sentry_dsn.arn,
    aws_ssm_parameter.revenuecat_api_key.arn,
  ]
}
