# ─── Route 53 Module ───────────────────────────────────────
# DNS records for LUMA infrastructure.
# Only created when domain_name is provided.

# ─── Hosted Zone (use existing or create new) ──────────────
data "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0

  name         = var.domain_name
  private_zone = false
}

# ─── API Record → ALB ─────────────────────────────────────
resource "aws_route53_record" "api" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# ─── CDN Record → CloudFront ──────────────────────────────
resource "aws_route53_record" "cdn" {
  count = var.domain_name != "" && var.cloudfront_domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "cdn.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.cloudfront_domain_name]
}

# ─── ACM Certificate for API domain ────────────────────────
resource "aws_acm_certificate" "api" {
  count = var.domain_name != "" && var.create_certificate ? 1 : 0

  domain_name               = "api.${var.domain_name}"
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = {
    Name        = "${var.project}-${var.environment}-api-cert"
    Environment = var.environment
    Project     = var.project
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = var.domain_name != "" && var.create_certificate ? {
    for dvo in aws_acm_certificate.api[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]

  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "api" {
  count = var.domain_name != "" && var.create_certificate ? 1 : 0

  certificate_arn         = aws_acm_certificate.api[0].arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}
