# ─── S3 + CloudFront Module ────────────────────────────────
# S3 buckets for photo/media storage with CloudFront CDN.

# ─── Photos Bucket ─────────────────────────────────────────
resource "aws_s3_bucket" "photos" {
  bucket = "${var.project}-photos-${var.environment}"

  tags = {
    Name        = "${var.project}-photos-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "photos" {
  bucket = aws_s3_bucket.photos.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

# ─── Voice Notes Bucket ───────────────────────────────────
resource "aws_s3_bucket" "voice" {
  bucket = "${var.project}-voice-${var.environment}"

  tags = {
    Name        = "${var.project}-voice-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "voice" {
  bucket = aws_s3_bucket.voice.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "voice" {
  bucket = aws_s3_bucket.voice.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── CloudFront OAC ───────────────────────────────────────
resource "aws_cloudfront_origin_access_control" "photos" {
  name                              = "${var.project}-${var.environment}-photos-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─── CloudFront Distribution ──────────────────────────────
resource "aws_cloudfront_distribution" "photos" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = ""
  comment             = "${var.project} ${var.environment} photo CDN"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.photos.bucket_regional_domain_name
    origin_id                = "photos-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.photos.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "photos-s3"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project}-${var.environment}-cdn"
    Environment = var.environment
  }
}

# ─── S3 Bucket Policy for CloudFront ──────────────────────
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_policy" "photos" {
  bucket = aws_s3_bucket.photos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.photos.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.photos.arn
        }
      }
    }]
  })
}
