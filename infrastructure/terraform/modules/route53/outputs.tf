output "api_fqdn" {
  value = var.domain_name != "" ? "api.${var.domain_name}" : ""
}

output "cdn_fqdn" {
  value = var.domain_name != "" ? "cdn.${var.domain_name}" : ""
}

output "certificate_arn" {
  value = var.domain_name != "" && var.create_certificate ? aws_acm_certificate.api[0].arn : ""
}

output "zone_id" {
  value = var.domain_name != "" ? data.aws_route53_zone.main[0].zone_id : ""
}
